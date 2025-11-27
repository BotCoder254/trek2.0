const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Project = require('../models/Project');
const Epic = require('../models/Epic');
const Task = require('../models/Task');
const Membership = require('../models/Membership');
const { protect, checkWorkspaceMembership, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { logAudit } = require('../utils/auditLogger');

// @route   POST /api/projects
// @desc    Create project
// @access  Private (requires projects.create permission)
router.post('/', protect, [
  body('workspaceId').notEmpty().withMessage('Workspace ID is required'),
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('description').optional().trim(),
  body('color').optional().trim(),
  validate
], async (req, res, next) => {
  try {
    const { workspaceId, name, description, color, startDate, dueDate, visibility } = req.body;

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

    const hasPermission = Membership.hasPermission(membership.role, 'projects.create');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create projects'
      });
    }

    // Get all workspace members to add to project
    const workspaceMembers = await Membership.find({ workspaceId, isActive: true });
    const projectMembers = workspaceMembers.map(m => ({
      userId: m.userId,
      role: m.userId.toString() === req.user._id.toString() ? 'lead' : 'member'
    }));

    const project = await Project.create({
      workspaceId,
      name,
      description,
      color,
      startDate,
      dueDate,
      visibility,
      createdBy: req.user._id,
      members: projectMembers
    });

    const populatedProject = await Project.findById(project._id)
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('members.userId', 'firstName lastName email avatar');

    // Log audit
    await logAudit({
      workspaceId,
      actorId: req.user._id,
      action: 'project.created',
      targetType: 'project',
      targetId: project._id,
      targetName: project.name,
      req
    });

    // Emit socket event
    const io = req.app.get('socketio');
    if (io) {
      io.to(`workspace:${workspaceId}`).emit('project:created', { workspaceId });
    }

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: { project: populatedProject }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/projects/workspace/:workspaceId
// @desc    Get workspace projects
// @access  Private (Member)
router.get('/workspace/:workspaceId', protect, checkWorkspaceMembership, async (req, res, next) => {
  try {
    const { status } = req.query;
    
    const query = {
      workspaceId: req.params.workspaceId
    };

    if (status) {
      query.status = status;
    }

    const projects = await Project.find(query)
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('members.userId', 'firstName lastName email avatar')
      .sort('-createdAt');

    // Get task counts and progress for each project
    const projectsWithProgress = await Promise.all(
      projects.map(async (project) => {
        const tasks = await Task.find({ projectId: project._id });
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'done').length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          ...project.toJSON(),
          taskCount: totalTasks,
          completedTasks,
          progress
        };
      })
    );

    res.json({
      success: true,
      data: { projects: projectsWithProgress }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/projects/:projectId
// @desc    Get project details
// @access  Private (Member)
router.get('/:projectId', protect, async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    if (!projectId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid project ID' });
    }
    const project = await Project.findById(projectId)
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('members.userId', 'firstName lastName email avatar');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user has access
    const membership = await Membership.findOne({
      userId: req.user._id,
      workspaceId: project.workspaceId,
      isActive: true
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this project'
      });
    }

    // Get task counts
    const tasks = await Task.find({ projectId: project._id });
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.json({
      success: true,
      data: {
        project: {
          ...project.toJSON(),
          taskCount: totalTasks,
          completedTasks,
          progress
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/projects/:projectId
// @desc    Update project
// @access  Private (Lead/Owner/Manager)
router.put('/:projectId', protect, [
  body('name').optional().trim().notEmpty().withMessage('Project name cannot be empty'),
  body('description').optional().trim(),
  validate
], async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);

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

    const isLead = project.members.some(m => 
      m.userId.toString() === req.user._id.toString() && m.role === 'lead'
    );

    const hasPermission = Membership.hasPermission(membership?.role, 'projects.update') || isLead;

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this project'
      });
    }

    const { name, description, color, status, startDate, dueDate, visibility } = req.body;
    const oldProject = { ...project.toObject() };

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (color) project.color = color;
    if (status) project.status = status;
    if (startDate !== undefined) project.startDate = startDate;
    if (dueDate !== undefined) project.dueDate = dueDate;
    if (visibility) project.visibility = visibility;

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('members.userId', 'firstName lastName email avatar');

    // Log audit
    const changes = {};
    if (name && name !== oldProject.name) changes.name = { from: oldProject.name, to: name };
    if (status && status !== oldProject.status) changes.status = { from: oldProject.status, to: status };
    
    await logAudit({
      workspaceId: project.workspaceId,
      actorId: req.user._id,
      action: status === 'archived' ? 'project.archived' : 'project.updated',
      targetType: 'project',
      targetId: project._id,
      targetName: project.name,
      changes,
      req
    });

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: { project: updatedProject }
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/projects/:projectId
// @desc    Delete project
// @access  Private (Owner/Manager)
router.delete('/:projectId', protect, async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);

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

    const hasPermission = Membership.hasPermission(membership?.role, 'projects.delete');

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this project'
      });
    }

    // Delete related data
    await Epic.deleteMany({ projectId: project._id });
    await Task.deleteMany({ projectId: project._id });
    await Project.findByIdAndDelete(project._id);

    // Log audit
    await logAudit({
      workspaceId: project.workspaceId,
      actorId: req.user._id,
      action: 'project.deleted',
      targetType: 'project',
      targetId: project._id,
      targetName: project.name,
      req
    });

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/projects/:projectId/members
// @desc    Add member to project
// @access  Private (Lead/Owner/Manager)
router.post('/:projectId/members', protect, [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('role').optional().isIn(['lead', 'member']).withMessage('Invalid role'),
  validate
], async (req, res, next) => {
  try {
    const { userId, role = 'member' } = req.body;
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user already a member
    if (project.members.some(m => m.userId.toString() === userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a project member'
      });
    }

    project.members.push({ userId, role });
    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('members.userId', 'firstName lastName email avatar');

    res.json({
      success: true,
      message: 'Member added successfully',
      data: { project: updatedProject }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

