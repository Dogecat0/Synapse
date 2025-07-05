'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Category } from '../../../types/journal';

function NewJournalEntryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const entryDate = searchParams.get('date');
  const [date, setDate] = useState(entryDate || new Date().toISOString().slice(0, 10));
  const [activities, setActivities] = useState([{ 
    description: '', 
    duration: '', 
    notes: '', 
    tags: '', 
    categoryId: '' 
  }]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
    checkExistingEntry(date);
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
    }
  };

  const handleActivityChange = (index: number, field: string, value: string) => {
    const newActivities = [...activities];
    newActivities[index] = { ...newActivities[index], [field]: value };
    setActivities(newActivities);
  };

  const handleAddActivity = () => {
    setActivities([...activities, { 
      description: '', 
      duration: '', 
      notes: '', 
      tags: '', 
      categoryId: '' 
    }]);
  };

  const handleRemoveActivity = (index: number) => {
    if (activities.length > 1) {
      setActivities(activities.filter((_, i) => i !== index));
    }
  };

  const checkExistingEntry = async (selectedDate: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/journal');
      if (response.ok) {
        const allEntries = await response.json();
        const data = allEntries.find((entry: any) => entry.date.startsWith(selectedDate));

        if (data && data.id) {
          // Found an existing entry, populate the form
          const existingActivities = data.activities.map((a: any) => ({
            description: a.description,
            duration: a.duration?.toString() ?? '',
            notes: a.notes ?? '',
            tags: a.tags.map((t: any) => t.name).join(', '),
            categoryId: a.categoryId
          }));

          setActivities(existingActivities.length > 0 ? existingActivities : [{ 
            description: '', 
            duration: '', 
            notes: '', 
            tags: '', 
            categoryId: '' 
          }]);
          setIsEditing(true);
        } else {
          // No existing entry, reset form
          setActivities([{ description: '', duration: '', notes: '', tags: '', categoryId: '' }]);
          setIsEditing(false);
        }
      }
    } catch (error) {
      console.error('Error checking existing entry:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDate(newDate);
    checkExistingEntry(newDate);
  };

  const validateForm = () => {
    const newErrors: Record<string, string[]> = {};

    activities.forEach((activity, index) => {
      if (!activity.description.trim()) {
        if (!newErrors.activities) newErrors.activities = [];
        newErrors.activities.push(`Activity #${index + 1} description is required`);
      }
      
      if (!activity.categoryId) {
        if (!newErrors.activities) newErrors.activities = [];
        newErrors.activities.push(`Activity #${index + 1} category is required`);
      }
      
      if (activity.duration && isNaN(parseInt(activity.duration))) {
        if (!newErrors.activities) newErrors.activities = [];
        newErrors.activities.push(`Activity #${index + 1} duration must be a number`);
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent, force = false) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    const validActivities = activities.filter(a => a.description.trim() && a.categoryId);

    try {
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          activities: validActivities,
          force,
        }),
      });

      if (response.ok) {
        setShowConfirmation(true);
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        const error = await response.json();
        if (response.status === 409 && !force) {
          if (confirm('An entry for this date already exists. Do you want to overwrite it?')) {
            handleSubmit(e, true);
            return;
          }
        } else {
          setErrors({ form: [error.error || 'Failed to save entry'] });
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ form: ['An unexpected error occurred'] });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="nav-link">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Home</span>
          </Link>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {isEditing ? 'Edit Journal Entry' : 'New Journal Entry'}
            </h1>
            <p className="text-slate-600">Record your daily activities and insights</p>
          </div>
        </div>

        {showConfirmation && (
          <div className="tech-card p-6 mb-6 border-green-200 bg-green-50">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-green-800">Entry saved successfully!</p>
                <p className="text-sm text-green-600">Redirecting to home page...</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e)} className="space-y-8">
          {/* Date Selection */}
          <div className="tech-card p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={handleDateChange}
              className="tech-input max-w-xs"
              disabled={isLoading}
            />
            {isEditing && (
              <p className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editing existing entry for this date
              </p>
            )}
          </div>

          {/* Activities Section */}
          <div className="tech-card p-6 space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Activities</h2>
              <div className="tech-badge-blue">
                {activities.filter(a => a.description.trim()).length} activities
              </div>
            </div>

            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div key={index} className="activity-item relative">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="font-medium text-slate-700">Activity #{index + 1}</div>
                      {activity.categoryId && (
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getCategoryById(activity.categoryId)?.color }}
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveActivity(index)}
                      className="flex items-center px-2 py-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Remove activity"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove
                    </button>
                  </div>
                  
                  <div className="grid gap-4">
                    <input
                      type="text"
                      placeholder="What did you do?"
                      value={activity.description}
                      onChange={(e) => handleActivityChange(index, 'description', e.target.value)}
                      className="tech-input"
                    />
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <select
                        value={activity.categoryId}
                        onChange={(e) => handleActivityChange(index, 'categoryId', e.target.value)}
                        className="tech-input"
                        required
                      >
                        <option value="">Select category...</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      
                      <input
                        type="number"
                        placeholder="Duration (minutes)"
                        value={activity.duration}
                        onChange={(e) => handleActivityChange(index, 'duration', e.target.value)}
                        className="tech-input"
                        min="0"
                      />
                    </div>
                    
                    <textarea
                      placeholder="Additional notes or details..."
                      value={activity.notes}
                      onChange={(e) => handleActivityChange(index, 'notes', e.target.value)}
                      className="tech-textarea"
                      rows={3}
                    />
                    
                    <input
                      type="text"
                      placeholder="Tags (comma-separated)"
                      value={activity.tags}
                      onChange={(e) => handleActivityChange(index, 'tags', e.target.value)}
                      className="tech-input"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddActivity}
              className="tech-button-primary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Activity
            </button>
          </div>

          {/* Error Display */}
          {Object.keys(errors).length > 0 && (
            <div className="tech-card p-4 border-red-200 bg-red-50">
              <h3 className="font-medium text-red-800 mb-2">Please fix the following errors:</h3>
              <ul className="text-sm text-red-600 space-y-1">
                {Object.values(errors).flat().map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-slate-200">
            <Link href="/" className="tech-button-secondary text-center">
              Cancel
            </Link>
            <button
              type="submit"
              className="tech-button-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isEditing ? 'Update Entry' : 'Save Entry'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewJournalEntry() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewJournalEntryContent />
    </Suspense>
  );
}