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

// @route   GET /api/analytics/cycle-time/:workspaceId
// @desc    Get cycle time metrics (time from in-progress to done)
// @access  Private
router.get('/cycle-time/:workspaceId', protect, checkWorkspaceMembership, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { days = 30, projectId, epicId } = req.query;

    const projects = await Project.find({ workspaceId });
    const projectIds = projectId ? [projectId] : projects.map(p => p._id);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get completed tasks with their status change activities
    const completedTasks = await Task.find({
      projectId: { $in: projectIds },
      status: 'done',
      updatedAt: { $gte: startDate },
      ...(epicId && { epicId })
    }).populate('projectId', 'name');

    const cycleTimeData = await Promise.all(
      completedTasks.map(async (task) => {
        // Find when task moved to in-progress
        const startActivity = await Activity.findOne({
          taskId: task._id,
          type: 'task.status_changed',
          'changes.newValue': 'in-progress'
        }).sort('createdAt');

        // Find when task moved to done
        const endActivity = await Activity.findOne({
          taskId: task._id,
          type: 'task.status_changed',
          'changes.newValue': 'done'
        }).sort('-createdAt');

        if (startActivity && endActivity) {
          const cycleTime = (new Date(endActivity.createdAt) - new Date(startActivity.createdAt)) / (1000 * 60 * 60); // hours
          return {
            taskId: task._id,
            title: task.title,
            projectName: task.projectId.name,
            cycleTime: Math.round(cycleTime * 10) / 10,
            startedAt: startActivity.createdAt,
            completedAt: endActivity.createdAt
          };
        }
        return null;
      })
    );

    const validCycleTimes = cycleTimeData.filter(d => d !== null);
    const avgCycleTime = validCycleTimes.length > 0
      ? validCycleTimes.reduce((sum, d) => sum + d.cycleTime, 0) / validCycleTimes.length
      : 0;

    res.json({
      success: true,
      data: {
        tasks: validCycleTimes,
        avgCycleTime: Math.round(avgCycleTime * 10) / 10,
        totalTasks: validCycleTimes.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/analytics/burndown/:workspaceId
// @desc    Get burndown chart data for epic or project
// @access  Private
router.get('/burndown/:workspaceId', protect, checkWorkspaceMembership, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { projectId, epicId, days = 30 } = req.query;

    if (!projectId && !epicId) {
      return res.status(400).json({
        success: false,
        message: 'Either projectId or epicId is required'
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const query = epicId ? { epicId } : { projectId };
    const allTasks = await Task.find(query);
    const totalTasks = allTasks.length;

    // Generate daily data points
    const burndownData = [];
    for (let i = parseInt(days); i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(23, 59, 59, 999);

      // Count tasks not completed by this date
      const remainingTasks = allTasks.filter(task => {
        if (task.status !== 'done') return true;
        return new Date(task.updatedAt) > date;
      }).length;

      // Ideal burndown (linear)
      const idealRemaining = Math.round(totalTasks * (i / parseInt(days)));

      burndownData.push({
        date: date.toISOString().split('T')[0],
        remaining: remainingTasks,
        ideal: idealRemaining,
        completed: totalTasks - remainingTasks
      });
    }

    res.json({
      success: true,
      data: {
        burndown: burndownData,
        totalTasks,
        currentRemaining: burndownData[burndownData.length - 1].remaining
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/analytics/workload/:workspaceId
// @desc    Get workload by assignee
// @access  Private
router.get('/workload/:workspaceId', protect, checkWorkspaceMembership, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { projectId } = req.query;

    const projects = await Project.find({ workspaceId });
    const projectIds = projectId ? [projectId] : projects.map(p => p._id);

    const tasks = await Task.find({
      projectId: { $in: projectIds },
      status: { $in: ['todo', 'in-progress', 'in-review'] }
    }).populate('assignees', 'firstName lastName email');

    const workloadMap = {};

    tasks.forEach(task => {
      task.assignees.forEach(assignee => {
        const userId = assignee._id.toString();
        if (!workloadMap[userId]) {
          workloadMap[userId] = {
            userId,
            name: `${assignee.firstName} ${assignee.lastName}`,
            email: assignee.email,
            totalTasks: 0,
            todoTasks: 0,
            inProgressTasks: 0,
            inReviewTasks: 0,
            estimatedHours: 0,
            actualHours: 0
          };
        }

        workloadMap[userId].totalTasks++;
        if (task.status === 'todo') workloadMap[userId].todoTasks++;
        if (task.status === 'in-progress') workloadMap[userId].inProgressTasks++;
        if (task.status === 'in-review') workloadMap[userId].inReviewTasks++;
        if (task.estimate) workloadMap[userId].estimatedHours += task.estimate;
        if (task.timeSpent) workloadMap[userId].actualHours += task.timeSpent;
      });
    });

    const workloadData = Object.values(workloadMap).map(w => ({
      ...w,
      estimatedHours: Math.round(w.estimatedHours * 10) / 10,
      actualHours: Math.round(w.actualHours * 10) / 10,
      capacity: 40, // Default 40 hours per week
      utilization: Math.round((w.estimatedHours / 40) * 100)
    }));

    res.json({
      success: true,
      data: workloadData
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/analytics/velocity/:workspaceId
// @desc    Get team velocity (tasks completed per week)
// @access  Private
router.get('/velocity/:workspaceId', protect, checkWorkspaceMembership, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { weeks = 8, projectId } = req.query;

    const projects = await Project.find({ workspaceId });
    const projectIds = projectId ? [projectId] : projects.map(p => p._id);

    const velocityData = [];
    for (let i = parseInt(weeks) - 1; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7) - 7);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const completedTasks = await Task.countDocuments({
        projectId: { $in: projectIds },
        status: 'done',
        updatedAt: { $gte: weekStart, $lt: weekEnd }
      });

      const totalEstimate = await Task.aggregate([
        {
          $match: {
            projectId: { $in: projectIds },
            status: 'done',
            updatedAt: { $gte: weekStart, $lt: weekEnd },
            estimate: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$estimate' }
          }
        }
      ]);

      velocityData.push({
        week: `Week ${parseInt(weeks) - i}`,
        weekStart: weekStart.toISOString().split('T')[0],
        tasksCompleted: completedTasks,
        storyPoints: totalEstimate[0]?.total || 0
      });
    }

    const avgVelocity = velocityData.length > 0
      ? velocityData.reduce((sum, d) => sum + d.tasksCompleted, 0) / velocityData.length
      : 0;

    res.json({
      success: true,
      data: {
        velocity: velocityData,
        avgVelocity: Math.round(avgVelocity * 10) / 10
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/analytics/sla/:workspaceId
// @desc    Get SLA metrics (overdue tasks, response time)
// @access  Private
router.get('/sla/:workspaceId', protect, checkWorkspaceMembership, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { projectId } = req.query;

    const projects = await Project.find({ workspaceId });
    const projectIds = projectId ? [projectId] : projects.map(p => p._id);

    const now = new Date();

    // Overdue tasks
    const overdueTasks = await Task.find({
      projectId: { $in: projectIds },
      dueDate: { $lt: now },
      status: { $ne: 'done' }
    }).populate('projectId', 'name').populate('assignees', 'firstName lastName');

    // Tasks due soon (next 7 days)
    const dueSoon = new Date();
    dueSoon.setDate(dueSoon.getDate() + 7);
    const upcomingTasks = await Task.countDocuments({
      projectId: { $in: projectIds },
      dueDate: { $gte: now, $lte: dueSoon },
      status: { $ne: 'done' }
    });

    // On-time completion rate (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const completedTasks = await Task.find({
      projectId: { $in: projectIds },
      status: 'done',
      updatedAt: { $gte: thirtyDaysAgo }
    });

    const onTimeCompletions = completedTasks.filter(task => {
      if (!task.dueDate) return true;
      return new Date(task.updatedAt) <= new Date(task.dueDate);
    }).length;

    const onTimeRate = completedTasks.length > 0
      ? Math.round((onTimeCompletions / completedTasks.length) * 100)
      : 100;

    res.json({
      success: true,
      data: {
        overdueTasks: overdueTasks.map(t => ({
          id: t._id,
          title: t.title,
          dueDate: t.dueDate,
          daysOverdue: Math.floor((now - new Date(t.dueDate)) / (1000 * 60 * 60 * 24)),
          projectName: t.projectId.name,
          assignees: t.assignees.map(a => `${a.firstName} ${a.lastName}`)
        })),
        totalOverdue: overdueTasks.length,
        upcomingDue: upcomingTasks,
        onTimeRate,
        totalCompleted: completedTasks.length,
        onTimeCompletions
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

