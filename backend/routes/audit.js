const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, checkWorkspaceMembership, requireRole } = require('../middleware/auth');
const { Parser } = require('json2csv');

// @route   GET /api/audit/:workspaceId
// @desc    Get audit logs for workspace
// @access  Private (Owner only, Managers with limited view)
router.get('/:workspaceId', protect, checkWorkspaceMembership, async (req, res, next) => {
  try {
    const { action, actorId, targetType, startDate, endDate, page = 1, limit = 50 } = req.query;

    // Only Owners can view full audit logs
    // Managers can view filtered logs (excluding sensitive actions)
    if (!['Owner', 'Manager'].includes(req.membership.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only Owners and Managers can view audit logs'
      });
    }

    const query = { workspaceId: req.params.workspaceId };

    // Managers cannot see ownership transfers and critical security events
    if (req.membership.role === 'Manager') {
      query.action = { 
        $nin: ['ownership.transferred', 'security.2fa_enabled', 'security.2fa_disabled'] 
      };
    }

    if (action) query.action = action;
    if (actorId) query.actorId = actorId;
    if (targetType) query.targetType = targetType;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actorId', 'firstName lastName email avatar')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    const formattedLogs = logs.map(log => ({
      id: log._id,
      action: log.action,
      actor: log.actorId ? {
        id: log.actorId._id,
        name: `${log.actorId.firstName} ${log.actorId.lastName}`,
        email: log.actorId.email,
        avatar: log.actorId.avatar
      } : null,
      targetType: log.targetType,
      targetId: log.targetId,
      targetName: log.targetName,
      changes: log.changes,
      metadata: log.metadata,
      severity: log.severity,
      createdAt: log.createdAt
    }));

    res.json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/audit/:workspaceId/export
// @desc    Export audit logs as CSV
// @access  Private (Owner only)
router.get('/:workspaceId/export', protect, checkWorkspaceMembership, requireRole('Owner'), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const query = { workspaceId: req.params.workspaceId };
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .populate('actorId', 'firstName lastName email')
      .sort('-createdAt')
      .lean();

    const csvData = logs.map(log => ({
      timestamp: log.createdAt,
      action: log.action,
      actor: log.actorId ? `${log.actorId.firstName} ${log.actorId.lastName}` : 'Unknown',
      actorEmail: log.actorId?.email || 'N/A',
      targetType: log.targetType,
      targetName: log.targetName || 'N/A',
      severity: log.severity,
      ipAddress: log.metadata?.ipAddress || 'N/A',
      changes: JSON.stringify(log.changes)
    }));

    const parser = new Parser({
      fields: ['timestamp', 'action', 'actor', 'actorEmail', 'targetType', 'targetName', 'severity', 'ipAddress', 'changes']
    });
    
    const csv = parser.parse(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/audit/:workspaceId/stats
// @desc    Get audit log statistics
// @access  Private (Owner/Manager)
router.get('/:workspaceId/stats', protect, checkWorkspaceMembership, requireRole('Owner', 'Manager'), async (req, res, next) => {
  try {
    const stats = await AuditLog.aggregate([
      { $match: { workspaceId: require('mongoose').Types.ObjectId(req.params.workspaceId) } },
      {
        $facet: {
          bySeverity: [
            { $group: { _id: '$severity', count: { $sum: 1 } } }
          ],
          byAction: [
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          byTargetType: [
            { $group: { _id: '$targetType', count: { $sum: 1 } } }
          ],
          recent: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 }
          ]
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
