# Multi-stage build for production

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend

# Copy frontend package files
COPY package*.json ./
RUN npm install

# Copy frontend source
COPY . .

# Build frontend
RUN npm run build

# Stage 2: Build backend
FROM node:18-alpine AS backend-build
WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./
RUN npm install --production

# Stage 3: Production image
FROM node:18-alpine
WORKDIR /app

# Install production dependencies
RUN apk add --no-cache tini

# Copy backend files
COPY --from=backend-build /app/backend /app/backend
COPY --from=frontend-build /app/build /app/frontend/build

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 5000

# Use tini to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

# Start server
CMD ["node", "server.js"]

