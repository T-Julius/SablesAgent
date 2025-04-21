import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Box, Container, CssBaseline, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';

const AuthLayoutRoot = styled('div')(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  width: '100%'
}));

const AuthLayoutWrapper = styled('div')({
  display: 'flex',
  flex: '1 1 auto',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '24px'
});

const AuthLayout = () => {
  const { currentUser } = useAuth();

  // If user is already authenticated, redirect to appropriate dashboard
  if (currentUser) {
    if (currentUser.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (currentUser.role === 'player') {
      return <Navigate to="/player/dashboard" replace />;
    } else if (currentUser.role === 'coach') {
      return <Navigate to="/coach/dashboard" replace />;
    }
  }

  return (
    <AuthLayoutRoot>
      <CssBaseline />
      <Container maxWidth="sm">
        <AuthLayoutWrapper>
          <Paper 
            elevation={6} 
            sx={{ 
              p: 4, 
              width: '100%',
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography color="primary" variant="h4" gutterBottom>
                Zimbabwe Sables Rugby Team
              </Typography>
              <Typography color="textSecondary" variant="body2">
                Document Management System
              </Typography>
            </Box>
            <Outlet />
          </Paper>
        </AuthLayoutWrapper>
      </Container>
    </AuthLayoutRoot>
  );
};

export default AuthLayout;
