const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const config = require('./config/env.config');
const { errorHandler } = require('./middleware/errorHandler');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: config.FRONTEND_URL,
    credentials: true
  }
});

// Make io accessible to routes
app.set('socketio', io);

// Middleware
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Socket.io authentication and workspace rooms
io.use((socket, next) => {
  const workspaceId = socket.handshake.query.workspaceId;
  const userId = socket.handshake.query.userId;
  
  if (workspaceId && workspaceId !== 'undefined' && workspaceId !== 'null') {
    socket.workspaceId = workspaceId;
  }
  
  if (userId && userId !== 'undefined' && userId !== 'null') {
    socket.userId = userId;
  }
  
  next();
});

io.on('connection', (socket) => {
  console.log(`🔌 Client connected - Workspace: ${socket.workspaceId}, User: ${socket.userId}`);
  
  // Join workspace room
  if (socket.workspaceId) {
    socket.join(`workspace:${socket.workspaceId}`);
  }
  
  // Join user room for personal notifications
  if (socket.userId) {
    socket.join(`user:${socket.userId}`);
  }
  
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client disconnected - Workspace: ${socket.workspaceId}, User: ${socket.userId}, Reason: ${reason}`);
  });
  
  socket.on('error', (error) => {
    console.error(`🔌 Socket error:`, error);
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/workspaces', require('./routes/workspaces'));
app.use('/api/invites', require('./routes/invites'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/epics', require('./routes/epics'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/tasks', require('./routes/taskDependencies'));
app.use('/api/attachments', require('./routes/attachments'));
app.use('/api/search', require('./routes/search'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/views', require('./routes/savedViews'));
app.use('/api/labels', require('./routes/labels'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'TREK API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Database connection
mongoose.connect(config.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
  
  // Start server
  const PORT = config.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 API: http://localhost:${PORT}/api`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    console.log(`🌍 Environment: ${config.NODE_ENV}`);
  });
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});

module.exports = app;

