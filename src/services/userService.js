import api from './api';

export const userService = {
  // Get current user profile
  getProfile: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },

  // Update profile
  updateProfile: async (profileData) => {
    const response = await api.patch('/users/me', profileData);
    return response.data;
  },

  // Get presigned URL for avatar upload
  getAvatarPresignedUrl: async (fileType, fileName) => {
    const response = await api.post('/users/me/avatar/presign', { fileType, fileName });
    return response.data;
  },

  // Update preferences
  updatePreferences: async (preferences) => {
    const response = await api.patch('/users/me/preferences', preferences);
    return response.data;
  },

  // Initiate email change
  changeEmail: async (newEmail, password) => {
    const response = await api.post('/users/me/email/change', { newEmail, password });
    return response.data;
  },

  // Confirm email change
  confirmEmailChange: async (token) => {
    const response = await api.post(`/users/confirm-email/${token}`);
    return response.data;
  },

  // Get user activity
  getUserActivity: async (params = {}) => {
    const response = await api.get('/users/me/activity', { params });
    return response.data;
  }
};
