import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MoreVertical, Users, Calendar, Flag, Paperclip, MessageSquare, CheckSquare } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../../services/projectService';
import BlockedBadge from '../tasks/BlockedBadge';

const STATUSES = [
  { id: 'todo', label: 'To Do', color: '#6B7280' },
  { id: 'in-progress', label: 'In Progress', color: '#8B5CF6' },
  { id: 'in-review', label: 'In Review', color: '#F59E0B' },
  { id: 'done', label: 'Done', color: '#10B981' }
];

const KanbanBoard = ({ tasks = [], projectId, onTaskClick }) => {
  const queryClient = useQueryClient();
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Group tasks by status
  const tasksByStatus = STATUSES.reduce((acc, status) => {
    acc[status.id] = tasks.filter(task => task.status === status.id);
    return acc;
  }, {});

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status, position }) => 
      projectService.updateTaskStatus(taskId, status, position),
    onMutate: async ({ taskId, status }) => {
      // Optimistic update
      await queryClient.cancelQueries(['tasks', projectId]);
      
      const previousTasks = queryClient.getQueryData(['tasks', projectId]);
      
      queryClient.setQueryData(['tasks', projectId], (old) => {
        if (!old?.data?.tasks) return old;
        return {
          ...old,
          data: {
            ...old.data,
            tasks: old.data.tasks.map(task =>
              task._id === taskId ? { ...task, status } : task
            )
          }
        };
      });

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', projectId], context.previousTasks);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks', projectId]);
      queryClient.invalidateQueries(['project', projectId]);
      queryClient.invalidateQueries(['epics', projectId]);
    }
  });

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedTask && draggedTask.status !== newStatus) {
      const tasksInColumn = tasksByStatus[newStatus] || [];
      updateStatusMutation.mutate({
        taskId: draggedTask._id,
        status: newStatus,
        position: tasksInColumn.length
      });
    }
    setDraggedTask(null);
  };

  const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const diff = d - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return { text: 'Overdue', urgent: true };
    if (days === 0) return { text: 'Today', urgent: true };
    if (days === 1) return { text: 'Tomorrow', urgent: false };
    if (days <= 7) return { text: `${days} days`, urgent: false };
    return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), urgent: false };
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-secondary-light dark:text-secondary-dark';
      case 'high': return 'text-warning-light dark:text-warning-dark';
      case 'medium': return 'text-info-light dark:text-info-dark';
      default: return 'text-neutral-400';
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-4">
      {STATUSES.map((status) => {
        const columnTasks = tasksByStatus[status.id] || [];
        const isOver = dragOverColumn === status.id;

        return (
          <div
            key={status.id}
            className="flex-shrink-0 w-80"
            onDragOver={(e) => handleDragOver(e, status.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status.id)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {status.label}
                </h3>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {columnTasks.length}
                </span>
              </div>
              <button className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Cards Container */}
            <div
              className={`space-y-3 min-h-[200px] rounded-lg p-2 transition-colors ${
                isOver ? 'bg-primary-light/10 dark:bg-primary-dark/10' : ''
              }`}
            >
              <AnimatePresence>
                {columnTasks.map((task, index) => (
                  <motion.div
                    key={task._id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onTaskClick?.(task)}
                    className="card p-4 cursor-pointer hover:shadow-elevated transition-all"
                  >
                    {/* Title & Priority */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-neutral-900 dark:text-neutral-100 text-sm mb-2">
                          {task.title}
                        </h4>
                        {task.isBlocked && <BlockedBadge isBlocked={true} size="sm" />}
                      </div>
                      <div className="flex items-center gap-1">
                        <Flag className={`w-3 h-3 ${getPriorityColor(task.priority)}`} />
                        <button className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                          <MoreVertical className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Epic Badge */}
                    {task.epicId && (
                      <div className="flex items-center gap-1 mb-3">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: task.epicId.color }}
                        />
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">
                          {task.epicId.title}
                        </span>
                      </div>
                    )}

                    {/* Labels */}
                    {task.labels && task.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {task.labels.slice(0, 3).map((label, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              backgroundColor: `${label.color}20`,
                              color: label.color
                            }}
                          >
                            {label.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Metadata Row */}
                    <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                      <div className="flex items-center gap-3">
                        {/* Due Date */}
                        {task.dueDate && (() => {
                          const dateInfo = formatDate(task.dueDate);
                          return dateInfo ? (
                            <div className={`flex items-center gap-1 ${dateInfo.urgent ? 'text-secondary-light dark:text-secondary-dark' : ''}`}>
                              <Calendar className="w-3 h-3" />
                              <span>{dateInfo.text}</span>
                            </div>
                          ) : null;
                        })()}

                        {/* Checklist */}
                        {task.checklist && task.checklist.length > 0 && (
                          <div className="flex items-center gap-1">
                            <CheckSquare className="w-3 h-3" />
                            <span>
                              {task.checklist.filter(item => item.done).length}/{task.checklist.length}
                            </span>
                          </div>
                        )}

                        {/* Attachments */}
                        {task.attachments && task.attachments.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Paperclip className="w-3 h-3" />
                            <span>{task.attachments.length}</span>
                          </div>
                        )}

                        {/* Comments Count (placeholder) */}
                        {task.commentCount > 0 && (
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            <span>{task.commentCount || 0}</span>
                          </div>
                        )}
                      </div>

                      {/* Assignees */}
                      {task.assignees && task.assignees.length > 0 && (
                        <div className="flex -space-x-1">
                          {task.assignees.slice(0, 3).map((assignee, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded-full bg-primary-light dark:bg-primary-dark text-white text-xs flex items-center justify-center ring-2 ring-surface-light dark:ring-surface-dark"
                              title={assignee.fullName || `${assignee.firstName} ${assignee.lastName}`}
                            >
                              {assignee.firstName?.[0]}{assignee.lastName?.[0]}
                            </div>
                          ))}
                          {task.assignees.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-neutral-400 dark:bg-neutral-600 text-white text-xs flex items-center justify-center ring-2 ring-surface-light dark:ring-surface-dark">
                              +{task.assignees.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Empty State */}
              {columnTasks.length === 0 && !isOver && (
                <div className="text-center py-8 text-sm text-neutral-400 dark:text-neutral-600">
                  Drop tasks here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;

