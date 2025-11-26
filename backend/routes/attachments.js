const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { getUploadCredentials, deleteFile } = require('../utils/fileUploadService');
const Task = require('../models/Task');
const Comment = require('../models/Comment');

// @route   POST /api/attachments/presign
// @desc    Get presigned upload URL
// @access  Private
router.post('/presign', protect, [
  body('filename').notEmpty().withMessage('Filename is required'),
  body('mimetype').notEmpty().withMessage('Mimetype is required'),
  body('size').isInt().withMessage('Size must be a number'),
  validate
], async (req, res, next) => {
  try {
    const { filename, mimetype, size } = req.body;

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (size > MAX_SIZE) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 10MB limit'
      });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv'
    ];

    if (!allowedTypes.includes(mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'File type not allowed. Supported: images, PDF, Word, Excel, text files'
      });
    }

    const credentials = await getUploadCredentials(filename, mimetype);

    if (!credentials.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate upload credentials',
        error: credentials.error
      });
    }

    res.json({
      success: true,
      data: credentials
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/attachments/task/:taskId
// @desc    Register attachment to task
// @access  Private
router.post('/task/:taskId', protect, [
  body('name').notEmpty().withMessage('File name is required'),
  body('url').notEmpty().withMessage('File URL is required'),
  body('type').notEmpty().withMessage('File type is required'),
  body('size').isInt().withMessage('Size must be a number'),
  body('key').notEmpty().withMessage('File key is required'),
  body('provider').optional().isIn(['cloudinary', 's3']).withMessage('Invalid provider'),
  validate
], async (req, res, next) => {
  try {
    const { name, url, type, size, key, provider } = req.body;
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const attachment = {
      name,
      url,
      type,
      size,
      key,
      provider: provider || 'cloudinary',
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    };

    task.attachments.push(attachment);
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('attachments.uploadedBy', 'firstName lastName email avatar');

    res.status(201).json({
      success: true,
      message: 'Attachment added successfully',
      data: { 
        task: populatedTask,
        attachment: task.attachments[task.attachments.length - 1]
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/attachments/task/:taskId/:attachmentId
// @desc    Delete attachment from task
// @access  Private
router.delete('/task/:taskId/:attachmentId', protect, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const attachment = task.attachments.id(req.params.attachmentId);

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    // Check if user owns the attachment or has permission
    if (attachment.uploadedBy.toString() !== req.user._id.toString()) {
      // Add more permission checks if needed
    }

    // Delete from storage
    if (attachment.key) {
      await deleteFile(attachment.key, attachment.provider);
    }

    task.attachments.pull(req.params.attachmentId);
    await task.save();

    res.json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/attachments/comment/:commentId
// @desc    Register attachment to comment
// @access  Private
router.post('/comment/:commentId', protect, [
  body('name').notEmpty().withMessage('File name is required'),
  body('url').notEmpty().withMessage('File URL is required'),
  body('type').notEmpty().withMessage('File type is required'),
  body('size').isInt().withMessage('Size must be a number'),
  validate
], async (req, res, next) => {
  try {
    const { name, url, type, size } = req.body;
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user owns the comment
    if (comment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only add attachments to your own comments'
      });
    }

    const attachment = {
      name,
      url,
      type,
      size
    };

    comment.attachments.push(attachment);
    await comment.save();

    res.status(201).json({
      success: true,
      message: 'Attachment added to comment',
      data: { comment }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

