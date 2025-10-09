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
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api/products`;
const CATEGORIES_URL = `${process.env.REACT_APP_BACKEND_URL}/api/categories`;

const ProductManager = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentProduct, setCurrentProduct] = useState({
    code: '',
    name: '',
    description: '',
    pricePersonal: '',
    priceFuente: '',
    categoryId: '',
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(CATEGORIES_URL);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const handleOpenDialog = (product = null) => {
    if (product) {
      setCurrentProduct(product);
    } else {
      setCurrentProduct({ 
        name: '', 
        description: '', 
        pricePersonal: '', 
        priceFuente: '',
        categoryId: '',
        stock: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentProduct({ 
      name: '', 
      description: '', 
      pricePersonal: '', 
      priceFuente: '',
      categoryId: '',
      stock: ''
    });
  };

  const handleSaveProduct = async () => {
    try {
      const method = currentProduct.productId ? 'PUT' : 'POST';
      const url = currentProduct.productId 
        ? `${API_URL}/${currentProduct.productId}`
        : API_URL;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentProduct),
      });

      if (!response.ok) {
        throw new Error('Error al guardar el producto');
      }

      await fetchProducts();
      handleCloseDialog();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      const response = await fetch(`${API_URL}/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el producto');
      }

      await fetchProducts();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const filteredProducts = selectedCategory
    ? products.filter(product => product.categoryId === selectedCategory)
    : products;

  return (
    <Box className="product-manager" p={2}>
      <Card>
        <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
          <h2>Gestión de Productos</h2>
          <Box display="flex" gap={2}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Filtrar por Categoría</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                displayEmpty
              >
                {categories.map((category) => (
                  <MenuItem key={category.categoryId} value={category.categoryId}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
            >
              Nuevo Producto
            </Button>
          </Box>
        </Box>

        <TableContainer sx={{ padding: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Precio Personal</TableCell>
                <TableCell>Precio Fuente</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.productId}>
                  <TableCell>{product.code}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.description}</TableCell>
                  <TableCell>S/. {product.pricePersonal}</TableCell>
                  <TableCell>S/. {product.priceFuente}</TableCell>
                  <TableCell>
                    {categories.find(cat => cat.categoryId === product.categoryId)?.name}
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenDialog(product)}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteProduct(product.productId)}>
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
          {currentProduct.productId ? 'Editar Producto' : 'Nuevo Producto'}
        </DialogTitle>
        <DialogContent>
          <Box p={2}>
            <TextField
              fullWidth
              label="Nombre"
              value={currentProduct.name}
              onChange={(e) => setCurrentProduct({
                ...currentProduct,
                name: e.target.value
              })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Descripción"
              value={currentProduct.description}
              onChange={(e) => setCurrentProduct({
                ...currentProduct,
                description: e.target.value
              })}
              margin="normal"
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label="Precio Personal"
              type="number"
              value={currentProduct.pricePersonal}
              onChange={(e) => setCurrentProduct({
                ...currentProduct,
                pricePersonal: e.target.value
              })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Precio Fuente"
              type="number"
              value={currentProduct.priceFuente}
              onChange={(e) => setCurrentProduct({
                ...currentProduct,
                priceFuente: e.target.value
              })}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Categoría</InputLabel>
              <Select
                value={currentProduct.categoryId}
                onChange={(e) => setCurrentProduct({
                  ...currentProduct,
                  categoryId: e.target.value
                })}
              >
                {categories.map((category) => (
                  <MenuItem key={category.categoryId} value={category.categoryId}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button 
            onClick={handleSaveProduct} 
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

export default ProductManager;