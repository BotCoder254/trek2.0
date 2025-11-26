// Role hierarchy for permission checks
export const ROLES = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  MEMBER: 'Member',
  VIEWER: 'Viewer'
};

// Permission definitions
export const PERMISSIONS = {
  WORKSPACE_DELETE: 'workspace.delete',
  WORKSPACE_UPDATE: 'workspace.update',
  WORKSPACE_TRANSFER: 'workspace.transfer',
  MEMBERS_INVITE: 'members.invite',
  MEMBERS_REMOVE: 'members.remove',
  MEMBERS_CHANGE_ROLE: 'members.changeRole',
  PROJECTS_CREATE: 'projects.create',
  PROJECTS_DELETE: 'projects.delete',
  PROJECTS_UPDATE: 'projects.update',
  TASKS_CREATE: 'tasks.create',
  TASKS_UPDATE: 'tasks.update',
  TASKS_DELETE: 'tasks.delete'
};

// Role permission map
const rolePermissions = {
  [ROLES.OWNER]: [
    PERMISSIONS.WORKSPACE_DELETE,
    PERMISSIONS.WORKSPACE_UPDATE,
    PERMISSIONS.WORKSPACE_TRANSFER,
    PERMISSIONS.MEMBERS_INVITE,
    PERMISSIONS.MEMBERS_REMOVE,
    PERMISSIONS.MEMBERS_CHANGE_ROLE,
    PERMISSIONS.PROJECTS_CREATE,
    PERMISSIONS.PROJECTS_DELETE,
    PERMISSIONS.PROJECTS_UPDATE,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_UPDATE,
    PERMISSIONS.TASKS_DELETE
  ],
  [ROLES.MANAGER]: [
    PERMISSIONS.WORKSPACE_UPDATE,
    PERMISSIONS.MEMBERS_INVITE,
    PERMISSIONS.MEMBERS_CHANGE_ROLE,
    PERMISSIONS.PROJECTS_CREATE,
    PERMISSIONS.PROJECTS_DELETE,
    PERMISSIONS.PROJECTS_UPDATE,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_UPDATE,
    PERMISSIONS.TASKS_DELETE
  ],
  [ROLES.MEMBER]: [
    PERMISSIONS.PROJECTS_CREATE,
    PERMISSIONS.PROJECTS_UPDATE,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_UPDATE,
    PERMISSIONS.TASKS_DELETE
  ],
  [ROLES.VIEWER]: []
};

// Check if role has permission
export const hasPermission = (role, permission) => {
  return rolePermissions[role]?.includes(permission) || false;
};

// Check if user can perform action
export const canPerformAction = (userRole, requiredPermission) => {
  return hasPermission(userRole, requiredPermission);
};

// Get role badge color
export const getRoleBadgeColor = (role) => {
  const colors = {
    [ROLES.OWNER]: 'bg-primary-light dark:bg-primary-dark text-white',
    [ROLES.MANAGER]: 'bg-info-light dark:bg-info-dark text-white',
    [ROLES.MEMBER]: 'bg-success-light dark:bg-success-dark text-white',
    [ROLES.VIEWER]: 'bg-neutral-400 dark:bg-neutral-600 text-white'
  };
  return colors[role] || 'bg-neutral-300 dark:bg-neutral-700 text-white';
};

// Get role display name
export const getRoleDisplayName = (role) => {
  return role || 'Unknown';
};

// Check if role can modify another role
export const canModifyRole = (userRole, targetRole) => {
  if (userRole === ROLES.OWNER) return true;
  if (userRole === ROLES.MANAGER && targetRole !== ROLES.OWNER) return true;
  return false;
};

