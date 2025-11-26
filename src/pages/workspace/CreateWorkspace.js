import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, ArrowLeft, Loader, Palette } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { workspaceService } from '../../services/workspaceService';

const PRESET_COLORS = [
  '#F97316', // Orange (primary)
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#6366F1', // Indigo
];

const CreateWorkspace = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#F97316'
  });
  const [errors, setErrors] = useState({});

  const createMutation = useMutation({
    mutationFn: workspaceService.createWorkspace,
    onSuccess: (response) => {
      const workspace = response.data.workspace;
      navigate(`/workspace/${workspace.id}/projects`);
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to create workspace';
      setErrors({ general: message });
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Workspace name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    createMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl"
      >
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-6 flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        {/* Card */}
        <div className="card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-light/10 dark:bg-primary-dark/10 mb-4">
              <Building2 className="w-8 h-8 text-primary-light dark:text-primary-dark" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Create Workspace
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Set up a new workspace for your team to collaborate
            </p>
          </div>

          {/* Error Message */}
          {errors.general && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-secondary-light/10 dark:bg-secondary-dark/10 border border-secondary-light dark:border-secondary-dark rounded-lg"
            >
              <p className="text-sm text-secondary-light dark:text-secondary-dark">
                {errors.general}
              </p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Workspace Name */}
            <div>
              <label htmlFor="name" className="label">
                Workspace Name <span className="text-secondary-light">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className={`input ${errors.name ? 'border-secondary-light dark:border-secondary-dark' : ''}`}
                placeholder="e.g., Acme Inc, Marketing Team"
                autoFocus
              />
              {errors.name && (
                <p className="mt-1 text-sm text-secondary-light dark:text-secondary-dark">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="label">
                Description (Optional)
              </label>
              <textarea
                id="description"
                name="description"
                rows="3"
                value={formData.description}
                onChange={handleChange}
                className="input resize-none"
                placeholder="What's this workspace for?"
              />
            </div>

            {/* Color Picker */}
            <div>
              <label className="label flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Workspace Color
              </label>
              <div className="flex flex-wrap gap-3 mt-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={`
                      w-12 h-12 rounded-lg transition-all duration-200
                      ${formData.color === color 
                        ? 'ring-4 ring-offset-2 ring-offset-surface-light dark:ring-offset-surface-dark scale-110' 
                        : 'hover:scale-105'
                      }
                    `}
                    style={{ 
                      backgroundColor: color,
                      ringColor: color
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                Preview:
              </p>
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                  style={{ backgroundColor: formData.color }}
                >
                  {formData.name.charAt(0).toUpperCase() || 'W'}
                </div>
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {formData.name || 'Workspace Name'}
                  </p>
                  {formData.description && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {formData.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 btn btn-secondary py-3"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 btn btn-primary py-3 flex items-center justify-center gap-2"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Workspace'
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateWorkspace;

