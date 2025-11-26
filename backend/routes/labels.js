const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Label = require('../models/Label');
const Task = require('../models/Task');
const Membership = require('../models/Membership');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

// @route   GET /api/labels
// @desc    Get workspace labels
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

    // Check membership
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

    const labels = await Label.find({ workspaceId })
      .populate('createdBy', 'firstName lastName')
      .sort('name');

    res.json({
      success: true,
      data: { labels }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/labels
// @desc    Create label
// @access  Private
router.post('/', protect, [
  body('workspaceId').notEmpty().withMessage('Workspace ID is required'),
  body('name').trim().notEmpty().withMessage('Label name is required'),
  body('color').notEmpty().withMessage('Label color is required'),
  validate
], async (req, res, next) => {
  try {
    const { workspaceId, name, color } = req.body;

    // Check permission
    const membership = await Membership.findOne({
      userId: req.user._id,
      workspaceId,
      isActive: true
    });

    if (!membership || !['owner', 'manager'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only owners and managers can create labels'
      });
    }

    // Check if label already exists
    const existingLabel = await Label.findOne({ workspaceId, name });
    if (existingLabel) {
      return res.status(400).json({
        success: false,
        message: 'Label with this name already exists'
      });
    }

    const label = await Label.create({
      workspaceId,
      name,
      color,
      createdBy: req.user._id
    });

    const populatedLabel = await Label.findById(label._id)
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Label created successfully',
      data: { label: populatedLabel }
    });
  } catch (error) {
    next(error);
  }
});

// @route   PATCH /api/labels/:id
// @desc    Update label
// @access  Private
router.patch('/:id', protect, [
  body('name').optional().trim().notEmpty().withMessage('Label name cannot be empty'),
  body('color').optional().notEmpty().withMessage('Label color cannot be empty'),
  validate
], async (req, res, next) => {
  try {
    const label = await Label.findById(req.params.id);

    if (!label) {
      return res.status(404).json({
        success: false,
        message: 'Label not found'
      });
    }

    // Check permission
    const membership = await Membership.findOne({
      userId: req.user._id,
      workspaceId: label.workspaceId,
      isActive: true
    });

    if (!membership || !['owner', 'manager'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only owners and managers can edit labels'
      });
    }

    const { name, color } = req.body;

    if (name) label.name = name;
    if (color) label.color = color;

    await label.save();

    res.json({
      success: true,
      message: 'Label updated successfully',
      data: { label }
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/labels/:id
// @desc    Delete label
// @access  Private
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const label = await Label.findById(req.params.id);

    if (!label) {
      return res.status(404).json({
        success: false,
        message: 'Label not found'
      });
    }

    // Check permission
    const membership = await Membership.findOne({
      userId: req.user._id,
      workspaceId: label.workspaceId,
      isActive: true
    });

    if (!membership || !['owner', 'manager'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only owners and managers can delete labels'
      });
    }

    // Remove label from all tasks
    await Task.updateMany(
      { 'labels._id': label._id },
      { $pull: { labels: { _id: label._id } } }
    );

    await Label.findByIdAndDelete(label._id);

    res.json({
      success: true,
      message: 'Label deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
