const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Workspace = require('../models/Workspace');
const Membership = require('../models/Membership');
const Invite = require('../models/Invite');
const User = require('../models/User');
const { protect, checkWorkspaceMembership, requireRole, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { logAudit } = require('../utils/auditLogger');

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

    // Log audit
    await logAudit({
      workspaceId: workspace._id,
      actorId: req.user._id,
      action: 'workspace.created',
      targetType: 'workspace',
      targetId: workspace._id,
      targetName: workspace.name,
      req
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
    const oldWorkspace = await Workspace.findById(req.params.workspaceId);
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

    // Log audit
    const changes = {};
    if (name && name !== oldWorkspace.name) changes.name = { from: oldWorkspace.name, to: name };
    if (description !== undefined && description !== oldWorkspace.description) changes.description = { from: oldWorkspace.description, to: description };
    if (color && color !== oldWorkspace.color) changes.color = { from: oldWorkspace.color, to: color };
    if (settings) changes.settings = { from: oldWorkspace.settings, to: settings };

    await logAudit({
      workspaceId: workspace._id,
      actorId: req.user._id,
      action: settings ? 'workspace.settings_changed' : 'workspace.updated',
      targetType: 'workspace',
      targetId: workspace._id,
      targetName: workspace.name,
      changes,
      req
    });

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

    // Log audit
    await logAudit({
      workspaceId: workspace._id,
      actorId: req.user._id,
      action: 'workspace.deleted',
      targetType: 'workspace',
      targetId: workspace._id,
      targetName: workspace.name,
      req
    });

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

    const members = memberships.map(m => {
      if (!m.userId) return null;
      return {
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
      };
    }).filter(Boolean);

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

      const oldRole = membership.role;
      membership.role = role;
      await membership.save();

      // Log audit
      const targetUser = await User.findById(membership.userId);
      await logAudit({
        workspaceId: req.params.workspaceId,
        actorId: req.user._id,
        action: role === 'Owner' ? 'ownership.transferred' : 'member.role_changed',
        targetType: 'member',
        targetId: membership.userId,
        targetName: targetUser ? `${targetUser.firstName} ${targetUser.lastName}` : 'Unknown',
        changes: { role: { from: oldRole, to: role } },
        req
      });

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

      const targetUser = await User.findById(membership.userId);
      const workspace = await Workspace.findById(req.params.workspaceId);
      
      membership.isActive = false;
      await membership.save();

      // Send removal notification email
      if (targetUser && targetUser.email) {
        const { sendEmail } = require('../utils/emailService');
        const emailTemplate = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Removed from ${workspace.name}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
              .header { background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 40px 20px; text-align: center; }
              .logo { font-size: 36px; font-weight: bold; color: white; margin-bottom: 10px; }
              .content { padding: 40px 30px; }
              .greeting { font-size: 24px; font-weight: 600; color: #111827; margin-bottom: 20px; }
              .message { font-size: 16px; color: #4B5563; margin-bottom: 30px; line-height: 1.8; }
              .workspace-info { background: #FEF2F2; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #EF4444; }
              .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #FEE2E2; }
              .info-row:last-child { border-bottom: none; }
              .info-label { font-weight: 600; color: #6B7280; }
              .info-value { color: #111827; font-weight: 500; }
              .note { background: #F9FAFB; border-left: 4px solid #9CA3AF; padding: 20px; margin: 30px 0; border-radius: 4px; font-size: 14px; color: #4B5563; }
              .footer { background: #F9FAFB; padding: 30px; text-align: center; color: #6B7280; font-size: 14px; }
              .footer-link { color: #EF4444; text-decoration: none; }
              .divider { height: 1px; background: #E5E7EB; margin: 30px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">TREK</div>
                <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 18px;">Project Management Platform</p>
              </div>
              
              <div class="content">
                <div class="greeting">Workspace Access Removed</div>
                
                <div class="message">
                  Hello <strong>${targetUser.firstName}</strong>,
                </div>
                
                <div class="workspace-info">
                  <div class="info-row">
                    <span class="info-label">Workspace</span>
                    <span class="info-value">${workspace.name}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Removed By</span>
                    <span class="info-value">${req.user.firstName} ${req.user.lastName}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Your Previous Role</span>
                    <span class="info-value">${membership.role}</span>
                  </div>
                </div>
                
                <div class="message">
                  You have been removed from the <strong>${workspace.name}</strong> workspace. You will no longer have access to:
                </div>
                
                <ul style="margin: 20px 0; padding-left: 20px; color: #4B5563;">
                  <li>Projects and tasks in this workspace</li>
                  <li>Workspace files and attachments</li>
                  <li>Team discussions and comments</li>
                  <li>Workspace analytics and reports</li>
                </ul>
                
                <div class="note">
                  <strong>Note:</strong> If you believe this was done in error, please contact the workspace owner or ${req.user.firstName} ${req.user.lastName} directly.
                </div>
                
                <div class="divider"></div>
                
                <div style="font-size: 14px; color: #6B7280; text-align: center;">
                  <p>Thank you for being part of ${workspace.name}.</p>
                </div>
              </div>
              
              <div class="footer">
                <p>This is an automated notification from TREK.</p>
                <p style="margin-top: 15px;">
                  <a href="${config.FRONTEND_URL}" class="footer-link">TREK</a> - Where teams collaborate and projects succeed
                </p>
                <p style="margin-top: 15px; font-size: 12px; color: #9CA3AF;">
                  Copyright ${new Date().getFullYear()} TREK. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        
        await sendEmail({
          to: targetUser.email,
          subject: `Removed from ${workspace.name} workspace - TREK`,
          html: emailTemplate
        });
      }

      // Log audit
      await logAudit({
        workspaceId: req.params.workspaceId,
        actorId: req.user._id,
        action: 'member.removed',
        targetType: 'member',
        targetId: membership.userId,
        targetName: targetUser ? `${targetUser.firstName} ${targetUser.lastName}` : 'Unknown',
        changes: { removedBy: req.user._id },
        req
      });

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

    // Log audit
    await logAudit({
      workspaceId: req.params.workspaceId,
      actorId: req.user._id,
      action: 'member.left',
      targetType: 'member',
      targetId: req.user._id,
      targetName: `${req.user.firstName} ${req.user.lastName}`,
      req
    });

    res.json({
      success: true,
      message: 'Left workspace successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

