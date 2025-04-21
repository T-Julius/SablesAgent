# Deployment Guide for Zimbabwe Sables Rugby Team Document Management System

This guide provides instructions for deploying the Zimbabwe Sables Rugby Team Document Management System to Vercel.

## Prerequisites

Before deploying, ensure you have the following:

1. A Vercel account with team ID: `team_CPl7jZawsnSFC5RzPUoT1KhK`
2. Access to the required environment variables:
   - MongoDB connection string
   - JWT secret key
   - Google API credentials
   - Email service credentials
   - Firebase credentials (for notifications)
3. Node.js and npm installed on your local machine

## Deployment Steps

### Option 1: Using the Deployment Script

1. Make the deployment script executable:
   ```bash
   chmod +x deploy-vercel.sh
   ```

2. Run the deployment script:
   ```bash
   ./deploy-vercel.sh
   ```

3. Follow the prompts to enter the required environment variables.

### Option 2: Manual Deployment

1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Set up environment variables:
   ```bash
   vercel env add MONGODB_URI
   vercel env add JWT_SECRET
   vercel env add GOOGLE_CLIENT_ID
   vercel env add GOOGLE_CLIENT_SECRET
   vercel env add GOOGLE_API_KEY
   vercel env add EMAIL_HOST
   vercel env add EMAIL_PORT
   vercel env add EMAIL_USER
   vercel env add EMAIL_PASS
   vercel env add FIREBASE_PROJECT_ID
   vercel env add FIREBASE_PRIVATE_KEY
   vercel env add FIREBASE_CLIENT_EMAIL
   ```

4. Deploy to Vercel:
   ```bash
   vercel deploy --prod --team team_CPl7jZawsnSFC5RzPUoT1KhK
   ```

## Post-Deployment Configuration

After deployment, you'll need to:

1. Set up Google Drive API access:
   - Configure the redirect URI in the Google Cloud Console to point to your new Vercel domain
   - Update the OAuth consent screen with your Vercel domain

2. Configure Firebase for notifications:
   - Add your Vercel domain to the authorized domains in Firebase Console

3. Test the deployment:
   - Verify that all features are working correctly
   - Test document integration with Google Drive
   - Test the intelligent agent interface
   - Test email and notification functionality
   - Test calendar integration

## Troubleshooting

If you encounter issues during deployment:

1. Check the Vercel deployment logs for errors
2. Verify that all environment variables are correctly set
3. Ensure that the MongoDB instance is accessible from Vercel
4. Check that Google API credentials have the correct permissions
5. Verify that the Firebase configuration is correct

## Support

For additional support, contact the development team or refer to the system documentation.
