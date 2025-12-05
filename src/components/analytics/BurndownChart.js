import React from 'react';
import { Line } from 'react-chartjs-2';
import { TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

const BurndownChart = ({ data, isLoading }) => {
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
    labels: data?.burndown?.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) || [],
    datasets: [
      {
        label: 'Actual',
        data: data?.burndown?.map(d => d.remaining) || [],
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 3
      },
      {
        label: 'Ideal',
        data: data?.burndown?.map(d => d.ideal) || [],
        borderColor: 'rgba(156, 163, 175, 1)',
        borderDash: [5, 5],
        fill: false,
        tension: 0,
        borderWidth: 2
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
        cornerRadius: 8
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { callback: (value) => `${value} tasks` }
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
          <div className="p-3 rounded-xl bg-primary-light dark:bg-primary-dark text-white">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Burndown Chart
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Progress vs ideal pace
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-primary-light dark:text-primary-dark">
            {data?.currentRemaining || 0}
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            Remaining
          </div>
        </div>
      </div>
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>
    </motion.div>
  );
};

export default BurndownChart;
