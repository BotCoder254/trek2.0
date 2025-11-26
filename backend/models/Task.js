const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  epicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Epic',
    default: null
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'in-review', 'done'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dueDate: {
    type: Date,
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  labels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Label'
  }],
  attachments: [{
    name: String,
    url: String,
    key: String, // S3 key or Cloudinary public_id
    type: String,
    size: Number,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  checklist: [{
    text: {
      type: String,
      required: true
    },
    done: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  estimate: {
    type: Number, // hours
    default: null
  },
  timeSpent: {
    type: Number, // hours
    default: 0
  },
  position: {
    type: Number,
    default: 0
  },
  order: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  blockedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  isBlocked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ epicId: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);

