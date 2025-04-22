import React from 'react';
import { Box, Typography, Container } from '@mui/material';

function App() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Zimbabwe Sables Rugby Team Document Management System
        </Typography>
        <Typography variant="body1">
          Welcome to the document management system. The application is currently being set up.
        </Typography>
      </Box>
    </Container>
  );
}

export default App;
