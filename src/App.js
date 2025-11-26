import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from './context/ThemeContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { SocketProvider } from './context/SocketContext';
import { authService } from './services/authService';

// Route Components
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';

// Layout
import MainLayout from './components/layout/MainLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Main Pages
import Dashboard from './pages/Dashboard';
import CreateWorkspace from './pages/workspace/CreateWorkspace';
import WorkspaceSettings from './pages/workspace/WorkspaceSettings';
import AcceptInvite from './pages/invite/AcceptInvite';
import ProfilePage from './pages/profile/ProfilePage';
import ConfirmEmail from './pages/profile/ConfirmEmail';

// Project Pages
import ProjectList from './pages/projects/ProjectList';
import ProjectDetail from './pages/projects/ProjectDetail';

// Calendar
import CalendarView from './pages/calendar/CalendarView';

// Analytics
import AnalyticsPage from './pages/analytics/AnalyticsPage';

// Notifications
import NotificationsPage from './pages/notifications/NotificationsPage';

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  }
});

function App() {
  return (
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <WorkspaceProvider>
              <SocketProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicRoute>
                    <Signup />
                  </PublicRoute>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <PublicRoute>
                    <ForgotPassword />
                  </PublicRoute>
                }
              />
              <Route
                path="/reset-password/:token"
                element={
                  <PublicRoute>
                    <ResetPassword />
                  </PublicRoute>
                }
              />
              <Route path="/confirm-email/:token" element={<ConfirmEmail />} />

              {/* Root redirect */}
              <Route 
                path="/" 
                element={<Navigate to={authService.isAuthenticated() ? "/dashboard" : "/login"} replace />} 
              />

              {/* Protected Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="create-workspace" element={<CreateWorkspace />} />
                <Route path="notifications" element={<NotificationsPage />} />
                
                {/* Workspace Routes */}
                <Route path="workspace/:workspaceId">
                  <Route path="settings" element={<WorkspaceSettings />} />
                  <Route path="projects" element={<ProjectList />} />
                  <Route path="projects/:projectId" element={<ProjectDetail />} />
                  <Route path="calendar" element={<CalendarView />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                </Route>
                
                {/* Invite Route */}
                <Route path="invite/:token" element={<AcceptInvite />} />

                {/* Settings */}
                <Route path="settings">
                  <Route index element={<div className="p-8"><h1 className="text-2xl font-bold">Settings (Coming Soon)</h1></div>} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>
              </Route>

              {/* 404 */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
              </SocketProvider>
        </WorkspaceProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;

