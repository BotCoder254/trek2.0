const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Epic = require('../models/Epic');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Membership = require('../models/Membership');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

// @route   POST /api/epics
// @desc    Create epic
// @access  Private
router.post('/', protect, [
  body('projectId').notEmpty().withMessage('Project ID is required'),
  body('title').trim().notEmpty().withMessage('Epic title is required'),
  validate
], async (req, res, next) => {
  try {
    const { projectId, title, description, color, startDate, dueDate } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check permission
    const membership = await Membership.findOne({
      userId: req.user._id,
      workspaceId: project.workspaceId,
      isActive: true
    });

    if (!membership || !Membership.hasPermission(membership.role, 'tasks.create')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create epics'
      });
    }

    // Get max order
    const maxOrderEpic = await Epic.findOne({ projectId }).sort('-order');
    const order = maxOrderEpic ? maxOrderEpic.order + 1 : 0;

    const epic = await Epic.create({
      projectId,
      title,
      description,
      color,
      startDate,
      dueDate,
      order,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Epic created successfully',
      data: { epic }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/epics/project/:projectId
// @desc    Get project epics
// @access  Private
router.get('/project/:projectId', protect, async (req, res, next) => {
  try {
    const epics = await Epic.find({ projectId: req.params.projectId })
      .populate('createdBy', 'firstName lastName email avatar')
      .sort('order');

    // Get task counts for each epic
    const epicsWithProgress = await Promise.all(
      epics.map(async (epic) => {
        const tasks = await Task.find({ epicId: epic._id });
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'done').length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          ...epic.toJSON(),
          taskCount: totalTasks,
          completedTasks,
          progress
        };
      })
    );

    res.json({
      success: true,
      data: { epics: epicsWithProgress }
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/epics/:epicId
// @desc    Update epic
// @access  Private
router.put('/:epicId', protect, [
  body('title').optional().trim().notEmpty().withMessage('Epic title cannot be empty'),
  validate
], async (req, res, next) => {
  try {
    const epic = await Epic.findById(req.params.epicId);

    if (!epic) {
      return res.status(404).json({
        success: false,
        message: 'Epic not found'
      });
    }

    const { title, description, color, status, startDate, dueDate, order } = req.body;

    if (title) epic.title = title;
    if (description !== undefined) epic.description = description;
    if (color) epic.color = color;
    if (status) epic.status = status;
    if (startDate !== undefined) epic.startDate = startDate;
    if (dueDate !== undefined) epic.dueDate = dueDate;
    if (order !== undefined) epic.order = order;

    await epic.save();

    res.json({
      success: true,
      message: 'Epic updated successfully',
      data: { epic }
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/epics/:epicId
// @desc    Delete epic
// @access  Private
router.delete('/:epicId', protect, async (req, res, next) => {
  try {
    const epic = await Epic.findById(req.params.epicId);

    if (!epic) {
      return res.status(404).json({
        success: false,
        message: 'Epic not found'
      });
    }

    // Unlink tasks from this epic (don't delete tasks)
    await Task.updateMany(
      { epicId: epic._id },
      { $set: { epicId: null } }
    );

    await Epic.findByIdAndDelete(epic._id);

    res.json({
      success: true,
      message: 'Epic deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

