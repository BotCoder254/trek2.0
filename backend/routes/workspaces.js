const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Workspace = require('../models/Workspace');
const Membership = require('../models/Membership');
const Invite = require('../models/Invite');
const User = require('../models/User');
const { protect, checkWorkspaceMembership, requireRole, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

// @route   POST /api/workspaces
// @desc    Create new workspace
// @access  Private
router.post('/', protect, [
  body('name').trim().notEmpty().withMessage('Workspace name is required'),
  body('description').optional().trim(),
  validate
], async (req, res, next) => {
  try {
    const { name, description, color } = req.body;

    // Create workspace
    const workspace = await Workspace.create({
      name,
      description,
      color: color || '#F97316',
      createdBy: req.user._id
    });

    // Create owner membership
    await Membership.create({
      userId: req.user._id,
      workspaceId: workspace._id,
      role: 'Owner'
    });

    res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      data: {
        workspace: {
          id: workspace._id,
          name: workspace.name,
          slug: workspace.slug,
          description: workspace.description,
          logo: workspace.logo,
          color: workspace.color,
          role: 'Owner',
          createdAt: workspace.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/workspaces
// @desc    Get all user's workspaces
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    const memberships = await Membership.find({
      userId: req.user._id,
      isActive: true
    })
    .populate('workspaceId')
    .sort('-lastActive');

    const workspaces = memberships.map(m => ({
      id: m.workspaceId._id,
      name: m.workspaceId.name,
      slug: m.workspaceId.slug,
      description: m.workspaceId.description,
      logo: m.workspaceId.logo,
      color: m.workspaceId.color,
      role: m.role,
      joinedAt: m.joinedAt,
      lastActive: m.lastActive,
      memberCount: 0 // Will be populated in a separate query if needed
    }));

    res.json({
      success: true,
      data: { workspaces }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/workspaces/:workspaceId
// @desc    Get workspace details
// @access  Private (Member)
router.get('/:workspaceId', protect, checkWorkspaceMembership, async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId)
      .populate('createdBy', 'firstName lastName email avatar');

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found'
      });
    }

    // Get member count
    const memberCount = await Membership.countDocuments({
      workspaceId: workspace._id,
      isActive: true
    });

    res.json({
      success: true,
      data: {
        workspace: {
          id: workspace._id,
          name: workspace.name,
          slug: workspace.slug,
          description: workspace.description,
          logo: workspace.logo,
          color: workspace.color,
          settings: workspace.settings,
          role: req.membership.role,
          memberCount,
          createdBy: workspace.createdBy,
          createdAt: workspace.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/workspaces/:workspaceId
// @desc    Update workspace
// @access  Private (Owner/Manager)
router.put('/:workspaceId', protect, checkWorkspaceMembership, requireRole('Owner', 'Manager'), [
  body('name').optional().trim().notEmpty().withMessage('Workspace name cannot be empty'),
  body('description').optional().trim(),
  validate
], async (req, res, next) => {
  try {
    const { name, description, color, settings } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (color) updateData.color = color;
    
    // Only Owner can update settings
    if (settings && req.membership.role === 'Owner') {
      updateData.settings = { ...settings };
    }

    const workspace = await Workspace.findByIdAndUpdate(
      req.params.workspaceId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found'
      });
    }

    res.json({
      success: true,
      message: 'Workspace updated successfully',
      data: { workspace }
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/workspaces/:workspaceId
// @desc    Delete workspace
// @access  Private (Owner only)
router.delete('/:workspaceId', protect, checkWorkspaceMembership, requireRole('Owner'), async (req, res, next) => {
  try {
    const workspace = await Workspace.findByIdAndDelete(req.params.workspaceId);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found'
      });
    }

    // Delete all memberships
    await Membership.deleteMany({ workspaceId: req.params.workspaceId });

    // Cancel all pending invites
    await Invite.updateMany(
      { workspaceId: req.params.workspaceId, status: 'pending' },
      { status: 'cancelled' }
    );

    res.json({
      success: true,
      message: 'Workspace deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/workspaces/:workspaceId/members
// @desc    Get workspace members
// @access  Private (Member)
router.get('/:workspaceId/members', protect, checkWorkspaceMembership, async (req, res, next) => {
  try {
    const memberships = await Membership.find({
      workspaceId: req.params.workspaceId,
      isActive: true
    })
    .populate('userId', 'firstName lastName email avatar lastActive')
    .populate('invitedBy', 'firstName lastName')
    .sort('-role joinedAt');

    const members = memberships.map(m => ({
      id: m._id,
      user: {
        id: m.userId._id,
        firstName: m.userId.firstName,
        lastName: m.userId.lastName,
        fullName: `${m.userId.firstName} ${m.userId.lastName}`,
        email: m.userId.email,
        avatar: m.userId.avatar,
        lastActive: m.userId.lastActive
      },
      role: m.role,
      joinedAt: m.joinedAt,
      lastActive: m.lastActive,
      invitedBy: m.invitedBy ? {
        id: m.invitedBy._id,
        fullName: `${m.invitedBy.firstName} ${m.invitedBy.lastName}`
      } : null
    }));

    res.json({
      success: true,
      data: { members }
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/workspaces/:workspaceId/members/:membershipId/role
// @desc    Update member role
// @access  Private (Owner/Manager)
router.put('/:workspaceId/members/:membershipId/role', 
  protect, 
  checkWorkspaceMembership, 
  requireRole('Owner', 'Manager'),
  [
    body('role').isIn(['Owner', 'Manager', 'Member', 'Viewer']).withMessage('Invalid role'),
    validate
  ],
  async (req, res, next) => {
    try {
      const { role } = req.body;
      const membership = await Membership.findOne({
        _id: req.params.membershipId,
        workspaceId: req.params.workspaceId
      });

      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Member not found'
        });
      }

      // Managers cannot promote to Owner or change Owner role
      if (req.membership.role === 'Manager') {
        if (role === 'Owner' || membership.role === 'Owner') {
          return res.status(403).json({
            success: false,
            message: 'Managers cannot modify Owner roles'
          });
        }
      }

      // Prevent removing last owner
      if (membership.role === 'Owner' && role !== 'Owner') {
        const ownerCount = await Membership.countDocuments({
          workspaceId: req.params.workspaceId,
          role: 'Owner',
          isActive: true
        });

        if (ownerCount <= 1) {
          return res.status(400).json({
            success: false,
            message: 'Cannot change role of the last owner. Transfer ownership first.'
          });
        }
      }

      membership.role = role;
      await membership.save();

      res.json({
        success: true,
        message: 'Member role updated successfully',
        data: { membership }
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   DELETE /api/workspaces/:workspaceId/members/:membershipId
// @desc    Remove member from workspace
// @access  Private (Owner/Manager)
router.delete('/:workspaceId/members/:membershipId', 
  protect, 
  checkWorkspaceMembership, 
  requireRole('Owner', 'Manager'),
  async (req, res, next) => {
    try {
      const membership = await Membership.findOne({
        _id: req.params.membershipId,
        workspaceId: req.params.workspaceId
      });

      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Member not found'
        });
      }

      // Managers cannot remove Owners
      if (req.membership.role === 'Manager' && membership.role === 'Owner') {
        return res.status(403).json({
          success: false,
          message: 'Managers cannot remove Owners'
        });
      }

      // Prevent removing last owner
      if (membership.role === 'Owner') {
        const ownerCount = await Membership.countDocuments({
          workspaceId: req.params.workspaceId,
          role: 'Owner',
          isActive: true
        });

        if (ownerCount <= 1) {
          return res.status(400).json({
            success: false,
            message: 'Cannot remove the last owner. Transfer ownership first.'
          });
        }
      }

      membership.isActive = false;
      await membership.save();

      res.json({
        success: true,
        message: 'Member removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/workspaces/:workspaceId/leave
// @desc    Leave workspace
// @access  Private (Member)
router.post('/:workspaceId/leave', protect, checkWorkspaceMembership, async (req, res, next) => {
  try {
    // Prevent last owner from leaving
    if (req.membership.role === 'Owner') {
      const ownerCount = await Membership.countDocuments({
        workspaceId: req.params.workspaceId,
        role: 'Owner',
        isActive: true
      });

      if (ownerCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot leave workspace as the last owner. Transfer ownership or delete the workspace.'
        });
      }
    }

    req.membership.isActive = false;
    await req.membership.save();

    res.json({
      success: true,
      message: 'Left workspace successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

