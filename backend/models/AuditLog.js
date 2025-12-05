const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'workspace.created',
      'workspace.updated',
      'workspace.deleted',
      'workspace.settings_changed',
      'member.invited',
      'member.joined',
      'member.removed',
      'member.left',
      'member.role_changed',
      'ownership.transferred',
      'project.created',
      'project.updated',
      'project.deleted',
      'project.archived',
      'task.created',
      'task.updated',
      'task.deleted',
      'task.status_changed',
      'security.password_changed',
      'security.email_changed',
      'security.2fa_enabled',
      'security.2fa_disabled'
    ]
  },
  targetType: {
    type: String,
    enum: ['workspace', 'member', 'project', 'task', 'user', 'settings'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  targetName: {
    type: String,
    required: false
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    location: String
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
    index: true
  }
}, {
  timestamps: false,
  strict: true
});

// Compound indexes for efficient queries
auditLogSchema.index({ workspaceId: 1, createdAt: -1 });
auditLogSchema.index({ workspaceId: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ workspaceId: 1, actorId: 1, createdAt: -1 });
auditLogSchema.index({ workspaceId: 1, targetType: 1, createdAt: -1 });

// Prevent updates and deletes (immutable)
auditLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('Audit logs are immutable and cannot be updated');
});

auditLogSchema.pre('findOneAndDelete', function() {
  throw new Error('Audit logs are immutable and cannot be deleted');
});

auditLogSchema.pre('updateOne', function() {
  throw new Error('Audit logs are immutable and cannot be updated');
});

auditLogSchema.pre('deleteOne', function() {
  throw new Error('Audit logs are immutable and cannot be deleted');
});

// Static method to create audit log
auditLogSchema.statics.log = async function(data) {
  try {
    return await this.create(data);
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break main operations
  }
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
