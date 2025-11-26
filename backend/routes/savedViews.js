const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const SavedView = require('../models/SavedView');
const Membership = require('../models/Membership');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

// Helper to check if user can create workspace-wide views
const canCreateWorkspaceWideView = async (userId, workspaceId) => {
  const membership = await Membership.findOne({ userId, workspaceId });
  return membership && ['Owner', 'Manager'].includes(membership.role);
};

// @route   POST /api/views
// @desc    Create saved view
// @access  Private
router.post('/', protect, [
  body('name').trim().notEmpty().withMessage('View name is required'),
  body('workspaceId').isMongoId().withMessage('Valid workspace ID is required'),
  body('filterParams').optional().isObject(),
  body('isDefault').optional().isBoolean(),
  body('isWorkspaceWide').optional().isBoolean(),
  validate
], async (req, res, next) => {
  try {
    const { name, workspaceId, filterParams, isDefault, isWorkspaceWide } = req.body;

    // Check if user can create workspace-wide views
    if (isWorkspaceWide) {
      const hasPermission = await canCreateWorkspaceWideView(req.user._id, workspaceId);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Only Owners and Managers can create workspace-wide views'
        });
      }
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await SavedView.updateMany(
        { userId: req.user._id, workspaceId, isDefault: true },
        { isDefault: false }
      );
    }

    const savedView = await SavedView.create({
      userId: req.user._id,
      workspaceId,
      name,
      filterParams: filterParams || {},
      isDefault: isDefault || false,
      isWorkspaceWide: isWorkspaceWide || false,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Saved view created successfully',
      data: { view: savedView }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/views
// @desc    Get saved views for workspace
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: 'Workspace ID is required'
      });
    }

    // Get user's personal views and workspace-wide views
    const views = await SavedView.find({
      workspaceId,
      $or: [
        { userId: req.user._id },
        { isWorkspaceWide: true }
      ]
    })
      .populate('createdBy', 'firstName lastName email')
      .sort('-createdAt');

    res.json({
      success: true,
      data: { views }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/views/:id
// @desc    Get single saved view
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    const view = await SavedView.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .populate('filterParams.assignees', 'firstName lastName email avatar');

    if (!view) {
      return res.status(404).json({
        success: false,
        message: 'Saved view not found'
      });
    }

    // Check access
    if (view.userId.toString() !== req.user._id.toString() && !view.isWorkspaceWide) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { view }
    });
  } catch (error) {
    next(error);
  }
});

// @route   PATCH /api/views/:id
// @desc    Update saved view
// @access  Private
router.patch('/:id', protect, [
  body('name').optional().trim().notEmpty(),
  body('filterParams').optional().isObject(),
  body('isDefault').optional().isBoolean(),
  validate
], async (req, res, next) => {
  try {
    const view = await SavedView.findById(req.params.id);

    if (!view) {
      return res.status(404).json({
        success: false,
        message: 'Saved view not found'
      });
    }

    // Check ownership
    if (view.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own views'
      });
    }

    const { name, filterParams, isDefault } = req.body;

    // If setting as default, unset other defaults
    if (isDefault) {
      await SavedView.updateMany(
        { 
          userId: req.user._id, 
          workspaceId: view.workspaceId, 
          isDefault: true,
          _id: { $ne: view._id }
        },
        { isDefault: false }
      );
    }

    if (name) view.name = name;
    if (filterParams) view.filterParams = filterParams;
    if (isDefault !== undefined) view.isDefault = isDefault;

    await view.save();

    res.json({
      success: true,
      message: 'Saved view updated successfully',
      data: { view }
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/views/:id
// @desc    Delete saved view
// @access  Private
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const view = await SavedView.findById(req.params.id);

    if (!view) {
      return res.status(404).json({
        success: false,
        message: 'Saved view not found'
      });
    }

    // Check ownership or workspace-wide permission
    if (view.userId.toString() !== req.user._id.toString()) {
      if (view.isWorkspaceWide) {
        const hasPermission = await canCreateWorkspaceWideView(req.user._id, view.workspaceId);
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: 'Access denied'
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own views'
        });
      }
    }

    await SavedView.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Saved view deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

