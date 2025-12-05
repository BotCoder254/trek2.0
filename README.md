# TREK - Project Management Platform

A modern, full-stack project management platform built with the MERN stack (MongoDB, Express, React, Node.js).

## 📸 Screenshots

<table>
  <tr>
    <td><img src="projectimages/Screenshot From 2025-11-26 13-31-18.png" alt="Dashboard" width="100%"/></td>
    <td><img src="projectimages/Screenshot From 2025-11-26 13-32-48.png" alt="Projects" width="100%"/></td>
    <td><img src="projectimages/Screenshot From 2025-11-26 13-32-55.png" alt="Tasks" width="100%"/></td>
     <td><img src="projectimages/Screenshot From 2025-11-26 22-24-40.png" alt="Tasks" width="100%"/></td>
  </tr>
  <tr>
    <td><img src="projectimages/Screenshot From 2025-11-26 18-25-45.png" alt="Analytics" width="100%"/></td>
    <td><img src="projectimages/Screenshot From 2025-11-26 18-25-54.png" alt="Calendar" width="100%"/></td>
    <td><img src="projectimages/Screenshot From 2025-11-26 18-26-13.png" alt="Settings" width="100%"/></td>
    <td><img src="projectimages/Screenshot From 2025-11-26 17-26-26.png" alt="Settings" width="100%"/></td>
  </tr>
</table>

## 🚀 Features

### ✅ Completed Features

#### 1. Authentication & Onboarding
- Email/password authentication with JWT
- Beautiful split-layout auth pages with images
- Invite-aware signup and login flows
- Password strength validation
- Secure token management

#### 2. Global Layout & Sidebar
- Persistent collapsible sidebar with smooth animations
- Responsive design (desktop, tablet, mobile)
- Workspace switcher with dropdown
- Top bar with search, notifications, and user menu
- Dark mode toggle
- Role-based navigation

#### 3. Workspaces & Role-Based Access
- Create and manage workspaces
- Four role types: Owner, Manager, Member, Viewer
- Role-based permissions system
- Workspace settings and customization
- Workspace color themes

#### 4. Member Management
- Invite members via email
- Pending invite management
- Role assignment and modification
- Member list with avatars
- Remove members functionality
- Last active timestamps

#### 5. Dark Mode
- System preference detection
- Persistent theme selection
- Smooth theme transitions
- Complete dark mode coverage

#### 6. User Profile & Settings
- Comprehensive profile management
- Avatar upload with drag-and-drop
- Bio and timezone settings
- Theme preferences (light/dark/system)
- Display density options
- Password change with validation
- Email change with confirmation flow
- Notification preferences
- Activity history tracking

## 🛠️ Tech Stack

### Frontend
- **React** - UI library
- **React Router** - Navigation
- **TanStack Query (React Query)** - Server state management
- **Framer Motion** - Animations
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment (copy and edit env.config.js):
```bash
cp config/env.example.js config/env.config.js
```

4. Update `config/env.config.js` with your settings:
```javascript
module.exports = {
  PORT: 5000,
  MONGODB_URI: 'mongodb://localhost:27017/trek',
  JWT_SECRET: 'your_secret_key',
  JWT_EXPIRES_IN: '7d',
  NODE_ENV: 'development',
  FRONTEND_URL: 'http://localhost:3000'
};
```

5. Start the server:
```bash
npm start
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to project root:
```bash
cd ..
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## 🎨 Design System

### Colors
- **Primary**: Orange (#F97316) - Main brand color
- **Secondary**: Red (#EF4444) - Destructive actions
- **Success**: Green (#10B981) - Success states
- **Warning**: Amber (#F59E0B) - Warning states
- **Info**: Purple (#8B5CF6) - Information

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1023px
- **Desktop**: ≥ 1024px

### Components
- Buttons: Primary, Secondary, Ghost, Danger
- Inputs: Text, Email, Password, Textarea
- Cards: Standard, Hover
- Badges: Role badges with color coding
- Modals: Animated overlays

## 🔐 Authentication Flow

1. User signs up with email/password
2. JWT token generated and stored
3. Token sent with each API request
4. Protected routes check for valid token
5. Automatic redirect to login if token invalid

## 👥 Role Permissions

### Owner
- Full workspace control
- Delete workspace
- Transfer ownership
- Invite/remove members
- Change all roles
- Create/manage projects

### Manager
- Workspace updates
- Invite members
- Change Member/Viewer roles
- Create/manage projects
- Cannot modify Owners

### Member
- Create projects (if allowed)
- Create/update tasks
- View workspace content
- Limited settings access

### Viewer
- Read-only access
- View projects and tasks
- Cannot modify content
- Disabled edit controls with tooltips

## 📱 Responsive Design

### Desktop (≥ 1024px)
- Persistent sidebar (240px width)
- Full labels and icons
- Table layouts for data

### Tablet (768px - 1023px)
- Collapsible sidebar
- Icons + short labels
- Adaptive layouts

### Mobile (< 768px)
- Hamburger menu
- Full-screen drawer sidebar
- Bottom navigation (optional)
- Stacked card layouts

## 🎭 Animations

All animations powered by Framer Motion:
- Page transitions
- Sidebar collapse/expand
- Modal appearances
- Button hover effects
- Active state indicators

## 📁 Project Structure

```
trek/
├── backend/
│   ├── config/          # Configuration files
│   ├── middleware/      # Express middleware
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   └── server.js        # Entry point
├── src/
│   ├── components/      # React components
│   │   └── layout/      # Layout components
│   ├── context/         # React context
│   ├── pages/           # Page components
│   │   ├── auth/        # Auth pages
│   │   └── workspace/   # Workspace pages
│   ├── services/        # API service layer
│   ├── utils/           # Utility functions
│   ├── App.js           # Main app component
│   ├── index.js         # Entry point
│   └── index.css        # Global styles
├── public/              # Static files
└── package.json         # Dependencies
```

## 🔄 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password

### Users
- `GET /api/users/me` - Get user profile
- `PATCH /api/users/me` - Update user profile
- `POST /api/users/me/avatar/presign` - Get avatar upload URL
- `PATCH /api/users/me/preferences` - Update preferences
- `POST /api/users/me/email/change` - Initiate email change
- `POST /api/users/confirm-email/:token` - Confirm email change
- `GET /api/users/me/activity` - Get user activity history

### Workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces` - Get user's workspaces
- `GET /api/workspaces/:id` - Get workspace details
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace
- `GET /api/workspaces/:id/members` - Get members
- `PUT /api/workspaces/:id/members/:memberId/role` - Update role
- `DELETE /api/workspaces/:id/members/:memberId` - Remove member
- `POST /api/workspaces/:id/leave` - Leave workspace

### Invites
- `POST /api/invites` - Create invite
- `GET /api/invites/:token` - Get invite details
- `POST /api/invites/:token/accept` - Accept invite
- `GET /api/invites/workspace/:id` - Get workspace invites
- `DELETE /api/invites/:id` - Cancel invite

## 🚧 Coming Soon

- Projects & Epics
- Tasks & Subtasks(Implemented)
- Kanban Board
- Calendar View
- Analytics Dashboard
- File Attachments(implemented)
- Comments & Activity Feed(implemented)
- Real-time Notifications(implemented)
- Advanced Search(implemented)
- Team Chat(cooming soon)

## 📄 License

This project is private and proprietary and also open source .

## 👨‍💻 Development

Built with ❤️ using modern web technologies.

---

**TREK** - Where teams collaborate and projects succeed! 🏔️
