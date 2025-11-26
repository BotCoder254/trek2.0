const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');

// Helper function to check if task creates circular dependency
const hasCircularDependency = async (taskId, dependencyId, visited = new Set()) => {
  if (taskId.toString() === dependencyId.toString()) return true;
  if (visited.has(dependencyId.toString())) return false;
  
  visited.add(dependencyId.toString());
  
  const dependentTask = await Task.findById(dependencyId);
  if (!dependentTask || !dependentTask.dependencies) return false;
  
  for (const depId of dependentTask.dependencies) {
    if (await hasCircularDependency(taskId, depId, visited)) {
      return true;
    }
  }
  
  return false;
};

// Helper function to check if task is blocked
const checkIfBlocked = async (taskId) => {
  const task = await Task.findById(taskId);
  if (!task || !task.dependencies || task.dependencies.length === 0) {
    return false;
  }
  
  const dependencies = await Task.find({
    _id: { $in: task.dependencies }
  });
  
  // Task is blocked if any dependency is not completed
  return dependencies.some(dep => dep.status !== 'done');
};

// @route   POST /api/tasks/:taskId/dependencies
// @desc    Add dependency to task
// @access  Private
router.post('/:taskId/dependencies', protect, async (req, res, next) => {
  try {
    const { dependencyId } = req.body;
    const task = await Task.findById(req.params.taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check if dependency task exists
    const dependencyTask = await Task.findById(dependencyId);
    if (!dependencyTask) {
      return res.status(404).json({
        success: false,
        message: 'Dependency task not found'
      });
    }
    
    // Check for circular dependency
    if (await hasCircularDependency(task._id, dependencyId)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add dependency: would create circular dependency'
      });
    }
    
    // Check if dependency already exists
    if (task.dependencies.includes(dependencyId)) {
      return res.status(400).json({
        success: false,
        message: 'Dependency already exists'
      });
    }
    
    // Add dependency
    task.dependencies.push(dependencyId);
    
    // Update blocked status
    task.isBlocked = await checkIfBlocked(task._id);
    
    // Add to blockedBy array of dependency task
    if (!dependencyTask.blockedBy) {
      dependencyTask.blockedBy = [];
    }
    if (!dependencyTask.blockedBy.includes(task._id)) {
      dependencyTask.blockedBy.push(task._id);
    }
    
    await task.save();
    await dependencyTask.save();
    
    // Create activity log
    await Activity.create({
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      taskId: task._id,
      userId: req.user._id,
      type: 'dependency_added',
      metadata: {
        dependencyTaskId: dependencyId,
        dependencyTaskTitle: dependencyTask.title
      }
    });
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`workspace:${task.workspaceId}`).emit('task:updated', {
        taskId: task._id,
        type: 'dependency_added'
      });
    }
    
    const populatedTask = await Task.findById(task._id)
      .populate('dependencies', 'title status priority')
      .populate('blockedBy', 'title status priority');
    
    res.json({
      success: true,
      message: 'Dependency added successfully',
      data: { task: populatedTask }
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/tasks/:taskId/dependencies/:dependencyId
// @desc    Remove dependency from task
// @access  Private
router.delete('/:taskId/dependencies/:dependencyId', protect, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Remove dependency
    task.dependencies = task.dependencies.filter(
      dep => dep.toString() !== req.params.dependencyId
    );
    
    // Update blocked status
    task.isBlocked = await checkIfBlocked(task._id);
    
    // Remove from blockedBy array of dependency task
    const dependencyTask = await Task.findById(req.params.dependencyId);
    if (dependencyTask) {
      dependencyTask.blockedBy = dependencyTask.blockedBy.filter(
        id => id.toString() !== task._id.toString()
      );
      await dependencyTask.save();
    }
    
    await task.save();
    
    // Create activity log
    await Activity.create({
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      taskId: task._id,
      userId: req.user._id,
      type: 'dependency_removed',
      metadata: {
        dependencyTaskId: req.params.dependencyId
      }
    });
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`workspace:${task.workspaceId}`).emit('task:updated', {
        taskId: task._id,
        type: 'dependency_removed'
      });
    }
    
    res.json({
      success: true,
      message: 'Dependency removed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/tasks/:taskId/dependencies
// @desc    Get task dependencies
// @access  Private
router.get('/:taskId/dependencies', protect, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId)
      .populate('dependencies', 'title status priority projectId')
      .populate('blockedBy', 'title status priority projectId');
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        dependencies: task.dependencies || [],
        blockedBy: task.blockedBy || [],
        isBlocked: task.isBlocked
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/tasks/:taskId/check-unblock
// @desc    Check and notify if task is unblocked
// @access  Private (called when dependency task is completed)
router.post('/:taskId/check-unblock', protect, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    const wasBlocked = task.isBlocked;
    const isNowBlocked = await checkIfBlocked(task._id);
    
    if (wasBlocked && !isNowBlocked) {
      task.isBlocked = false;
      await task.save();
      
      // Create notification for assignees
      if (task.assignees && task.assignees.length > 0) {
        for (const assigneeId of task.assignees) {
          await Notification.create({
            workspaceId: task.workspaceId,
            userId: assigneeId,
            type: 'dependency_unblocked',
            title: 'Task Unblocked',
            message: `Task "${task.title}" is now unblocked and ready to work on`,
            link: `/workspace/${task.workspaceId}/projects/${task.projectId}`,
            taskId: task._id,
            projectId: task.projectId,
            triggeredBy: req.user._id
          });
        }
      }
      
      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.to(`workspace:${task.workspaceId}`).emit('dependency:unblocked', {
          taskId: task._id
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        wasBlocked,
        isNowBlocked,
        unblocked: wasBlocked && !isNowBlocked
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
module.exports.checkIfBlocked = checkIfBlocked;

