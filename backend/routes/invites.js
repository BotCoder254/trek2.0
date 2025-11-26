const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Invite = require('../models/Invite');
const Membership = require('../models/Membership');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const { protect, checkWorkspaceMembership, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { sendInviteEmail } = require('../utils/emailService');
const config = require('../config/env.config');
// @route   POST /api/invites
// @desc    Create invite
// @access  Private (Owner/Manager)
router.post('/', protect, [
  body('workspaceId').notEmpty().withMessage('Workspace ID is required'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('role').isIn(['Manager', 'Member', 'Viewer']).withMessage('Invalid role'),
  validate
], async (req, res, next) => {
  try {
    const { workspaceId, email, role } = req.body;

    // Check membership and permission
    const membership = await Membership.findOne({
      userId: req.user._id,
      workspaceId,
      isActive: true
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this workspace'
      });
    }

    // Check if user has permission to invite
    if (!['Owner', 'Manager'].includes(membership.role)) {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace || !workspace.settings.allowMemberInvites) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to invite members'
        });
      }
    }

    // Check if user is already a member
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const existingMembership = await Membership.findOne({
        userId: existingUser._id,
        workspaceId,
        isActive: true
      });

      if (existingMembership) {
        return res.status(400).json({
          success: false,
          message: 'User is already a member of this workspace'
        });
      }
    }

    // Check for existing pending invite
    const existingInvite = await Invite.findOne({
      workspaceId,
      email,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (existingInvite) {
      return res.status(400).json({
        success: false,
        message: 'A pending invite already exists for this email'
      });
    }

    // Create invite
    const { expiryDays = 7, singleUse = true, customMessage, sendEmail = true } = req.body;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const invite = await Invite.create({
      workspaceId,
      email,
      role,
      invitedBy: req.user._id,
      expiresAt,
      singleUse,
      customMessage
    });

    const populatedInvite = await Invite.findById(invite._id)
      .populate('workspaceId', 'name slug')
      .populate('invitedBy', 'firstName lastName email');

    // Send email if requested
    let emailSent = false;
    if (sendEmail) {
      const inviteLink = `${config.FRONTEND_URL}/invite/${populatedInvite.token}`;
      const emailResult = await sendInviteEmail({
        to: email,
        workspaceName: populatedInvite.workspaceId.name,
        inviterName: `${populatedInvite.invitedBy.firstName} ${populatedInvite.invitedBy.lastName}`,
        role,
        inviteLink,
        customMessage
      });
      emailSent = emailResult.success;
    }

    res.status(201).json({
      success: true,
      message: 'Invite created successfully',
      data: {
        invite: {
          id: populatedInvite._id,
          token: populatedInvite.token,
          email: populatedInvite.email,
          role: populatedInvite.role,
          workspace: {
            id: populatedInvite.workspaceId._id,
            name: populatedInvite.workspaceId.name,
            slug: populatedInvite.workspaceId.slug
          },
          invitedBy: {
            id: populatedInvite.invitedBy._id,
            fullName: `${populatedInvite.invitedBy.firstName} ${populatedInvite.invitedBy.lastName}`,
            email: populatedInvite.invitedBy.email
          },
          expiresAt: populatedInvite.expiresAt,
          singleUse: populatedInvite.singleUse,
          status: populatedInvite.status,
          emailSent
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/invites/:token
// @desc    Get invite details by token
// @access  Public
router.get('/:token', async (req, res, next) => {
  try {
    const invite = await Invite.findOne({ token: req.params.token })
      .populate('workspaceId', 'name slug logo color')
      .populate('invitedBy', 'firstName lastName');

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite not found'
      });
    }

    if (!invite.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invite has expired or is no longer valid'
      });
    }

    res.json({
      success: true,
      data: {
        invite: {
          email: invite.email,
          role: invite.role,
          workspace: {
            name: invite.workspaceId.name,
            slug: invite.workspaceId.slug,
            logo: invite.workspaceId.logo,
            color: invite.workspaceId.color
          },
          invitedBy: {
            fullName: `${invite.invitedBy.firstName} ${invite.invitedBy.lastName}`
          },
          expiresAt: invite.expiresAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/invites/:token/accept
// @desc    Accept invite (used after login/signup)
// @access  Private
router.post('/:token/accept', protect, async (req, res, next) => {
  try {
    const invite = await Invite.findOne({ token: req.params.token })
      .populate('workspaceId');

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite not found'
      });
    }

    if (!invite.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invite has expired or is no longer valid'
      });
    }

    if (invite.email !== req.user.email) {
      return res.status(400).json({
        success: false,
        message: 'This invite was sent to a different email address'
      });
    }

    // Check if already a member
    const existingMembership = await Membership.findOne({
      userId: req.user._id,
      workspaceId: invite.workspaceId._id,
      isActive: true
    });

    if (existingMembership) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this workspace'
      });
    }

    // Accept invite
    invite.status = 'accepted';
    invite.acceptedAt = new Date();
    invite.acceptedBy = req.user._id;
    if (invite.singleUse) {
      invite.usedAt = new Date();
    }
    await invite.save();

    // Create membership
    const membership = await Membership.create({
      userId: req.user._id,
      workspaceId: invite.workspaceId._id,
      role: invite.role,
      invitedBy: invite.invitedBy
    });

    res.json({
      success: true,
      message: 'Invite accepted successfully',
      data: {
        workspace: {
          id: invite.workspaceId._id,
          name: invite.workspaceId.name,
          slug: invite.workspaceId.slug,
          logo: invite.workspaceId.logo,
          color: invite.workspaceId.color,
          role: membership.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/invites/workspace/:workspaceId
// @desc    Get all invites for workspace
// @access  Private (Owner/Manager)
router.get('/workspace/:workspaceId', 
  protect, 
  checkWorkspaceMembership, 
  requireRole('Owner', 'Manager'),
  async (req, res, next) => {
    try {
      const invites = await Invite.find({
        workspaceId: req.params.workspaceId,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      })
      .populate('invitedBy', 'firstName lastName email')
      .sort('-createdAt');

      const inviteList = invites.map(inv => ({
        id: inv._id,
        token: inv.token,
        email: inv.email,
        role: inv.role,
        invitedBy: {
          id: inv.invitedBy._id,
          fullName: `${inv.invitedBy.firstName} ${inv.invitedBy.lastName}`,
          email: inv.invitedBy.email
        },
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt
      }));

      res.json({
        success: true,
        data: { invites: inviteList }
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   DELETE /api/invites/:inviteId
// @desc    Cancel invite
// @access  Private (Owner/Manager)
router.delete('/:inviteId', protect, async (req, res, next) => {
  try {
    const invite = await Invite.findById(req.params.inviteId);

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite not found'
      });
    }

    // Check permission
    const membership = await Membership.findOne({
      userId: req.user._id,
      workspaceId: invite.workspaceId,
      isActive: true
    });

    if (!membership || !['Owner', 'Manager'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to cancel invites'
      });
    }

    invite.status = 'cancelled';
    await invite.save();

    res.json({
      success: true,
      message: 'Invite cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

