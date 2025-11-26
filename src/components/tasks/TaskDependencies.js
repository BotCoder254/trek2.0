import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Link2, Unlink, ArrowRight, AlertCircle, Search, 
  X, Plus, ChevronDown, ChevronUp
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const TaskDependencies = ({ taskId, projectId, canEdit = true }) => {
  const queryClient = useQueryClient();
  const [showAddDependency, setShowAddDependency] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  // Fetch dependencies
  const { data: dependenciesData } = useQuery({
    queryKey: ['task-dependencies', taskId],
    queryFn: async () => {
      const response = await api.get(`/tasks/${taskId}/dependencies`);
      return response.data;
    },
    enabled: !!taskId
  });

  // Fetch available tasks for typeahead
  const { data: availableTasksData } = useQuery({
    queryKey: ['available-tasks', projectId, searchQuery],
    queryFn: async () => {
      const response = await api.get(`/tasks/project/${projectId}`, {
        params: { search: searchQuery, limit: 20 }
      });
      return response.data;
    },
    enabled: !!projectId && searchQuery.length >= 2
  });

  // Add dependency mutation
  const addDependencyMutation = useMutation({
    mutationFn: async (dependencyId) => {
      const response = await api.post(`/tasks/${taskId}/dependencies`, {
        dependencyId
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['task-dependencies', taskId]);
      queryClient.invalidateQueries(['task', taskId]);
      setShowAddDependency(false);
      setSearchQuery('');
    }
  });

  // Remove dependency mutation
  const removeDependencyMutation = useMutation({
    mutationFn: async (dependencyId) => {
      await api.delete(`/tasks/${taskId}/dependencies/${dependencyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['task-dependencies', taskId]);
      queryClient.invalidateQueries(['task', taskId]);
    }
  });

  const dependencies = dependenciesData?.data?.dependencies || [];
  const blockedBy = dependenciesData?.data?.blockedBy || [];
  const isBlocked = dependenciesData?.data?.isBlocked || false;
  const availableTasks = availableTasksData?.data?.tasks || [];

  const getStatusColor = (status) => {
    switch (status) {
      case 'done': return 'bg-success-light/20 text-success-light';
      case 'in-progress': return 'bg-info-light/20 text-info-light';
      case 'in-review': return 'bg-warning-light/20 text-warning-light';
      default: return 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400';
    }
  };

  const DependencyItem = ({ task, type, canRemove }) => (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 hover:shadow-md transition-all"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-sm text-neutral-900 dark:text-neutral-100 truncate">
            {task.title}
          </h4>
          <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(task.status)}`}>
            {task.status}
          </span>
        </div>
        <p className="text-xs text-neutral-500">
          {type === 'dependency' ? 'Depends on this task' : 'This task depends on it'}
        </p>
      </div>
      
      {canRemove && type === 'dependency' && (
        <button
          onClick={() => removeDependencyMutation.mutate(task._id)}
          className="p-1.5 hover:bg-secondary-light/10 text-secondary-light rounded transition-colors"
          title="Remove dependency"
        >
          <Unlink className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100"
        >
          <Link2 className="w-5 h-5" />
          Dependencies
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {canEdit && isExpanded && (
          <button
            onClick={() => setShowAddDependency(!showAddDependency)}
            className="btn btn-secondary btn-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        )}
      </div>

      {/* Blocked Warning */}
      {isBlocked && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-lg bg-secondary-light/10 border border-secondary-light"
        >
          <AlertCircle className="w-5 h-5 text-secondary-light flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-secondary-light">Task Blocked</h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              This task is blocked by incomplete dependencies. Complete the dependent tasks first.
            </p>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4"
          >
            {/* Add Dependency Search */}
            {showAddDependency && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Search className="w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for tasks to add as dependency..."
                    className="flex-1 bg-transparent border-none focus:outline-none text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      setShowAddDependency(false);
                      setSearchQuery('');
                    }}
                    className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Search Results */}
                {searchQuery.length >= 2 && (
                  <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                    {availableTasks
                      .filter(t => t._id !== taskId)
                      .filter(t => !dependencies.some(d => d._id === t._id))
                      .map((task) => (
                        <button
                          key={task._id}
                          onClick={() => addDependencyMutation.mutate(task._id)}
                          className="w-full flex items-center gap-3 p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                              {task.title}
                            </p>
                            <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                          </div>
                          <Plus className="w-4 h-4 text-primary-light flex-shrink-0" />
                        </button>
                      ))}
                    {availableTasks.filter(t => t._id !== taskId).length === 0 && (
                      <p className="text-sm text-neutral-500 text-center py-4">
                        No tasks found
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Dependencies (This task depends on...) */}
            {dependencies.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase">
                    Depends On
                  </h3>
                  <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {dependencies.map((task) => (
                      <DependencyItem
                        key={task._id}
                        task={task}
                        type="dependency"
                        canRemove={canEdit}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Blocking Tasks (Tasks that depend on this one) */}
            {blockedBy.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase">
                    Blocking
                  </h3>
                  <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {blockedBy.map((task) => (
                      <DependencyItem
                        key={task._id}
                        task={task}
                        type="blocked"
                        canRemove={false}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Empty State */}
            {dependencies.length === 0 && blockedBy.length === 0 && (
              <div className="text-center py-8 text-neutral-500">
                <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No dependencies yet</p>
                {canEdit && (
                  <p className="text-xs mt-1">
                    Add dependencies to define task relationships
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskDependencies;

