import React, { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useBluetoothPrinter } from '../contexts/BluetoothPrinterContext';

// Shared kitchen ticket generator
const generateKitchenTicket = (order) => {
  const esc = String.fromCharCode(27);
  const init = esc + '@'; // Initialize printer
  const alignCenter = esc + 'a' + String.fromCharCode(1);
  const alignLeft = esc + 'a' + String.fromCharCode(0);
  const cut = esc + 'm'; // Partial cut (some printers use GS V)

  let ticket = init;
  ticket += alignCenter;
  ticket += '================================\n';
  ticket += '            COCINA\n';
  ticket += '================================\n\n';
  ticket += alignLeft;
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
  ticket += '================================\n';
  ticket += 'PRODUCTOS:\n\n';
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
    ticket += `${item.quantity}  ${productName}\n`;
    if (item.comment && item.comment.trim() !== '') {
      ticket += `   >> ${item.comment}\n`;
    }
    ticket += '\n';
  });
  ticket += '================================\n';
  ticket += `Orden #: ${order.orderId}\n`;
  ticket += `Fecha: ${new Date(order.timestamp || order.createdAt).toLocaleString('es-PE')}\n`;
  ticket += '================================\n\n';
  ticket += cut;
  return ticket;
};

const AutoPrintDaemon = () => {
  const { isConnected, autoPrintEnabled, printText } = useBluetoothPrinter();

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
      if (!isConnected) return; // require BT connected
      try {
        const ticket = generateKitchenTicket(data.orderData);
        await printText(ticket);
      } catch (err) {
        // Silently fail to avoid UI disruption
        // console.error('AutoPrintDaemon print failed:', err);
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [isConnected, autoPrintEnabled, printText]);

  return null;
};

export default AutoPrintDaemon;