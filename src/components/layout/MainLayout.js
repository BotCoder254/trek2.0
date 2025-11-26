import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { authService } from '../../services/authService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { motion } from 'framer-motion';

const MainLayout = () => {
  const navigate = useNavigate();
  const { setWorkspaces, switchWorkspace } = useWorkspace();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch current user and workspaces
  const { data: userData, isLoading, isError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authService.getCurrentUser,
    retry: false
  });

  // Handle authentication error
  React.useEffect(() => {
    if (isError) {
      authService.logout();
      navigate('/login', { replace: true });
    }
  }, [isError, navigate]);

  // Handle successful data load
  React.useEffect(() => {
    if (userData?.data?.workspaces) {
      const workspaces = userData.data.workspaces || [];
      setWorkspaces(workspaces);
      
      // Auto-select first workspace if available
      const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
      const workspace = savedWorkspaceId 
        ? workspaces.find(w => w.id === savedWorkspaceId)
        : workspaces[0];
      
      if (workspace) {
        switchWorkspace(workspace);
      }
    }
  }, [userData, setWorkspaces, switchWorkspace]);

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleCloseMobileMenu = () => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
      setIsSidebarCollapsed(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-primary-light dark:border-primary-dark border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-neutral-50 dark:bg-neutral-900">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobile={isMobile}
        onClose={handleCloseMobileMenu}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <TopBar
          onMenuClick={handleMobileMenuToggle}
          isMobileMenuOpen={isMobileMenuOpen}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;

