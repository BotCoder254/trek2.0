import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bell, Check, CheckCheck, Trash2, Filter, CheckSquare, 
  MessageSquare, UserPlus, Clock, AlertCircle, FolderKanban, 
  Building2, Unlock
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatDistanceToNow, format } from 'date-fns';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const [filter, setFilter] = useState('all'); // all, unread, read

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', 'all', currentWorkspace?.id, filter],
    queryFn: async () => {
      const params = { workspaceId: currentWorkspace?.id, limit: 100 };
      if (filter === 'unread') params.isRead = false;
      if (filter === 'read') params.isRead = true;
      
      const response = await api.get('/notifications', { params });
      return response.data;
    },
    enabled: !!currentWorkspace?.id
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.patch('/notifications/mark-all-read', {
      workspaceId: currentWorkspace?.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  const notifications = notificationsData?.data?.notifications || [];
  const unreadCount = notificationsData?.data?.unreadCount || 0;

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification._id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getNotificationIcon = (type) => {
    const iconMap = {
      task_assigned: { Icon: CheckSquare, color: 'text-info-light' },
      task_completed: { Icon: Check, color: 'text-success-light' },
      task_commented: { Icon: MessageSquare, color: 'text-primary-light' },
      task_mentioned: { Icon: UserPlus, color: 'text-warning-light' },
      task_due_soon: { Icon: Clock, color: 'text-warning-light' },
      task_overdue: { Icon: AlertCircle, color: 'text-secondary-light' },
      project_invited: { Icon: FolderKanban, color: 'text-info-light' },
      workspace_invited: { Icon: Building2, color: 'text-primary-light' },
      dependency_unblocked: { Icon: Unlock, color: 'text-success-light' }
    };
    return iconMap[type] || { Icon: Bell, color: 'text-neutral-400' };
  };

  const groupNotificationsByDate = (notifications) => {
    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      earlier: []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    notifications.forEach(notification => {
      const notifDate = new Date(notification.createdAt);
      const notifDay = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate());

      if (notifDay.getTime() === today.getTime()) {
        groups.today.push(notification);
      } else if (notifDay.getTime() === yesterday.getTime()) {
        groups.yesterday.push(notification);
      } else if (notifDate >= weekAgo) {
        groups.thisWeek.push(notification);
      } else {
        groups.earlier.push(notification);
      }
    });

    return groups;
  };

  const groupedNotifications = groupNotificationsByDate(notifications);

  const renderNotificationGroup = (title, notifications) => {
    if (notifications.length === 0) return null;

    return (
      <div key={title} className="mb-8">
        <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase mb-4">
          {title}
        </h3>
        <div className="space-y-2">
          {notifications.map((notification) => {
            const { Icon, color } = getNotificationIcon(notification.type);
            return (
              <motion.div
                key={notification._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => handleNotificationClick(notification)}
                className={`card p-4 cursor-pointer transition-all ${
                  !notification.isRead ? 'border-l-4 border-primary-light dark:border-primary-dark bg-primary-light/5 dark:bg-primary-dark/5' : ''
                }`}
              >
                <div className="flex gap-4">
                  <div className={`flex-shrink-0 p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 ${color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {notification.title}
                    </h4>
                    {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-primary-light dark:bg-primary-dark flex-shrink-0 mt-2" />
                    )}
                  </div>
                  <p className="text-neutral-600 dark:text-neutral-400 mb-3">
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    {notification.triggeredBy && (
                      <span className="text-neutral-500">
                        By {notification.triggeredBy.firstName} {notification.triggeredBy.lastName}
                      </span>
                    )}
                    <span className="text-neutral-400">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                    <span className="text-neutral-400">
                      {format(new Date(notification.createdAt), 'MMM d, yyyy • h:mm a')}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {!notification.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsReadMutation.mutate(notification._id);
                      }}
                      className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotificationMutation.mutate(notification._id);
                    }}
                    className="p-2 hover:bg-secondary-light/10 text-secondary-light rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Notifications
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Stay updated with your team's activity
            </p>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                className="btn btn-secondary flex items-center gap-2"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read ({unreadCount})
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-5 h-5 text-neutral-500" />
          <div className="flex gap-2">
            {['all', 'unread', 'read'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-primary-light dark:bg-primary-dark text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-light border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="card p-12 text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-neutral-300 dark:text-neutral-600" />
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              No notifications
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              {filter === 'unread' ? 'All caught up!' : 'You don\'t have any notifications yet'}
            </p>
          </div>
        ) : (
          <div>
            {renderNotificationGroup('Today', groupedNotifications.today)}
            {renderNotificationGroup('Yesterday', groupedNotifications.yesterday)}
            {renderNotificationGroup('This Week', groupedNotifications.thisWeek)}
            {renderNotificationGroup('Earlier', groupedNotifications.earlier)}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;

