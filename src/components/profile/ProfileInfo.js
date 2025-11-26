import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Edit2, Save, X, MapPin, Calendar } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../../services/userService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ProfileInfo = ({ user, onAvatarClick }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
    timezone: user?.timezone || 'UTC'
  });

  const queryClient = useQueryClient();

  const updateProfileMutation = useMutation({
    mutationFn: userService.updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['userProfile'], data);
      queryClient.invalidateQueries(['currentUser']);
      toast.success('Profile updated successfully');
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      bio: user?.bio || '',
      timezone: user?.timezone || 'UTC'
    });
    setIsEditing(false);
  };

  const getInitials = () => {
    return `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      {/* Avatar Section */}
      <div className="flex flex-col items-center p-6 border-b border-border-light dark:border-border-dark">
        <div className="relative group">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.fullName}
              className="w-32 h-32 rounded-full object-cover"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-primary-light dark:bg-primary-dark flex items-center justify-center text-white text-3xl font-bold">
              {getInitials()}
            </div>
          )}
          <button
            onClick={onAvatarClick}
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Camera className="w-8 h-8 text-white" />
          </button>
        </div>

        {!isEditing && (
          <div className="text-center mt-4">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              {user?.fullName}
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {user?.email}
            </p>
            {user?.pendingEmail && (
              <div className="mt-2 px-3 py-1 bg-warning-light/10 dark:bg-warning-dark/10 text-warning-light dark:text-warning-dark rounded-full text-xs">
                Email change pending: {user.pendingEmail}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          <span className="text-sm font-medium">Edit Profile</span>
        </button>
      </div>

      {/* Profile Form */}
      {isEditing ? (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              First Name
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="input resize-none"
              rows={3}
              maxLength={500}
              placeholder="Tell us about yourself..."
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {formData.bio.length}/500 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="input"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
              <option value="Asia/Shanghai">Shanghai</option>
              <option value="Australia/Sydney">Sydney</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="flex-1 btn btn-primary"
            >
              <Save className="w-4 h-4" />
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 btn btn-secondary"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="p-6 space-y-4">
          {user?.bio && (
            <div>
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Bio
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {user.bio}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <MapPin className="w-4 h-4" />
            <span>{user?.timezone || 'UTC'}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <Calendar className="w-4 h-4" />
            <span>Joined {user?.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A'}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ProfileInfo;
