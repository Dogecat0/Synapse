'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function NewJournalEntryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const entryDate = searchParams.get('date');
  const [date, setDate] = useState(entryDate || new Date().toISOString().slice(0, 10));
  const [professionalActivities, setProfessionalActivities] = useState([{ description: '', duration: '', notes: '', tags: '' }]);
  const [projectActivities, setProjectActivities] = useState([{ description: '', duration: '', notes: '', tags: '' }]);
  const [lifeActivities, setLifeActivities] = useState([{ description: '', duration: '', notes: '', tags: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleActivityChange = (activitiesGetter, activitiesSetter, index, field, value) => {
    // Validation for duration field - allow only numbers
    if (field === 'duration' && value && !/^\d*$/.test(value)) {
      return;
    }
    const updatedActivities = [...activitiesGetter()];
    updatedActivities[index][field] = value;
    activitiesSetter(updatedActivities);
  };

  const handleAddActivity = (setter) => {
    setter(prev => [...prev, { description: '', duration: '', notes: '', tags: '' }]);
  };

  const handleRemoveActivity = (setter, index) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  // Function to fetch an existing entry when the date changes
  const checkExistingEntry = async (selectedDate) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/journal`); // Fetch all entries
      if (response.ok) {
        const allEntries = await response.json();
        
        // Find the entry for the selected date
        const data = allEntries.find(entry => entry.date.startsWith(selectedDate));

        if (data && data.id) {
          // Found an existing entry, populate the form
          const professional = data.activities
            .filter(a => a.category === 'PROFESSIONAL')
            .map(a => ({
              description: a.description,
              duration: a.duration?.toString() ?? '',
              notes: a.notes ?? '',
              tags: a.tags.map(t => t.name).join(', '),
            }));
          const project = data.activities
            .filter(a => a.category === 'PROJECT')
            .map(a => ({
              description: a.description,
              duration: a.duration?.toString() ?? '',
              notes: a.notes ?? '',
              tags: a.tags.map(t => t.name).join(', '),
            }));
          const life = data.activities
            .filter(a => a.category === 'LIFE')
            .map(a => ({
              description: a.description,
              duration: a.duration?.toString() ?? '',
              notes: a.notes ?? '',
              tags: a.tags.map(t => t.name).join(', '),
            }));

          setProfessionalActivities(professional.length > 0 ? professional : [{ description: '', duration: '', notes: '', tags: '' }]);
          setProjectActivities(project.length > 0 ? project : [{ description: '', duration: '', notes: '', tags: '' }]);
          setLifeActivities(life.length > 0 ? life : [{ description: '', duration: '', notes: '', tags: '' }]);

          setIsEditing(true);
        } else {
          // No existing entry, reset form
          setProfessionalActivities([{ description: '', duration: '', notes: '', tags: '' }]);
          setProjectActivities([{ description: '', duration: '', notes: '', tags: '' }]);
          setLifeActivities([{ description: '', duration: '', notes: '', tags: '' }]);
          setIsEditing(false);
        }
      }
    } catch (error) {
      console.error('Error checking existing entry:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle date change
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setDate(newDate);
    checkExistingEntry(newDate);
  };

  // Check for existing entry when component mounts
  useEffect(() => {
    checkExistingEntry(date);
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string[]> = {};

    const validateCategory = (activities, categoryName) => {
      activities.forEach((activity, index) => {
        if (!activity.description.trim() && (activities.length > 1 || Object.values(activity).some(v => v !== ''))) {
          if (!newErrors[categoryName]) newErrors[categoryName] = [];
          newErrors[categoryName].push(`${categoryName} activity #${index + 1} requires a description`);
        }
        if (activity.duration && !/^\d+$/.test(activity.duration)) {
          if (!newErrors[categoryName]) newErrors[categoryName] = [];
          newErrors[categoryName].push(`${categoryName} activity #${index + 1} duration must be a number`);
        }
      });
    };

    validateCategory(professionalActivities, 'Professional');
    validateCategory(projectActivities, 'Project');
    validateCategory(lifeActivities, 'Life');

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

    const allActivities = [
      ...professionalActivities.filter(a => a.description.trim()).map(a => ({ ...a, category: 'PROFESSIONAL' })),
      ...projectActivities.filter(a => a.description.trim()).map(a => ({ ...a, category: 'PROJECT' })),
      ...lifeActivities.filter(a => a.description.trim()).map(a => ({ ...a, category: 'LIFE' })),
    ];

    if (allActivities.length === 0) {
      setErrors({ form: ['Please add at least one activity.'] });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date, activities: allActivities, force: isEditing || force }),
      });

      setIsSubmitting(false);

      if (response.ok) {
        setShowConfirmation(true);
        setTimeout(() => {
          setShowConfirmation(false);
          router.push('/');
        }, 3000);
      } else {
        const data = await response.json();
        if (data.exists) {
          if (window.confirm('An entry for this date already exists. Do you want to overwrite it?')) {
            handleSubmit(e, true);
          }
        } else {
          setErrors({ form: [data.error || 'Failed to save journal entry'] });
        }
      }
    } catch (error) {
      setIsSubmitting(false);
      setErrors({ form: ['An error occurred while saving your entry'] });
      console.error('Error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Navigation Header */}
        <nav className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
          <Link href="/" className="nav-link">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className={`status-indicator ${isEditing ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isEditing ? 'Edit Journal Entry' : 'New Journal Entry'}
            </h1>
          </div>
        </nav>

        {/* Success Message */}
        {showConfirmation && (
          <div className="fixed top-4 right-4 tech-card p-4 border-l-4 border-emerald-500 bg-emerald-50 z-50">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-800 font-medium">
                Journal entry {isEditing ? 'updated' : 'saved'} successfully!
              </span>
            </div>
          </div>
        )}

        {/* Error Messages */}
        {Object.keys(errors).length > 0 && (
          <div className="mb-6 tech-card p-4 border-l-4 border-red-500 bg-red-50">
            <h3 className="text-red-800 font-medium mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Please correct the following issues:
            </h3>
            <ul className="space-y-1 text-sm">
              {Object.entries(errors).flatMap(([category, msgs]) =>
                msgs.map((msg, i) => (
                  <li key={`${category}-${i}`} className="text-red-700 flex items-center gap-2">
                    <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                    {msg}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex items-center gap-3 text-slate-600">
              <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="text-lg">Loading entry data...</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Date Selection */}
            <div className="tech-card p-6">
              <label htmlFor="date" className="block text-sm font-semibold text-slate-700 mb-3">
                Entry Date
              </label>
              <input
                type="date"
                id="date"
                value={date}
                onChange={handleDateChange}
                className="tech-input max-w-xs"
              />
              {isEditing && (
                <p className="mt-2 text-sm text-amber-600 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editing existing entry for this date
                </p>
              )}
            </div>

            {/* Professional Activities Section */}
            <div className="activity-section">
              <div className="flex items-center gap-3 mb-6">
                <div className="status-work"></div>
                <h2 className="text-xl font-semibold text-slate-900">Professional Activities</h2>
                <div className="tech-badge-blue">{professionalActivities.filter(a => a.description.trim()).length} activities</div>
              </div>

              <div className="space-y-4">
                {professionalActivities.map((activity, index) => (
                  <div key={index} className="activity-item relative">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
                      <div className="font-medium text-slate-700">Activity #{index + 1}</div>
                      <button
                        type="button"
                        onClick={() => handleRemoveActivity(setProfessionalActivities, index)}
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
                        placeholder="What did you work on?"
                        value={activity.description}
                        onChange={(e) => handleActivityChange(() => professionalActivities, setProfessionalActivities, index, 'description', e.target.value)}
                        className="tech-input"
                      />
                      <div className="grid md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Duration (minutes)"
                          value={activity.duration}
                          onChange={(e) => handleActivityChange(() => professionalActivities, setProfessionalActivities, index, 'duration', e.target.value)}
                          className="tech-input"
                        />
                        <input
                          type="text"
                          placeholder="Tags (comma-separated)"
                          value={activity.tags}
                          onChange={(e) => handleActivityChange(() => professionalActivities, setProfessionalActivities, index, 'tags', e.target.value)}
                          className="tech-input"
                        />
                      </div>
                      <textarea
                        placeholder="Additional notes or details..."
                        value={activity.notes}
                        onChange={(e) => handleActivityChange(() => professionalActivities, setProfessionalActivities, index, 'notes', e.target.value)}
                        className="tech-textarea"
                        rows={3}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleAddActivity(setProfessionalActivities)}
                className="tech-button-primary flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Professional Activity
              </button>
            </div>

            {/* Project Activities Section */}
            <div className="activity-section">
              <div className="flex items-center gap-3 mb-6">
                <div className="status-indicator bg-purple-500"></div>
                <h2 className="text-xl font-semibold text-slate-900">Project Activities</h2>
                <div className="tech-badge bg-purple-100 text-purple-800">{projectActivities.filter(a => a.description.trim()).length} activities</div>
              </div>

              <div className="space-y-4">
                {projectActivities.map((activity, index) => (
                  <div key={index} className="activity-item relative">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
                      <div className="font-medium text-slate-700">Activity #{index + 1}</div>
                      <button
                        type="button"
                        onClick={() => handleRemoveActivity(setProjectActivities, index)}
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
                        placeholder="What project activity did you do?"
                        value={activity.description}
                        onChange={(e) => handleActivityChange(() => projectActivities, setProjectActivities, index, 'description', e.target.value)}
                        className="tech-input"
                      />
                      <div className="grid md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Duration (minutes)"
                          value={activity.duration}
                          onChange={(e) => handleActivityChange(() => projectActivities, setProjectActivities, index, 'duration', e.target.value)}
                          className="tech-input"
                        />
                        <input
                          type="text"
                          placeholder="Tags (comma-separated)"
                          value={activity.tags}
                          onChange={(e) => handleActivityChange(() => projectActivities, setProjectActivities, index, 'tags', e.target.value)}
                          className="tech-input"
                        />
                      </div>
                      <textarea
                        placeholder="Additional notes or details..."
                        value={activity.notes}
                        onChange={(e) => handleActivityChange(() => projectActivities, setProjectActivities, index, 'notes', e.target.value)}
                        className="tech-textarea"
                        rows={3}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleAddActivity(setProjectActivities)}
                className="tech-button-primary flex items-center gap-2 bg-purple-600 hover:bg-purple-700 focus:ring-purple-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Project Activity
              </button>
            </div>

            {/* Life Activities Section */}
            <div className="activity-section">
              <div className="flex items-center gap-3 mb-6">
                <div className="status-life"></div>
                <h2 className="text-xl font-semibold text-slate-900">Life Activities</h2>
                <div className="tech-badge-green">{lifeActivities.filter(a => a.description.trim()).length} activities</div>
              </div>

              <div className="space-y-4">
                {lifeActivities.map((activity, index) => (
                  <div key={index} className="activity-item relative">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
                      <div className="font-medium text-slate-700">Activity #{index + 1}</div>
                      <button
                        type="button"
                        onClick={() => handleRemoveActivity(setLifeActivities, index)}
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
                        placeholder="What life activity did you do?"
                        value={activity.description}
                        onChange={(e) => handleActivityChange(() => lifeActivities, setLifeActivities, index, 'description', e.target.value)}
                        className="tech-input"
                      />
                      <div className="grid md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Duration (minutes)"
                          value={activity.duration}
                          onChange={(e) => handleActivityChange(() => lifeActivities, setLifeActivities, index, 'duration', e.target.value)}
                          className="tech-input"
                        />
                        <input
                          type="text"
                          placeholder="Tags (comma-separated)"
                          value={activity.tags}
                          onChange={(e) => handleActivityChange(() => lifeActivities, setLifeActivities, index, 'tags', e.target.value)}
                          className="tech-input"
                        />
                      </div>
                      <textarea
                        placeholder="Additional notes or details..."
                        value={activity.notes}
                        onChange={(e) => handleActivityChange(() => lifeActivities, setLifeActivities, index, 'notes', e.target.value)}
                        className="tech-textarea"
                        rows={3}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleAddActivity(setLifeActivities)}
                className="tech-button-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Life Activity
              </button>
            </div>

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
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
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
        )}
      </div>
    </div>
  );
}

export default function NewJournalEntry() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex justify-center items-center">
        <div className="flex items-center gap-3 text-slate-600">
          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-lg">Loading...</span>
        </div>
      </div>
    }>
      <NewJournalEntryContent />
    </Suspense>
  )
}