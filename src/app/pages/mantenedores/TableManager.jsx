import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Paper,
} from '@mui/material';
import { Edit, Delete, Add, Restaurant } from '@mui/icons-material';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api/tables`;

const TableManager = () => {
  const [tables, setTables] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentTable, setCurrentTable] = useState({
    number: '',
    capacity: '',
    state: 1, // 1: Disponible, 2: Ocupada, 3: Reservada
  });

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setTables(data);
    } catch (error) {
      console.error('Error al cargar mesas:', error);
    }
  };

  const handleOpenDialog = (table = null) => {
    if (table) {
      setCurrentTable(table);
    } else {
      setCurrentTable({ 
        number: '', 
        capacity: '', 
        state: 1, // 1: Disponible, 2: Ocupada, 3: Reservada
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentTable({ 
      number: '', 
      capacity: '', 
      state: 1, // 1: Disponible, 2: Ocupada, 3: Reservada
    });
  };

  const handleSaveTable = async () => {
    try {
      const method = currentTable.tableId ? 'PUT' : 'POST';
      const url = currentTable.tableId 
        ? `${API_URL}/${currentTable.tableId}`
        : API_URL;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentTable),
      });

      if (!response.ok) {
        throw new Error('Error al guardar la mesa');
      }

      await fetchTables();
      handleCloseDialog();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDeleteTable = async (tableId) => {
    try {
      const response = await fetch(`${API_URL}/${tableId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la mesa');
      }

      await fetchTables();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getStatusColor = (state) => {
    switch (state) {
      case 1: // Disponible
        return '#4CAF50'; // Verde
      case 2: // Ocupada:
        return '#F44336'; // Rojo
      case 3: // Reservada:
        return '#FFC107'; // Amarillo
      default:
        return '#9E9E9E'; // Gris
    }
  };

  const getStatusText = (state) => {
    switch (state) {
      case 1:
        return 'Disponible';
      case 2:
        return 'Ocupada';
      case 3:
        return 'Reservada';
      default:
        return 'Desconocido';
    }
  };

  return (
    <Box className="table-manager" p={2}>
      <Card>
        <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
          <h2>Gestión de Mesas</h2>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Nueva Mesa
          </Button>
        </Box>

        <Box p={2}>
          <Grid container spacing={2}>
            {tables.map((table) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={table.tableId}>
                <Paper 
                  elevation={3} 
                  sx={{ 
                    p: 2, 
                    position: 'relative',
                    borderTop: `4px solid ${getStatusColor(table.state)}`
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center">
                      <Restaurant sx={{ mr: 1 }} />
                      <h3 style={{ margin: 0 }}>Mesa {table.number}</h3>
                    </Box>
                    <Box>
                      <IconButton onClick={() => handleOpenDialog(table)} size="small">
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteTable(table.tableId)} size="small">
                        <Delete />
                      </IconButton>
                    </Box>
                  </Box>
                  <Box mt={2}>
                    <p><strong>Capacidad:</strong> {table.capacity} personas</p>
                    <p><strong>Estado:</strong> {getStatusText(table.state)}</p>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <TableContainer sx={{ padding: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Número</TableCell>
                <TableCell>Capacidad</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tables.map((table) => (
                <TableRow key={table.tableId}>
                  <TableCell>{table.number}</TableCell>
                  <TableCell>{table.capacity}</TableCell>
                  <TableCell>
                    <Box 
                      sx={{ 
                        backgroundColor: getStatusColor(table.state),
                        color: 'white',
                        p: 0.5,
                        borderRadius: 1,
                        display: 'inline-block',
                        minWidth: 80,
                        textAlign: 'center'
                      }}
                    >
                      {getStatusText(table.state)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenDialog(table)}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteTable(table.tableId)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          {currentTable.tableId ? 'Editar Mesa' : 'Nueva Mesa'}
        </DialogTitle>
        <DialogContent>
          <Box p={2}>
            <TextField
              fullWidth
              label="Número de Mesa"
              type="number"
              value={currentTable.number}
              onChange={(e) => setCurrentTable({
                ...currentTable,
                number: e.target.value
              })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Capacidad"
              type="number"
              value={currentTable.capacity}
              onChange={(e) => setCurrentTable({
                ...currentTable,
                capacity: e.target.value
              })}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Estado</InputLabel>
              <Select
                value={currentTable.state}
                onChange={(e) => setCurrentTable({
                  ...currentTable,
                  state: e.target.value
                })}
              >
                <MenuItem value={1}>Disponible</MenuItem>
                <MenuItem value={2}>Ocupada</MenuItem>
                <MenuItem value={3}>Reservada</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button 
            onClick={handleSaveTable} 
            color="primary" 
            variant="contained"
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TableManager;