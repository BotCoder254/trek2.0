import api from './api';

export const projectService = {
  // Get workspace projects
  getWorkspaceProjects: async (workspaceId, status = null) => {
    const params = status ? { status } : {};
    const response = await api.get(`/projects/workspace/${workspaceId}`, { params });
    return response.data;
  },

  // Get project by ID
  getProject: async (projectId) => {
    const response = await api.get(`/projects/${projectId}`);
    return response.data;
  },

  // Create project
  createProject: async (projectData) => {
    const response = await api.post('/projects', projectData);
    return response.data;
  },

  // Update project
  updateProject: async (projectId, projectData) => {
    const response = await api.put(`/projects/${projectId}`, projectData);
    return response.data;
  },

  // Delete project
  deleteProject: async (projectId) => {
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
  },

  // Add project member
  addProjectMember: async (projectId, userId, role = 'member') => {
    const response = await api.post(`/projects/${projectId}/members`, { userId, role });
    return response.data;
  },

  // Get project epics
  getProjectEpics: async (projectId) => {
    const response = await api.get(`/epics/project/${projectId}`);
    return response.data;
  },

  // Create epic
  createEpic: async (epicData) => {
    const response = await api.post('/epics', epicData);
    return response.data;
  },

  // Update epic
  updateEpic: async (epicId, epicData) => {
    const response = await api.put(`/epics/${epicId}`, epicData);
    return response.data;
  },

  // Delete epic
  deleteEpic: async (epicId) => {
    const response = await api.delete(`/epics/${epicId}`);
    return response.data;
  },

  // Get project tasks
  getProjectTasks: async (projectId, filters = {}) => {
    const response = await api.get(`/tasks/project/${projectId}`, { params: filters });
    return response.data;
  },

  // Get task by ID
  getTask: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
  },

  // Create task
  createTask: async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },

  // Update task
  updateTask: async (taskId, taskData) => {
    const response = await api.put(`/tasks/${taskId}`, taskData);
    return response.data;
  },

  // Update task status
  updateTaskStatus: async (taskId, status, order = null) => {
    const response = await api.patch(`/tasks/${taskId}/status`, { status, order });
    return response.data;
  },

  // Delete task
  deleteTask: async (taskId) => {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  }
};

