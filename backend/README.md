# TREK Backend API

RESTful API for the TREK Project Management Platform.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Configure environment in `config/env.config.js`

3. Make sure MongoDB is running

4. Start server:
```bash
npm start
```

Server runs on `http://localhost:5000`

## API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User
```http
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "inviteToken": "optional-invite-token"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "inviteToken": "optional-invite-token"
}
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

### Workspace Endpoints

#### Create Workspace
```http
POST /workspaces
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Workspace",
  "description": "Description here",
  "color": "#F97316"
}
```

#### Get User Workspaces
```http
GET /workspaces
Authorization: Bearer <token>
```

#### Get Workspace Details
```http
GET /workspaces/:workspaceId
Authorization: Bearer <token>
```

#### Get Workspace Members
```http
GET /workspaces/:workspaceId/members
Authorization: Bearer <token>
```

#### Update Member Role
```http
PUT /workspaces/:workspaceId/members/:membershipId/role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "Manager"
}
```

### Invite Endpoints

#### Create Invite
```http
POST /invites
Authorization: Bearer <token>
Content-Type: application/json

{
  "workspaceId": "workspace-id",
  "email": "colleague@example.com",
  "role": "Member"
}
```

#### Get Invite Details (Public)
```http
GET /invites/:token
```

#### Accept Invite
```http
POST /invites/:token/accept
Authorization: Bearer <token>
```

## Database Models

### User
- email (unique)
- password (hashed)
- firstName
- lastName
- avatar
- isActive
- lastActive

### Workspace
- name
- description
- slug (auto-generated, unique)
- logo
- color
- settings
- createdBy

### Membership
- userId (ref: User)
- workspaceId (ref: Workspace)
- role (Owner/Manager/Member/Viewer)
- invitedBy
- joinedAt
- lastActive

### Invite
- workspaceId (ref: Workspace)
- email
- role
- token (unique)
- invitedBy
- status
- expiresAt

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Error message here",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

## Success Responses

All success responses follow this format:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data here
  }
}
```

