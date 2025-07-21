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
  InputAdornment,
  IconButton as MuiIconButton,
} from '@mui/material';
import { Edit, Delete, Add, Visibility, VisibilityOff } from '@mui/icons-material';

const API_URL = 'http://localhost:4000/api/users';

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 0
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setCurrentUser({
        ...user,
        password: ''
      });
    } else {
      setCurrentUser({
        username: '',
        email: '',
        password: '',
        role: 0
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setShowPassword(false);
    setCurrentUser({
      username: '',
      email: '',
      password: '',
      role: 0
    });
  };

  const handleSaveUser = async () => {
    try {
      const method = currentUser.userId ? 'PUT' : 'POST';
      const url = currentUser.userId 
        ? `${API_URL}/${currentUser.userId}`
        : API_URL;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentUser),
      });

      if (!response.ok) {
        throw new Error('Error al guardar el usuario');
      }

      await fetchUsers();
      handleCloseDialog();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el usuario');
      }

      await fetchUsers();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'user':
        return 'Usuario';
      case 'cashier':
        return 'Cajero';
      case 'waiter':
        return 'Mesero';
      default:
        return role;
    }
  };

  return (
    <Box className="user-manager" p={2}>
      <Card>
        <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
          <h2>Gestión de Usuarios</h2>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Nuevo Usuario
          </Button>
        </Box>

        <TableContainer sx={{ padding: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Usuario</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleText(user.role)}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenDialog(user)}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteUser(user.userId)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentUser.userId ? 'Editar Usuario' : 'Nuevo Usuario'}
        </DialogTitle>
        <DialogContent>
          <Box p={2}>
            <TextField
              fullWidth
              label="Nombre de Usuario"
              value={currentUser.username}
              onChange={(e) => setCurrentUser({
                ...currentUser,
                username: e.target.value
              })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={currentUser.email}
              onChange={(e) => setCurrentUser({
                ...currentUser,
                email: e.target.value
              })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              value={currentUser.password}
              onChange={(e) => setCurrentUser({
                ...currentUser,
                password: e.target.value
              })}
              margin="normal"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <MuiIconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </MuiIconButton>
                  </InputAdornment>
                ),
              }}
              helperText={currentUser.userId ? "Deja en blanco para mantener la contraseña actual" : ""}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Rol</InputLabel>
              <Select
                value={currentUser.role}
                onChange={(e) => setCurrentUser({
                  ...currentUser,
                  role: e.target.value
                })}
              >
                <MenuItem value={1}>Administrador</MenuItem>
                <MenuItem value={2}>Usuario</MenuItem>
                <MenuItem value={3}>Cajero</MenuItem>
                <MenuItem value={4}>Mesero</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button 
            onClick={handleSaveUser} 
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

export default UserManager;