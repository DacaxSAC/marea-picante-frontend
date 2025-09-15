import React, { useState, useEffect, useCallback } from 'react';
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
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    TextField,
    Switch,
    Chip,
} from '@mui/material';
import {
    Visibility,
    Receipt,
    TableRestaurant,
    AccessTime,
    AttachMoney,
    Close,
    Print,
    Payment,
    CreditCard,
    Add,
    Delete,
} from '@mui/icons-material';

const API_URL = 'http://localhost:4000/api/orders';

const OrderManager = () => {
    const [orders, setOrders] = useState([]);
    const [openDetailDialog, setOpenDetailDialog] = useState(false);
    const [bluetoothDevice, setBluetoothDevice] = useState(null);
    const [isBluetoothConnected, setIsBluetoothConnected] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [paymentMethod, setPaymentMethod] = useState('efectivo');
    const [payments, setPayments] = useState([]);
    const [showMultiplePayments, setShowMultiplePayments] = useState(false);
    const [currentPaymentAmount, setCurrentPaymentAmount] = useState('');
    const [remainingAmount, setRemainingAmount] = useState(0);

    const fetchOrders = useCallback(async () => {
        try {
            const response = await fetch(API_URL);
            const data = await response.json();
            setOrders(data);
        } catch (error) {
            console.error('Error al cargar órdenes:', error);
            showSnackbar('Error al cargar órdenes', 'error');
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const handleOpenDetailDialog = (order) => {
        setSelectedOrder(order);
        setOpenDetailDialog(true);
    };

    const handleCloseDetailDialog = () => {
        setOpenDetailDialog(false);
        setSelectedOrder(null);
    };

    // Función centralizada para calcular total con recargo POS
    const calculateTotalWithPOS = (subtotal, paymentMethod) => {
        if (paymentMethod === 'pos') {
            const totalWithSurcharge = subtotal * 1.05;
            // Redondear hacia arriba los decimales del segundo nivel
            return Math.ceil(totalWithSurcharge * 10) / 10;
        }
        return subtotal;
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
            let paymentsToProcess;
            
            if (showMultiplePayments && payments.length > 0) {
                // Para pagos múltiples, aplicar el cargo del 5% solo a los pagos POS
                paymentsToProcess = payments.map(payment => ({
                    ...payment,
                    amount: payment.paymentMethod === 'pos' 
                        ? Math.ceil(payment.amount * 1.05 * 10) / 10 
                        : payment.amount
                }));
            } else {
                const subtotal = selectedOrder.detalles.reduce((total, item) => total + (Number(item.unitPrice) * Number(item.quantity)), 0);
                const total = calculateTotalWithPOS(subtotal, paymentMethod);
                paymentsToProcess = [{
                    paymentMethod: paymentMethod,
                    amount: total
                }];
            }
            
            // Procesar pagos múltiples
            const response = await fetch(`${API_URL}/${selectedOrder.orderId}/payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ payments: paymentsToProcess })
            });
            
            if (!response.ok) {
                throw new Error('Error al procesar pagos');
            }
            
            // Generar ticket automáticamente al marcar como pagado
            const orderWithPayment = {
                ...selectedOrder,
                paymentMethod: showMultiplePayments ? 'MULTIPLE' : paymentMethod,
                payments: paymentsToProcess
            };
            await handleGenerateTicket(orderWithPayment);
            
            showSnackbar('Orden pagada exitosamente', 'success');
            fetchOrders();
            handleCloseDetailDialog();
        } catch (error) {
            showSnackbar('Error al procesar el pago: ' + error.message, 'error');
        }
    };

    const handleGenerateTicket = async () => {
        try {
            const order = selectedOrder;
            if (!order) {
                showSnackbar('No hay orden seleccionada', 'error');
                return;
            }

            // Verificar si hay impresora Bluetooth disponible
            if (!navigator.bluetooth) {
                showSnackbar('Bluetooth no está disponible en este navegador', 'error');
                return;
            }

            // Formatear la orden para el ticket térmico
            const ticketOrder = {
                orderId: order.orderId,
                timestamp: order.timestamp,
                tables: order.tables,
                items: order.detalles.map(item => ({
                    name: item.producto.name,
                    quantity: item.quantity,
                    unitPrice: parseFloat(item.unitPrice),
                    subtotal: parseFloat(item.subtotal)
                })),
                paymentMethod: paymentMethod
            };

            // Generar ticket térmico ESC/POS
            const ticketData = generateThermalTicket(ticketOrder);
            
            // Enviar a impresora Bluetooth
            await printToBluetoothPrinter(ticketData);
            
            showSnackbar(`Ticket impreso exitosamente - Método de pago: ${getPaymentMethodText(paymentMethod)}`, 'success');
        } catch (error) {
            console.error('Error al imprimir ticket:', error);
            showSnackbar('Error al imprimir ticket: ' + error.message, 'error');
        }
    };



    const connectToPrinter = async () => {
        try {
            if (!navigator.bluetooth) {
                throw new Error('Bluetooth no está disponible en este navegador');
            }

            // Si ya hay una conexión activa, usarla
            if (bluetoothDevice && bluetoothDevice.gatt.connected) {
                console.log('Usando conexión existente');
                return bluetoothDevice;
            }

            // Intentar reconectar si tenemos un dispositivo guardado
            if (bluetoothDevice && !bluetoothDevice.gatt.connected) {
                try {
                    await bluetoothDevice.gatt.connect();
                    setIsBluetoothConnected(true);
                    console.log('Reconectado a impresora existente');
                    return bluetoothDevice;
                } catch (error) {
                    console.log('No se pudo reconectar, solicitando nueva selección');
                }
            }

            // Solicitar nueva impresora
            const device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'POS' },
                    { namePrefix: 'Printer' },
                    { namePrefix: 'BT' },
                    { namePrefix: 'BlueTooth Printer' }
                ],
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
            });

            // Conectar al dispositivo
            await device.gatt.connect();
            
            // Configurar listener para desconexión
            device.addEventListener('gattserverdisconnected', () => {
                console.log('Impresora desconectada');
                setIsBluetoothConnected(false);
            });

            setBluetoothDevice(device);
            setIsBluetoothConnected(true);
            console.log('Nueva impresora conectada:', device.name);
            
            return device;
        } catch (error) {
            setIsBluetoothConnected(false);
            throw new Error('Error de conexión Bluetooth: ' + error.message);
        }
    };

    const printToBluetoothPrinter = async (ticketData) => {
        try {
            // Conectar o usar conexión existente
            const device = await connectToPrinter();
            
            const service = await device.gatt.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
            const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

            // Enviar datos del ticket
            const encoder = new TextEncoder();
            const data = encoder.encode(ticketData);
            
            // Enviar en chunks de 20 bytes
            for (let i = 0; i < data.length; i += 20) {
                const chunk = data.slice(i, i + 20);
                await characteristic.writeValue(chunk);
                await new Promise(resolve => setTimeout(resolve, 50)); // Pequeña pausa
            }

            console.log('Ticket enviado exitosamente');
            // NO desconectar - mantener la conexión activa
        } catch (error) {
            throw new Error('Error de impresión: ' + error.message);
        }
    };

    const changePrinter = () => {
        // Desconectar impresora actual si está conectada
        if (bluetoothDevice && bluetoothDevice.gatt.connected) {
            bluetoothDevice.gatt.disconnect();
        }
        
        // Limpiar estado
        setBluetoothDevice(null);
        setIsBluetoothConnected(false);
        
        setSnackbar({
            open: true,
            message: 'Impresora desconectada. Se solicitará seleccionar una nueva impresora en la próxima impresión.',
            severity: 'info'
        });
    };

    const generateThermalTicket = (order) => {
        // Comandos ESC/POS
        const ESC = '\x1B';
        const commands = {
            INIT: ESC + '\x40',
            ALIGN_CENTER: ESC + '\x61\x01',
            ALIGN_LEFT: ESC + '\x61\x00',
            ALIGN_RIGHT: ESC + '\x61\x02',
            BOLD_ON: ESC + '\x45\x01',
            BOLD_OFF: ESC + '\x45\x00',
            DOUBLE_HEIGHT: ESC + '\x21\x10',
            NORMAL_SIZE: ESC + '\x21\x00',
            FEED_LINE: '\x0A',
            CUT_PAPER: '\x1D\x56\x00'
        };

        let ticket = '';
        
        // Inicializar impresora
        ticket += commands.INIT;
        
        // Encabezado
        ticket += commands.ALIGN_CENTER + commands.BOLD_ON + commands.DOUBLE_HEIGHT;
        ticket += 'MAREA PICANTE\n';
        ticket += commands.NORMAL_SIZE + commands.BOLD_OFF;
        ticket += 'Restaurante\n';
        ticket += commands.FEED_LINE;
        
        // Información de la orden
        ticket += commands.ALIGN_LEFT;
        ticket += '================================\n';
        ticket += `Orden #: ${order.orderId}\n`;
        const orderDate = order.createdAt || order.timestamp || new Date();
        ticket += `Fecha: ${new Date(orderDate).toLocaleString('es-PE')}\n`;
        ticket += `Mesa(s): ${order.tables.map(t => t.number).join(', ')}\n`;
        ticket += '================================\n';
        ticket += commands.FEED_LINE;
        
        // Productos
        ticket += commands.BOLD_ON;
        ticket += 'PRODUCTOS:\n';
        ticket += commands.BOLD_OFF;
        ticket += commands.FEED_LINE;
        
        order.items.forEach(item => {
            const subtotal = Number(item.unitPrice) * Number(item.quantity);
            ticket += `${item.name}\n`;
            ticket += `${item.quantity} x S/.${Number(item.unitPrice).toFixed(2)} = S/.${subtotal.toFixed(2)}\n`;
            ticket += commands.FEED_LINE;
        });
        
        // Total
        ticket += '--------------------------------\n';
        const subtotal = order.items.reduce((total, item) => total + (Number(item.unitPrice) * Number(item.quantity)), 0);
        
        ticket += commands.ALIGN_RIGHT;
        ticket += `Subtotal: S/.${subtotal.toFixed(2)}\n`;
        
        if (order.paymentMethod === 'pos') {
            const posIncrease = subtotal * 0.05;
            ticket += `Recargo POS (5%): S/.${posIncrease.toFixed(2)}\n`;
        }
        
        const total = calculateTotalWithPOS(subtotal, order.paymentMethod);
        ticket += '--------------------------------\n';
        ticket += commands.BOLD_ON + commands.DOUBLE_HEIGHT;
        ticket += `TOTAL: S/.${total.toFixed(2)}\n`;
        ticket += commands.NORMAL_SIZE + commands.BOLD_OFF;
        ticket += commands.ALIGN_LEFT;
        ticket += '================================\n';
        
        // Método de pago
        ticket += commands.FEED_LINE;
        ticket += commands.BOLD_ON;
        if (order.payments && order.payments.length > 1) {
            ticket += 'METODOS DE PAGO:\n';
            ticket += commands.BOLD_OFF;
            order.payments.forEach(payment => {
                ticket += `${getPaymentMethodText(payment.paymentMethod)}: S/.${payment.amount.toFixed(2)}\n`;
            });
        } else {
            ticket += `METODO DE PAGO: ${getPaymentMethodText(order.paymentMethod).toUpperCase()}\n`;
            ticket += commands.BOLD_OFF;
        }
        
        // Pie de página
        ticket += commands.FEED_LINE;
        ticket += commands.ALIGN_CENTER;
        ticket += '¡Gracias por su preferencia!\n';
        ticket += 'Vuelva pronto\n';
        
        // Alimentar papel y cortar
        ticket += commands.FEED_LINE;
        ticket += commands.FEED_LINE;
        ticket += commands.FEED_LINE;
        ticket += commands.CUT_PAPER;
        
        return ticket;
    };

    const getPaymentMethodText = (method) => {
        switch (method) {
            case 'efectivo':
                return 'Efectivo';
            case 'yape':
                return 'Yape';
            case 'pos':
                return 'POS';
            case 'MULTIPLE':
                return 'Múltiples métodos';
            default:
                return 'Efectivo';
        }
    };

    const addPayment = () => {
        if (!currentPaymentAmount || parseFloat(currentPaymentAmount) <= 0) {
            showSnackbar('Ingrese un monto válido', 'error');
            return;
        }
        
        const amount = parseFloat(currentPaymentAmount);
        if (amount > remainingAmount) {
            showSnackbar('El monto excede el restante', 'error');
            return;
        }
        
        const newPayment = {
            paymentMethod: paymentMethod,
            amount: amount
        };
        
        const updatedPayments = [...payments, newPayment];
        setPayments(updatedPayments);
        setCurrentPaymentAmount('');
        
        const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
        setRemainingAmount(getRemainingAmount() - amount);
    };

    const removePayment = (index) => {
        const removedPayment = payments[index];
        const updatedPayments = payments.filter((_, i) => i !== index);
        setPayments(updatedPayments);
        setRemainingAmount(remainingAmount + removedPayment.amount);
    };

    const getRemainingAmount = () => {
        if (!selectedOrder) return 0;
        const subtotal = selectedOrder.detalles.reduce((total, item) => total + (Number(item.unitPrice) * Number(item.quantity)), 0);
        const total = calculateTotalWithPOS(subtotal, 'efectivo'); // Usar efectivo como base
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        return total - totalPaid;
    };

    const toggleMultiplePayments = () => {
        setShowMultiplePayments(!showMultiplePayments);
        setPayments([]);
        setCurrentPaymentAmount('');
        if (!showMultiplePayments && selectedOrder) {
            const subtotal = selectedOrder.detalles.reduce((total, item) => total + (Number(item.unitPrice) * Number(item.quantity)), 0);
            const total = calculateTotalWithPOS(subtotal, 'efectivo');
            setRemainingAmount(total);
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
                    <Box display="flex" alignItems="center" gap={2}>
                        <Box display="flex" alignItems="center">
                            <Box
                                sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    backgroundColor: isBluetoothConnected ? '#4caf50' : '#f44336',
                                    mr: 1
                                }}
                            />
                            <Typography variant="body2" color="text.secondary">
                                {isBluetoothConnected ? 'Impresora conectada' : 'Sin impresora'}
                            </Typography>
                        </Box>
                        {isBluetoothConnected && (
                            <Button
                                onClick={changePrinter}
                                variant="outlined"
                                size="small"
                                sx={{ borderRadius: '8px' }}
                            >
                                Cambiar Impresora
                            </Button>
                        )}
                    </Box>
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
                                            {order.isDelivery ? (
                                                <>
                                                    <span style={{ marginRight: 8 }}>🥡</span>
                                                    Para Llevar
                                                </>
                                            ) : (
                                                <>
                                                    <TableRestaurant sx={{ mr: 1 }} />
                                                    {order.tables.map(t => t.number).sort((a, b) => a - b).join(', ')}
                                                </>
                                            )}
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
                                            {selectedOrder.isDelivery ? (
                                                <span style={{ marginRight: 8, fontSize: '1.2em' }}>🥡</span>
                                            ) : (
                                                <TableRestaurant sx={{ mr: 1, color: '#6c757d' }} />
                                            )}
                                            <Typography variant="subtitle2" color="text.secondary">
                                                {selectedOrder.isDelivery ? 'Orden' : 'Mesas'}
                                            </Typography>
                                        </Box>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            {selectedOrder.isDelivery ? 
                                                'Para Llevar' : 
                                                selectedOrder.tables.map(t => t.number).sort((a, b) => a - b).join(', ')
                                            }
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
                                            {formatDateTime(selectedOrder.createdAt)}
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
                                    S/ {(() => {
                                        const subtotal = selectedOrder.detalles.reduce((total, item) => total + (Number(item.unitPrice) * Number(item.quantity)), 0);
                                        return calculateTotalWithPOS(subtotal, paymentMethod).toFixed(2);
                                    })()}
                                </Typography>
                                {paymentMethod === 'pos' && (
                                    <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
                                        (Incluye 5% por uso de POS)
                                    </Typography>
                                )}
                            </Paper>

                            {/* Sección de Métodos de Pago y Ticket */}
                            <Paper 
                                elevation={0}
                                sx={{ 
                                    mt: 3, 
                                    p: 3, 
                                    borderRadius: '12px',
                                    border: '1px solid #e9ecef'
                                }}
                            >
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#495057' }}>
                                        Métodos de Pago y Ticket
                                    </Typography>
                                    <Box display="flex" alignItems="center">
                                        <Typography variant="body2" sx={{ mr: 1 }}>Pagos múltiples</Typography>
                                        <Switch
                                            checked={showMultiplePayments}
                                            onChange={toggleMultiplePayments}
                                            color="primary"
                                        />
                                    </Box>
                                </Box>
                                
                                {!showMultiplePayments ? (
                                    <Grid container spacing={3}>
                                        <Grid item xs={12} md={6}>
                                            <FormControl component="fieldset">
                                                <FormLabel component="legend" sx={{ fontWeight: 600, color: '#495057', mb: 1 }}>
                                                    Seleccionar Método de Pago
                                                </FormLabel>
                                                <RadioGroup
                                                    value={paymentMethod}
                                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                                    sx={{ mt: 1 }}
                                                >
                                                    <FormControlLabel 
                                                        value="efectivo" 
                                                        control={<Radio />} 
                                                        label={
                                                            <Box display="flex" alignItems="center">
                                                                <AttachMoney sx={{ mr: 1, color: '#28a745' }} />
                                                                Efectivo
                                                            </Box>
                                                        }
                                                    />
                                                    <FormControlLabel 
                                                        value="yape" 
                                                        control={<Radio />} 
                                                        label={
                                                            <Box display="flex" alignItems="center">
                                                                <Payment sx={{ mr: 1, color: '#6f42c1' }} />
                                                                Yape
                                                            </Box>
                                                        }
                                                    />
                                                    <FormControlLabel 
                                                        value="pos" 
                                                        control={<Radio />} 
                                                        label={
                                                            <Box display="flex" alignItems="center">
                                                                <CreditCard sx={{ mr: 1, color: '#007bff' }} />
                                                                POS
                                                            </Box>
                                                        }
                                                    />
                                                </RadioGroup>
                                            </FormControl>
                                        </Grid>
                                        
                                        <Grid item xs={12} md={6}>
                                            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                                                    Generar ticket de la orden con el método de pago seleccionado
                                                </Typography>
                                                <Button
                                                    onClick={handleGenerateTicket}
                                                    variant="contained"
                                                    startIcon={<Print />}
                                                    sx={{ 
                                                        minWidth: 180,
                                                        py: 1.5,
                                                        borderRadius: '10px',
                                                        background: 'linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%)',
                                                        boxShadow: '0 4px 12px rgba(111, 66, 193, 0.3)',
                                                        '&:hover': {
                                                            background: 'linear-gradient(135deg, #5a32a3 0%, #4c2a85 100%)',
                                                            boxShadow: '0 6px 16px rgba(111, 66, 193, 0.4)'
                                                        }
                                                    }}
                                                >
                                                    Generar Ticket
                                                </Button>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                ) : (
                                    <Box>
                                        <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                                            Monto restante: S/ {remainingAmount.toFixed(2)}
                                        </Typography>
                                        
                                        <Grid container spacing={2} sx={{ mb: 2 }}>
                                            <Grid item xs={12} sm={4}>
                                                <FormControl component="fieldset" fullWidth>
                                                    <FormLabel component="legend" sx={{ fontWeight: 600, color: '#495057', mb: 1 }}>
                                                        Método de Pago
                                                    </FormLabel>
                                                    <RadioGroup
                                                        value={paymentMethod}
                                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                                        row
                                                    >
                                                        <FormControlLabel value="efectivo" control={<Radio size="small" />} label="Efectivo" />
                                                        <FormControlLabel value="yape" control={<Radio size="small" />} label="Yape" />
                                                        <FormControlLabel value="pos" control={<Radio size="small" />} label="POS" />
                                                    </RadioGroup>
                                                </FormControl>
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <TextField
                                                    label="Monto"
                                                    type="number"
                                                    value={currentPaymentAmount}
                                                    onChange={(e) => setCurrentPaymentAmount(e.target.value)}
                                                    fullWidth
                                                    size="small"
                                                    inputProps={{ step: "0.01", min: "0" }}
                                                />
                                                {paymentMethod === 'pos' && currentPaymentAmount && (
                                                    <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
                                                        Total con cargo POS (5%): S/ {(parseFloat(currentPaymentAmount || 0) * 1.05).toFixed(2)}
                                                    </Typography>
                                                )}
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <Button
                                                    onClick={addPayment}
                                                    variant="contained"
                                                    startIcon={<Add />}
                                                    fullWidth
                                                    disabled={remainingAmount <= 0}
                                                    sx={{ height: '40px' }}
                                                >
                                                    Agregar Pago
                                                </Button>
                                            </Grid>
                                        </Grid>
                                        
                                        {payments.length > 0 && (
                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                                    Pagos agregados:
                                                </Typography>
                                                {payments.map((payment, index) => (
                                                    <Chip
                                                        key={index}
                                                        label={`${getPaymentMethodText(payment.paymentMethod)}: S/ ${payment.amount.toFixed(2)}`}
                                                        onDelete={() => removePayment(index)}
                                                        deleteIcon={<Delete />}
                                                        sx={{ mr: 1, mb: 1 }}
                                                        color="primary"
                                                        variant="outlined"
                                                    />
                                                ))}
                                            </Box>
                                        )}
                                    </Box>
                                )}
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
                            disabled={
                                selectedOrder?.status === 'CANCELLED' || 
                                selectedOrder?.status === 'PAID' ||
                                (showMultiplePayments && (payments.length === 0 || remainingAmount > 0))
                            }
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
                            {showMultiplePayments ? 'Procesar Pagos' : 'Marcar como Pagado'}
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