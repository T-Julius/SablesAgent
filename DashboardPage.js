import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Card, 
  CardContent, 
  CardHeader, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  Divider,
  Button,
  CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';
import DescriptionIcon from '@mui/icons-material/Description';
import EventIcon from '@mui/icons-material/Event';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PeopleIcon from '@mui/icons-material/People';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(2),
  color: theme.palette.text.primary,
}));

const AdminDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDocuments: 0,
    totalEvents: 0,
    totalNotifications: 0
  });
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch dashboard statistics
        const statsResponse = await axios.get('/admin/dashboard/stats');
        
        // Fetch recent documents
        const documentsResponse = await axios.get('/documents/recent', { params: { limit: 5 } });
        
        // Fetch upcoming events
        const eventsResponse = await axios.get('/events', { 
          params: { 
            timeMin: new Date().toISOString(),
            maxResults: 5
          } 
        });
        
        // Fetch recent notifications
        const notificationsResponse = await axios.get('/notifications', { params: { limit: 5 } });
        
        // Update state with fetched data
        setStats(statsResponse.data.data);
        setRecentDocuments(documentsResponse.data.data.documents || []);
        setUpcomingEvents(eventsResponse.data.data.events || []);
        setRecentNotifications(notificationsResponse.data.data.notifications || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" paragraph>
        Welcome back, {currentUser?.name}! Here's an overview of the Zimbabwe Sables Rugby Team system.
      </Typography>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Total Users
              </Typography>
              <Typography variant="h3" color="primary">
                {stats.totalUsers}
              </Typography>
              <Button 
                size="small" 
                sx={{ mt: 2 }}
                onClick={() => navigate('/admin/users')}
              >
                View All Users
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Total Documents
              </Typography>
              <Typography variant="h3" color="primary">
                {stats.totalDocuments}
              </Typography>
              <Button 
                size="small" 
                sx={{ mt: 2 }}
                onClick={() => navigate('/admin/documents')}
              >
                View All Documents
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Total Events
              </Typography>
              <Typography variant="h3" color="primary">
                {stats.totalEvents}
              </Typography>
              <Button 
                size="small" 
                sx={{ mt: 2 }}
                onClick={() => navigate('/admin/events')}
              >
                View All Events
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Notifications
              </Typography>
              <Typography variant="h3" color="primary">
                {stats.totalNotifications}
              </Typography>
              <Button 
                size="small" 
                sx={{ mt: 2 }}
                onClick={() => navigate('/notifications')}
              >
                View All Notifications
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Recent Documents" />
            <Divider />
            <CardContent>
              {recentDocuments.length > 0 ? (
                <List>
                  {recentDocuments.map((doc) => (
                    <ListItem 
                      key={doc._id} 
                      button
                      onClick={() => navigate(`/documents/${doc._id}`)}
                    >
                      <ListItemIcon>
                        <DescriptionIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary={doc.title} 
                        secondary={`Updated: ${new Date(doc.updatedAt).toLocaleString()}`} 
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No recent documents found.
                </Typography>
              )}
              <Button 
                variant="outlined" 
                fullWidth 
                sx={{ mt: 2 }}
                onClick={() => navigate('/admin/documents')}
              >
                View All Documents
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Upcoming Events" />
            <Divider />
            <CardContent>
              {upcomingEvents.length > 0 ? (
                <List>
                  {upcomingEvents.map((event) => (
                    <ListItem 
                      key={event.id} 
                      button
                      onClick={() => navigate(`/events/${event.id}`)}
                    >
                      <ListItemIcon>
                        <EventIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary={event.summary} 
                        secondary={`${new Date(event.start.dateTime).toLocaleString()}`} 
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No upcoming events found.
                </Typography>
              )}
              <Button 
                variant="outlined" 
                fullWidth 
                sx={{ mt: 2 }}
                onClick={() => navigate('/admin/events')}
              >
                View All Events
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Recent Notifications" />
            <Divider />
            <CardContent>
              {recentNotifications.length > 0 ? (
                <List>
                  {recentNotifications.map((notification) => (
                    <ListItem 
                      key={notification._id} 
                      button
                      onClick={() => navigate(`/notifications`)}
                    >
                      <ListItemIcon>
                        <NotificationsIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary={notification.title} 
                        secondary={`${new Date(notification.createdAt).toLocaleString()}`} 
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No recent notifications found.
                </Typography>
              )}
              <Button 
                variant="outlined" 
                fullWidth 
                sx={{ mt: 2 }}
                onClick={() => navigate('/notifications')}
              >
                View All Notifications
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboardPage;
