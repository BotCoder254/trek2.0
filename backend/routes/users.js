const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { body } = require('express-validator');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { sendEmail } = require('../utils/emailService');
const config = require('../config/env.config');

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          avatar: user.avatar,
          bio: user.bio,
          timezone: user.timezone,
          preferences: user.preferences,
          emailVerified: user.emailVerified,
          pendingEmail: user.pendingEmail,
          lastActive: user.lastActive,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   PATCH /api/users/me
// @desc    Update user profile
// @access  Private
router.patch('/me', protect, [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio must be 500 characters or less'),
  body('timezone').optional().notEmpty().withMessage('Timezone cannot be empty'),
  validate
], async (req, res, next) => {
  try {
    const { firstName, lastName, bio, timezone, avatarUrl } = req.body;

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (bio !== undefined) updateData.bio = bio;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (avatarUrl !== undefined) updateData.avatar = avatarUrl;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    // Log activity
    await Activity.create({
      userId: req.user._id,
      action: 'profile_updated',
      entityType: 'user',
      entityId: req.user._id,
      metadata: { fields: Object.keys(updateData) }
    });

    // Emit real-time update
    const io = req.app.get('socketio');
    if (io) {
      io.to(`user:${req.user._id}`).emit('profile:updated', {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          avatar: user.avatar,
          bio: user.bio,
          timezone: user.timezone
        }
      });
    }

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
          avatar: user.avatar,
          bio: user.bio,
          timezone: user.timezone,
          preferences: user.preferences
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/users/me/avatar/presign
// @desc    Get presigned URL for avatar upload
// @access  Private
router.post('/me/avatar/presign', protect, async (req, res, next) => {
  try {
    const { fileType, fileName } = req.body;

    if (!fileType || !fileName) {
      return res.status(400).json({
        success: false,
        message: 'File type and name are required'
      });
    }

    // Generate unique filename
    const uniqueFileName = `avatars/${req.user._id}/${Date.now()}-${fileName}`;

    // Get presigned URL from file upload service
    const { getPresignedUrl } = require('../utils/fileUploadService');
    const { uploadUrl, fileUrl } = await getPresignedUrl(uniqueFileName, fileType);

    res.json({
      success: true,
      data: {
        uploadUrl,
        fileUrl
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   PATCH /api/users/me/preferences
// @desc    Update user preferences
// @access  Private
router.patch('/me/preferences', protect, [
  body('theme').optional().isIn(['light', 'dark', 'system']).withMessage('Invalid theme'),
  body('density').optional().isIn(['comfortable', 'compact']).withMessage('Invalid density'),
  validate
], async (req, res, next) => {
  try {
    const { theme, density, notifications } = req.body;

    const user = await User.findById(req.user._id);
    
    if (theme !== undefined) user.preferences.theme = theme;
    if (density !== undefined) user.preferences.density = density;
    if (notifications !== undefined) {
      user.preferences.notifications = {
        ...user.preferences.notifications,
        ...notifications
      };
    }

    await user.save();

    // Emit real-time update
    const io = req.app.get('socketio');
    if (io) {
      io.to(`user:${req.user._id}`).emit('preferences:updated', {
        preferences: user.preferences
      });
    }

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        preferences: user.preferences
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/users/me/email/change
// @desc    Initiate email change
// @access  Private
router.post('/me/email/change', protect, [
  body('newEmail').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
], async (req, res, next) => {
  try {
    const { newEmail, password } = req.body;

    // Check if new email is same as current
    if (newEmail === req.user.email) {
      return res.status(400).json({
        success: false,
        message: 'New email must be different from current email'
      });
    }

    // Check if email is already in use
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'This email is already in use. Please contact the account owner or use a different email.'
      });
    }

    // Verify password
    const user = await User.findById(req.user._id).select('+password');
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    // Generate confirmation token
    const changeToken = crypto.randomBytes(32).toString('hex');
    const changeTokenHash = crypto.createHash('sha256').update(changeToken).digest('hex');

    user.pendingEmail = newEmail;
    user.emailChangeToken = changeTokenHash;
    user.emailChangeExpire = Date.now() + 3600000; // 1 hour
    await user.save({ validateBeforeSave: false });

    // Create confirmation URL
    const confirmUrl = `${config.FRONTEND_URL}/confirm-email/${changeToken}`;

    // Send confirmation email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f3f4f6; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 40px 30px; }
          .content h2 { color: #111827; margin-top: 0; }
          .content p { color: #4b5563; line-height: 1.6; margin: 16px 0; }
          .button { display: inline-block; background: #f97316; color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
          .button:hover { background: #ea580c; }
          .footer { padding: 30px; text-align: center; color: #9ca3af; font-size: 14px; border-top: 1px solid #e5e7eb; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TREK</h1>
          </div>
          <div class="content">
            <h2>Confirm Email Change</h2>
            <p>Hi ${user.firstName},</p>
            <p>You requested to change your email address to <strong>${newEmail}</strong>. Click the button below to confirm this change:</p>
            
            <a href="${confirmUrl}" class="button">Confirm Email Change</a>
            
            <div class="warning">
              <strong>Important:</strong> This link will expire in 1 hour. If you did not request this change, please ignore this email and your email will remain unchanged.
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #f97316;">${confirmUrl}</p>
          </div>
          <div class="footer">
            <p>Copyright ${new Date().getFullYear()} TREK. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: newEmail,
      subject: 'Confirm Email Change - TREK',
      html: emailHtml
    });

    res.json({
      success: true,
      message: 'Confirmation email sent to new address. Please check your inbox.'
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/users/confirm-email/:token
// @desc    Confirm email change
// @access  Public
router.post('/confirm-email/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    // Hash token
    const changeTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      emailChangeToken: changeTokenHash,
      emailChangeExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired confirmation token'
      });
    }

    // Update email
    user.email = user.pendingEmail;
    user.emailVerified = true;
    user.pendingEmail = null;
    user.emailChangeToken = undefined;
    user.emailChangeExpire = undefined;
    await user.save();

    // Log activity
    await Activity.create({
      userId: user._id,
      action: 'email_changed',
      entityType: 'user',
      entityId: user._id,
      metadata: { newEmail: user.email }
    });

    res.json({
      success: true,
      message: 'Email changed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/users/me/activity
// @desc    Get user activity history
// @access  Private
router.get('/me/activity', protect, async (req, res, next) => {
  try {
    const { limit = 20, page = 1 } = req.query;

    const activities = await Activity.find({ userId: req.user._id })
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('workspaceId', 'name slug')
      .populate('projectId', 'name')
      .lean();

    const total = await Activity.countDocuments({ userId: req.user._id });

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
