import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from './WorkspaceContext';
import { authService } from '../services/authService';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentWorkspace?.id || !authService.isAuthenticated()) {
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Get current user ID
    const token = localStorage.getItem('token');
    let userId = null;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.id;
      } catch (e) {
        console.error('Failed to parse token:', e);
      }
    }

    // Connect to Socket.io server
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      query: { 
        workspaceId: currentWorkspace.id,
        userId: userId
      },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('🔌 Socket connected to workspace:', currentWorkspace.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setIsConnected(false);
    });

    // Listen for real-time events
    newSocket.on('notification:new', (data) => {
      console.log('🔔 New notification:', data);
      // Invalidate notifications query
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications', 'unread-count']);
      
      // Show toast notification
      if (window.showNotificationToast) {
        window.showNotificationToast(data.notification);
      }
    });

    newSocket.on('task:created', (data) => {
      console.log('✅ Task created:', data);
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['analytics']);
    });

    newSocket.on('task:updated', (data) => {
      console.log('📝 Task updated:', data);
      queryClient.invalidateQueries(['task', data.taskId]);
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['analytics']);
    });

    newSocket.on('task:deleted', (data) => {
      console.log('🗑️ Task deleted:', data);
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['analytics']);
    });

    newSocket.on('comment:created', (data) => {
      console.log('💬 Comment created:', data);
      queryClient.invalidateQueries(['task', data.taskId]);
    });

    newSocket.on('dependency:unblocked', (data) => {
      console.log('🔓 Task unblocked:', data);
      queryClient.invalidateQueries(['task', data.taskId]);
      queryClient.invalidateQueries(['tasks']);
    });

    newSocket.on('project:member-added', (data) => {
      console.log('👥 Project member added:', data);
      queryClient.invalidateQueries(['projects', data.workspaceId]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [currentWorkspace?.id, queryClient]);

  const emit = (event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, emit }}>
      {children}
    </SocketContext.Provider>
  );
};

