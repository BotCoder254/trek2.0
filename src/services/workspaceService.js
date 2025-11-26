import api from './api';

export const workspaceService = {
  // Get all workspaces
  getWorkspaces: async () => {
    const response = await api.get('/workspaces');
    return response.data;
  },

  // Get workspace by ID
  getWorkspace: async (workspaceId) => {
    const response = await api.get(`/workspaces/${workspaceId}`);
    return response.data;
  },

  // Create workspace
  createWorkspace: async (workspaceData) => {
    const response = await api.post('/workspaces', workspaceData);
    return response.data;
  },

  // Update workspace
  updateWorkspace: async (workspaceId, workspaceData) => {
    const response = await api.put(`/workspaces/${workspaceId}`, workspaceData);
    return response.data;
  },

  // Delete workspace
  deleteWorkspace: async (workspaceId) => {
    const response = await api.delete(`/workspaces/${workspaceId}`);
    return response.data;
  },

  // Get workspace members
  getMembers: async (workspaceId) => {
    const response = await api.get(`/workspaces/${workspaceId}/members`);
    return response.data;
  },

  // Update member role
  updateMemberRole: async (workspaceId, membershipId, role) => {
    const response = await api.put(`/workspaces/${workspaceId}/members/${membershipId}/role`, { role });
    return response.data;
  },

  // Remove member
  removeMember: async (workspaceId, membershipId) => {
    const response = await api.delete(`/workspaces/${workspaceId}/members/${membershipId}`);
    return response.data;
  },

  // Leave workspace
  leaveWorkspace: async (workspaceId) => {
    const response = await api.post(`/workspaces/${workspaceId}/leave`);
    return response.data;
  }
};

