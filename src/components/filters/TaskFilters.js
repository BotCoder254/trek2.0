import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, X, Save, Star, Calendar, Users, Flag, 
  Tag, ChevronDown, Search, Clock
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useWorkspace } from '../../context/WorkspaceContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const TaskFilters = ({ filters, onFiltersChange, projectId, canSaveWorkspaceWide = false }) => {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [showFilters, setShowFilters] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSavedViews, setShowSavedViews] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [isWorkspaceWide, setIsWorkspaceWide] = useState(false);

  // Fetch saved views
  const { data: savedViewsData } = useQuery({
    queryKey: ['saved-views', currentWorkspace?.id],
    queryFn: async () => {
      const response = await api.get('/views', {
        params: { workspaceId: currentWorkspace?.id }
      });
      return response.data;
    },
    enabled: !!currentWorkspace?.id
  });

  // Fetch workspace members for assignee filter
  const { data: membersData } = useQuery({
    queryKey: ['workspace-members', currentWorkspace?.id],
    queryFn: async () => {
      const response = await api.get(`/workspaces/${currentWorkspace?.id}/members`);
      return response.data;
    },
    enabled: !!currentWorkspace?.id
  });

  // Save view mutation
  const saveViewMutation = useMutation({
    mutationFn: async ({ name, filterParams, isWorkspaceWide }) => {
      const response = await api.post('/views', {
        name,
        workspaceId: currentWorkspace?.id,
        filterParams,
        isWorkspaceWide
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['saved-views']);
      setShowSaveModal(false);
      setNewViewName('');
      setIsWorkspaceWide(false);
      toast.success('View saved successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save view');
    }
  });

  // Delete view mutation
  const deleteViewMutation = useMutation({
    mutationFn: async (viewId) => {
      await api.delete(`/views/${viewId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['saved-views']);
      toast.success('View deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete view');
    }
  });

  const savedViews = savedViewsData?.data?.views || [];
  const members = membersData?.data?.members || [];

  const activeFilterCount = Object.values(filters).filter(v => 
    Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined
  ).length;

  const handleFilterChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleRemoveFilter = (key) => {
    const newFilters = { ...filters };
    if (Array.isArray(newFilters[key])) {
      newFilters[key] = [];
    } else {
      delete newFilters[key];
    }
    onFiltersChange(newFilters);
  };

  const handleClearAll = () => {
    onFiltersChange({});
  };

  const handleApplySavedView = (view) => {
    onFiltersChange(view.filterParams || {});
    setShowSavedViews(false);
    toast.success(`Applied "${view.name}" view`);
  };

  const handleSaveView = () => {
    if (!newViewName.trim()) {
      toast.error('Please enter a view name');
      return;
    }
    saveViewMutation.mutate({
      name: newViewName,
      filterParams: filters,
      isWorkspaceWide
    });
  };

  const STATUSES = [
    { value: 'todo', label: 'To Do', color: 'bg-neutral-200' },
    { value: 'in-progress', label: 'In Progress', color: 'bg-info-light' },
    { value: 'in-review', label: 'In Review', color: 'bg-warning-light' },
    { value: 'done', label: 'Done', color: 'bg-success-light' }
  ];

  const PRIORITIES = [
    { value: 'low', label: 'Low', color: 'bg-neutral-400' },
    { value: 'medium', label: 'Medium', color: 'bg-info-light' },
    { value: 'high', label: 'High', color: 'bg-warning-light' },
    { value: 'urgent', label: 'Urgent', color: 'bg-secondary-light' }
  ];

  return (
    <div className="space-y-3">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-secondary flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-primary-light text-white text-xs px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {/* Saved Views Button */}
        <button
          onClick={() => setShowSavedViews(!showSavedViews)}
          className="btn btn-secondary flex items-center gap-2"
        >
          <Star className="w-4 h-4" />
          Saved Views
        </button>

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <>
            {filters.status && filters.status.length > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full text-sm"
              >
                <span className="font-medium">Status:</span>
                <span>{filters.status.join(', ')}</span>
                <button
                  onClick={() => handleRemoveFilter('status')}
                  className="hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}

            {filters.priority && filters.priority.length > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full text-sm"
              >
                <span className="font-medium">Priority:</span>
                <span>{filters.priority.join(', ')}</span>
                <button
                  onClick={() => handleRemoveFilter('priority')}
                  className="hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}

            <button
              onClick={handleClearAll}
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              Clear all
            </button>
          </>
        )}

        {/* Save View Button */}
        {activeFilterCount > 0 && (
          <button
            onClick={() => setShowSaveModal(true)}
            className="btn btn-primary btn-sm flex items-center gap-2 ml-auto"
          >
            <Save className="w-4 h-4" />
            Save View
          </button>
        )}
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="card p-6 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="label flex items-center gap-2 mb-2">
                  <Flag className="w-4 h-4" />
                  Status
                </label>
                <div className="space-y-2">
                  {STATUSES.map((status) => (
                    <label key={status.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.status?.includes(status.value) || false}
                        onChange={(e) => {
                          const currentStatus = filters.status || [];
                          if (e.target.checked) {
                            handleFilterChange('status', [...currentStatus, status.value]);
                          } else {
                            handleFilterChange('status', currentStatus.filter(s => s !== status.value));
                          }
                        }}
                        className="w-4 h-4 rounded"
                      />
                      <div className={`w-3 h-3 rounded ${status.color}`} />
                      <span className="text-sm">{status.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="label flex items-center gap-2 mb-2">
                  <Flag className="w-4 h-4" />
                  Priority
                </label>
                <div className="space-y-2">
                  {PRIORITIES.map((priority) => (
                    <label key={priority.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.priority?.includes(priority.value) || false}
                        onChange={(e) => {
                          const currentPriority = filters.priority || [];
                          if (e.target.checked) {
                            handleFilterChange('priority', [...currentPriority, priority.value]);
                          } else {
                            handleFilterChange('priority', currentPriority.filter(p => p !== priority.value));
                          }
                        }}
                        className="w-4 h-4 rounded"
                      />
                      <div className={`w-3 h-3 rounded ${priority.color}`} />
                      <span className="text-sm">{priority.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Assignee Filter */}
              <div>
                <label className="label flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4" />
                  Assignees
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {members.map((member) => {
                    if (!member.userId) return null;
                    return (
                      <label key={member._id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.assignees?.includes(member.userId._id) || false}
                          onChange={(e) => {
                            const currentAssignees = filters.assignees || [];
                            if (e.target.checked) {
                              handleFilterChange('assignees', [...currentAssignees, member.userId._id]);
                            } else {
                              handleFilterChange('assignees', currentAssignees.filter(a => a !== member.userId._id));
                            }
                          }}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm">{member.userId.firstName} {member.userId.lastName}</span>
                      </label>
                    );
                  }).filter(Boolean)}
                </div>
              </div>

              {/* Due Date Filter */}
              <div>
                <label className="label flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4" />
                  Due Date
                </label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={filters.dueDateStart || ''}
                    onChange={(e) => handleFilterChange('dueDateStart', e.target.value)}
                    className="input text-sm"
                    placeholder="From"
                  />
                  <input
                    type="date"
                    value={filters.dueDateEnd || ''}
                    onChange={(e) => handleFilterChange('dueDateEnd', e.target.value)}
                    className="input text-sm"
                    placeholder="To"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Views Dropdown */}
      <AnimatePresence>
        {showSavedViews && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="card p-4 overflow-hidden"
          >
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Saved Views</h3>
            {savedViews.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-4">
                No saved views yet. Apply filters and click "Save View" to create one.
              </p>
            ) : (
              <div className="space-y-2">
                {savedViews.map((view) => (
                  <div
                    key={view._id}
                    className="flex items-center justify-between p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                  >
                    <button
                      onClick={() => handleApplySavedView(view)}
                      className="flex-1 text-left flex items-center gap-3"
                    >
                      <Star className={`w-4 h-4 ${view.isDefault ? 'fill-warning-light text-warning-light' : 'text-neutral-400'}`} />
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {view.name}
                          {view.isWorkspaceWide && (
                            <span className="ml-2 text-xs px-2 py-0.5 bg-primary-light/20 text-primary-light rounded">
                              Workspace
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {view.createdBy?.firstName} {view.createdBy?.lastName}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => deleteViewMutation.mutate(view._id)}
                      className="p-2 hover:bg-secondary-light/10 text-secondary-light rounded"
                      title="Delete view"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save View Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaveModal(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md card p-6 z-50"
            >
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                Save Current View
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="label">View Name</label>
                  <input
                    type="text"
                    value={newViewName}
                    onChange={(e) => setNewViewName(e.target.value)}
                    placeholder="e.g., My High Priority Tasks"
                    className="input"
                    autoFocus
                  />
                </div>
                {canSaveWorkspaceWide && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isWorkspaceWide}
                      onChange={(e) => setIsWorkspaceWide(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Make this view available to all workspace members</span>
                  </label>
                )}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveView}
                    disabled={saveViewMutation.isPending}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saveViewMutation.isPending ? 'Saving...' : 'Save View'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskFilters;

