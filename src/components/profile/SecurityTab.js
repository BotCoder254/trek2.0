import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../../services/authService';
import { userService } from '../../services/userService';
import toast from 'react-hot-toast';

const SecurityTab = () => {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [emailData, setEmailData] = useState({
    newEmail: '',
    password: ''
  });
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: authService.changePassword,
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to change password');
    }
  });

  const changeEmailMutation = useMutation({
    mutationFn: ({ newEmail, password }) => userService.changeEmail(newEmail, password),
    onSuccess: () => {
      toast.success('Confirmation email sent. Please check your inbox.');
      setEmailData({ newEmail: '', password: '' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to initiate email change');
    }
  });

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      toast.error('Password must contain uppercase, lowercase, and number');
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    changeEmailMutation.mutate(emailData);
  };

  return (
    <div className="space-y-8">
      {/* Change Password */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary-light/10 dark:bg-primary-dark/10">
            <Lock className="w-5 h-5 text-primary-light dark:text-primary-dark" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Change Password
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Update your password to keep your account secure
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="input pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="input pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="input pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="bg-info-light/10 dark:bg-info-dark/10 border border-info-light/20 dark:border-info-dark/20 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-info-light dark:text-info-dark flex-shrink-0 mt-0.5" />
              <div className="text-sm text-neutral-700 dark:text-neutral-300">
                <p className="font-medium mb-1">Password requirements:</p>
                <ul className="list-disc list-inside space-y-1 text-neutral-600 dark:text-neutral-400">
                  <li>At least 8 characters long</li>
                  <li>Contains uppercase and lowercase letters</li>
                  <li>Contains at least one number</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={changePasswordMutation.isPending}
            className="btn btn-primary w-full"
          >
            {changePasswordMutation.isPending ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>
      </motion.div>

      <div className="border-t border-border-light dark:border-border-dark" />

      {/* Change Email */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary-light/10 dark:bg-primary-dark/10">
            <Mail className="w-5 h-5 text-primary-light dark:text-primary-dark" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Change Email
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Update your email address
            </p>
          </div>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              New Email Address
            </label>
            <input
              type="email"
              value={emailData.newEmail}
              onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
              className="input"
              placeholder="your.new.email@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showEmailPassword ? 'text' : 'password'}
                value={emailData.password}
                onChange={(e) => setEmailData({ ...emailData, password: e.target.value })}
                className="input pr-10"
                placeholder="Enter your current password"
                required
              />
              <button
                type="button"
                onClick={() => setShowEmailPassword(!showEmailPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                {showEmailPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="bg-warning-light/10 dark:bg-warning-dark/10 border border-warning-light/20 dark:border-warning-dark/20 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-warning-light dark:text-warning-dark flex-shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                We'll send a confirmation link to your new email address. Your email won't change until you confirm it.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={changeEmailMutation.isPending}
            className="btn btn-primary w-full"
          >
            {changeEmailMutation.isPending ? 'Sending Confirmation...' : 'Change Email'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default SecurityTab;
