const AuditLog = require('../models/AuditLog');

const getSeverity = (action) => {
  const criticalActions = ['workspace.deleted', 'ownership.transferred', 'member.removed'];
  const highActions = ['workspace.settings_changed', 'member.role_changed', 'security.2fa_disabled'];
  const mediumActions = ['member.invited', 'member.joined', 'project.deleted'];
  
  if (criticalActions.includes(action)) return 'critical';
  if (highActions.includes(action)) return 'high';
  if (mediumActions.includes(action)) return 'medium';
  return 'low';
};

const logAudit = async ({
  workspaceId,
  actorId,
  action,
  targetType,
  targetId = null,
  targetName = null,
  changes = {},
  req = null
}) => {
  try {
    const metadata = {};
    
    if (req) {
      metadata.ipAddress = req.ip || req.connection.remoteAddress;
      metadata.userAgent = req.get('user-agent');
    }

    await AuditLog.log({
      workspaceId,
      actorId,
      action,
      targetType,
      targetId,
      targetName,
      changes,
      metadata,
      severity: getSeverity(action)
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
};

module.exports = { logAudit };
