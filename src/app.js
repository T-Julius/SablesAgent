import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './contexts/AuthContext';

// Placeholder component for loading state
const Loading = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress />
  </Box>
);

// Placeholder component for dashboard
const Dashboard = () => (
  <Box sx={{ p: 4 }}>
    <h1>Zimbabwe Sables Rugby Team Document Management System</h1>
    <p>Welcome to the document management system.</p>
  </Box>
);

// Placeholder component for login
const Login = () => (
  <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
    <Box sx={{ p: 4, border: '1px solid #ccc', borderRadius: 2, maxWidth: 400 }}>
      <h2>Login</h2>
      <p>Please log in to access the system.</p>
    </Box>
  </Box>
);

function App() {
  // Mock loading state for now
  const loading = false;
  const currentUser = null;
  
  if (loading) {
    return <Loading />;
  }
  
  return (
    <Routes>
      {/* Default route */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Dashboard route */}
      <Route path="/dashboard" element={<Dashboard />} />
      
      {/* Login route */}
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

export default App;
