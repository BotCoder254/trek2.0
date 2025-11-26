import api from './api';

export const inviteService = {
  // Create invite
  createInvite: async (inviteData) => {
    const response = await api.post('/invites', inviteData);
    return response.data;
  },

  // Get invite by token
  getInvite: async (token) => {
    const response = await api.get(`/invites/${token}`);
    return response.data;
  },

  // Accept invite
  acceptInvite: async (token) => {
    const response = await api.post(`/invites/${token}/accept`);
    return response.data;
  },

  // Get workspace invites
  getWorkspaceInvites: async (workspaceId) => {
    const response = await api.get(`/invites/workspace/${workspaceId}`);
    return response.data;
  },

  // Cancel invite
  cancelInvite: async (inviteId) => {
    const response = await api.delete(`/invites/${inviteId}`);
    return response.data;
  }
};

