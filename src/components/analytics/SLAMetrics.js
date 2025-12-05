import React from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const SLAMetrics = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3" />
          <div className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
        SLA & Deadlines
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="text-center p-4 rounded-lg bg-secondary-light/10">
          <AlertCircle className="w-8 h-8 text-secondary-light mx-auto mb-2" />
          <div className="text-3xl font-bold text-secondary-light">
            {data?.totalOverdue || 0}
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">Overdue Tasks</div>
        </div>
        
        <div className="text-center p-4 rounded-lg bg-warning-light/10">
          <Clock className="w-8 h-8 text-warning-light mx-auto mb-2" />
          <div className="text-3xl font-bold text-warning-light">
            {data?.upcomingDue || 0}
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">Due This Week</div>
        </div>
        
        <div className="text-center p-4 rounded-lg bg-success-light/10">
          <CheckCircle className="w-8 h-8 text-success-light mx-auto mb-2" />
          <div className="text-3xl font-bold text-success-light">
            {data?.onTimeRate || 0}%
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">On-Time Rate</div>
        </div>
      </div>

      {data?.overdueTasks && data.overdueTasks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
            Most Overdue Tasks
          </h4>
          <div className="space-y-2">
            {data.overdueTasks.slice(0, 5).map((task, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {task.title}
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    {task.projectName}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-sm font-semibold text-secondary-light">
                    {task.daysOverdue}d overdue
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    {task.assignees.join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SLAMetrics;
