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
  Chip,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Edit,
  Delete,
  Add,
  Visibility,
  Receipt,
  TableRestaurant,
  AccessTime,
  AttachMoney,
} from '@mui/icons-material';

const API_URL = 'http://localhost:4000/api/orders';

const OrderManager = () => {
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [products, setProducts] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [currentOrder, setCurrentOrder] = useState({
    orderId: '',
    tables: [],
    items: [],
    status: 'pending',
    total: 0,
    timestamp: new Date().toISOString(),
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [newItem, setNewItem] = useState({ productId: '', quantity: 1, price: 0 });

  useEffect(() => {
    fetchOrders();
    fetchTables();
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error al cargar órdenes:', error);
      showSnackbar('Error al cargar órdenes', 'error');
    }
  };

  const fetchTables = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/tables');
      const data = await response.json();
      setTables(data);
    } catch (error) {
      console.error('Error al cargar mesas:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleOpenDialog = (order = null) => {
    if (order) {
      setCurrentOrder(order);
    } else {
      setCurrentOrder({
        orderId: `ORD-${Date.now()}`,
        tables: [],
        items: [],
        status: 'pending',
        total: 0,
        timestamp: new Date().toISOString(),
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentOrder({
      orderId: '',
      tables: [],
      items: [],
      status: 'pending',
      total: 0,
      timestamp: new Date().toISOString(),
    });
    setNewItem({ productId: '', quantity: 1, price: 0 });
  };

  const handleOpenDetailDialog = (order) => {
    setSelectedOrder(order);
    setOpenDetailDialog(true);
  };

  const handleCloseDetailDialog = () => {
    setOpenDetailDialog(false);
    setSelectedOrder(null);
  };

  const calculateTotal = (items) => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const addItemToOrder = () => {
    if (!newItem.productId || newItem.quantity <= 0) {
      showSnackbar('Seleccione un producto y cantidad válida', 'error');
      return;
    }

    const product = products.find(p => p.id === newItem.productId);
    if (!product) {
      showSnackbar('Producto no encontrado', 'error');
      return;
    }

    const item = {
      id: Date.now(),
      productId: product.id,
      name: product.name,
      quantity: newItem.quantity,
      price: newItem.price || product.price,
      subtotal: (newItem.price || product.price) * newItem.quantity,
    };

    const updatedItems = [...currentOrder.items, item];
    const updatedOrder = {
      ...currentOrder,
      items: updatedItems,
      total: calculateTotal(updatedItems),
    };

    setCurrentOrder(updatedOrder);
    setNewItem({ productId: '', quantity: 1, price: 0 });
  };

  const removeItemFromOrder = (itemId) => {
    const updatedItems = currentOrder.items.filter(item => item.id !== itemId);
    const updatedOrder = {
      ...currentOrder,
      items: updatedItems,
      total: calculateTotal(updatedItems),
    };
    setCurrentOrder(updatedOrder);
  };

  const handleSaveOrder = async () => {
    try {
      if (currentOrder.tables.length === 0) {
        showSnackbar('Debe seleccionar al menos una mesa', 'error');
        return;
      }

      if (currentOrder.items.length === 0) {
        showSnackbar('Debe agregar al menos un producto', 'error');
        return;
      }

      const method = currentOrder.id ? 'PUT' : 'POST';
      const url = currentOrder.id ? `${API_URL}/${currentOrder.id}` : API_URL;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentOrder),
      });

      if (!response.ok) {
        throw new Error('Error al guardar la orden');
      }

      await fetchOrders();
      handleCloseDialog();
      showSnackbar(
        currentOrder.id ? 'Orden actualizada exitosamente' : 'Orden creada exitosamente'
      );
    } catch (error) {
      console.error('Error:', error);
      showSnackbar('Error al guardar la orden', 'error');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta orden?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${orderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la orden');
      }

      await fetchOrders();
      showSnackbar('Orden eliminada exitosamente');
    } catch (error) {
      console.error('Error:', error);
      showSnackbar('Error al eliminar la orden', 'error');
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el estado');
      }

      await fetchOrders();
      showSnackbar('Estado actualizado exitosamente');
    } catch (error) {
      console.error('Error:', error);
      showSnackbar('Error al actualizar el estado', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'warning';
      case 'PREPARING':
        return 'info';
      case 'READY':
        return 'success';
      case 'DELIVERED':
        return 'default';
      case 'CANCELLED':
        return 'error';
      case 'PAID':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'Pendiente';
      case 'PREPARING':
        return 'Preparando';
      case 'READY':
        return 'Listo';
      case 'DELIVERED':
        return 'Entregado';
      case 'CANCELLED':
        return 'Cancelado';
      case 'PAID':
        return 'Pagado';
      default:
        return 'Desconocido';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box className="order-manager" p={2}>
      <Card>
        <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" component="h2">
            Gestión de Órdenes
          </Typography>
        </Box>

        <TableContainer sx={{ padding: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID Orden</TableCell>
                <TableCell>Mesas</TableCell>
                <TableCell>Fecha/Hora</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Receipt sx={{ mr: 1 }} />
                      {order.orderId}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <TableRestaurant sx={{ mr: 1 }} />
                      {order.tables.map(t => t.number).join(', ')}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <AccessTime sx={{ mr: 1 }} />
                      {formatDateTime(order.createdAt)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      size="small"
                    >
                      <MenuItem value="PENDING">Pendiente</MenuItem>
                      <MenuItem value="PREPARING">Preparando</MenuItem>
                      <MenuItem value="READY">Listo</MenuItem>
                      <MenuItem value="DELIVERED">Entregado</MenuItem>
                      <MenuItem value="PAID">Pagado</MenuItem>
                      <MenuItem value="CANCELLED">Cancelado</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <AttachMoney sx={{ mr: 1 }} />
                      S/ {Number(order.total).toFixed(2)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenDetailDialog(order)}>
                      <Visibility />
                    </IconButton>
                    <IconButton onClick={() => handleOpenDialog(order)}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteOrder(order.id)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Dialog para ver detalles de orden */}
      <Dialog open={openDetailDialog} onClose={handleCloseDetailDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Detalles de Orden #{selectedOrder?.orderId}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box p={2}>
              <Typography variant="body1" gutterBottom>
                <strong>Mesas:</strong> {selectedOrder.tables.map(t => t.number).join(', ')}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Fecha:</strong> {formatDateTime(selectedOrder.timestamp)}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Estado:</strong> 
                <Chip 
                  label={getStatusText(selectedOrder.status)} 
                  color={getStatusColor(selectedOrder.status)}
                  sx={{ ml: 1 }}
                />
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                Productos:
              </Typography>
              <List>
                {selectedOrder.items.map((item) => (
                  <ListItem key={item.id}>
                    <ListItemText
                      primary={item.name}
                      secondary={`${item.quantity} x S/ ${item.price.toFixed(2)} = S/ ${item.subtotal.toFixed(2)}`}
                    />
                  </ListItem>
                ))}
              </List>
              
              <Box mt={2} p={2} bgcolor="primary.light" color="primary.contrastText" borderRadius={1}>
                <Typography variant="h6">
                  Total: S/ {selectedOrder.total.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailDialog}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OrderManager;