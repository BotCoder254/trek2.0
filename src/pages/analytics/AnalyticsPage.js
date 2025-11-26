import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Calendar, Users, Target, 
  BarChart3, Activity, Download
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '../../context/WorkspaceContext';
import api from '../../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AnalyticsPage = () => {
  const { currentWorkspace } = useWorkspace();
  const [timeRange, setTimeRange] = useState('30');

  // Fetch all analytics data
  const { data: dashboardData } = useQuery({
    queryKey: ['analytics', 'dashboard', currentWorkspace?.id],
    queryFn: async () => {
      const response = await api.get(`/analytics/dashboard/${currentWorkspace.id}`);
      return response.data;
    },
    enabled: !!currentWorkspace?.id
  });

  const { data: tasksByStatusData } = useQuery({
    queryKey: ['analytics', 'tasks-by-status', currentWorkspace?.id, timeRange],
    queryFn: async () => {
      const response = await api.get(`/analytics/tasks-by-status/${currentWorkspace.id}?days=${timeRange}`);
      return response.data;
    },
    enabled: !!currentWorkspace?.id
  });

  const { data: projectProgressData } = useQuery({
    queryKey: ['analytics', 'project-progress', currentWorkspace?.id],
    queryFn: async () => {
      const response = await api.get(`/analytics/project-progress/${currentWorkspace.id}`);
      return response.data;
    },
    enabled: !!currentWorkspace?.id
  });

  const { data: tasksByAssigneeData } = useQuery({
    queryKey: ['analytics', 'tasks-by-assignee', currentWorkspace?.id],
    queryFn: async () => {
      const response = await api.get(`/analytics/tasks-by-assignee/${currentWorkspace.id}`);
      return response.data;
    },
    enabled: !!currentWorkspace?.id
  });

  const stats = dashboardData?.data || {};
  const projectProgress = projectProgressData?.data || [];
  const tasksByAssignee = tasksByAssigneeData?.data || [];

  // Prepare task trend data
  const taskTrendData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Completed',
        data: [12, 19, 15, 25],
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Created',
        data: [15, 22, 18, 28],
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const completionRateData = {
    labels: projectProgress.map(p => p.name),
    datasets: [{
      label: 'Completion Rate %',
      data: projectProgress.map(p => p.progress),
      backgroundColor: projectProgress.map(p => p.color || 'rgba(59, 130, 246, 0.8)'),
      borderRadius: 8
    }]
  };

  const teamWorkloadData = {
    labels: tasksByAssignee.map(a => a.name),
    datasets: [
      {
        label: 'Total Tasks',
        data: tasksByAssignee.map(a => a.total),
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderRadius: 6
      },
      {
        label: 'Completed',
        data: tasksByAssignee.map(a => a.completed),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderRadius: 6
      }
    ]
  };

  const priorityDistributionData = {
    labels: ['Urgent', 'High', 'Medium', 'Low'],
    datasets: [{
      data: [
        stats.urgentTasks || 0,
        stats.highPriorityTasks || 0,
        stats.totalTasks - (stats.urgentTasks || 0) - (stats.highPriorityTasks || 0) - 5,
        5
      ],
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',
        'rgba(251, 146, 60, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(156, 163, 175, 0.8)'
      ],
      borderWidth: 2
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 15, font: { size: 12 } }
      }
    },
    scales: {
      y: { beginAtZero: true },
      x: { ticks: { font: { size: 11 } } }
    }
  };

  const lineOptions = {
    ...chartOptions,
    interaction: {
      mode: 'index',
      intersect: false
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { padding: 15, font: { size: 12 } }
      }
    }
  };

  const MetricCard = ({ icon: Icon, title, value, change, color }) => (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {change && (
          <div className={`text-sm font-medium ${
            change.startsWith('+') ? 'text-success-light' : 'text-secondary-light'
          }`}>
            {change}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
          {value}
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{title}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Analytics & Reports
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Deep insights into your workspace performance
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="input"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <button className="btn btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            icon={Target}
            title="Completion Rate"
            value={`${stats.completionRate || 0}%`}
            change="+5.2%"
            color="bg-success-light"
          />
          <MetricCard
            icon={TrendingUp}
            title="Velocity"
            value="24"
            change="+12%"
            color="bg-primary-light dark:bg-primary-dark"
          />
          <MetricCard
            icon={Calendar}
            title="Avg. Cycle Time"
            value="3.2d"
            change="-0.8d"
            color="bg-info-light"
          />
          <MetricCard
            icon={Activity}
            title="Active Contributors"
            value={stats.members || 0}
            change="+2"
            color="bg-warning-light"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Task Trends */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Task Trends
            </h3>
            <div className="h-80">
              <Line data={taskTrendData} options={lineOptions} />
            </div>
          </div>

          {/* Priority Distribution */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Priority Distribution
            </h3>
            <div className="h-80">
              <Doughnut data={priorityDistributionData} options={doughnutOptions} />
            </div>
          </div>
        </div>

        {/* Full Width Charts */}
        <div className="space-y-6 mb-8">
          {/* Project Completion Rates */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Project Completion Rates
            </h3>
            <div className="h-96">
              <Bar data={completionRateData} options={chartOptions} />
            </div>
          </div>

          {/* Team Workload */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Workload Analysis
            </h3>
            <div className="h-96">
              <Bar data={teamWorkloadData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
            Summary Statistics
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800">
              <div className="text-3xl font-bold text-primary-light dark:text-primary-dark mb-2">
                {stats.totalTasks || 0}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Total Tasks</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800">
              <div className="text-3xl font-bold text-success-light mb-2">
                {stats.completedTasks || 0}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Completed</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800">
              <div className="text-3xl font-bold text-info-light mb-2">
                {stats.inProgressTasks || 0}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">In Progress</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800">
              <div className="text-3xl font-bold text-secondary-light mb-2">
                {stats.overdueTasks || 0}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Overdue</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;

