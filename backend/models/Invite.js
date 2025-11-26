const mongoose = require('mongoose');
const crypto = require('crypto');

const inviteSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['Manager', 'Member', 'Viewer'],
    required: true,
    default: 'Member'
  },
  token: {
    type: String,
    unique: true,
    sparse: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired', 'cancelled'],
    default: 'pending'
  },
  singleUse: {
    type: Boolean,
    default: true
  },
  customMessage: {
    type: String,
    default: ''
  },
  expiresAt: {
    type: Date,
    required: true
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  usedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate unique token before validation
inviteSchema.pre('validate', function(next) {
  if (!this.token) {
    this.token = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// Check if invite is valid
inviteSchema.methods.isValid = function() {
  if (this.status !== 'pending') return false;
  if (this.expiresAt <= new Date()) return false;
  if (this.singleUse && this.usedAt) return false;
  return true;
};

// Index for token lookup
inviteSchema.index({ token: 1 });
inviteSchema.index({ workspaceId: 1, email: 1 });
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Invite', inviteSchema);

