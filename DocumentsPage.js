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
  DialogActions
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminDocumentsPage = () => {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });
  
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchDocuments();
  }, [paginationModel, searchQuery]);
  
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      const response = await axios.get('/documents', {
        params: {
          page: paginationModel.page + 1,
          limit: paginationModel.pageSize,
          search: searchQuery || undefined
        }
      });
      
      setDocuments(response.data.data.documents || []);
      setTotalDocuments(response.data.data.total || 0);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewDocument = (documentId) => {
    navigate(`/documents/${documentId}`);
  };
  
  const handleEditDocument = (documentId) => {
    navigate(`/admin/documents/edit/${documentId}`);
  };
  
  const handleDeleteDocument = async () => {
    if (!selectedDocument) return;
    
    try {
      await axios.delete(`/documents/${selectedDocument._id}`);
      setOpenDeleteDialog(false);
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };
  
  const columns = [
    { field: 'title', headerName: 'Title', flex: 2 },
    { field: 'type', headerName: 'Type', flex: 1 },
    { 
      field: 'createdAt', 
      headerName: 'Created', 
      flex: 1,
      valueFormatter: (params) => new Date(params.value).toLocaleString()
    },
    { 
      field: 'updatedAt', 
      headerName: 'Updated', 
      flex: 1,
      valueFormatter: (params) => new Date(params.value).toLocaleString()
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
            onClick={() => handleViewDocument(params.row._id)}
            title="View Document"
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => handleEditDocument(params.row._id)}
            title="Edit Document"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => {
              setSelectedDocument(params.row);
              setOpenDeleteDialog(true);
            }}
            title="Delete Document"
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
          Documents Management
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => navigate('/admin/documents/create')}
        >
          Add Document
        </Button>
      </Box>
      
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search documents by title, content, or type..."
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
            rows={documents}
            columns={columns}
            getRowId={(row) => row._id}
            rowCount={totalDocuments}
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
            Are you sure you want to delete the document "{selectedDocument?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteDocument} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDocumentsPage;
