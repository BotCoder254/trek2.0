const mongoose = require('mongoose');

const labelSchema = new mongoose.Schema({
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
  color: {
    type: String,
    required: true,
    default: '#F97316'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for faster queries
labelSchema.index({ workspaceId: 1 });
labelSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Label', labelSchema);
