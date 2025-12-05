import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Download, Filter, Search, Calendar, 
  User, AlertTriangle, Info, AlertCircle, X,
  ChevronRight, Clock, MapPin, Monitor
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '../../context/WorkspaceContext';
import { auditService } from '../../services/auditService';
import { format } from 'date-fns';

const AuditLogsPage = () => {
  const { currentWorkspace } = useWorkspace();
  const [selectedLog, setSelectedLog] = useState(null);
  const [filters, setFilters] = useState({
    action: '',
    actorId: '',
    targetType: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', currentWorkspace?.id, filters, page],
    queryFn: () => auditService.getAuditLogs(currentWorkspace.id, { ...filters, page, limit }),
    enabled: !!currentWorkspace?.id
  });

  const logs = data?.data?.logs || [];
  const pagination = data?.data?.pagination || {};

  const handleExport = async () => {
    try {
      const blob = await auditService.exportAuditLogs(currentWorkspace.id, filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${currentWorkspace.name}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return AlertTriangle;
      case 'high': return AlertCircle;
      case 'medium': return Info;
      default: return Shield;
    }
  };

  const getActionLabel = (action) => {
    return action.split('.').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const actionTypes = [
    { value: '', label: 'All Actions' },
    { value: 'workspace.created', label: 'Workspace Created' },
    { value: 'workspace.updated', label: 'Workspace Updated' },
    { value: 'workspace.deleted', label: 'Workspace Deleted' },
    { value: 'workspace.settings_changed', label: 'Settings Changed' },
    { value: 'member.invited', label: 'Member Invited' },
    { value: 'member.joined', label: 'Member Joined' },
    { value: 'member.removed', label: 'Member Removed' },
    { value: 'member.role_changed', label: 'Role Changed' },
    { value: 'ownership.transferred', label: 'Ownership Transferred' }
  ];

  const targetTypes = [
    { value: '', label: 'All Types' },
    { value: 'workspace', label: 'Workspace' },
    { value: 'member', label: 'Member' },
    { value: 'project', label: 'Project' },
    { value: 'task', label: 'Task' },
    { value: 'settings', label: 'Settings' }
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-light/10 dark:bg-primary-dark/10 rounded-xl">
                <Shield className="w-6 h-6 text-primary-light dark:text-primary-dark" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                  Audit Logs
                </h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Track all critical workspace activities and changes
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-primary-light dark:bg-primary-dark text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </motion.button>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Action Type
              </label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="input w-full"
              >
                {actionTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Target Type
              </label>
              <select
                value={filters.targetType}
                onChange={(e) => setFilters({ ...filters, targetType: e.target.value })}
                className="input w-full"
              >
                {targetTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="input w-full"
              />
            </div>
          </div>
        </div>

        {/* Logs List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="card">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-light mx-auto"></div>
                  <p className="mt-4 text-neutral-600 dark:text-neutral-400">Loading audit logs...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="p-8 text-center">
                  <Shield className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                  <p className="text-neutral-600 dark:text-neutral-400">No audit logs found</p>
                </div>
              ) : (
                <div className="divide-y divide-border-light dark:divide-border-dark">
                  {logs.map((log) => {
                    const SeverityIcon = getSeverityIcon(log.severity);
                    return (
                      <motion.div
                        key={log.id}
                        whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                        onClick={() => setSelectedLog(log)}
                        className="p-4 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-lg ${getSeverityColor(log.severity)}`}>
                            <SeverityIcon className="w-5 h-5" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-neutral-900 dark:text-white">
                                {getActionLabel(log.action)}
                              </h3>
                              <ChevronRight className="w-5 h-5 text-neutral-400" />
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                <span>{log.actor?.name || 'Unknown'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{format(new Date(log.createdAt), 'MMM d, yyyy HH:mm')}</span>
                              </div>
                            </div>
                            
                            {log.targetName && (
                              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
                                Target: {log.targetName}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="p-4 border-t border-border-light dark:border-border-dark flex items-center justify-between">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    Page {page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            <AnimatePresence mode="wait">
              {selectedLog ? (
                <motion.div
                  key={selectedLog.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="card p-6 sticky top-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                      Event Details
                    </h3>
                    <button
                      onClick={() => setSelectedLog(null)}
                      className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-neutral-500 uppercase">Action</label>
                      <p className="mt-1 text-neutral-900 dark:text-white font-medium">
                        {getActionLabel(selectedLog.action)}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-neutral-500 uppercase">Severity</label>
                      <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(selectedLog.severity)}`}>
                        {selectedLog.severity.toUpperCase()}
                      </span>
                    </div>

                    {selectedLog.actor && (
                      <div>
                        <label className="text-xs font-semibold text-neutral-500 uppercase">Performed By</label>
                        <div className="mt-2 flex items-center gap-3">
                          {selectedLog.actor.avatar ? (
                            <img src={selectedLog.actor.avatar} alt="" className="w-10 h-10 rounded-full" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary-light/10 flex items-center justify-center">
                              <User className="w-5 h-5 text-primary-light" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white">{selectedLog.actor.name}</p>
                            <p className="text-sm text-neutral-500">{selectedLog.actor.email}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-neutral-500 uppercase">Timestamp</label>
                      <div className="mt-1 flex items-center gap-2 text-neutral-900 dark:text-white">
                        <Clock className="w-4 h-4" />
                        <span>{format(new Date(selectedLog.createdAt), 'PPpp')}</span>
                      </div>
                    </div>

                    {selectedLog.targetName && (
                      <div>
                        <label className="text-xs font-semibold text-neutral-500 uppercase">Target</label>
                        <p className="mt-1 text-neutral-900 dark:text-white">
                          {selectedLog.targetType}: {selectedLog.targetName}
                        </p>
                      </div>
                    )}

                    {selectedLog.metadata?.ipAddress && (
                      <div>
                        <label className="text-xs font-semibold text-neutral-500 uppercase">IP Address</label>
                        <div className="mt-1 flex items-center gap-2 text-neutral-900 dark:text-white">
                          <MapPin className="w-4 h-4" />
                          <span className="font-mono text-sm">{selectedLog.metadata.ipAddress}</span>
                        </div>
                      </div>
                    )}

                    {selectedLog.metadata?.userAgent && (
                      <div>
                        <label className="text-xs font-semibold text-neutral-500 uppercase">User Agent</label>
                        <div className="mt-1 flex items-start gap-2 text-neutral-900 dark:text-white">
                          <Monitor className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className="text-sm break-all">{selectedLog.metadata.userAgent}</span>
                        </div>
                      </div>
                    )}

                    {Object.keys(selectedLog.changes || {}).length > 0 && (
                      <div>
                        <label className="text-xs font-semibold text-neutral-500 uppercase mb-2 block">Changes</label>
                        <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-3 space-y-2">
                          {Object.entries(selectedLog.changes).map(([key, value]) => (
                            <div key={key} className="text-sm">
                              <span className="font-medium text-neutral-700 dark:text-neutral-300">{key}:</span>
                              {value?.from && value?.to ? (
                                <div className="mt-1 space-y-1">
                                  <div className="text-red-600 dark:text-red-400">- {JSON.stringify(value.from)}</div>
                                  <div className="text-green-600 dark:text-green-400">+ {JSON.stringify(value.to)}</div>
                                </div>
                              ) : (
                                <div className="mt-1 text-neutral-600 dark:text-neutral-400">
                                  {JSON.stringify(value)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="card p-8 text-center sticky top-6"
                >
                  <Shield className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Select an audit log to view details
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogsPage;
