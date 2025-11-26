import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  CheckSquare, Clock, AlertCircle, TrendingUp, 
  Users, FolderKanban, Activity, ArrowRight
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
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

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
  Filler
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();

  // Fetch dashboard analytics
  const { data: dashboardData } = useQuery({
    queryKey: ['analytics', 'dashboard', currentWorkspace?.id],
    queryFn: async () => {
      const response = await api.get(`/analytics/dashboard/${currentWorkspace.id}`);
      return response.data;
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 30000 // Refetch every 30 seconds
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

  const stats = dashboardData?.data || {};
  const recentProjects = recentProjectsData?.data || [];
  const recentTasks = recentTasksData?.data || [];
  const projectProgress = projectProgressData?.data || [];
  const tasksByAssignee = tasksByAssigneeData?.data || [];

  // Chart configurations
  const taskStatusData = {
    labels: ['To Do', 'In Progress', 'Done'],
    datasets: [{
      data: [stats.todoTasks || 0, stats.inProgressTasks || 0, stats.completedTasks || 0],
      backgroundColor: [
        'rgba(156, 163, 175, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)'
      ],
      borderColor: [
        'rgba(156, 163, 175, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(34, 197, 94, 1)'
      ],
      borderWidth: 2
    }]
  };

  const projectProgressChartData = {
    labels: projectProgress.map(p => p.name),
    datasets: [{
      label: 'Progress %',
      data: projectProgress.map(p => p.progress),
      backgroundColor: projectProgress.map(p => p.color || 'rgba(59, 130, 246, 0.8)'),
      borderRadius: 8
    }]
  };

  const assigneeChartData = {
    labels: tasksByAssignee.map(a => a.name),
    datasets: [
      {
        label: 'Completed',
        data: tasksByAssignee.map(a => a.completed),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderRadius: 6
      },
      {
        label: 'In Progress',
        data: tasksByAssignee.map(a => a.inProgress),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 6
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: { size: 12 }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { font: { size: 11 } }
      },
      x: {
        ticks: { font: { size: 11 } }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: { size: 12 }
        }
      }
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color, trend }) => (
    <motion.div
      whileHover={{ y: -4 }}
      className="card p-6 cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-success-light text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            {trend}
          </div>
        )}
      </div>
      <h3 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
        {value}
      </h3>
      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
        {title}
      </p>
      {subtitle && (
        <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Dashboard
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Welcome back! Here's what's happening with your projects.
          </p>
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

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Team Performance */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Team Performance
            </h3>
            <div className="h-64">
              <Bar data={assigneeChartData} options={chartOptions} />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Quick Stats
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary-light" />
                  <span className="font-medium">Team Members</span>
                </div>
                <span className="text-2xl font-bold text-primary-light dark:text-primary-dark">
                  {stats.members || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-info-light" />
                  <span className="font-medium">Recent Activity</span>
                </div>
                <span className="text-2xl font-bold text-info-light">
                  {stats.recentActivity || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-warning-light" />
                  <span className="font-medium">High Priority</span>
                </div>
                <span className="text-2xl font-bold text-warning-light">
                  {stats.highPriorityTasks || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Projects & Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Projects */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Recent Projects
              </h3>
              <button
                onClick={() => navigate(`/workspace/${currentWorkspace?.id}/projects`)}
                className="text-sm text-primary-light dark:text-primary-dark hover:underline flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {recentProjects.slice(0, 5).map((project) => (
                <motion.div
                  key={project._id}
                  whileHover={{ x: 4 }}
                  onClick={() => navigate(`/workspace/${currentWorkspace?.id}/projects/${project._id}`)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: project.color }}
                  >
                    <FolderKanban className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {project.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {project.taskCount || 0} tasks
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Recent Tasks
              </h3>
            </div>
            <div className="space-y-3">
              {recentTasks.slice(0, 5).map((task) => (
                <div
                  key={task._id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <CheckSquare className="w-5 h-5 text-neutral-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.projectId && (
                        <span className="text-xs text-neutral-500">
                          {task.projectId.name}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        task.status === 'done' 
                          ? 'bg-success-light/20 text-success-light'
                          : task.status === 'in-progress'
                          ? 'bg-info-light/20 text-info-light'
                          : 'bg-neutral-200 dark:bg-neutral-700'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
