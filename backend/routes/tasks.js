const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Membership = require('../models/Membership');
const Activity = require('../models/Activity');
const Comment = require('../models/Comment');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

// Helper to log activity
const logActivity = async (type, taskId, userId, workspaceId, projectId, changes = {}, metadata = {}) => {
  try {
    await Activity.create({
      type,
      taskId,
      userId,
      workspaceId,
      projectId,
      changes,
      metadata
    });
  } catch (error) {
    console.error('Activity logging error:', error);
  }
};

// @route   POST /api/tasks
// @desc    Create task
// @access  Private
router.post('/', protect, [
  body('projectId').notEmpty().withMessage('Project ID is required'),
  body('title').trim().notEmpty().withMessage('Task title is required'),
  validate
], async (req, res, next) => {
  try {
    const { projectId, epicId, title, description, priority, dueDate, assignees, tags } = req.body;

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
        message: 'You do not have permission to create tasks'
      });
    }

    const task = await Task.create({
      projectId,
      epicId,
      title,
      description,
      priority,
      dueDate,
      assignees,
      tags,
      createdBy: req.user._id
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignees', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName email avatar');

    // Log activity
    await logActivity('task.created', task._id, req.user._id, project.workspaceId, projectId, {}, {
      title: task.title
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task: populatedTask }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/tasks/calendar
// @desc    Get tasks for calendar view
// @access  Private
router.get('/calendar', protect, async (req, res, next) => {
  try {
    const { workspaceId, start, end } = req.query;
    
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

    // Get all projects in workspace
    const projects = await Project.find({ workspaceId });
    const projectIds = projects.map(p => p._id);

    // Build query
    const query = { projectId: { $in: projectIds } };
    
    if (start || end) {
      query.dueDate = {};
      if (start) query.dueDate.$gte = new Date(start);
      if (end) query.dueDate.$lte = new Date(end);
    }

    const tasks = await Task.find(query)
      .populate('assignees', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('epicId', 'title color')
      .populate('projectId', 'name color')
      .sort('dueDate');

    res.json({
      success: true,
      data: { tasks }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/tasks/project/:projectId
// @desc    Get project tasks
// @access  Private
router.get('/project/:projectId', protect, async (req, res, next) => {
  try {
    const { epicId, status, assignee, labels } = req.query;
    
    const query = { projectId: req.params.projectId };
    
    if (epicId) query.epicId = epicId === 'null' ? null : epicId;
    if (status) query.status = status;
    if (assignee) query.assignees = assignee;
    if (labels) {
      const labelIds = Array.isArray(labels) ? labels : [labels];
      query.labels = { $in: labelIds };
    }

    const tasks = await Task.find(query)
      .populate('assignees', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('epicId', 'title color')
      .populate('labels')
      .sort('order');

    res.json({
      success: true,
      data: { tasks }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/tasks/:taskId
// @desc    Get task details
// @access  Private
router.get('/:taskId', protect, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId)
      .populate('assignees', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('epicId', 'title color')
      .populate('projectId', 'name color')
      .populate('labels');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: { task }
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/tasks/:taskId
// @desc    Update task
// @access  Private
router.put('/:taskId', protect, [
  body('title').optional().trim().notEmpty().withMessage('Task title cannot be empty'),
  validate
], async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId).populate('projectId');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permission
    const membership = await Membership.findOne({
      userId: req.user._id,
      workspaceId: task.projectId.workspaceId,
      isActive: true
    });

    if (!membership || !Membership.hasPermission(membership.role, 'tasks.update')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update tasks'
      });
    }

    const { title, description, status, priority, epicId, assignees, dueDate, tags, order, labels, checklist, estimate, timeSpent, position } = req.body;

    const oldTask = { ...task.toObject() };

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status && status !== task.status) {
      // Check if task is blocked and prevent status change to in-progress or done
      if (task.isBlocked && (status === 'in-progress' || status === 'done')) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change status of blocked task. Complete dependencies first.'
        });
      }
      const project = await Project.findById(task.projectId);
      await logActivity('task.status_changed', task._id, req.user._id, project.workspaceId, task.projectId, {
        field: 'status',
        oldValue: task.status,
        newValue: status
      });
      task.status = status;
    }
    if (priority !== undefined) task.priority = priority;
    if (epicId !== undefined) task.epicId = epicId;
    if (assignees !== undefined) task.assignees = assignees;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (tags !== undefined) task.tags = tags;
    if (labels !== undefined) task.labels = labels;
    if (checklist !== undefined) task.checklist = checklist;
    if (estimate !== undefined) task.estimate = estimate;
    if (timeSpent !== undefined) task.timeSpent = timeSpent;
    if (order !== undefined) task.order = order;
    if (position !== undefined) task.position = position;

    await task.save();
    
    console.log('Task updated successfully:', {
      taskId: task._id,
      title: task.title,
      description: task.description,
      checklist: task.checklist
    });

    // If task status changed to 'done', check if it unblocks any other tasks
    if (status === 'done' && oldTask.status !== 'done' && task.blockedBy && task.blockedBy.length > 0) {
      const { checkIfBlocked } = require('./taskDependencies');
      const io = req.app.get('socketio');
      
      for (const blockedTaskId of task.blockedBy) {
        const wasBlocked = await Task.findById(blockedTaskId).then(t => t?.isBlocked);
        const isNowBlocked = await checkIfBlocked(blockedTaskId);
        
        if (wasBlocked && !isNowBlocked) {
          await Task.findByIdAndUpdate(blockedTaskId, { isBlocked: false });
          
          // Emit socket event
          if (io) {
            const project = await Project.findById(task.projectId);
            io.to(`workspace:${project.workspaceId}`).emit('dependency:unblocked', {
              taskId: blockedTaskId
            });
          }
        }
      }
    }

    const updatedTask = await Task.findById(task._id)
      .populate('assignees', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('epicId', 'title color')
      .populate('labels');

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { task: updatedTask }
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/tasks/:taskId
// @desc    Delete task
// @access  Private
router.delete('/:taskId', protect, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    await Task.findByIdAndDelete(task._id);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @route   PATCH /api/tasks/:taskId/status
// @desc    Update task status (for Kanban drag-drop)
// @access  Private
router.patch('/:taskId/status', protect, [
  body('status').isIn(['todo', 'in-progress', 'in-review', 'done']).withMessage('Invalid status'),
  body('position').optional().isInt(),
  validate
], async (req, res, next) => {
  try {
    const { status, position } = req.body;
    const task = await Task.findById(req.params.taskId).populate('projectId');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if task is blocked and prevent status change to in-progress or done
    if (task.isBlocked && (status === 'in-progress' || status === 'done')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change status of blocked task. Complete dependencies first.',
        isBlocked: true
      });
    }

    const oldStatus = task.status;
    task.status = status;
    if (position !== undefined) task.position = position;
    await task.save();

    // Log activity
    if (oldStatus !== status) {
      await logActivity('task.moved', task._id, req.user._id, task.projectId.workspaceId, task.projectId._id, {
        field: 'status',
        oldValue: oldStatus,
        newValue: status
      }, { position });
    }

    res.json({
      success: true,
      message: 'Task status updated',
      data: { task }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/tasks/:taskId/comments
// @desc    Get task comments
// @access  Private
router.get('/:taskId/comments', protect, async (req, res, next) => {
  try {
    const comments = await Comment.find({ taskId: req.params.taskId })
      .populate('userId', 'firstName lastName email avatar')
      .sort('createdAt');

    res.json({
      success: true,
      data: { comments }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/tasks/:taskId/comments
// @desc    Add comment to task
// @access  Private
router.post('/:taskId/comments', protect, [
  body('content').trim().notEmpty().withMessage('Comment content is required'),
  validate
], async (req, res, next) => {
  try {
    const { content, mentions } = req.body;
    
    const task = await Task.findById(req.params.taskId).populate('projectId');
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const comment = await Comment.create({
      taskId: req.params.taskId,
      userId: req.user._id,
      content,
      mentions
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate('userId', 'firstName lastName email avatar');

    // Log activity
    await logActivity('comment.added', task._id, req.user._id, task.projectId.workspaceId, task.projectId._id);

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: { comment: populatedComment }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/tasks/:taskId/activity
// @desc    Get task activity history
// @access  Private
router.get('/:taskId/activity', protect, async (req, res, next) => {
  try {
    const activities = await Activity.find({ taskId: req.params.taskId })
      .populate('userId', 'firstName lastName email avatar')
      .sort('-createdAt')
      .limit(100);

    res.json({
      success: true,
      data: { activities }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/tasks/:taskId/activity
// @desc    Get task activity history
// @access  Private
router.get('/:taskId/activity', protect, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const activities = await Activity.find({ taskId: req.params.taskId })
      .populate('userId', 'firstName lastName avatar email')
      .sort('-createdAt')
      .limit(100);

    res.json({
      success: true,
      data: { activities }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

