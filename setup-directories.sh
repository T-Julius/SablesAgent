#!/bin/bash

# This script sets up the necessary directory structure for Vercel deployment

# Create main directories
mkdir -p public src/contexts backend

# Create public assets directory
mkdir -p public/assets

# Create a placeholder favicon
echo "Creating placeholder favicon"
touch public/favicon.ico
touch public/logo192.png
touch public/logo512.png

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file"
  cat > .env << EOF
NODE_ENV=development
PORT=5000
EOF
fi

echo "Directory structure has been set up successfully!"
echo "You may now run deploy-vercel.sh to deploy to Vercel."
