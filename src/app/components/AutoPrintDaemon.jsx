import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useBluetoothPrinter } from '../contexts/BluetoothPrinterContext';

// Generador de ticket de cocina estilo mobile (ESC/POS, tamaños y negritas)
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

  // Mostrar mesas o "PARA LLEVAR"
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

  // Cliente en delivery
  ticket += '\n';
  if (order.isDelivery && order.customerName) {
    ticket += BOLD_ON + DOUBLE_HEIGHT;
    ticket += ALIGN_CENTER + `CLIENTE: ${order.customerName}\n`;
    ticket += BOLD_OFF + NORMAL_SIZE;
  }

  ticket += '\n\n';
  ticket += ALIGN_CENTER + '================================\n';
  ticket += '\n';

  // Productos
  ticket += ALIGN_LEFT + BOLD_ON + 'PRODUCTOS:\n' + BOLD_OFF;
  ticket += '\n';
  const items = order.items || order.orderDetails || [];
  items.forEach(item => {
    let productName = item.name || (item.product && item.product.name) || 'Producto sin nombre';
    if (productName && (productName.toLowerCase().includes('delivery') || 
                        productName.toLowerCase().includes('domicilio') ||
                        productName.toLowerCase().includes('envío') ||
                        productName.toLowerCase().includes('taper'))) {
      return;
    }
    productName = productName.replace(/ \(Personal\)$/,'').replace(/ \(Fuente\)$/,'');
    if (item.priceType === 'fuente') {
      productName = 'F. ' + productName;
    }
    ticket += BOLD_ON + DOUBLE_HEIGHT;
    ticket += `${item.quantity}  ${productName}\n`;
    ticket += BOLD_OFF + NORMAL_SIZE;
    if (item.comment && item.comment.trim() !== '') {
      ticket += BOLD_ON + `   >> ${item.comment}\n` + BOLD_OFF;
    }
    ticket += '\n';
  });

  ticket += ALIGN_CENTER + '================================\n';
  ticket += '\n\n\n';
  ticket += CUT;
  return ticket;
};

const AutoPrintDaemon = () => {
  const { isConnected, autoPrintEnabled, printText } = useBluetoothPrinter();
  const socketRef = useRef(null);
  const isConnectedRef = useRef(isConnected);
  const autoPrintEnabledRef = useRef(autoPrintEnabled);
  const printTextRef = useRef(printText);

  // Mantener refs sincronizadas para leer valores actuales dentro de los handlers
  useEffect(() => {
    isConnectedRef.current = isConnected;
    autoPrintEnabledRef.current = autoPrintEnabled;
    printTextRef.current = printText;
  }, [isConnected, autoPrintEnabled, printText]);

  const printTicketBrowserAuto = useCallback((order) => {
    const ticket = generateKitchenTicket(order);
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        // Popup bloqueado: sin UI aquí, sólo log
        console.warn('Ventana de impresión bloqueada por el navegador');
        return;
      }
      printWindow.document.write(`
        <html>
          <head>
            <title>Ticket de Cocina - Auto</title>
            <style>
              body { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.2; margin: 0; padding: 20px; white-space: pre-wrap; }
              @media print { body { margin: 0; padding: 10px; } }
            </style>
          </head>
          <body>${ticket}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    } catch (err) {
      console.warn('Fallo en impresión de navegador automática:', err);
    }
  }, []);

  const ensureFullOrder = useCallback(async (payload) => {
    const orderId = payload?.orderId || payload?.orderData?.orderId || payload?.orderData?.id;
    let order = payload?.orderData;
    const hasDetails = order && ((order.orderDetails && order.orderDetails.length > 0) || (order.items && order.items.length > 0));
    const hasTables = order && order.tables && order.tables.length > 0;
    if (!order || !hasDetails || !hasTables) {
      try {
                const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/orders/${orderId}`);
        if (res.ok) {
          order = await res.json();
        }
      } catch (e) {
        // ignore fetch errors, fallback to original payload
      }
    }
    return order || payload?.orderData;
  }, []);

  useEffect(() => {
    console.log('Inicializando AutoPrintDaemon WebSocket...');
    console.log('URL Backend:', process.env.REACT_APP_BACKEND_URL);
    console.log('Estado impresora - isConnected:', isConnectedRef.current);
    console.log('Estado impresión automática:', autoPrintEnabledRef.current);
    
    const socket = io(process.env.REACT_APP_BACKEND_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('✅ AutoPrintDaemon conectado a WebSocket');
      socket.emit('join-restaurant', 1);
      console.log('Unido a sala de restaurante ID: 1');
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error.message);
    });
    
    socket.on('disconnect', (reason) => {
      console.warn('⚠️ WebSocket desconectado:', reason);
    });
    
    socket.on('new-order', async (data) => {
      console.log('📥 Evento new-order recibido:', data);
      
      if (!autoPrintEnabledRef.current) {
        console.log('❌ Impresión automática desactivada, ignorando evento');
        return;
      }
      
      try {
        console.log('Obteniendo datos completos de la orden...');
        const order = await ensureFullOrder(data);
        console.log('Datos de orden completos:', order);
        
        if (isConnectedRef.current) {
          console.log('🖨️ Impresora Bluetooth conectada, generando ticket...');
          const ticket = generateKitchenTicket(order);
          console.log('Enviando a imprimir...');
          await printTextRef.current(ticket);
          console.log('✅ Ticket impreso correctamente');
        } else {
          console.log('⚠️ Impresora Bluetooth no conectada, usando fallback de navegador');
          printTicketBrowserAuto(order);
        }
      } catch (err) {
        console.error('❌ Error al procesar impresión automática:', err);
      }
    });
    
    // Escuchar items agregados a orden existente y generar ticket sólo de esos productos
    socket.on('order-items-added', async (data) => {
      console.log('📥 Evento order-items-added recibido:', data);
      
      if (!autoPrintEnabledRef.current) {
        console.log('❌ Impresión automática desactivada, ignorando evento');
        return;
      }
      
      try {
        console.log('Obteniendo datos completos de la orden...');
        const fullOrder = await ensureFullOrder(data);
        const addedItems = Array.isArray(data.addedItems) ? data.addedItems : [data.addedItems];
        console.log('Items agregados:', addedItems);
        
        const orderForTicket = { ...fullOrder, items: addedItems, orderDetails: addedItems };
        
        if (isConnectedRef.current) {
          console.log('🖨️ Impresora Bluetooth conectada, generando ticket...');
          const ticket = generateKitchenTicket(orderForTicket);
          console.log('Enviando a imprimir...');
          await printTextRef.current(ticket);
          console.log('✅ Ticket impreso correctamente');
        } else {
          console.log('⚠️ Impresora Bluetooth no conectada, usando fallback de navegador');
          printTicketBrowserAuto(orderForTicket);
        }
      } catch (err) {
        console.error('❌ Error al procesar impresión de items agregados:', err);
      }
    });
    
    return () => {
      console.log('Desconectando WebSocket...');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [ensureFullOrder, printTicketBrowserAuto]);

  return null;
};

export default AutoPrintDaemon;