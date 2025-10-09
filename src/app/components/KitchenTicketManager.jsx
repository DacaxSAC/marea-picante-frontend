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
            const newSocket = io('http://localhost:4000', {
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

            newSocket.on('new-order', (data) => {
                console.log('🍽️ Nueva orden recibida:', data);
                const newNotification = {
                    id: Date.now(),
                    order: data.orderData,
                    timestamp: new Date(),
                    printed: false
                };
                setNotifications(prev => [newNotification, ...prev]);
                setSnackbar({ open: true, message: `Nueva orden #${data.orderData.orderId} recibida`, severity: 'info' });

                // Sin auto-impresión local. El AutoPrintDaemon maneja la impresión global.
            });

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
        const init = esc + '@';
        const alignCenter = esc + 'a' + String.fromCharCode(1);
        const alignLeft = esc + 'a' + String.fromCharCode(0);
        const cut = esc + 'm';

        let ticket = init;
        ticket += alignCenter;
        ticket += '================================\n';
        ticket += '            COCINA\n';
        ticket += '================================\n\n';
        ticket += alignLeft;
        
        // Mostrar mesas o "PARA LLEVAR" según el tipo
        if (order.isDelivery) {
            ticket += '        PARA LLEVAR\n\n';
            if (order.customerName) {
                ticket += `CLIENTE: ${order.customerName}\n\n`;
            }
        } else if (order.tables && order.tables.length > 0) {
            const tableLabel = order.tables.length === 1 ? 'MESA:' : 'MESAS:';
            const tableNumbers = order.tables.map(t => t.number || t).sort((a,b) => a - b).join(', ');
            ticket += `${tableLabel} ${tableNumbers}\n\n`;
        }
        
        // Separador
        ticket += '================================\n';
        ticket += 'PRODUCTOS:\n\n';
        
        // Lista de productos
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
            
            // Productos con cantidad
            ticket += `${item.quantity}  ${productName}\n`;
            
            // Mostrar comentario si existe
            if (item.comment && item.comment.trim() !== '') {
                ticket += `   >> ${item.comment}\n`;
            }
            
            ticket += '\n';
        });
        
        // Separador final
        ticket += '================================\n';
        ticket += `Orden #: ${order.orderId}\n`;
        ticket += `Fecha: ${new Date(order.timestamp || order.createdAt).toLocaleString('es-PE')}\n`;
        ticket += '================================\n\n';
        ticket += cut;
        
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