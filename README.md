Zimbabwe Sables Rugby Team Document Management System

This is a document management system for the Zimbabwe Sables Rugby Team, allowing for efficient management of team documents, events, and communications.

Project Structure

- `/public`: Static assets
- `/src`: React frontend code
- `/backend`: Node.js backend code

Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/sables-agent.git
cd sables-agent
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
Example .env file
NODE_ENV=development
PORT=5000
```

Development

Run the development server:
```bash
npm run dev
```

This will start both the backend server and the frontend development server.

Building for Production

Build the application:
```bash
npm run build
```

Deployment to Vercel

1. Make sure you have the Vercel CLI installed:
```bash
npm install -g vercel
```

2. Run the deployment script:
```bash
bash deploy-vercel.sh
```

Project Structure Explanation

Frontend

- React.js with Material UI
- State management with Context API
- Routing with React Router

Backend

- Express.js for API endpoints
- MongoDB for data storage
- JWT for authentication

Features

- Document management
- Event scheduling
- Team communications
- User role management
- Intelligent agent for workflow automation

Troubleshooting

If you encounter any issues during deployment:

1. Check the Vercel build logs for specific errors
2. Ensure all required environment variables are set in Vercel
3. Verify the project structure matches Vercel's expectations
