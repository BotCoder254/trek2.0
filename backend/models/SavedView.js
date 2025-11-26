const mongoose = require('mongoose');

const savedViewSchema = new mongoose.Schema({
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
  name: {
    type: String,
    required: true,
    trim: true
  },
  filterParams: {
    status: [String],
    priority: [String],
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    labels: [String],
    dueDateRange: {
      start: Date,
      end: Date
    },
    epicId: mongoose.Schema.Types.ObjectId,
    projectId: mongoose.Schema.Types.ObjectId
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isWorkspaceWide: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
savedViewSchema.index({ userId: 1, workspaceId: 1 });
savedViewSchema.index({ workspaceId: 1, isWorkspaceWide: 1 });

module.exports = mongoose.model('SavedView', savedViewSchema);

