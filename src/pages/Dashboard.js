import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, Clock, AlertCircle, TrendingUp, TrendingDown,
  Users, FolderKanban, Activity, ArrowRight, Calendar,
  Target, Zap, BarChart3, PieChart, RefreshCw
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '../context/WorkspaceContext';
import api from '../services/api';
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
  Filler,
  RadialLinearScale
} from 'chart.js';
import { Line, Bar, Doughnut, PolarArea, Radar } from 'react-chartjs-2';

// Register Chart.js components
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
  Filler,
  RadialLinearScale
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Fetch dashboard analytics with real-time updates
  const { data: dashboardData, refetch: refetchDashboard } = useQuery({
    queryKey: ['analytics', 'dashboard', currentWorkspace?.id],
    queryFn: async () => {
      const response = await api.get(`/analytics/dashboard/${currentWorkspace.id}`);
      setLastUpdated(new Date());
      return response.data;
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 15000 // Refetch every 15 seconds for real-time feel
  });

  // Fetch tasks by status over time
  const { data: tasksTrendData } = useQuery({
    queryKey: ['analytics', 'tasks-trend', currentWorkspace?.id],
    queryFn: async () => {
      const response = await api.get(`/analytics/tasks-by-status/${currentWorkspace.id}?days=7`);
      return response.data;
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 30000
  });

  // Fetch activity timeline
  const { data: activityData } = useQuery({
    queryKey: ['analytics', 'activity-timeline', currentWorkspace?.id],
    queryFn: async () => {
      const response = await api.get(`/analytics/activity-timeline/${currentWorkspace.id}`);
      return response.data;
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 10000 // More frequent for activity
  });

  // Fetch recent projects
  const { data: recentProjectsData } = useQuery({
    queryKey: ['analytics', 'recent-projects', currentWorkspace?.id],
    queryFn: async () => {
      const response = await api.get(`/analytics/recent-projects/${currentWorkspace.id}`);
      return response.data;
    },
    enabled: !!currentWorkspace?.id
  });

  // Fetch recent tasks
  const { data: recentTasksData } = useQuery({
    queryKey: ['analytics', 'recent-tasks', currentWorkspace?.id],
    queryFn: async () => {
      const response = await api.get(`/analytics/recent-tasks/${currentWorkspace.id}`);
      return response.data;
    },
    enabled: !!currentWorkspace?.id
  });

  // Fetch project progress
  const { data: projectProgressData } = useQuery({
    queryKey: ['analytics', 'project-progress', currentWorkspace?.id],
    queryFn: async () => {
      const response = await api.get(`/analytics/project-progress/${currentWorkspace.id}`);
      return response.data;
    },
    enabled: !!currentWorkspace?.id
  });

  // Fetch tasks by assignee
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
  const recentProjects = useMemo(() => recentProjectsData?.data || [], [recentProjectsData]);
  const recentTasks = useMemo(() => recentTasksData?.data || [], [recentTasksData]);
  const projectProgress = useMemo(() => projectProgressData?.data || [], [projectProgressData]);
  const tasksByAssignee = useMemo(() => tasksByAssigneeData?.data || [], [tasksByAssigneeData]);
  const tasksTrend = useMemo(() => tasksTrendData?.data || [], [tasksTrendData]);
  const activities = useMemo(() => activityData?.data || [], [activityData]);

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchDashboard(),
      // Add other refetch calls here
    ]);
    setIsRefreshing(false);
  };

  // Update last updated time only when data actually changes
  useEffect(() => {
    if (dashboardData) {
      setLastUpdated(new Date());
    }
  }, [dashboardData]);

  // Enhanced Chart configurations with gradients and animations
  const taskStatusData = {
    labels: ['To Do', 'In Progress', 'In Review', 'Done'],
    datasets: [{
      data: [
        stats.todoTasks || 0, 
        stats.inProgressTasks || 0, 
        stats.inReviewTasks || 0,
        stats.completedTasks || 0
      ],
      backgroundColor: [
        'rgba(156, 163, 175, 0.9)',
        'rgba(59, 130, 246, 0.9)',
        'rgba(245, 158, 11, 0.9)',
        'rgba(34, 197, 94, 0.9)'
      ],
      borderColor: [
        'rgba(156, 163, 175, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(34, 197, 94, 1)'
      ],
      borderWidth: 3,
      hoverOffset: 8
    }]
  };

  // Tasks trend line chart
  const tasksTrendChartData = {
    labels: tasksTrend.map(t => new Date(t._id.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Completed Tasks',
        data: tasksTrend.filter(t => t._id.status === 'done').map(t => t.count),
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8
      },
      {
        label: 'In Progress',
        data: tasksTrend.filter(t => t._id.status === 'in-progress').map(t => t.count),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8
      }
    ]
  };

  const projectProgressChartData = {
    labels: projectProgress.map(p => p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name),
    datasets: [{
      label: 'Progress %',
      data: projectProgress.map(p => p.progress),
      backgroundColor: projectProgress.map(p => p.color || 'rgba(59, 130, 246, 0.8)'),
      borderColor: projectProgress.map(p => p.color || 'rgba(59, 130, 246, 1)'),
      borderWidth: 2,
      borderRadius: 12,
      borderSkipped: false
    }]
  };

  const assigneeChartData = {
    labels: tasksByAssignee.map(a => a.name.split(' ').map(n => n[0]).join('')),
    datasets: [
      {
        label: 'Completed',
        data: tasksByAssignee.map(a => a.completed),
        backgroundColor: 'rgba(34, 197, 94, 0.9)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 2,
        borderRadius: 8
      },
      {
        label: 'In Progress',
        data: tasksByAssignee.map(a => a.inProgress),
        backgroundColor: 'rgba(59, 130, 246, 0.9)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        borderRadius: 8
      },
      {
        label: 'To Do',
        data: tasksByAssignee.map(a => a.total - a.completed - a.inProgress),
        backgroundColor: 'rgba(156, 163, 175, 0.9)',
        borderColor: 'rgba(156, 163, 175, 1)',
        borderWidth: 2,
        borderRadius: 8
      }
    ]
  };

  // Enhanced chart options with animations and interactions
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
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
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true
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

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
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
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8
      }
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1200
    }
  };

  const lineOptions = {
    ...chartOptions,
    elements: {
      point: {
        hoverRadius: 8,
        hoverBorderWidth: 3
      }
    },
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        beginAtZero: true
      }
    }
  };

  const StatCard = React.memo(({ icon: Icon, title, value, subtitle, color, trend, trendDirection = 'up', onClick }) => (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="card p-6 cursor-pointer relative overflow-hidden group"
      onClick={onClick}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="flex items-start justify-between mb-4 relative z-10">
        <motion.div 
          className={`p-3 rounded-xl ${color} shadow-lg`}
          whileHover={{ rotate: 5, scale: 1.1 }}
        >
          <Icon className="w-6 h-6 text-white" />
        </motion.div>
        {trend && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-full ${
              trendDirection === 'up' 
                ? 'text-success-light bg-success-light/10' 
                : 'text-secondary-light bg-secondary-light/10'
            }`}
          >
            {trendDirection === 'up' ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {trend}
          </motion.div>
        )}
      </div>
      <motion.h3 
        className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {value}
      </motion.h3>
      <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
        {title}
      </p>
      {subtitle && (
        <p className="text-xs text-neutral-500 mt-2 font-medium">{subtitle}</p>
      )}
    </motion.div>
  ));

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                Dashboard
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 text-lg">
                Welcome back! Here's what's happening with your projects.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-neutral-500">Last updated</p>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {lastUpdated.toLocaleTimeString()}
                </p>
              </div>
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
            </div>
          </div>
        </div>

        {/* Stats Grid - 4 Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={CheckSquare}
            title="Total Tasks"
            value={stats.totalTasks || 0}
            subtitle={`${stats.completedTasks || 0} completed`}
            color="bg-primary-light dark:bg-primary-dark"
            trend={`${stats.completionRate || 0}%`}
          />
          <StatCard
            icon={Clock}
            title="In Progress"
            value={stats.inProgressTasks || 0}
            subtitle="Active tasks"
            color="bg-info-light"
          />
          <StatCard
            icon={AlertCircle}
            title="Overdue"
            value={stats.overdueTasks || 0}
            subtitle="Need attention"
            color="bg-secondary-light"
          />
          <StatCard
            icon={FolderKanban}
            title="Projects"
            value={stats.totalProjects || 0}
            subtitle="Active projects"
            color="bg-success-light"
          />
        </div>

        {/* Charts Row - 3 Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Task Status Breakdown */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Task Status
            </h3>
            <div className="h-64">
              <Doughnut data={taskStatusData} options={doughnutOptions} />
            </div>
          </div>

          {/* Project Progress */}
          <div className="card p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Project Progress
            </h3>
            <div className="h-64">
              <Bar data={projectProgressChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Additional Stats Row - 6 More Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={Target}
            title="Completion Rate"
            value={`${stats.completionRate || 0}%`}
            subtitle="Overall progress"
            color="bg-purple-500"
            trend="+5%"
            trendDirection="up"
          />
          <StatCard
            icon={Zap}
            title="High Priority"
            value={stats.highPriorityTasks || 0}
            subtitle="Urgent tasks"
            color="bg-warning-light"
            trend={stats.urgentTasks || 0}
          />
          <StatCard
            icon={Calendar}
            title="Due This Week"
            value={stats.dueThisWeek || 0}
            subtitle="Upcoming deadlines"
            color="bg-indigo-500"
          />
        </div>

        {/* Charts Row - Tasks Trend */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Tasks Trend (Last 7 Days)
              </h3>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Activity className="w-4 h-4" />
                Real-time data
              </div>
            </div>
            <div className="h-80">
              <Line data={tasksTrendChartData} options={lineOptions} />
            </div>
          </div>
        </div>

        {/* Bottom Row - Team Performance & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Team Performance */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Team Performance
              </h3>
              <BarChart3 className="w-5 h-5 text-neutral-400" />
            </div>
            <div className="h-80">
              <Bar data={assigneeChartData} options={chartOptions} />
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Recent Activity
              </h3>
              <Activity className="w-5 h-5 text-neutral-400" />
            </div>
            <div className="h-80 overflow-y-auto custom-scrollbar space-y-3">
              {activities.slice(0, 10).map((activity, index) => (
                <motion.div
                  key={activity._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-light/20 flex items-center justify-center flex-shrink-0">
                    {activity.userId?.firstName?.[0] || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-900 dark:text-neutral-100">
                      <span className="font-semibold">
                        {activity.userId?.firstName} {activity.userId?.lastName}
                      </span>
                      {' '}
                      <span className="text-neutral-600 dark:text-neutral-400">
                        {activity.type === 'task.created' && 'created a task'}
                        {activity.type === 'task.status_changed' && 'updated task status'}
                        {activity.type === 'task.moved' && 'moved a task'}
                        {activity.type === 'comment.added' && 'added a comment'}
                      </span>
                    </p>
                    {activity.taskId && (
                      <p className="text-xs text-neutral-500 mt-1 truncate">
                        {activity.taskId.title}
                      </p>
                    )}
                    <p className="text-xs text-neutral-400 mt-1">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Quick Stats
            </h3>
            <div className="space-y-4">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary-light/10 to-primary-light/5 border border-primary-light/20"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary-light" />
                  <span className="font-semibold">Team Members</span>
                </div>
                <span className="text-2xl font-bold text-primary-light dark:text-primary-dark">
                  {stats.members || 0}
                </span>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-info-light/10 to-info-light/5 border border-info-light/20"
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-info-light" />
                  <span className="font-semibold">Recent Activity</span>
                </div>
                <span className="text-2xl font-bold text-info-light">
                  {stats.recentActivity || 0}
                </span>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-warning-light/10 to-warning-light/5 border border-warning-light/20"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-warning-light" />
                  <span className="font-semibold">High Priority</span>
                </div>
                <span className="text-2xl font-bold text-warning-light">
                  {stats.highPriorityTasks || 0}
                </span>
              </motion.div>
            </div>
          </div>

          {/* Priority Distribution */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Priority Distribution
            </h3>
            <div className="h-64">
              <Doughnut 
                data={{
                  labels: ['Low', 'Medium', 'High', 'Urgent'],
                  datasets: [{
                    data: [
                      stats.lowPriorityTasks || 0,
                      stats.mediumPriorityTasks || 0,
                      stats.highPriorityTasks || 0,
                      stats.urgentTasks || 0
                    ],
                    backgroundColor: [
                      'rgba(156, 163, 175, 0.9)',
                      'rgba(59, 130, 246, 0.9)',
                      'rgba(245, 158, 11, 0.9)',
                      'rgba(239, 68, 68, 0.9)'
                    ],
                    borderWidth: 3,
                    hoverOffset: 8
                  }]
                }} 
                options={doughnutOptions} 
              />
            </div>
          </div>

          {/* Workspace Overview */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Workspace Overview
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Total Projects</span>
                <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {stats.totalProjects || 0}
                </span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                <div 
                  className="bg-success-light h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.completionRate || 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Total Tasks</span>
                <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {stats.totalTasks || 0}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="text-center p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                  <p className="text-xs text-neutral-500">To Do</p>
                  <p className="text-xl font-bold text-neutral-700 dark:text-neutral-300">
                    {stats.todoTasks || 0}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-info-light/10">
                  <p className="text-xs text-info-light">Active</p>
                  <p className="text-xl font-bold text-info-light">
                    {stats.inProgressTasks || 0}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-success-light/10">
                  <p className="text-xs text-success-light">Done</p>
                  <p className="text-xl font-bold text-success-light">
                    {stats.completedTasks || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Projects & Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Projects */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <FolderKanban className="w-5 h-5" />
                Recent Projects
              </h3>
              <button
                onClick={() => navigate(`/workspace/${currentWorkspace?.id}/projects`)}
                className="text-sm text-primary-light dark:text-primary-dark hover:underline flex items-center gap-1 font-medium"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {recentProjects.slice(0, 6).map((project, index) => (
                <motion.div
                  key={project._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ x: 6, scale: 1.02 }}
                  onClick={() => navigate(`/workspace/${currentWorkspace?.id}/projects/${project._id}`)}
                  className="flex items-center gap-3 p-4 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-all border border-transparent hover:border-primary-light/20"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
                    style={{ backgroundColor: project.color }}
                  >
                    <FolderKanban className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {project.name}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {project.taskCount || 0} tasks • Updated {new Date(project.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-neutral-400 flex-shrink-0" />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <CheckSquare className="w-5 h-5" />
                Recent Tasks
              </h3>
            </div>
            <div className="space-y-2">
              {recentTasks.slice(0, 6).map((task, index) => (
                <motion.div
                  key={task._id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  className="flex items-start gap-3 p-4 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all cursor-pointer border border-transparent hover:border-info-light/20"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    task.status === 'done' 
                      ? 'bg-success-light/20' 
                      : task.status === 'in-progress'
                      ? 'bg-info-light/20'
                      : 'bg-neutral-200 dark:bg-neutral-700'
                  }`}>
                    <CheckSquare className={`w-5 h-5 ${
                      task.status === 'done' 
                        ? 'text-success-light' 
                        : task.status === 'in-progress'
                        ? 'text-info-light'
                        : 'text-neutral-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {task.projectId && (
                        <span className="text-xs text-neutral-500 font-medium">
                          {task.projectId.name}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        task.status === 'done' 
                          ? 'bg-success-light/20 text-success-light'
                          : task.status === 'in-progress'
                          ? 'bg-info-light/20 text-info-light'
                          : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                      }`}>
                        {task.status.replace('-', ' ')}
                      </span>
                      {task.priority && (
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          task.priority === 'urgent' 
                            ? 'bg-secondary-light/20 text-secondary-light'
                            : task.priority === 'high'
                            ? 'bg-warning-light/20 text-warning-light'
                            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                        }`}>
                          {task.priority}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
