'use client';

import { useState, useEffect } from 'react';
import { Category } from '../types/journal';

interface CategoryManagerProps {
  onCategorySelect?: (category: Category) => void;
  showManagement?: boolean;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ 
  onCategorySelect, 
  showManagement = false 
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6B7280',
    icon: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchCategories();
        setShowCreateForm(false);
        setEditingCategory(null);
        setFormData({ name: '', description: '', color: '#6B7280', icon: '' });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save category');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
      icon: category.icon || ''
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (category: Category) => {
    if (category.isDefault) {
      alert('Cannot delete default categories');
      return;
    }

    if (category._count?.activities && category._count.activities > 0) {
      alert('Cannot delete category with existing activities');
      return;
    }

    if (!confirm(`Are you sure you want to delete the "${category.name}" category?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchCategories();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading categories...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Category List */}
      <div className="grid gap-3">
        {categories.map(category => (
          <div 
            key={category.id} 
            className={`tech-card p-4 cursor-pointer transition-all duration-200 ${
              onCategorySelect ? 'hover:shadow-md hover:border-blue-300' : ''
            }`}
            onClick={() => onCategorySelect?.(category)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: category.color }}
                />
                <div>
                  <h4 className="font-medium text-slate-900">{category.name}</h4>
                  {category.description && (
                    <p className="text-sm text-slate-600">{category.description}</p>
                  )}
                </div>
                {category.isDefault && (
                  <span className="tech-badge bg-blue-100 text-blue-800">Default</span>
                )}
              </div>
              
              {showManagement && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">
                    {category._count?.activities || 0} activities
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(category);
                    }}
                    className="tech-button-secondary !py-1 !px-2 text-xs"
                  >
                    Edit
                  </button>
                  {!category.isDefault && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(category);
                      }}
                      className="tech-button-secondary !py-1 !px-2 text-xs text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add New Category Button */}
      {showManagement && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="tech-button-primary w-full flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Category
        </button>
      )}

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="tech-input"
                  required
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="tech-textarea"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-10 border border-slate-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="tech-input"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    placeholder="#6B7280"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingCategory(null);
                    setFormData({ name: '', description: '', color: '#6B7280', icon: '' });
                  }}
                  className="tech-button-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="tech-button-primary flex-1"
                >
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;