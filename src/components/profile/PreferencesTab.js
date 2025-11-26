import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../../services/userService';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

const PreferencesTab = ({ user }) => {
  const { isDark, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  
  const [preferences, setPreferences] = useState({
    theme: user?.preferences?.theme || 'system'
  });

  useEffect(() => {
    if (user?.preferences) {
      setPreferences({
        theme: user.preferences.theme || 'system'
      });
    }
  }, [user]);

  const updatePreferencesMutation = useMutation({
    mutationFn: userService.updatePreferences,
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
      toast.success('Preferences updated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update preferences');
    }
  });

  const handleThemeChange = (theme) => {
    setPreferences({ ...preferences, theme });
    updatePreferencesMutation.mutate({ theme });
    
    if (theme === 'light') {
      if (isDark) toggleTheme();
    } else if (theme === 'dark') {
      if (!isDark) toggleTheme();
    } else {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemPrefersDark !== isDark) toggleTheme();
    }
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
          Appearance
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          Customize how TREK looks to you
        </p>
        
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = preferences.theme === option.value;
            
            return (
              <motion.button
                key={option.value}
                onClick={() => handleThemeChange(option.value)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-primary-light dark:border-primary-dark bg-primary-light/5 dark:bg-primary-dark/5'
                    : 'border-border-light dark:border-border-dark hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Icon className={`w-6 h-6 ${
                    isSelected
                      ? 'text-primary-light dark:text-primary-dark'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`} />
                  <span className={`text-sm font-medium ${
                    isSelected
                      ? 'text-primary-light dark:text-primary-dark'
                      : 'text-neutral-700 dark:text-neutral-300'
                  }`}>
                    {option.label}
                  </span>
                </div>
                
                {isSelected && (
                  <motion.div
                    layoutId="selectedTheme"
                    className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary-light dark:bg-primary-dark"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PreferencesTab;
