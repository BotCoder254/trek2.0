# TREK - Complete Deployment Guide

## Overview

TREK is fully configured for multiple deployment options:
- **Docker** - Self-hosted with Docker Compose
- **Vercel** - Frontend deployment  
- **Render** - Backend + Database deployment
- **Socket.io** - Real-time notifications

---

## New Features Added

### 1. Real-Time Notifications (Socket.io)
- ✅ In-app notification bell with unread counter
- ✅ Real-time task updates
- ✅ Email + in-app notification combo
- ✅ Notification history page
- ✅ Mark as read / Mark all as read
- ✅ Workspace-specific notification channels

### 2. Task Dependencies
- ✅ Tasks can depend on other tasks
- ✅ Blocked/Unblocked status
- ✅ Visual indicators on cards
- ✅ Dependency panel in task detail
- ✅ Automatic notifications when unblocked

### 3. Deployment Configurations
- ✅ Docker + Docker Compose
- ✅ Vercel configuration
- ✅ Render configuration
- ✅ Production-ready setup

---

## Docker Deployment

### Prerequisites
- Docker installed
- Docker Compose installed

### Setup

1. **Create `.env` file** in project root:
```bash
JWT_SECRET=your_super_secret_key_here
FRONTEND_URL=http://localhost:3000
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket
```

2. **Build and Run**:
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

3. **Access Application**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- MongoDB: localhost:27017

### Docker Commands
```bash
# Restart services
docker-compose restart

# View running containers
docker ps

# Remove volumes (fresh start)
docker-compose down -v

# Rebuild specific service
docker-compose build backend
```

---

## Vercel Deployment (Frontend)

### Prerequisites
- Vercel account
- Vercel CLI installed: `npm i -g vercel`

### Setup

1. **Configure Environment Variables** in Vercel dashboard:
```
REACT_APP_API_URL=https://your-backend-url.com
```

2. **Deploy**:
```bash
# Login to Vercel
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

3. **Auto-Deploy**: Connect GitHub repository for automatic deployments

### vercel.json Configuration
Already included in project root. Handles:
- Static file caching
- SPA routing
- Build configuration

---

## Render Deployment (Backend)

### Prerequisites
- Render account
- MongoDB Atlas account (or Render PostgreSQL)

### Setup

1. **Create Web Service** on Render:
   - Connect repository
   - Select `trek-backend` branch
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && node server.js`

2. **Configure Environment Variables** in Render dashboard:
```
NODE_ENV=production
PORT=5000
MONGODB_URI=your-mongodb-atlas-connection-string
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-vercel-app.vercel.app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket
```

3. **Deploy**: Render auto-deploys on push to main branch

### render.yaml Configuration
Already included. Defines:
- Web service configuration
- Environment variables
- Build/start commands
- Database setup

---

## MongoDB Atlas Setup

### Create Database

1. **Sign up** at https://www.mongodb.com/cloud/atlas
2. **Create Cluster** (Free tier available)
3. **Configure**:
   - Add IP to whitelist: `0.0.0.0/0` (all IPs)
   - Create database user
   - Get connection string

4. **Connection String**:
```
mongodb+srv://username:password@cluster.mongodb.net/trek?retryWrites=true&w=majority
```

---

## Socket.io Real-Time Features

### Backend Setup
Socket.io server is automatically configured in `server.js`. It:
- Creates workspace-specific rooms
- Authenticates connections via workspace ID
- Broadcasts events to workspace members

### Frontend Integration
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  query: { workspaceId: currentWorkspace.id }
});

socket.on('notification:new', (data) => {
  // Handle new notification
});

socket.on('task:updated', (data) => {
  // Handle task update
});
```

### Events Emitted
- `notification:new` - New notification
- `task:created` - Task created
- `task:updated` - Task updated
- `task:deleted` - Task deleted
- `comment:created` - Comment added
- `dependency:unblocked` - Task unblocked

---

## Email Configuration

### Gmail Setup
1. Go to https://myaccount.google.com/apppasswords
2. Generate app-specific password
3. Use in `EMAIL_PASSWORD` environment variable

### Templates
All email templates are without emojis and include:
- Password reset
- Workspace invites
- Task notifications
- Mentions

---

## File Storage Configuration

### AWS S3
```bash
# Install AWS CLI
aws configure

# Create S3 bucket
aws s3 mb s3://trek-uploads

# Configure CORS
aws s3api put-bucket-cors --bucket trek-uploads --cors-configuration file://cors.json
```

### Cloudinary
1. Sign up at https://cloudinary.com
2. Get credentials from dashboard
3. Set `STORAGE_TYPE=cloudinary`

---

## Production Checklist

### Security
- [ ] Change JWT_SECRET to strong random string
- [ ] Use HTTPS for all connections
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set secure cookie flags
- [ ] Use environment variables for secrets

### Database
- [ ] Set up MongoDB Atlas with replica sets
- [ ] Configure backups
- [ ] Set up monitoring
- [ ] Create indexes

### Frontend
- [ ] Build optimized production bundle
- [ ] Enable CDN caching
- [ ] Configure error tracking (Sentry)
- [ ] Set up analytics

### Backend
- [ ] Configure logging (Winston/Morgan)
- [ ] Set up error monitoring
- [ ] Enable compression
- [ ] Configure rate limiting
- [ ] Set up health checks

### File Storage
- [ ] Configure S3 bucket policies
- [ ] Set up CloudFront for S3
- [ ] Configure lifecycle policies
- [ ] Enable versioning

---

## Monitoring & Logs

### Docker Logs
```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Render Logs
Available in Render dashboard under "Logs" tab

### Application Health
- Health endpoint: `GET /api/health`
- Returns server status and timestamp

---

## Troubleshooting

### Docker Issues

**Port already in use**:
```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 PID
```

**MongoDB connection failed**:
- Check MongoDB container is running: `docker ps`
- Verify connection string
- Check network connectivity

### Deployment Issues

**Vercel build fails**:
- Check build logs in Vercel dashboard
- Verify all dependencies in package.json
- Check for environment variable issues

**Render deployment fails**:
- Verify build/start commands
- Check environment variables
- View logs in Render dashboard

### Socket.io Issues

**Connections failing**:
- Check CORS configuration
- Verify workspace ID in query params
- Check firewall/security group rules

**Events not received**:
- Verify socket is connected
- Check workspace room joining
- Verify event names match

---

## Performance Optimization

### Frontend
- Code splitting
- Lazy loading routes
- Image optimization
- CDN for static assets

### Backend
- Database indexing
- Query optimization
- Caching (Redis)
- Connection pooling

### Database
- Proper indexing
- Query optimization
- Aggregation pipelines
- Read replicas

---

## Scaling

### Horizontal Scaling
- Load balancer (Nginx/AWS ALB)
- Multiple backend instances
- Sticky sessions for Socket.io
- Redis adapter for Socket.io

### Vertical Scaling
- Increase server resources
- Optimize queries
- Add caching layer

---

## Backup Strategy

### Database Backups
```bash
# Manual backup
mongodump --uri="mongodb://connection-string" --out=/backup

# Restore
mongorestore --uri="mongodb://connection-string" /backup
```

### Automated Backups
- MongoDB Atlas automatic backups
- S3 versioning for file uploads
- Regular database snapshots

---

## Support & Resources

### Documentation
- Docker: https://docs.docker.com
- Vercel: https://vercel.com/docs
- Render: https://render.com/docs
- MongoDB Atlas: https://docs.atlas.mongodb.com
- Socket.io: https://socket.io/docs

### Common Commands
```bash
# Check Docker version
docker --version
docker-compose --version

# Check Node version
node --version
npm --version

# Check MongoDB connection
mongosh "your-connection-string"

# Test API endpoint
curl http://localhost:5000/api/health
```

---

## All Features Working

✅ Authentication & Authorization
✅ Workspaces & Role Management  
✅ Projects & Epics
✅ Tasks with full metadata
✅ Kanban Board
✅ Calendar View
✅ File Uploads (S3/Cloudinary)
✅ Global Search
✅ Analytics & Charts
✅ **Real-Time Notifications**
✅ **Task Dependencies**
✅ **Email Notifications**
✅ Dark Mode
✅ Responsive Design
✅ **Docker Deployment**
✅ **Vercel/Render Ready**

---

**Your TREK platform is production-ready and fully deployable!**

