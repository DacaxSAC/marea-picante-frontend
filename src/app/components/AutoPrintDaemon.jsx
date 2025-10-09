import React, { useEffect } from 'react';
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
  const DOUBLE_SIZE = esc + '!' + String.fromCharCode(48);
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

  const printTicketBrowserAuto = (order) => {
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
  };

  const ensureFullOrder = async (payload) => {
    const orderId = payload?.orderId || payload?.orderData?.orderId || payload?.orderData?.id;
    let order = payload?.orderData;
    const hasDetails = order && ((order.orderDetails && order.orderDetails.length > 0) || (order.items && order.items.length > 0));
    const hasTables = order && order.tables && order.tables.length > 0;
    if (!order || !hasDetails || !hasTables) {
      try {
        const res = await fetch(`http://localhost:4000/api/orders/${orderId}`);
        if (res.ok) {
          order = await res.json();
        }
      } catch (e) {
        // ignore fetch errors, fallback to original payload
      }
    }
    return order || payload?.orderData;
  };

  useEffect(() => {
    const socket = io('http://localhost:4000', {
      transports: ['websocket'],
      autoConnect: true,
    });
    socket.on('connect', () => {
      // console.log('AutoPrintDaemon conectado a WS');
      // Unirse a la sala del restaurante (ID 1 por defecto)
      socket.emit('join-restaurant', 1);
    });
    socket.on('new-order', async (data) => {
      if (!autoPrintEnabled) return;
      try {
        const order = await ensureFullOrder(data);
        if (isConnected) {
          const ticket = generateKitchenTicket(order);
          await printText(ticket);
        } else {
          // Fallback a impresión del navegador si no hay BT conectada
          printTicketBrowserAuto(order);
        }
      } catch (err) {
        // Silently fail to avoid UI disruption
      }
    });
    // Escuchar items agregados a orden existente y generar ticket sólo de esos productos
    socket.on('order-items-added', async (data) => {
      if (!autoPrintEnabled) return;
      try {
        const fullOrder = await ensureFullOrder(data);
        const addedItems = Array.isArray(data.addedItems) ? data.addedItems : [data.addedItems];
        const orderForTicket = { ...fullOrder, items: addedItems, orderDetails: addedItems };
        if (isConnected) {
          const ticket = generateKitchenTicket(orderForTicket);
          await printText(ticket);
        } else {
          printTicketBrowserAuto(orderForTicket);
        }
      } catch (err) {
        // fail silently
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [isConnected, autoPrintEnabled, printText]);

  return null;
};

export default AutoPrintDaemon;