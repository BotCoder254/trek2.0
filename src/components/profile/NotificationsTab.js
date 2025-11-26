import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Mail, MessageSquare, CheckCircle, AtSign } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../../services/userService';
import toast from 'react-hot-toast';

const NotificationsTab = ({ user }) => {
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    taskAssigned: true,
    taskCompleted: true,
    comments: true,
    mentions: true
  });

  useEffect(() => {
    if (user?.preferences?.notifications) {
      setNotifications(user.preferences.notifications);
    }
  }, [user]);

  const updateNotificationsMutation = useMutation({
    mutationFn: (notificationSettings) => 
      userService.updatePreferences({ notifications: notificationSettings }),
    onSuccess: (data) => {
      queryClient.setQueryData(['userProfile'], (old) => ({
        ...old,
        data: {
          ...old.data,
          user: {
            ...old.data.user,
            preferences: data.data.preferences
          }
        }
      }));
      toast.success('Notification preferences updated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update preferences');
    }
  });

  const handleToggle = (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    updateNotificationsMutation.mutate(updated);
  };

  const notificationSettings = [
    {
      id: 'email',
      label: 'Email Notifications',
      description: 'Receive notifications via email',
      icon: Mail,
      color: 'text-blue-500'
    },
    {
      id: 'push',
      label: 'Push Notifications',
      description: 'Receive browser push notifications',
      icon: Bell,
      color: 'text-purple-500'
    },
    {
      id: 'taskAssigned',
      label: 'Task Assignments',
      description: 'When you are assigned to a task',
      icon: CheckCircle,
      color: 'text-green-500'
    },
    {
      id: 'taskCompleted',
      label: 'Task Completions',
      description: 'When tasks you created are completed',
      icon: CheckCircle,
      color: 'text-success-light'
    },
    {
      id: 'comments',
      label: 'Comments',
      description: 'When someone comments on your tasks',
      icon: MessageSquare,
      color: 'text-info-light'
    },
    {
      id: 'mentions',
      label: 'Mentions',
      description: 'When someone mentions you',
      icon: AtSign,
      color: 'text-warning-light'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Notification Preferences
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Choose what notifications you want to receive
        </p>
      </div>

      <div className="space-y-3">
        {notificationSettings.map((setting, index) => {
          const Icon = setting.icon;
          const isEnabled = notifications[setting.id];

          return (
            <motion.div
              key={setting.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-4 rounded-lg border border-border-light dark:border-border-dark hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className={`p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 ${setting.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                    {setting.label}
                  </h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
                    {setting.description}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleToggle(setting.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:ring-offset-2 ${
                  isEnabled
                    ? 'bg-primary-light dark:bg-primary-dark'
                    : 'bg-neutral-300 dark:bg-neutral-700'
                }`}
              >
                <motion.span
                  layout
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-info-light/10 dark:bg-info-dark/10 border border-info-light/20 dark:border-info-dark/20 rounded-lg p-4">
        <div className="flex gap-3">
          <Bell className="w-5 h-5 text-info-light dark:text-info-dark flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">
              About Notifications
            </p>
            <p className="text-neutral-600 dark:text-neutral-400">
              You can customize which notifications you receive. Email notifications are sent to your registered email address, while push notifications appear in your browser.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsTab;
