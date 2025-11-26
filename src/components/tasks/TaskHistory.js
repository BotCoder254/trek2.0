import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, Filter, User, CheckSquare, MessageSquare, 
  Paperclip, Users, Flag, Calendar, Edit, Trash2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { formatDistanceToNow, format } from 'date-fns';

const TaskHistory = ({ taskId }) => {
  const [filter, setFilter] = useState('all'); // all, status, assignee, comment

  // Fetch task activity
  const { data: activityData } = useQuery({
    queryKey: ['task-activity', taskId],
    queryFn: async () => {
      const response = await api.get(`/tasks/${taskId}/activity`);
      return response.data;
    },
    enabled: !!taskId
  });

  const activities = activityData?.data?.activities || [];

  const getActivityIcon = (type) => {
    const iconMap = {
      created: { Icon: CheckSquare, color: 'text-success-light', bg: 'bg-success-light/10' },
      status_changed: { Icon: CheckSquare, color: 'text-info-light', bg: 'bg-info-light/10' },
      assignee_added: { Icon: Users, color: 'text-primary-light', bg: 'bg-primary-light/10' },
      assignee_removed: { Icon: Users, color: 'text-neutral-400', bg: 'bg-neutral-100 dark:bg-neutral-800' },
      priority_changed: { Icon: Flag, color: 'text-warning-light', bg: 'bg-warning-light/10' },
      due_date_changed: { Icon: Calendar, color: 'text-info-light', bg: 'bg-info-light/10' },
      description_updated: { Icon: Edit, color: 'text-neutral-600', bg: 'bg-neutral-100 dark:bg-neutral-800' },
      comment_added: { Icon: MessageSquare, color: 'text-primary-light', bg: 'bg-primary-light/10' },
      attachment_added: { Icon: Paperclip, color: 'text-neutral-600', bg: 'bg-neutral-100 dark:bg-neutral-800' },
      dependency_added: { Icon: CheckSquare, color: 'text-success-light', bg: 'bg-success-light/10' },
      dependency_removed: { Icon: CheckSquare, color: 'text-neutral-400', bg: 'bg-neutral-100 dark:bg-neutral-800' },
      deleted: { Icon: Trash2, color: 'text-secondary-light', bg: 'bg-secondary-light/10' }
    };
    return iconMap[type] || { Icon: History, color: 'text-neutral-400', bg: 'bg-neutral-100 dark:bg-neutral-800' };
  };

  const getActivityMessage = (activity) => {
    const { type, metadata, userId } = activity;
    const userName = `${userId?.firstName || 'Someone'} ${userId?.lastName || ''}`;

    switch (type) {
      case 'created':
        return `${userName} created this task`;
      case 'status_changed':
        return `${userName} changed status from "${metadata?.oldValue || 'N/A'}" to "${metadata?.newValue || 'N/A'}"`;
      case 'assignee_added':
        return `${userName} assigned ${metadata?.assigneeName || 'someone'} to this task`;
      case 'assignee_removed':
        return `${userName} removed ${metadata?.assigneeName || 'someone'} from this task`;
      case 'priority_changed':
        return `${userName} changed priority from "${metadata?.oldValue || 'N/A'}" to "${metadata?.newValue || 'N/A'}"`;
      case 'due_date_changed':
        return `${userName} ${metadata?.newValue ? 'set' : 'removed'} the due date`;
      case 'description_updated':
        return `${userName} updated the description`;
      case 'comment_added':
        return `${userName} added a comment`;
      case 'attachment_added':
        return `${userName} added an attachment "${metadata?.fileName || ''}"`;
      case 'dependency_added':
        return `${userName} added a dependency`;
      case 'dependency_removed':
        return `${userName} removed a dependency`;
      default:
        return `${userName} made a change`;
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    if (filter === 'status') return activity.type === 'status_changed';
    if (filter === 'assignee') return activity.type.includes('assignee');
    if (filter === 'comment') return activity.type === 'comment_added';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header with Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Activity History
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-neutral-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border-none bg-transparent focus:outline-none text-neutral-700 dark:text-neutral-300 cursor-pointer"
          >
            <option value="all">All Activity</option>
            <option value="status">Status Changes</option>
            <option value="assignee">Assignee Changes</option>
            <option value="comment">Comments</option>
          </select>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {filteredActivities.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-neutral-500"
            >
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No activity yet</p>
            </motion.div>
          ) : (
            filteredActivities.map((activity, index) => {
              const { Icon, color, bg } = getActivityIcon(activity.type);
              
              return (
                <motion.div
                  key={activity._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex gap-3 relative"
                >
                  {/* Timeline Line */}
                  {index < filteredActivities.length - 1 && (
                    <div className="absolute left-5 top-12 bottom-0 w-px bg-neutral-200 dark:bg-neutral-700" />
                  )}

                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full ${bg} flex items-center justify-center z-10`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm text-neutral-900 dark:text-neutral-100 font-medium">
                          {getActivityMessage(activity)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {activity.userId?.avatar ? (
                            <img
                              src={activity.userId.avatar}
                              alt={activity.userId.firstName}
                              className="w-5 h-5 rounded-full"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-primary-light dark:bg-primary-dark text-white text-xs flex items-center justify-center">
                              {activity.userId?.firstName?.[0]}{activity.userId?.lastName?.[0]}
                            </div>
                          )}
                          <span className="text-xs text-neutral-500">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {format(new Date(activity.createdAt), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Details */}
                    {activity.metadata?.details && (
                      <div className="mt-2 p-2 rounded bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
                        {activity.metadata.details}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TaskHistory;

