import React from 'react';
import { Line } from 'react-chartjs-2';
import { Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const CycleTimeChart = ({ data, isLoading }) => {
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
    labels: data?.tasks?.map((t, i) => `Task ${i + 1}`) || [],
    datasets: [{
      label: 'Cycle Time (hours)',
      data: data?.tasks?.map(t => t.cycleTime) || [],
      borderColor: 'rgba(59, 130, 246, 1)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
      borderWidth: 3
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          title: (context) => data?.tasks?.[context[0].dataIndex]?.title || '',
          label: (context) => `${context.parsed.y} hours`
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
          <div className="p-3 rounded-xl bg-info-light text-white">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Cycle Time Analysis
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Time from start to completion
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-info-light">
            {data?.avgCycleTime || 0}h
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            Average
          </div>
        </div>
      </div>
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>
    </motion.div>
  );
};

export default CycleTimeChart;
