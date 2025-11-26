import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, Calendar, Users, Target, 
  BarChart3, Activity, Download, RefreshCw,
  Clock, Zap, AlertCircle, CheckCircle2,
  PieChart, LineChart, BarChart2, TrendingDown
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Fetch all analytics data with real-time updates
  const { data: dashboardData, refetch: refetchDashboard } = useQuery({
    queryKey: ['analytics', 'dashboard', currentWorkspace?.id],
    queryFn: async () => {
      const response = await api.get(`/analytics/dashboard/${currentWorkspace.id}`);
      setLastUpdated(new Date());
      return response.data;
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchDashboard();
    setIsRefreshing(false);
  };

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

  // Memoize data to prevent flickering
  const stats = useMemo(() => dashboardData?.data || {}, [dashboardData]);
  const projectProgress = useMemo(() => projectProgressData?.data || [], [projectProgressData]);
  const tasksByAssignee = useMemo(() => tasksByAssigneeData?.data || [], [tasksByAssigneeData]);

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

  // Enhanced Grafana-style chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { 
          padding: 20, 
          font: { size: 12, weight: '500' },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        padding: 12
      }
    },
    scales: {
      y: { 
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
        },
        ticks: { 
          font: { size: 11 },
          color: 'rgba(0, 0, 0, 0.6)'
        }
      },
      x: { 
        grid: {
          display: false
        },
        ticks: { 
          font: { size: 11 },
          color: 'rgba(0, 0, 0, 0.6)'
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    }
  };

  const lineOptions = {
    ...chartOptions,
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 3
      },
      point: {
        radius: 4,
        hoverRadius: 8,
        hoverBorderWidth: 3
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'right',
        labels: { 
          padding: 20, 
          font: { size: 12, weight: '500' },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12
      }
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1200
    }
  };

  const MetricCard = React.memo(({ icon: Icon, title, value, change, color, trend = 'up' }) => (
    <motion.div 
      whileHover={{ y: -4, scale: 1.02 }}
      className="card p-6 relative overflow-hidden group cursor-pointer"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="flex items-start justify-between mb-4 relative z-10">
        <motion.div 
          className={`p-3 rounded-xl ${color} shadow-lg`}
          whileHover={{ rotate: 5, scale: 1.1 }}
        >
          <Icon className="w-6 h-6 text-white" />
        </motion.div>
        {change && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-full ${
              trend === 'up' 
                ? 'text-success-light bg-success-light/10' 
                : 'text-secondary-light bg-secondary-light/10'
            }`}
          >
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {change}
          </motion.div>
        )}
      </div>
      <div className="relative z-10">
        <motion.h3 
          className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {value}
        </motion.h3>
        <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">{title}</p>
      </div>
    </motion.div>
  ));

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
            <div className="text-right mr-2">
              <p className="text-xs text-neutral-500">Last updated</p>
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="input"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </motion.button>
            <button className="btn btn-primary flex items-center gap-2">
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

