import api from './api';

export const analyticsService = {
  // Dashboard
  getDashboard: async (workspaceId) => {
    const response = await api.get(`/analytics/dashboard/${workspaceId}`);
    return response.data;
  },

  // Cycle Time
  getCycleTime: async (workspaceId, params = {}) => {
    const response = await api.get(`/analytics/cycle-time/${workspaceId}`, { params });
    return response.data;
  },

  // Burndown
  getBurndown: async (workspaceId, params = {}) => {
    const response = await api.get(`/analytics/burndown/${workspaceId}`, { params });
    return response.data;
  },

  // Workload
  getWorkload: async (workspaceId, params = {}) => {
    const response = await api.get(`/analytics/workload/${workspaceId}`, { params });
    return response.data;
  },

  // Velocity
  getVelocity: async (workspaceId, params = {}) => {
    const response = await api.get(`/analytics/velocity/${workspaceId}`, { params });
    return response.data;
  },

  // SLA
  getSLA: async (workspaceId, params = {}) => {
    const response = await api.get(`/analytics/sla/${workspaceId}`, { params });
    return response.data;
  },

  // Tasks by status
  getTasksByStatus: async (workspaceId, params = {}) => {
    const response = await api.get(`/analytics/tasks-by-status/${workspaceId}`, { params });
    return response.data;
  },

  // Tasks by assignee
  getTasksByAssignee: async (workspaceId) => {
    const response = await api.get(`/analytics/tasks-by-assignee/${workspaceId}`);
    return response.data;
  },

  // Project progress
  getProjectProgress: async (workspaceId) => {
    const response = await api.get(`/analytics/project-progress/${workspaceId}`);
    return response.data;
  }
};
