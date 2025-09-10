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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemText,
    Alert,
    Snackbar,
} from '@mui/material';
import {
    Visibility,
    Receipt,
    TableRestaurant,
    AccessTime,
    AttachMoney,
    Close,
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

    const handleCancelOrder = async () => {
        try {
            await updateOrderStatus(selectedOrder.orderId, 'CANCELLED');
            handleCloseDetailDialog();
        } catch (error) {
            // Error ya manejado en updateOrderStatus
        }
    };

    const handlePayOrder = async () => {
        try {
            await updateOrderStatus(selectedOrder.orderId, 'PAID');
            handleCloseDetailDialog();
        } catch (error) {
            // Error ya manejado en updateOrderStatus
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toUpperCase()) {
            case 'PENDING':
                return '#FFA726'; // Naranja más patito
            case 'IN_PROGRESS':
                return '#42A5F5'; // Azul
            case 'PAID':
                return '#66BB6A'; // Verde
            case 'CANCELLED':
                return '#EF5350'; // Rojo
            default:
                return '#9E9E9E'; // Gris
        }
    };

    const getStatusText = (status) => {
        switch (status?.toUpperCase()) {
            case 'PENDING':
                return 'Pendiente';
            case 'IN_PROGRESS':
                return 'En Progreso';
            case 'PAID':
                return 'Pagado';
            case 'CANCELLED':
                return 'Cancelado';
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
                                <TableRow key={order.orderId}>
                                    <TableCell>
                                        <Box display="flex" alignItems="center">
                                            <Receipt sx={{ mr: 1 }} />
                                            {order.orderId}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box display="flex" alignItems="center">
                                            <TableRestaurant sx={{ mr: 1 }} />
                                            {order.tables.map(t => t.number).sort((a, b) => a - b).join(', ')}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box display="flex" alignItems="center">
                                            <AccessTime sx={{ mr: 1 }} />
                                            {formatDateTime(order.createdAt)}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box 
                                            display="flex" 
                                            alignItems="center"
                                            sx={{
                                                backgroundColor: `${getStatusColor(order.status)}20`,
                                                borderRadius: 1,
                                                px: 1.5,
                                                py: 0.5,
                                                width: 'fit-content'
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    backgroundColor: getStatusColor(order.status),
                                                    mr: 1
                                                }}
                                            />
                                            <Typography 
                                                variant="body2" 
                                                sx={{ 
                                                    color: getStatusColor(order.status),
                                                    fontWeight: 500
                                                }}
                                            >
                                                {getStatusText(order.status)}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box display="flex" alignItems="center">
                                            <AttachMoney sx={{ mr: 1 }} />
                                            S/ {order.detalles.reduce((total, item) => total + (Number(item.unitPrice) * Number(item.quantity)), 0).toFixed(2)}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <IconButton onClick={() => handleOpenDetailDialog(order)}>
                                            <Visibility />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            {/* Dialog para ver detalles de orden */}
            <Dialog 
                open={openDetailDialog} 
                onClose={handleCloseDetailDialog} 
                maxWidth="md" 
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                        overflow: 'hidden'
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        py: 3,
                        position: 'relative'
                    }}
                >
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                                Orden #{selectedOrder?.orderId}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Detalles completos de la orden
                            </Typography>
                        </Box>
                        <IconButton 
                            onClick={handleCloseDetailDialog} 
                            size="small"
                            sx={{
                                color: 'white',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                '&:hover': {
                                    backgroundColor: 'rgba(255,255,255,0.2)'
                                }
                            }}
                        >
                            <Close />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {selectedOrder && (
                        <Box p={3}>
                            {/* Información básica */}
                            <Grid container spacing={3} sx={{ mb: 3 }}>
                                <Grid item xs={12} md={4}>
                                    <Paper 
                                        elevation={0} 
                                        sx={{ 
                                            p: 2, 
                                            backgroundColor: '#f8f9fa',
                                            borderRadius: '12px',
                                            border: '1px solid #e9ecef'
                                        }}
                                    >
                                        <Box display="flex" alignItems="center" mb={1}>
                                            <TableRestaurant sx={{ mr: 1, color: '#6c757d' }} />
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Mesas
                                            </Typography>
                                        </Box>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            {selectedOrder.tables.map(t => t.number).sort((a, b) => a - b).join(', ')}
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Paper 
                                        elevation={0} 
                                        sx={{ 
                                            p: 2, 
                                            backgroundColor: '#f8f9fa',
                                            borderRadius: '12px',
                                            border: '1px solid #e9ecef'
                                        }}
                                    >
                                        <Box display="flex" alignItems="center" mb={1}>
                                            <AccessTime sx={{ mr: 1, color: '#6c757d' }} />
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Fecha y Hora
                                            </Typography>
                                        </Box>
                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                            {formatDateTime(selectedOrder.timestamp)}
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Paper 
                                        elevation={0} 
                                        sx={{ 
                                            p: 2, 
                                            backgroundColor: '#f8f9fa',
                                            borderRadius: '12px',
                                            border: '1px solid #e9ecef'
                                        }}
                                    >
                                        <Typography variant="subtitle2" color="text.secondary" mb={1}>
                                            Estado
                                        </Typography>
                                        <Box
                                            sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                backgroundColor: `${getStatusColor(selectedOrder.status)}20`,
                                                color: getStatusColor(selectedOrder.status),
                                                borderRadius: '12px',
                                                padding: '6px 14px',
                                                fontSize: '0.875rem',
                                                fontWeight: 600,
                                                border: `2px solid ${getStatusColor(selectedOrder.status)}40`
                                            }}
                                        >
                                            {getStatusText(selectedOrder.status)}
                                        </Box>
                                    </Paper>
                                </Grid>
                            </Grid>

                            {/* Lista de productos */}
                            <Paper 
                                elevation={0} 
                                sx={{ 
                                    borderRadius: '12px',
                                    border: '1px solid #e9ecef',
                                    overflow: 'hidden'
                                }}
                            >
                                <Box 
                                    sx={{ 
                                        p: 2, 
                                        backgroundColor: '#f8f9fa',
                                        borderBottom: '1px solid #e9ecef'
                                    }}
                                >
                                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#495057' }}>
                                        Productos Ordenados
                                    </Typography>
                                </Box>
                                <List sx={{ p: 0 }}>
                                    {selectedOrder.detalles.map((item, index) => (
                                        <ListItem 
                                            key={item.orderDetailId}
                                            sx={{
                                                borderBottom: index < selectedOrder.detalles.length - 1 ? '1px solid #f1f3f4' : 'none',
                                                py: 2
                                            }}
                                        >
                                            <ListItemText
                                                primary={
                                                    <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                                                        {item.producto.name}
                                                    </Typography>
                                                }
                                                secondary={
                                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                                        <Typography variant="body2" color="text.secondary">
                                                            {item.quantity} x S/ {Number(item.unitPrice).toFixed(2)}
                                                        </Typography>
                                                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#28a745' }}>
                                                            S/ {Number(item.subtotal).toFixed(2)}
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>

                            {/* Total */}
                            <Paper 
                                elevation={0}
                                sx={{ 
                                    mt: 3, 
                                    p: 3, 
                                    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                                    color: 'white',
                                    borderRadius: '12px',
                                    textAlign: 'center'
                                }}
                            >
                                <Typography variant="subtitle1" sx={{ opacity: 0.9, mb: 1 }}>
                                    Total de la Orden
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                    S/ {selectedOrder.detalles.reduce((total, item) => total + (Number(item.unitPrice) * Number(item.quantity)), 0).toFixed(2)}
                                </Typography>
                            </Paper>
                        </Box>
                    )}


                    <DialogActions 
                        sx={{ 
                            p: 3, 
                            backgroundColor: '#f8f9fa',
                            borderTop: '1px solid #e9ecef',
                            gap: 2,
                            justifyContent: 'center'
                        }}
                    >
                        <Button
                            onClick={handleCancelOrder}
                            variant="contained"
                            disabled={selectedOrder?.status === 'CANCELLED' || selectedOrder?.status === 'PAID'}
                            startIcon={<Close />}
                            sx={{ 
                                minWidth: 140,
                                py: 1.5,
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                                boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #c82333 0%, #bd2130 100%)',
                                    boxShadow: '0 6px 16px rgba(220, 53, 69, 0.4)'
                                },
                                '&:disabled': {
                                    background: '#6c757d',
                                    boxShadow: 'none'
                                }
                            }}
                        >
                            Cancelar Orden
                        </Button>
                        <Button
                            onClick={handlePayOrder}
                            variant="contained"
                            disabled={selectedOrder?.status === 'CANCELLED' || selectedOrder?.status === 'PAID'}
                            startIcon={<AttachMoney />}
                            sx={{ 
                                minWidth: 140,
                                py: 1.5,
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                                boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #218838 0%, #1e7e34 100%)',
                                    boxShadow: '0 6px 16px rgba(40, 167, 69, 0.4)'
                                },
                                '&:disabled': {
                                    background: '#6c757d',
                                    boxShadow: 'none'
                                }
                            }}
                        >
                            Marcar como Pagado
                        </Button>
                    </DialogActions>
                </DialogContent>
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