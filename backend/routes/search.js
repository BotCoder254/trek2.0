const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const Membership = require('../models/Membership');

// @route   GET /api/search
// @desc    Global search across workspace
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    const { q, workspaceId, type } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: {
          tasks: [],
          projects: [],
          members: []
        }
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

    const searchRegex = new RegExp(q, 'i');
    const results = {};

    // Search tasks
    if (!type || type === 'tasks') {
      const projects = await Project.find({ workspaceId });
      const projectIds = projects.map(p => p._id);

      results.tasks = await Task.find({
        projectId: { $in: projectIds },
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { tags: searchRegex }
        ]
      })
      .populate('projectId', 'name color')
      .populate('assignees', 'firstName lastName email avatar')
      .limit(10)
      .sort('-updatedAt');
    }

    // Search projects
    if (!type || type === 'projects') {
      results.projects = await Project.find({
        workspaceId,
        $or: [
          { name: searchRegex },
          { description: searchRegex }
        ]
      })
      .populate('createdBy', 'firstName lastName')
      .limit(10)
      .sort('-updatedAt');
    }

    // Search members
    if (!type || type === 'members') {
      const memberships = await Membership.find({
        workspaceId,
        isActive: true
      }).populate('userId');

      results.members = memberships
        .filter(m => {
          const user = m.userId;
          return (
            user.firstName.toLowerCase().includes(q.toLowerCase()) ||
            user.lastName.toLowerCase().includes(q.toLowerCase()) ||
            user.email.toLowerCase().includes(q.toLowerCase())
          );
        })
        .slice(0, 10)
        .map(m => ({
          ...m.userId.toJSON(),
          role: m.role
        }));
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/search/suggestions
// @desc    Quick search suggestions for autocomplete
// @access  Private
router.get('/suggestions', protect, async (req, res, next) => {
  try {
    const { q, workspaceId } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const membership = await Membership.findOne({
      userId: req.user._id,
      workspaceId,
      isActive: true
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const searchRegex = new RegExp(q, 'i');
    const suggestions = [];

    // Get recent tasks
    const projects = await Project.find({ workspaceId });
    const projectIds = projects.map(p => p._id);

    const tasks = await Task.find({
      projectId: { $in: projectIds },
      title: searchRegex
    })
    .select('title projectId status')
    .populate('projectId', 'name')
    .limit(5)
    .sort('-updatedAt');

    tasks.forEach(task => {
      suggestions.push({
        type: 'task',
        id: task._id,
        title: task.title,
        subtitle: task.projectId?.name,
        icon: 'CheckSquare'
      });
    });

    // Get matching projects
    const matchingProjects = await Project.find({
      workspaceId,
      name: searchRegex
    })
    .select('name color')
    .limit(3);

    matchingProjects.forEach(project => {
      suggestions.push({
        type: 'project',
        id: project._id,
        title: project.name,
        subtitle: 'Project',
        icon: 'FolderKanban',
        color: project.color
      });
    });

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

