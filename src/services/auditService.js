import api from './api';

export const auditService = {
  getAuditLogs: async (workspaceId, params = {}) => {
    const response = await api.get(`/audit/${workspaceId}`, {
      params
    });
    return response.data;
  },

  exportAuditLogs: async (workspaceId, params = {}) => {
    const response = await api.get(`/audit/${workspaceId}/export`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  getAuditStats: async (workspaceId) => {
    const response = await api.get(`/audit/${workspaceId}/stats`);
    return response.data;
  }
};
