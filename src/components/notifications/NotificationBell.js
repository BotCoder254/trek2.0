import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Check, CheckCheck, X, ExternalLink, CheckSquare, 
  MessageSquare, UserPlus, Clock, AlertCircle, FolderKanban, 
  Building2, Unlock
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Fetch unread count
  const { data: countData } = useQuery({
    queryKey: ['notifications', 'unread-count', currentWorkspace?.id],
    queryFn: async () => {
      const response = await api.get('/notifications/unread-count', {
        params: { workspaceId: currentWorkspace?.id }
      });
      return response.data;
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  // Fetch notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', currentWorkspace?.id],
    queryFn: async () => {
      const response = await api.get('/notifications', {
        params: { workspaceId: currentWorkspace?.id, limit: 10 }
      });
      return response.data;
    },
    enabled: !!currentWorkspace?.id && isOpen
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications', 'unread-count']);
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.patch('/notifications/mark-all-read', {
      workspaceId: currentWorkspace?.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications', 'unread-count']);
    }
  });

  const unreadCount = countData?.data?.count || 0;
  const notifications = notificationsData?.data?.notifications || [];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification._id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
    setIsOpen(false);
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

  return (
    <div className="relative" ref={menuRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        <Bell className="w-6 h-6 text-neutral-700 dark:text-neutral-300" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-secondary-light text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-surface-light dark:bg-neutral-800 rounded-lg shadow-2xl border border-border-light dark:border-border-dark overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark">
              <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">
                Notifications
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsReadMutation.mutate()}
                    className="text-xs text-primary-light dark:text-primary-dark hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Mark all read
                  </button>
                )}
                <Link
                  to="/notifications"
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-primary-light dark:text-primary-dark hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-4 h-4" />
                  View all
                </Link>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 mx-auto mb-4 text-neutral-300 dark:text-neutral-600" />
                  <p className="text-neutral-500 dark:text-neutral-400">
                    No notifications yet
                  </p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const { Icon, color } = getNotificationIcon(notification.type);
                  return (
                    <motion.div
                      key={notification._id}
                      whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 border-b border-border-light dark:border-border-dark cursor-pointer transition-colors ${
                        !notification.isRead ? 'bg-primary-light/5 dark:bg-primary-dark/5' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`flex-shrink-0 ${color}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <div className="w-2 h-2 rounded-full bg-primary-light dark:bg-primary-dark flex-shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {notification.triggeredBy && (
                              <span className="text-xs text-neutral-500">
                                {notification.triggeredBy.firstName} {notification.triggeredBy.lastName}
                              </span>
                            )}
                            <span className="text-xs text-neutral-400">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsReadMutation.mutate(notification._id);
                            }}
                            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded flex-shrink-0"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;

