const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Membership = require('../models/Membership');
const config = require('../config/env.config');

// Verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update last active
      req.user.lastActive = Date.now();
      await req.user.save({ validateBeforeSave: false });

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token is invalid or expired'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

// Check workspace membership
exports.checkWorkspaceMembership = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: 'Workspace ID is required'
      });
    }

    const membership = await Membership.findOne({
      userId: req.user._id,
      workspaceId: workspaceId,
      isActive: true
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this workspace'
      });
    }

    req.membership = membership;
    req.workspaceId = workspaceId;

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking workspace membership'
    });
  }
};

// Check if user has required role
exports.requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.membership) {
      return res.status(403).json({
        success: false,
        message: 'Workspace membership required'
      });
    }

    if (!roles.includes(req.membership.role)) {
      return res.status(403).json({
        success: false,
        message: `This action requires one of the following roles: ${roles.join(', ')}`,
        requiredRoles: roles,
        currentRole: req.membership.role
      });
    }

    next();
  };
};

// Check if user has permission for specific action
exports.requirePermission = (action) => {
  return (req, res, next) => {
    if (!req.membership) {
      return res.status(403).json({
        success: false,
        message: 'Workspace membership required'
      });
    }

    const hasPermission = Membership.hasPermission(req.membership.role, action);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `You don't have permission to ${action}`,
        requiredPermission: action,
        currentRole: req.membership.role
      });
    }

    next();
  };
};

