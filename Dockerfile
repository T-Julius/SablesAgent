FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Production image
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built app from base image
COPY --from=base /app/dist ./dist
COPY --from=base /app/backend ./backend
COPY --from=base /app/public ./public

# Copy configuration files
COPY .env.production ./.env

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "backend/server.js"]
