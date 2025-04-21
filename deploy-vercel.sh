#!/bin/bash

# Vercel deployment script for Zimbabwe Sables Rugby Team document management system
# This script prepares and deploys the application to Vercel

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Prepare the project for deployment
echo "Preparing project for deployment..."

# Create necessary directories if they don't exist
mkdir -p build backend/routes

# Copy updated configuration files
echo "Copying updated configuration files..."
cp vercel.json .
cp .env.example .env

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the application
echo "Building application..."
npm run build

# Set up environment variables
echo "Setting up environment variables..."
vercel env add MONGODB_URI
vercel env add JWT_SECRET
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add GOOGLE_API_KEY
vercel env add GOOGLE_REDIRECT_URI
vercel env add EMAIL_HOST
vercel env add EMAIL_PORT
vercel env add EMAIL_USER
vercel env add EMAIL_PASSWORD
vercel env add EMAIL_DEFAULT_SENDER
vercel env add FIREBASE_PROJECT_ID
vercel env add FIREBASE_PRIVATE_KEY
vercel env add FIREBASE_CLIENT_EMAIL
vercel env add ELASTIC_URL
vercel env add ELASTIC_INDEX
vercel env add TOKEN_ENCRYPTION_KEY
vercel env add WEBHOOK_SECRET_TOKEN

# Deploy to Vercel
echo "Deploying to Vercel..."
vercel deploy --prod

echo "Deployment completed!"
