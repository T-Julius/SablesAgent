import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardHeader, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  Divider,
  Button,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminEventsPage = () => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openEventDialog, setOpenEventDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [totalEvents, setTotalEvents] = useState(0);
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });
  
  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    location: '',
    startTime: new Date(),
    endTime: new Date(new Date().getTime() + 60 * 60 * 1000), // 1 hour later
    attendees: []
  });
  
  // Users for attendee selection
  const [users, setUsers] = useState([]);
  
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchEvents();
    fetchUsers();
  }, [paginationModel, searchQuery]);
  
  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      const response = await axios.get('/events', {
        params: {
          page: paginationModel.page + 1,
          limit: paginationModel.pageSize,
          search: searchQuery || undefined
        }
      });
      
      setEvents(response.data.data.events || []);
      setTotalEvents(response.data.data.total || 0);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchUsers = async () => {
    try {
      const response = await axios.get('/users');
      setUsers(response.data.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };
  
  const handleViewEvent = (eventId) => {
    navigate(`/events/${eventId}`);
  };
  
  const handleCreateEvent = () => {
    setIsEditMode(false);
    setEventForm({
      title: '',
      description: '',
      location: '',
      startTime: new Date(),
      endTime: new Date(new Date().getTime() + 60 * 60 * 1000),
      attendees: []
    });
    setOpenEventDialog(true);
  };
  
  const handleEditEvent = (event) => {
    setIsEditMode(true);
    setEventForm({
      title: event.summary,
      description: event.description || '',
      location: event.location || '',
      startTime: new Date(event.start.dateTime),
      endTime: new Date(event.end.dateTime),
      attendees: event.attendees?.map(a => a.email) || []
    });
    setSelectedEvent(event);
    setOpenEventDialog(true);
  };
  
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    try {
      await axios.delete(`/events/${selectedEvent.calendarId}/${selectedEvent.id}`);
      setOpenDeleteDialog(false);
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };
  
  const handleSaveEvent = async () => {
    try {
      if (isEditMode && selectedEvent) {
        // Update existing event
        await axios.put(`/events/${selectedEvent.calendarId}/${selectedEvent.id}`, {
          title: eventForm.title,
          description: eventForm.description,
          location: eventForm.location,
          startTime: eventForm.startTime.toISOString(),
          endTime: eventForm.endTime.toISOString(),
          attendees: eventForm.attendees.map(email => ({ email }))
        });
      } else {
        // Create new event
        await axios.post('/events', {
          title: eventForm.title,
          description: eventForm.description,
          location: eventForm.location,
          startTime: eventForm.startTime.toISOString(),
          endTime: eventForm.endTime.toISOString(),
          attendees: eventForm.attendees.map(email => ({ email }))
        });
      }
      
      setOpenEventDialog(false);
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };
  
  const columns = [
    { field: 'summary', headerName: 'Title', flex: 2 },
    { field: 'location', headerName: 'Location', flex: 1 },
    { 
      field: 'start', 
      headerName: 'Start Time', 
      flex: 1,
      valueGetter: (params) => new Date(params.row.start.dateTime),
      valueFormatter: (params) => params.value.toLocaleString()
    },
    { 
      field: 'end', 
      headerName: 'End Time', 
      flex: 1,
      valueGetter: (params) => new Date(params.row.end.dateTime),
      valueFormatter: (params) => params.value.toLocaleString()
    },
    {
      field: 'attendees',
      headerName: 'Attendees',
      flex: 1,
      valueGetter: (params) => params.row.attendees?.length || 0
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton 
            size="small" 
            onClick={() => handleViewEvent(params.row.id)}
            title="View Event"
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => handleEditEvent(params.row)}
            title="Edit Event"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => {
              setSelectedEvent(params.row);
              setOpenDeleteDialog(true);
            }}
            title="Delete Event"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      )
    }
  ];
  
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Events Management
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleCreateEvent}
        >
          Create Event
        </Button>
      </Box>
      
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search events by title, location, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
          />
        </CardContent>
      </Card>
      
      <Card>
        <CardContent sx={{ height: 600 }}>
          <DataGrid
            rows={events}
            columns={columns}
            getRowId={(row) => row.id}
            rowCount={totalEvents}
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            paginationModel={paginationModel}
            paginationMode="server"
            onPaginationModelChange={setPaginationModel}
            disableRowSelectionOnClick
          />
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the event "{selectedEvent?.summary}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteEvent} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
      
      {/* Event Create/Edit Dialog */}
      <Dialog
        open={openEventDialog}
        onClose={() => setOpenEventDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{isEditMode ? 'Edit Event' : 'Create Event'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Event Title"
              value={eventForm.title}
              onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Description"
              value={eventForm.description}
              onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
              margin="normal"
              multiline
              rows={3}
            />
            
            <TextField
              fullWidth
              label="Location"
              value={eventForm.location}
              onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
              margin="normal"
            />
            
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <DateTimePicker
                    label="Start Time"
                    value={eventForm.startTime}
                    onChange={(newValue) => setEventForm({...eventForm, startTime: newValue})}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <DateTimePicker
                    label="End Time"
                    value={eventForm.endTime}
                    onChange={(newValue) => setEventForm({...eventForm, endTime: newValue})}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
              </Grid>
            </LocalizationProvider>
            
            <FormControl fullWidth sx={{ mt: 3 }}>
              <InputLabel>Attendees</InputLabel>
              <Select
                multiple
                value={eventForm.attendees}
                onChange={(e) => setEventForm({...eventForm, attendees: e.target.value})}
                label="Attendees"
              >
                {users.map((user) => (
                  <MenuItem key={user._id} value={user.email}>
                    {user.name} ({user.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEventDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveEvent} variant="contained">
            {isEditMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminEventsPage;
