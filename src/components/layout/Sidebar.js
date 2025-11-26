import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Calendar, 
  BarChart3, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  LogOut,
  Building2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Bell
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../services/authService';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import { hasPermission, PERMISSIONS } from '../../utils/roleUtils';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobile, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { isDark } = useTheme();
  const [showRecentProjects, setShowRecentProjects] = useState(true);
  const [showRecentTasks, setShowRecentTasks] = useState(false);

  // Fetch recent projects
  const { data: recentProjectsData } = useQuery({
    queryKey: ['analytics', 'recent-projects', currentWorkspace?.id],
    queryFn: async () => {
      const response = await api.get(`/analytics/recent-projects/${currentWorkspace.id}`);
      return response.data;
    },
    enabled: !!currentWorkspace?.id && !isCollapsed
  });

  // Fetch recent tasks
  const { data: recentTasksData } = useQuery({
    queryKey: ['analytics', 'recent-tasks', currentWorkspace?.id],
    queryFn: async () => {
      const response = await api.get(`/analytics/recent-tasks/${currentWorkspace.id}`);
      return response.data;
    },
    enabled: !!currentWorkspace?.id && !isCollapsed
  });

  const recentProjects = recentProjectsData?.data || [];
  const recentTasks = recentTasksData?.data || [];

  // Fetch unread notifications count
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 'unread-count', currentWorkspace?.id],
    queryFn: async () => {
      const response = await api.get('/notifications', {
        params: { workspaceId: currentWorkspace?.id, isRead: false, limit: 1 }
      });
      return response.data;
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  const unreadCount = notificationsData?.data?.unreadCount || 0;

  const navigationItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
      requiresWorkspace: false
    },
    {
      name: 'Projects',
      icon: FolderKanban,
      path: currentWorkspace ? `/workspace/${currentWorkspace.id}/projects` : '/dashboard',
      requiresWorkspace: true
    },
    {
      name: 'Calendar',
      icon: Calendar,
      path: currentWorkspace ? `/workspace/${currentWorkspace.id}/calendar` : '/dashboard',
      requiresWorkspace: true
    },
    {
      name: 'Analytics',
      icon: BarChart3,
      path: currentWorkspace ? `/workspace/${currentWorkspace.id}/analytics` : '/dashboard',
      requiresWorkspace: true
    },
    {
      name: 'Notifications',
      icon: Bell,
      path: '/notifications',
      requiresWorkspace: false,
      badge: unreadCount
    },
    {
      name: 'Settings',
      icon: Settings,
      path: currentWorkspace ? `/workspace/${currentWorkspace.id}/settings` : '/settings',
      requiresWorkspace: false
    }
  ];

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  const sidebarVariants = {
    expanded: { width: isMobile ? '100%' : 240 },
    collapsed: { width: isMobile ? 0 : 80 }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && !isCollapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={isCollapsed ? 'collapsed' : 'expanded'}
        variants={sidebarVariants}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`
          fixed lg:sticky top-0 left-0 h-screen
          bg-surface-light dark:bg-neutral-900 
          border-r border-border-light dark:border-border-dark
          flex flex-col z-50
          ${isMobile && isCollapsed ? 'hidden' : ''}
        `}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border-light dark:border-border-dark">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-light to-info-light flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className="text-xl font-bold text-primary-light dark:text-primary-dark">
                TREK
              </span>
            </motion.div>
          )}
          
          {isCollapsed && !isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-light to-info-light flex items-center justify-center mx-auto"
            >
              <span className="text-white font-bold text-lg">T</span>
            </motion.div>
          )}

          {!isMobile && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        {/* Workspace Switcher */}
        {!isCollapsed && (
          <div className="p-4 border-b border-border-light dark:border-border-dark">
            <WorkspaceSwitcher />
          </div>
        )}

        {isCollapsed && !isMobile && (
          <div className="p-4 border-b border-border-light dark:border-border-dark">
            <button
              onClick={() => setIsCollapsed(false)}
              className="w-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors flex items-center justify-center"
            >
              <Building2 className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path || 
                           (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            
            // Hide workspace-specific items if no workspace selected
            if (item.requiresWorkspace && !currentWorkspace && !isCollapsed) {
              return null;
            }

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={handleNavClick}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg
                  transition-all duration-200 relative
                  ${isActive 
                    ? 'bg-primary-light/10 dark:bg-primary-dark/10 text-primary-light dark:text-primary-dark font-medium' 
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }
                  ${isCollapsed && !isMobile ? 'justify-center' : ''}
                `}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-light dark:text-primary-dark' : ''}`} />
                  {isCollapsed && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-secondary-light text-white text-xs flex items-center justify-center rounded-full font-bold">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <>
                    <span className="truncate flex-1">{item.name}</span>
                    {item.badge > 0 && (
                      <span className="ml-auto px-2 py-0.5 bg-secondary-light text-white text-xs rounded-full font-semibold">
                        {item.badge}
                      </span>
                    )}
                    {isActive && !item.badge && (
                      <motion.div
                        layoutId="activeNav"
                        className="ml-auto w-1 h-6 bg-primary-light dark:bg-primary-dark rounded-full"
                      />
                    )}
                  </>
                )}
              </Link>
            );
          })}

          {/* Create Workspace Button */}
          {!isCollapsed && !currentWorkspace && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                navigate('/create-workspace');
                handleNavClick();
              }}
              className="w-full mt-4 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-primary-light dark:bg-primary-dark text-white font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
              Create Workspace
            </motion.button>
          )}

          {/* Recent Projects Section */}
          {!isCollapsed && currentWorkspace && recentProjects.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border-light dark:border-border-dark">
              <button
                onClick={() => setShowRecentProjects(!showRecentProjects)}
                className="w-full flex items-center justify-between px-2 mb-2 text-xs font-semibold text-neutral-500 uppercase"
              >
                <span>Recent Projects</span>
                {showRecentProjects ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              <AnimatePresence>
                {showRecentProjects && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-1"
                  >
                    {recentProjects.slice(0, 3).map((project) => (
                      <Link
                        key={project._id}
                        to={`/workspace/${currentWorkspace.id}/projects/${project._id}`}
                        onClick={handleNavClick}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm"
                      >
                        <div
                          className="w-3 h-3 rounded flex-shrink-0"
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="truncate text-neutral-700 dark:text-neutral-300">
                          {project.name}
                        </span>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Recent Tasks Section */}
          {!isCollapsed && currentWorkspace && recentTasks.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowRecentTasks(!showRecentTasks)}
                className="w-full flex items-center justify-between px-2 mb-2 text-xs font-semibold text-neutral-500 uppercase"
              >
                <span>Recent Tasks</span>
                {showRecentTasks ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              <AnimatePresence>
                {showRecentTasks && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-1"
                  >
                    {recentTasks.slice(0, 3).map((task) => (
                      <div
                        key={task._id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm cursor-pointer"
                      >
                        <CheckSquare className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-neutral-700 dark:text-neutral-300 text-xs">
                            {task.title}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {task.projectId?.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border-light dark:border-border-dark space-y-2">
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
              text-secondary-light dark:text-secondary-dark
              hover:bg-secondary-light/10 dark:hover:bg-secondary-dark/10
              transition-colors
              ${isCollapsed && !isMobile ? 'justify-center' : ''}
            `}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;

