import React from 'react';
import { motion } from 'framer-motion';
import { Activity, FileText, CheckCircle, MessageSquare, UserPlus, Settings, Mail } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { userService } from '../../services/userService';
import { formatDistanceToNow } from 'date-fns';

const ActivityTab = () => {
  const { data: activityData, isLoading } = useQuery({
    queryKey: ['userActivity'],
    queryFn: () => userService.getUserActivity({ limit: 50 })
  });

  const activities = activityData?.data?.activities || [];

  const getActivityIcon = (activity) => {
    const action = activity?.action || activity?.type;
    const iconMap = {
      task_created: CheckCircle,
      'task.created': CheckCircle,
      task_updated: CheckCircle,
      'task.updated': CheckCircle,
      task_completed: CheckCircle,
      'task.status_changed': CheckCircle,
      comment_added: MessageSquare,
      'comment.added': MessageSquare,
      project_created: FileText,
      'project.created': FileText,
      project_updated: FileText,
      profile_updated: Settings,
      email_changed: Mail,
      workspace_joined: UserPlus,
      'attachment.added': FileText,
      'dependency_added': CheckCircle,
      'dependency_removed': CheckCircle
    };
    return iconMap[action] || Activity;
  };

  const getActivityColor = (activity) => {
    const action = activity?.action || activity?.type;
    const colorMap = {
      task_created: 'text-success-light dark:text-success-dark',
      'task.created': 'text-success-light dark:text-success-dark',
      task_updated: 'text-info-light dark:text-info-dark',
      'task.updated': 'text-info-light dark:text-info-dark',
      task_completed: 'text-success-light dark:text-success-dark',
      'task.status_changed': 'text-info-light dark:text-info-dark',
      comment_added: 'text-purple-500',
      'comment.added': 'text-purple-500',
      project_created: 'text-primary-light dark:text-primary-dark',
      'project.created': 'text-primary-light dark:text-primary-dark',
      project_updated: 'text-info-light dark:text-info-dark',
      profile_updated: 'text-warning-light dark:text-warning-dark',
      email_changed: 'text-secondary-light dark:text-secondary-dark',
      workspace_joined: 'text-success-light dark:text-success-dark',
      'attachment.added': 'text-info-light dark:text-info-dark'
    };
    return colorMap[action] || 'text-neutral-500';
  };

  const getActivityMessage = (activity) => {
    if (!activity) return 'Unknown activity';
    
    const action = activity.action || activity.type;
    if (!action) return 'Unknown activity';
    
    const messages = {
      task_created: 'Created a task',
      'task.created': 'Created a task',
      task_updated: 'Updated a task',
      'task.updated': 'Updated a task',
      task_completed: 'Completed a task',
      'task.status_changed': 'Changed task status',
      comment_added: 'Added a comment',
      'comment.added': 'Added a comment',
      project_created: 'Created a project',
      'project.created': 'Created a project',
      project_updated: 'Updated a project',
      profile_updated: 'Updated profile',
      email_changed: 'Changed email address',
      workspace_joined: 'Joined a workspace',
      'attachment.added': 'Added an attachment',
      'dependency_added': 'Added task dependency',
      'dependency_removed': 'Removed task dependency'
    };
    return messages[action] || action.replace(/[._]/g, ' ');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-light dark:border-primary-dark" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="w-12 h-12 text-neutral-400 dark:text-neutral-600 mx-auto mb-3" />
        <p className="text-neutral-600 dark:text-neutral-400">
          No activity yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Recent Activity
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Your recent actions and updates
        </p>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {activities.map((activity, index) => {
          const Icon = getActivityIcon(activity);
          const colorClass = getActivityColor(activity);

          return (
            <motion.div
              key={activity._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className="flex items-start gap-3 p-4 rounded-lg border border-border-light dark:border-border-dark hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
            >
              <div className={`p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 ${colorClass}`}>
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {getActivityMessage(activity)}
                </p>
                
                {activity.workspaceId && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                    in {activity.workspaceId.name}
                  </p>
                )}
                
                {activity.projectId && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                    Project: {activity.projectId.name}
                  </p>
                )}

                <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-2">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityTab;
