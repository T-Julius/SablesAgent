import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './contexts/AuthContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// Admin Pages
import AdminDashboardPage from './pages/admin/DashboardPage';
import AdminUsersPage from './pages/admin/UsersPage';
import AdminDocumentsPage from './pages/admin/DocumentsPage';
import AdminEventsPage from './pages/admin/EventsPage';

// Player Pages
import PlayerDashboardPage from './pages/player/DashboardPage';
import PlayerDocumentsPage from './pages/player/DocumentsPage';
import PlayerEventsPage from './pages/player/EventsPage';
import PlayerProfilePage from './pages/player/ProfilePage';

// Shared Pages
import DocumentViewPage from './pages/shared/DocumentViewPage';
import EventDetailsPage from './pages/shared/EventDetailsPage';
import NotificationsPage from './pages/shared/NotificationsPage';
import AgentChatPage from './pages/shared/AgentChatPage';
import NotFoundPage from './pages/shared/NotFoundPage';

// Protected Route Component
const ProtectedRoute = ({ element, requiredRoles = [] }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Check if user is authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user has required role
  if (requiredRoles.length > 0 && !requiredRoles.includes(currentUser.role)) {
    // Redirect to appropriate dashboard based on role
    if (currentUser.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (currentUser.role === 'player') {
      return <Navigate to="/player/dashboard" replace />;
    } else if (currentUser.role === 'coach') {
      return <Navigate to="/coach/dashboard" replace />;
    } else {
      return <Navigate to="/login" replace />;
    }
  }
  
  return element;
};

function App() {
  const { currentUser, loading } = useAuth();
  
  // Determine default route based on user role
  const getDefaultRoute = () => {
    if (!currentUser) return '/login';
    
    switch (currentUser.role) {
      case 'admin':
        return '/admin/dashboard';
      case 'player':
        return '/player/dashboard';
      case 'coach':
        return '/coach/dashboard';
      default:
        return '/login';
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Routes>
      {/* Default route */}
      <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
      
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      
      {/* Admin routes */}
      <Route element={<MainLayout />}>
        <Route path="/admin/dashboard" element={
          <ProtectedRoute element={<AdminDashboardPage />} requiredRoles={['admin']} />
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute element={<AdminUsersPage />} requiredRoles={['admin']} />
        } />
        <Route path="/admin/documents" element={
          <ProtectedRoute element={<AdminDocumentsPage />} requiredRoles={['admin']} />
        } />
        <Route path="/admin/events" element={
          <ProtectedRoute element={<AdminEventsPage />} requiredRoles={['admin']} />
        } />
      </Route>
      
      {/* Player routes */}
      <Route element={<MainLayout />}>
        <Route path="/player/dashboard" element={
          <ProtectedRoute element={<PlayerDashboardPage />} requiredRoles={['player']} />
        } />
        <Route path="/player/documents" element={
          <ProtectedRoute element={<PlayerDocumentsPage />} requiredRoles={['player']} />
        } />
        <Route path="/player/events" element={
          <ProtectedRoute element={<PlayerEventsPage />} requiredRoles={['player']} />
        } />
        <Route path="/player/profile" element={
          <ProtectedRoute element={<PlayerProfilePage />} requiredRoles={['player']} />
        } />
      </Route>
      
      {/* Shared routes */}
      <Route element={<MainLayout />}>
        <Route path="/documents/:documentId" element={
          <ProtectedRoute element={<DocumentViewPage />} requiredRoles={['admin', 'player', 'coach', 'staff']} />
        } />
        <Route path="/events/:eventId" element={
          <ProtectedRoute element={<EventDetailsPage />} requiredRoles={['admin', 'player', 'coach', 'staff']} />
        } />
        <Route path="/notifications" element={
          <ProtectedRoute element={<NotificationsPage />} requiredRoles={['admin', 'player', 'coach', 'staff']} />
        } />
        <Route path="/agent" element={
          <ProtectedRoute element={<AgentChatPage />} requiredRoles={['admin', 'player', 'coach', 'staff']} />
        } />
      </Route>
      
      {/* 404 route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
