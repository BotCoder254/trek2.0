import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  Moon, 
  Sun, 
  User, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { authService } from '../../services/authService';
import GlobalSearch from '../search/GlobalSearch';
import NotificationBell from '../notifications/NotificationBell';

const TopBar = ({ onMenuClick, isMobileMenuOpen }) => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Get current user
  const { data: userData } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authService.getCurrentUser
  });

  const user = userData?.data?.user;

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const getInitials = (user) => {
    if (!user) return '?';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <header className="h-16 bg-surface-light dark:bg-neutral-900 border-b border-border-light dark:border-border-dark sticky top-0 z-30">
      <div className="h-full flex items-center justify-between px-4 lg:px-6">
        {/* Left Section */}
        <div className="flex items-center gap-4 flex-1">
          {/* Mobile Menu Toggle */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-md">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="relative w-full"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
              <div className="w-full pl-10 pr-4 py-2 rounded-lg border border-border-light dark:border-border-dark bg-neutral-50 dark:bg-neutral-800 text-neutral-400 text-left cursor-pointer hover:border-primary-light dark:hover:border-primary-dark transition-colors">
                Search projects, tasks...
              </div>
            </button>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Quick Create Button */}
          <button
            onClick={() => {/* Handle quick create */}}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-light dark:bg-primary-dark text-white hover:opacity-90 transition-opacity font-medium"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden md:inline">Create</span>
          </button>

          {/* Mobile Create Button */}
          <button
            onClick={() => {/* Handle quick create */}}
            className="sm:hidden p-2 rounded-lg bg-primary-light dark:bg-primary-dark text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-warning-light" />
            ) : (
              <Moon className="w-5 h-5 text-info-light" />
            )}
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.fullName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-light dark:bg-primary-dark flex items-center justify-center text-white font-semibold text-sm">
                  {getInitials(user)}
                </div>
              )}
              <span className="hidden lg:inline text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {user?.firstName}
              </span>
            </button>

            {/* User Dropdown */}
            <AnimatePresence>
              {isUserMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  
                  {/* Menu */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full right-0 mt-2 w-64 z-20"
                  >
                    <div className="card p-2">
                      {/* User Info */}
                      <div className="px-3 py-2 mb-2">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {user?.fullName}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          {user?.email}
                        </p>
                      </div>

                      <div className="border-t border-border-light dark:border-border-dark my-2" />

                      {/* Menu Items */}
                      <button
                        onClick={() => {
                          navigate('/settings/profile');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-left"
                      >
                        <User className="w-4 h-4" />
                        <span className="text-sm">Profile</span>
                      </button>

                      <button
                        onClick={() => {
                          navigate('/settings');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-left"
                      >
                        <Settings className="w-4 h-4" />
                        <span className="text-sm">Settings</span>
                      </button>

                      <div className="border-t border-border-light dark:border-border-dark my-2" />

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary-light/10 dark:hover:bg-secondary-dark/10 transition-colors text-left text-secondary-light dark:text-secondary-dark"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm">Logout</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Global Search Modal */}
      <GlobalSearch 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </header>
  );
};

export default TopBar;

