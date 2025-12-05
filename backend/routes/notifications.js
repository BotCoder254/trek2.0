const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Notification = require('../models/Notification');
const Membership = require('../models/Membership');
const { sendEmail } = require('../utils/emailService');

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    const { workspaceId, isRead, limit = 50, skip = 0 } = req.query;

    const query = { userId: req.user._id };
    
    if (workspaceId) {
      query.workspaceId = workspaceId;
    }
    
    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    const notifications = await Notification.find(query)
      .populate('triggeredBy', 'firstName lastName avatar')
      .populate('taskId', 'title')
      .populate('projectId', 'name')
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false
    });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', protect, async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    
    const query = {
      userId: req.user._id,
      isRead: false
    };
    
    if (workspaceId) {
      query.workspaceId = workspaceId;
    }

    const count = await Notification.countDocuments(query);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
});

// @route   PATCH /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.patch('/:id/read', protect, async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      data: { notification }
    });
  } catch (error) {
    next(error);
  }
});

// @route   PATCH /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.patch('/mark-all-read', protect, async (req, res, next) => {
  try {
    const { workspaceId } = req.body;

    const query = {
      userId: req.user._id,
      isRead: false
    };

    if (workspaceId) {
      query.workspaceId = workspaceId;
    }

    await Notification.updateMany(query, {
      isRead: true,
      readAt: new Date()
    });

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to create and emit notification
const createNotification = async (data, io) => {
  try {
    // Get user preferences to check if notifications are enabled
    const User = require('../models/User');
    const user = await User.findById(data.userId);
    
    if (!user) {
      return null;
    }

    // Check notification preferences based on type
    const prefs = user.preferences?.notifications || {};
    const notificationType = data.type;
    
    // Map notification types to preference keys
    const typeToPreference = {
      'task_assigned': 'taskAssigned',
      'task_completed': 'taskCompleted',
      'comment_added': 'comments',
      'mention': 'mentions'
    };
    
    const prefKey = typeToPreference[notificationType];
    
    // If preference exists and is false, don't create notification
    if (prefKey && prefs[prefKey] === false) {
      return null;
    }
    
    // Check if push notifications are disabled
    if (prefs.push === false) {
      // Don't create in-app notification
      // But still send email if email notifications are enabled
      if (prefs.email === false || !data.sendEmail) {
        return null;
      }
    }

    const notification = await Notification.create(data);
    
    const populatedNotification = await Notification.findById(notification._id)
      .populate('triggeredBy', 'firstName lastName avatar')
      .populate('taskId', 'title')
      .populate('projectId', 'name');

    // Emit socket event only if push notifications are enabled
    if (io && prefs.push !== false) {
      io.to(`workspace:${data.workspaceId}`).emit('notification:new', {
        notification: populatedNotification
      });
    }

    // Send email if enabled and not sent
    if (!notification.isEmailSent && data.sendEmail && prefs.email !== false) {
      if (user) {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f3f4f6; }
              .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; }
              .header h1 { color: white; margin: 0; font-size: 24px; }
              .content { padding: 30px; }
              .content h2 { color: #111827; margin-top: 0; }
              .content p { color: #4b5563; line-height: 1.6; margin: 16px 0; }
              .button { display: inline-block; background: #3b82f6; color: white !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
              .footer { padding: 20px; text-align: center; color: #9ca3af; font-size: 14px; border-top: 1px solid #e5e7eb; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>TREK</h1>
              </div>
              <div class="content">
                <h2>${data.title}</h2>
                <p>${data.message}</p>
                ${data.link ? `<a href="${process.env.FRONTEND_URL}${data.link}" class="button">View Details</a>` : ''}
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} TREK. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await sendEmail({
          to: user.email,
          subject: data.title,
          html: emailHtml
        });

        notification.isEmailSent = true;
        await notification.save();
      }
    }

    return populatedNotification;
  } catch (error) {
    throw error;
  }
};

// Helper function to check if user should receive notification
const shouldNotifyUser = async (userId, notificationType) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (!user) return false;
    
    const prefs = user.preferences?.notifications || {};
    
    // Map notification types to preference keys
    const typeToPreference = {
      'task_assigned': 'taskAssigned',
      'task_completed': 'taskCompleted',
      'comment_added': 'comments',
      'mention': 'mentions'
    };
    
    const prefKey = typeToPreference[notificationType];
    
    // If preference exists and is false, don't notify
    if (prefKey && prefs[prefKey] === false) {
      return false;
    }
    
    // Check if push notifications are enabled
    return prefs.push !== false;
  } catch (error) {
    return true; // Default to sending notification on error
  }
};

module.exports = router;
module.exports.createNotification = createNotification;
module.exports.shouldNotifyUser = shouldNotifyUser;

