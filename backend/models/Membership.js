const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  role: {
    type: String,
    enum: ['Owner', 'Manager', 'Member', 'Viewer'],
    required: true,
    default: 'Member'
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate memberships
membershipSchema.index({ userId: 1, workspaceId: 1 }, { unique: true });

// Index for quick lookups
membershipSchema.index({ workspaceId: 1, role: 1 });
membershipSchema.index({ userId: 1 });

// Static method to check permissions
membershipSchema.statics.hasPermission = function(role, action) {
  const permissions = {
    Owner: [
      'workspace.delete',
      'workspace.update',
      'workspace.transfer',
      'members.invite',
      'members.remove',
      'members.changeRole',
      'projects.create',
      'projects.delete',
      'projects.update',
      'tasks.create',
      'tasks.update',
      'tasks.delete'
    ],
    Manager: [
      'workspace.update',
      'members.invite',
      'members.changeRole',
      'projects.create',
      'projects.delete',
      'projects.update',
      'tasks.create',
      'tasks.update',
      'tasks.delete'
    ],
    Member: [
      'projects.create',
      'projects.update',
      'tasks.create',
      'tasks.update',
      'tasks.delete'
    ],
    Viewer: []
  };
  
  return permissions[role]?.includes(action) || false;
};

module.exports = mongoose.model('Membership', membershipSchema);

