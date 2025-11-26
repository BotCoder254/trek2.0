const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  type: {
    type: String,
    enum: [
      'task.created',
      'task.updated',
      'task.deleted',
      'task.status_changed',
      'task.assigned',
      'task.unassigned',
      'task.moved',
      'comment.added',
      'attachment.added',
      'project.created',
      'member.added',
      'dependency_added',
      'dependency_removed',
      'dependency_unblocked'
    ],
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changes: {
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
activitySchema.index({ workspaceId: 1, createdAt: -1 });
activitySchema.index({ taskId: 1, createdAt: -1 });
activitySchema.index({ projectId: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);

