import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Users } from 'lucide-react';
import { motion } from 'framer-motion';

const WorkloadChart = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3" />
          <div className="h-64 bg-neutral-200 dark:bg-neutral-700 rounded" />
        </div>
      </div>
    );
  }

  const chartData = {
    labels: data?.map(w => w.name) || [],
    datasets: [
      {
        label: 'Estimated Hours',
        data: data?.map(w => w.estimatedHours) || [],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 6
      },
      {
        label: 'Capacity (40h)',
        data: data?.map(w => w.capacity) || [],
        backgroundColor: 'rgba(156, 163, 175, 0.3)',
        borderRadius: 6
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 20, usePointStyle: true }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          afterLabel: (context) => {
            const workload = data?.[context.dataIndex];
            return workload ? `Utilization: ${workload.utilization}%` : '';
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { callback: (value) => `${value}h` }
      },
      x: { grid: { display: false } }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-warning-light text-white">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Team Workload
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Capacity vs assigned work
            </p>
          </div>
        </div>
      </div>
      <div className="h-80">
        <Bar data={chartData} options={options} />
      </div>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {data?.slice(0, 4).map((workload, i) => (
          <div key={i} className="text-center p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800">
            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {workload.name}
            </div>
            <div className={`text-2xl font-bold mt-1 ${
              workload.utilization > 100 ? 'text-secondary-light' : 'text-success-light'
            }`}>
              {workload.utilization}%
            </div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400">
              {workload.totalTasks} tasks
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default WorkloadChart;
