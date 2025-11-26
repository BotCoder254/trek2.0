const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body } = require('express-validator');
const User = require('../models/User');
const Membership = require('../models/Membership');
const Workspace = require('../models/Workspace');
const Invite = require('../models/Invite');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const config = require('../config/env.config');
const { sendEmail } = require('../utils/emailService');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN
  });
};

// @route   POST /api/auth/signup
// @desc    Register new user
// @access  Public
router.post('/signup', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  validate
], async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, inviteToken } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName
    });

    // Handle invite acceptance if token provided
    let workspace = null;
    let membership = null;

    if (inviteToken) {
      const invite = await Invite.findOne({ token: inviteToken })
        .populate('workspaceId');

      if (invite && invite.isValid() && invite.email === email) {
        // Accept invite
        invite.status = 'accepted';
        invite.acceptedAt = new Date();
        invite.acceptedBy = user._id;
        await invite.save();

        // Create membership
        membership = await Membership.create({
          userId: user._id,
          workspaceId: invite.workspaceId._id,
          role: invite.role,
          invitedBy: invite.invitedBy
        });

        // Add user to all workspace projects
        const Project = require('../models/Project');
        const projects = await Project.find({ 
          workspaceId: invite.workspaceId._id,
          visibility: 'workspace'
        });
        
        for (const project of projects) {
          if (!project.members.some(m => m.userId.toString() === user._id.toString())) {
            project.members.push({ userId: user._id, role: 'member' });
            await project.save();
          }
        }

        workspace = invite.workspaceId;
      }
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          avatar: user.avatar
        },
        token,
        workspace: workspace ? {
          id: workspace._id,
          name: workspace.name,
          slug: workspace.slug,
          role: membership.role
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
], async (req, res, next) => {
  try {
    const { email, password, inviteToken } = req.body;

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Handle invite acceptance if token provided
    let inviteWorkspace = null;

    if (inviteToken) {
      const invite = await Invite.findOne({ token: inviteToken })
        .populate('workspaceId');

      if (invite && invite.isValid() && invite.email === email) {
        // Check if user is already a member
        const existingMembership = await Membership.findOne({
          userId: user._id,
          workspaceId: invite.workspaceId._id
        });

        if (!existingMembership) {
          // Accept invite and create membership
          invite.status = 'accepted';
          invite.acceptedAt = new Date();
          invite.acceptedBy = user._id;
          await invite.save();

          await Membership.create({
            userId: user._id,
            workspaceId: invite.workspaceId._id,
            role: invite.role,
            invitedBy: invite.invitedBy
          });

          // Add user to all workspace projects
          const Project = require('../models/Project');
          const projects = await Project.find({ 
            workspaceId: invite.workspaceId._id,
            visibility: 'workspace'
          });
          
          for (const project of projects) {
            if (!project.members.some(m => m.userId.toString() === user._id.toString())) {
              project.members.push({ userId: user._id, role: 'member' });
              await project.save();
            }
          }

          inviteWorkspace = {
            id: invite.workspaceId._id,
            name: invite.workspaceId.name,
            slug: invite.workspaceId.slug,
            role: invite.role
          };
        }
      }
    }

    // Update last active
    user.lastActive = Date.now();
    await user.save({ validateBeforeSave: false });

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          avatar: user.avatar,
          lastActive: user.lastActive
        },
        token,
        inviteWorkspace
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/auth/me
// @desc    Get current user with memberships
// @access  Private
router.get('/me', protect, async (req, res, next) => {
  try {
    // Get user's memberships with workspace details
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
      logo: m.workspaceId.logo,
      color: m.workspaceId.color,
      role: m.role,
      joinedAt: m.joinedAt,
      lastActive: m.lastActive
    }));

    res.json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          fullName: req.user.fullName,
          avatar: req.user.avatar,
          lastActive: req.user.lastActive
        },
        workspaces
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  validate
], async (req, res, next) => {
  try {
    const { firstName, lastName, email } = req.body;

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email && email !== req.user.email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use'
        });
      }
      updateData.email = email;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  validate
], async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isPasswordMatch = await user.comparePassword(currentPassword);
    if (!isPasswordMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  validate
], async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${config.FRONTEND_URL}/reset-password/${resetToken}`;

    // Email template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f3f4f6; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 40px 30px; }
          .content h2 { color: #111827; margin-top: 0; }
          .content p { color: #4b5563; line-height: 1.6; margin: 16px 0; }
          .button { display: inline-block; background: #3b82f6; color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
          .button:hover { background: #2563eb; }
          .footer { padding: 30px; text-align: center; color: #9ca3af; font-size: 14px; border-top: 1px solid #e5e7eb; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏔️ TREK</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hi ${user.firstName},</p>
            <p>We received a request to reset your password for your TREK account. Click the button below to create a new password:</p>
            
            <a href="${resetUrl}" class="button">Reset Password</a>
            
            <div class="warning">
              <strong>⚠️ Important:</strong> This link will expire in 1 hour. If you didn't request this reset, please ignore this email.
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #3b82f6;">${resetUrl}</p>
            
            <p style="margin-top: 32px;">If you have any questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br>The TREK Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} TREK. All rights reserved.</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request - TREK',
      html: emailHtml
    });

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    next(error);
  }
});

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password with token
// @access  Public
router.post('/reset-password/:token', [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  validate
], async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash token to compare with stored hash
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Generate new auth token
    const authToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password reset successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          avatar: user.avatar
        },
        token: authToken
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

