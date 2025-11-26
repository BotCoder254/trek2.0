const express = require('express');
const router = express.Router();
const { protect, checkWorkspaceMembership } = require('../middleware/auth');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Membership = require('../models/Membership');
const Activity = require('../models/Activity');

// @route   GET /api/analytics/dashboard/:workspaceId
// @desc    Get dashboard analytics
// @access  Private
router.get('/dashboard/:workspaceId', protect, checkWorkspaceMembership, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    // Get all projects in workspace
    const projects = await Project.find({ workspaceId, status: 'active' });
    const projectIds = projects.map(p => p._id);

    // Get all tasks
    const allTasks = await Task.find({ projectId: { $in: projectIds } });

    // Calculate metrics
    const totalProjects = projects.length;
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'done').length;
    const inProgressTasks = allTasks.filter(t => t.status === 'in-progress').length;
    const todoTasks = allTasks.filter(t => t.status === 'todo').length;

    // Tasks by priority
    const urgentTasks = allTasks.filter(t => t.priority === 'urgent').length;
    const highPriorityTasks = allTasks.filter(t => t.priority === 'high').length;

    // Overdue tasks
    const now = new Date();
    const overdueTasks = allTasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < now && t.status !== 'done'
    ).length;

    // Team members
    const members = await Membership.countDocuments({ workspaceId, isActive: true });

    // Recent activity count
    const recentActivity = await Activity.countDocuments({
      workspaceId,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    res.json({
      success: true,
      data: {
        totalProjects,
        totalTasks,
        completedTasks,
        inProgressTasks,
        todoTasks,
        urgentTasks,
        highPriorityTasks,
        overdueTasks,
        members,
        recentActivity,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/analytics/tasks-by-status/:workspaceId
// @desc    Get tasks grouped by status over time
// @access  Private
router.get('/tasks-by-status/:workspaceId', protect, checkWorkspaceMembership, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { days = 30 } = req.query;

    const projects = await Project.find({ workspaceId });
    const projectIds = projects.map(p => p._id);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const tasks = await Task.aggregate([
      {
        $match: {
          projectId: { $in: projectIds },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/analytics/tasks-by-assignee/:workspaceId
// @desc    Get tasks per assignee
// @access  Private
router.get('/tasks-by-assignee/:workspaceId', protect, checkWorkspaceMembership, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const projects = await Project.find({ workspaceId });
    const projectIds = projects.map(p => p._id);

    const tasks = await Task.find({ projectId: { $in: projectIds } })
      .populate('assignees', 'firstName lastName');

    const assigneeCounts = {};

    tasks.forEach(task => {
      task.assignees.forEach(assignee => {
        const key = `${assignee.firstName} ${assignee.lastName}`;
        if (!assigneeCounts[key]) {
          assigneeCounts[key] = {
            name: key,
            total: 0,
            completed: 0,
            inProgress: 0
          };
        }
        assigneeCounts[key].total++;
        if (task.status === 'done') assigneeCounts[key].completed++;
        if (task.status === 'in-progress') assigneeCounts[key].inProgress++;
      });
    });

    res.json({
      success: true,
      data: Object.values(assigneeCounts)
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/analytics/project-progress/:workspaceId
// @desc    Get progress for all projects
// @access  Private
router.get('/project-progress/:workspaceId', protect, checkWorkspaceMembership, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const projects = await Project.find({ workspaceId, status: 'active' });

    const projectsWithProgress = await Promise.all(
      projects.map(async (project) => {
        const tasks = await Task.find({ projectId: project._id });
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'done').length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          name: project.name,
          progress,
          totalTasks,
          completedTasks,
          color: project.color
        };
      })
    );

    res.json({
      success: true,
      data: projectsWithProgress
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/analytics/recent-projects/:workspaceId
// @desc    Get recently updated projects
// @access  Private
router.get('/recent-projects/:workspaceId', protect, checkWorkspaceMembership, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const projects = await Project.find({ workspaceId, status: 'active' })
      .sort('-updatedAt')
      .limit(5)
      .populate('createdBy', 'firstName lastName');

    const projectsWithTasks = await Promise.all(
      projects.map(async (project) => {
        const taskCount = await Task.countDocuments({ projectId: project._id });
        return {
          ...project.toJSON(),
          taskCount
        };
      })
    );

    res.json({
      success: true,
      data: projectsWithTasks
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/analytics/recent-tasks/:workspaceId
// @desc    Get recently updated tasks
// @access  Private
router.get('/recent-tasks/:workspaceId', protect, checkWorkspaceMembership, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const projects = await Project.find({ workspaceId });
    const projectIds = projects.map(p => p._id);

    const tasks = await Task.find({ projectId: { $in: projectIds } })
      .sort('-updatedAt')
      .limit(10)
      .populate('projectId', 'name color')
      .populate('assignees', 'firstName lastName');

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/analytics/activity-timeline/:workspaceId
// @desc    Get recent activity for timeline
// @access  Private
router.get('/activity-timeline/:workspaceId', protect, checkWorkspaceMembership, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const activities = await Activity.find({ workspaceId })
      .sort('-createdAt')
      .limit(20)
      .populate('userId', 'firstName lastName avatar')
      .populate('taskId', 'title')
      .populate('projectId', 'name');

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

