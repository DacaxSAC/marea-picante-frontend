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
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';

const API_URL = 'https://marea-picante-prod-server.onrender.com/api/categories';

const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentCategory, setCurrentCategory] = useState({
    code: '',
    name: '',
    description: ''
  });

  const handleOpenDialog = (category = null) => {
    if (category) {
      setCurrentCategory(category);
    } else {
      setCurrentCategory({ name: '', description: '' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentCategory({ name: '', description: '' });
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const handleSaveCategory = async () => {
    try {
      const method = currentCategory.categoryId ? 'PUT' : 'POST';
      const url = currentCategory.categoryId 
        ? `${API_URL}/${currentCategory.categoryId}`
        : `${API_URL}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentCategory),
      });

      if (!response.ok) {
        throw new Error('Error al guardar la categoría');
      }

      await fetchCategories(); // Recargar categorías
      handleCloseDialog();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      const response = await fetch(`${API_URL}/${categoryId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Error al eliminar la categoría');
      }

      await fetchCategories(); // Recargar categorías
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <Box className="category-manager" p={2} >
      <Card>
        <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
          <h2>Gestión de Categorías</h2>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Nueva Categoría
          </Button>
        </Box>

        <TableContainer sx={{ padding: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.categoryId}>
                  <TableCell>{category.code}</TableCell>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>{category.description}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenDialog(category)}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteCategory(category.categoryId)}>
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
          {currentCategory.categoryId ? 'Editar Categoría' : 'Nueva Categoría'}
        </DialogTitle>
        <DialogContent>
          <Box p={2}>
            <TextField
              fullWidth
              label="Nombre"
              value={currentCategory.name}
              onChange={(e) => setCurrentCategory({
                ...currentCategory,
                name: e.target.value
              })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Descripción"
              value={currentCategory.description}
              onChange={(e) => setCurrentCategory({
                ...currentCategory,
                description: e.target.value
              })}
              margin="normal"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button 
            onClick={handleSaveCategory} 
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

export default CategoryManager;