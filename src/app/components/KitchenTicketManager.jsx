import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Paper,
    Divider,
    Alert,
    Snackbar,
    Switch,
    FormControlLabel,
    List,
    ListItem,
    Chip,
    IconButton,
} from '@mui/material';
import {
    Print,
    Kitchen,
    Notifications,
    NotificationsOff,
    Clear,
    Restaurant,
    Bluetooth,
    BluetoothDisabled,
} from '@mui/icons-material';
import { io } from 'socket.io-client';
import { useBluetoothPrinter } from '../contexts/BluetoothPrinterContext';

const KitchenTicketManager = () => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isListening, setIsListening] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const { isConnected: isBluetoothConnected, isConnecting: isConnectingBT, deviceName, autoPrintEnabled, setAutoPrintEnabled, connectToPrinter, printText } = useBluetoothPrinter();

    // Conectar al WebSocket
    useEffect(() => {
        if (isListening) {
            const newSocket = io(process.env.REACT_APP_BACKEND_URL, {
                transports: ['websocket'],
                autoConnect: true,
            });

            newSocket.on('connect', () => {
                console.log('✅ Conectado al WebSocket');
                setIsConnected(true);
                setSnackbar({ open: true, message: 'Conectado al sistema de notificaciones', severity: 'success' });
                
                // Unirse a la sala del restaurante (ID 1 por defecto)
                newSocket.emit('join-restaurant', 1);
            });

            newSocket.on('disconnect', () => {
                console.log('❌ Desconectado del WebSocket');
                setIsConnected(false);
                setSnackbar({ open: true, message: 'Desconectado del sistema de notificaciones', severity: 'warning' });
            });

            const handleNewOrder = async (data) => {
                console.log('🍽️ Nueva orden recibida:', data);
                const orderId = data?.orderId || data?.orderData?.orderId || data?.orderData?.id;
                let order = data.orderData;
                const hasDetails = order && ((order.orderDetails && order.orderDetails.length > 0) || (order.items && order.items.length > 0));
                const hasTables = order && order.tables && order.tables.length > 0;
                if (!order || !hasDetails || !hasTables) {
                    try {
                    const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/orders/${orderId}`);
                        if (res.ok) {
                            order = await res.json();
                        }
                    } catch (e) {
                        // ignorar errores de red
                    }
                }

                const newNotification = {
                    id: Date.now(),
                    order: order,
                    timestamp: new Date(),
                    printed: false
                };
                setNotifications(prev => [newNotification, ...prev]);
                setSnackbar({ open: true, message: `Nueva orden #${(order && (order.orderId || order.id)) || orderId} recibida`, severity: 'info' });
            };

            newSocket.on('new-order', handleNewOrder);

            // Manejar productos agregados a orden existente
            const handleOrderItemsAdded = async (data) => {
                console.log('➕ Ítems agregados a orden:', data);
                const orderId = data?.orderId || data?.orderData?.orderId || data?.orderData?.id;
                let order = data.orderData;
                const hasTables = order && order.tables && order.tables.length > 0;
                if (!order || !hasTables) {
                    try {
                const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/orders/${orderId}`);
                        if (res.ok) {
                            order = await res.json();
                        }
                    } catch (e) {}
                }
                const addedItems = Array.isArray(data.addedItems) ? data.addedItems : [data.addedItems];
                const orderForTicket = { ...order, items: addedItems, orderDetails: addedItems };
                const newNotification = {
                    id: Date.now(),
                    order: orderForTicket,
                    timestamp: new Date(),
                    printed: false
                };
                setNotifications(prev => [newNotification, ...prev]);
                setSnackbar({ open: true, message: `Productos agregados a orden #${(order && (order.orderId || order.id)) || orderId}` , severity: 'info' });
            };

            newSocket.on('order-items-added', handleOrderItemsAdded);

            newSocket.on('connect_error', (error) => {
                console.error('❌ Error de conexión:', error);
                setSnackbar({ open: true, message: 'Error de conexión al servidor', severity: 'error' });
            });

            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
            };
        } else {
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
        }
    }, [isListening]);

    // Generar ticket de cocina basado en el formato del mobile
    const generateKitchenTicket = (order) => {
        const esc = String.fromCharCode(27);
        const gs = String.fromCharCode(29);
        const INIT = esc + '@';
        const ALIGN_LEFT = esc + 'a' + String.fromCharCode(0);
        const ALIGN_CENTER = esc + 'a' + String.fromCharCode(1);
        const BOLD_ON = esc + 'E' + String.fromCharCode(1);
        const BOLD_OFF = esc + 'E' + String.fromCharCode(0);
        const NORMAL_SIZE = esc + '!' + String.fromCharCode(0);
        const DOUBLE_HEIGHT = esc + '!' + String.fromCharCode(16);
        const MEGA_SIZE = esc + '!' + String.fromCharCode(63);
        const CUT = gs + 'V' + String.fromCharCode(0);

        let ticket = '';
        ticket += INIT;
        ticket += '\n\n';

        // Título COCINA
        ticket += BOLD_ON + DOUBLE_HEIGHT;
        ticket += ALIGN_CENTER + 'COCINA\n';
        ticket += BOLD_OFF + NORMAL_SIZE;
        ticket += '\n';

        // Mostrar mesas o "PARA LLEVAR" según el tipo
        if (order.isDelivery) {
            ticket += BOLD_ON + MEGA_SIZE;
            ticket += ALIGN_CENTER + 'PARA LLEVAR\n';
            ticket += BOLD_OFF + NORMAL_SIZE;
        } else if (order.tables && order.tables.length > 0) {
            const tableLabel = order.tables.length === 1 ? 'MESA:' : 'MESAS:';
            const tableNumbers = order.tables.map(t => t.number || t).sort((a,b) => a - b).join(', ');
            ticket += BOLD_ON + DOUBLE_HEIGHT;
            ticket += ALIGN_CENTER + `${tableLabel} ${tableNumbers}\n`;
            ticket += BOLD_OFF + NORMAL_SIZE;
        }

        // Si es delivery, mostrar nombre del cliente
        ticket += '\n';
        if (order.isDelivery && order.customerName) {
            ticket += BOLD_ON + DOUBLE_HEIGHT;
            ticket += ALIGN_CENTER + `CLIENTE: ${order.customerName}\n`;
            ticket += BOLD_OFF + NORMAL_SIZE;
        }

        ticket += '\n\n';
        ticket += ALIGN_CENTER + '================================\n';
        ticket += '\n';

        // Lista de productos con mejor formato
        ticket += ALIGN_LEFT + BOLD_ON + 'PRODUCTOS:\n' + BOLD_OFF;
        ticket += '\n';
        const items = order.items || order.orderDetails || [];
        items.forEach(item => {
            let productName = item.name || (item.product && item.product.name) || 'Producto sin nombre';

            // Filtrar cargos por delivery - no mostrar en ticket de cocina
            if (productName && (productName.toLowerCase().includes('delivery') || 
                             productName.toLowerCase().includes('domicilio') ||
                             productName.toLowerCase().includes('envío') ||
                             productName.toLowerCase().includes('taper'))) {
                return; // Saltar este item
            }
            
            // Remover (Personal) o (Fuente) del nombre
            productName = productName.replace(/ \(Personal\)$/, '').replace(/ \(Fuente\)$/, '');
            
            // Si es tipo fuente, agregar F. al inicio
            if (item.priceType === 'fuente') {
                productName = 'F. ' + productName;
            }
            
            // Productos con letra grande y espaciado
            ticket += BOLD_ON + DOUBLE_HEIGHT;
            ticket += `${item.quantity}  ${productName}\n`;
            ticket += BOLD_OFF + NORMAL_SIZE;
            
            // Mostrar comentario si existe
            if (item.comment && item.comment.trim() !== '') {
                ticket += BOLD_ON;
                ticket += `   >> ${item.comment}\n`;
                ticket += BOLD_OFF;
            }
            
            ticket += '\n';
        });
        
        // Separador final
        ticket += ALIGN_CENTER + '================================\n';
        
        // Espacios en blanco abajo y corte
        ticket += '\n\n\n';
        ticket += CUT;
        
        return ticket;
    };

    // Imprimir ticket en impresora del navegador (fallback)
    const printTicketBrowser = (notification) => {
        const ticket = generateKitchenTicket(notification.order);
        
        // Crear ventana de impresión
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Ticket de Cocina - Orden #${notification.order.orderId}</title>
                    <style>
                        body {
                            font-family: 'Courier New', monospace;
                            font-size: 12px;
                            line-height: 1.2;
                            margin: 0;
                            padding: 20px;
                            white-space: pre-wrap;
                        }
                        @media print {
                            body {
                                margin: 0;
                                padding: 10px;
                            }
                        }
                    </style>
                </head>
                <body>${ticket}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
        
        // Marcar como impreso
        setNotifications(prev => 
            prev.map(n => 
                n.id === notification.id 
                    ? { ...n, printed: true }
                    : n
            )
        );
        
        setSnackbar({ open: true, message: `Ticket de orden #${notification.order.orderId} enviado a impresión`, severity: 'success' });
    };

    const printTicketBluetooth = async (notification) => {
        try {
            const ticket = generateKitchenTicket(notification.order);
            await printText(ticket);
            setNotifications(prev => 
                prev.map(n => n.id === notification.id ? { ...n, printed: true } : n)
            );
            setSnackbar({ open: true, message: `Ticket #${notification.order.orderId} impreso en Bluetooth`, severity: 'success' });
        } catch (error) {
            setSnackbar({ open: true, message: 'No se pudo imprimir por Bluetooth: ' + error.message, severity: 'error' });
        }
    };

    // Limpiar notificaciones
    const clearNotifications = () => {
        setNotifications([]);
        setSnackbar({ open: true, message: 'Notificaciones limpiadas', severity: 'info' });
    };

    // Eliminar notificación específica
    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <Box sx={{ p: 3 }}>
            <Card>
                <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                        <Box display="flex" alignItems="center">
                            <Kitchen sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography variant="h5" component="h1">
                                Tickets de Cocina
                            </Typography>
                        </Box>
                        
                    <Box display="flex" alignItems="center" gap={2}>
                            <Chip 
                                icon={isConnected ? <Notifications /> : <NotificationsOff />}
                                label={isConnected ? 'Conectado' : 'Desconectado'}
                                color={isConnected ? 'success' : 'error'}
                                variant="outlined"
                            />
                            
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={isListening}
                                        onChange={(e) => setIsListening(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label="Escuchar notificaciones"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={autoPrintEnabled}
                                        onChange={(e) => setAutoPrintEnabled(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label="Impresión automática"
                            />
                            <Chip 
                                icon={isBluetoothConnected ? <Bluetooth /> : <BluetoothDisabled />}
                                label={isBluetoothConnected ? (deviceName ? `BT: ${deviceName}` : 'BT Conectada') : 'BT Desconectada'}
                                color={isBluetoothConnected ? 'success' : 'default'}
                                variant="outlined"
                            />
                            <Button
                                variant="outlined"
                                onClick={connectToPrinter}
                                disabled={isConnectingBT}
                            >
                                {isConnectingBT ? 'Conectando...' : (isBluetoothConnected ? 'Cambiar impresora' : 'Conectar Impresora')}
                            </Button>

                            <Button
                                variant="contained"
                                color="primary"
                                onClick={async () => {
                                    // Simular evento de nueva orden con datos completos
                                    const mockData = {
                                        orderId: 12345,
                                        orderData: {
                                            orderId: 12345,
                                            isDelivery: false,
                                            customerName: null,
                                            tables: [{ number: 7 }, { number: 8 }],
                                            orderDetails: [
                                                { quantity: 2, product: { name: 'Ceviche Mixto' }, comment: 'poco picante' },
                                                { quantity: 1, product: { name: 'Lomo Saltado' }, comment: '' },
                                            ],
                                        },
                                        timestamp: new Date(),
                                        message: 'Nueva orden recibida (simulada)'
                                    };
                                    // Reutilizar la lógica de manejo
                                    const orderId = mockData.orderId;
                                    let order = mockData.orderData;
                                    const hasDetails = order && ((order.orderDetails && order.orderDetails.length > 0) || (order.items && order.items.length > 0));
                                    const hasTables = order && order.tables && order.tables.length > 0;
                                    if (!order || !hasDetails || !hasTables) {
                                        try {
            const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/orders/${orderId}`);
                                            if (res.ok) {
                                                order = await res.json();
                                            }
                                        } catch (e) {}
                                    }
                                    const newNotification = {
                                        id: Date.now(),
                                        order: order,
                                        timestamp: new Date(),
                                        printed: false
                                    };
                                    setNotifications(prev => [newNotification, ...prev]);
                                    setSnackbar({ open: true, message: `Nueva orden #${(order && (order.orderId || order.id)) || orderId} recibida (simulada)`, severity: 'info' });
                                }}
                            >
                                Simular Orden
                            </Button>
                            
                            <Button
                                variant="outlined"
                                startIcon={<Clear />}
                                onClick={clearNotifications}
                                disabled={notifications.length === 0}
                            >
                                Limpiar
                            </Button>
                        </Box>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    {notifications.length === 0 ? (
                        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
                            <Restaurant sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                            <Typography variant="h6" color="textSecondary">
                                No hay órdenes pendientes
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Las nuevas órdenes aparecerán aquí automáticamente
                            </Typography>
                        </Paper>
                    ) : (
                        <List>
                            {notifications.map((notification) => (
                                <ListItem
                                    key={notification.id}
                                    sx={{
                                        border: 1,
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        mb: 1,
                                        bgcolor: notification.printed ? 'grey.50' : 'background.paper'
                                    }}
                                >
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                            <Typography variant="h6">
                                                Orden #{notification.order.orderId}
                                            </Typography>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                {notification.printed && (
                                                    <Chip label="Impreso" size="small" color="success" />
                                                )}
                                                <Typography variant="caption" color="textSecondary">
                                                    {notification.timestamp.toLocaleTimeString('es-PE')}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        
                                        <Typography variant="body2" color="textSecondary" mb={1}>
                                            {notification.order.isDelivery 
                                                ? `Para llevar${notification.order.customerName ? ` - ${notification.order.customerName}` : ''}`
                                                : notification.order.tables && notification.order.tables.length > 0
                                                    ? `Mesa(s): ${notification.order.tables.map(t => t.number || t).sort((a,b) => a - b).join(', ')}`
                                                    : 'Sin mesa asignada'
                                            }
                                        </Typography>
                                        
                                        <Typography variant="body2">
                                            {(notification.order.items || notification.order.orderDetails || []).length} producto(s)
                                        </Typography>
                                    </Box>
                                    
                                    <Box display="flex" gap={1}>
                                        <Button
                                            variant="contained"
                                            startIcon={<Print />}
                                            onClick={() => (isBluetoothConnected ? printTicketBluetooth(notification) : printTicketBrowser(notification))}
                                            disabled={notification.printed}
                                        >
                                            {notification.printed ? 'Impreso' : 'Imprimir'}
                                        </Button>
                                        
                                        <IconButton
                                            onClick={() => removeNotification(notification.id)}
                                            color="error"
                                        >
                                            <Clear />
                                        </IconButton>
                                    </Box>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </CardContent>
            </Card>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert 
                    onClose={() => setSnackbar({ ...snackbar, open: false })} 
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default KitchenTicketManager;