import React from 'react';
import { Box, Typography, Chip, Button, Divider, Card, CardContent } from '@mui/material';
import { Print } from '@mui/icons-material';
import { useSerialPrinter } from '../../contexts/SerialPrinterContext';

const StatusRow = ({ label, connected }) => (
  <Box display="flex" alignItems="center" gap={1} mb={1}>
    <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: connected ? '#4caf50' : '#f44336' }} />
    <Typography variant="body2" color="text.secondary">
      {connected ? `${label}: Conectada` : `${label}: Desconectada`}
    </Typography>
  </Box>
);

const PrefInfo = ({ pref }) => {
  const v = pref?.usbVendorId ?? null;
  const p = pref?.usbProductId ?? null;
  const idx = typeof pref?.fallbackIndex === 'number' ? pref.fallbackIndex : null;
  const text = v && p ? `USB VID: ${v}, PID: ${p}` : (idx !== null ? `Índice preferido: ${idx}` : 'Sin identificación guardada');
  return (
    <Typography variant="caption" color="text.secondary">Preferencia: {text}</Typography>
  );
};

export default function PrinterSettingsPage() {
  const {
    isSerialConnectedOrders,
    isSerialConnectingOrders,
    isSerialConnectedKitchen,
    isSerialConnectingKitchen,
    preferred,
    connectSerial,
    selectSerialPort,
    disconnectRole,
    listGrantedPorts,
  } = useSerialPrinter();

  const [grantedCount, setGrantedCount] = React.useState(null);
  React.useEffect(() => {
    let mounted = true;
    listGrantedPorts().then((arr) => {
      if (mounted) setGrantedCount(arr.length);
    });
    return () => { mounted = false; };
  }, [listGrantedPorts]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Impresoras</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Puertos autorizados por el navegador: {grantedCount ?? '...'}
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Chip icon={<Print />} label="Órdenes" variant="outlined" sx={{ mb: 1 }} />
          <StatusRow label="Serial Órdenes" connected={isSerialConnectedOrders} />
          <Box display="flex" gap={1} mb={1}>
            <Button variant="outlined" size="small" onClick={() => connectSerial('orders')} disabled={isSerialConnectingOrders}>
              {isSerialConnectingOrders ? 'Conectando...' : (isSerialConnectedOrders ? 'Reconectar' : 'Conectar')}
            </Button>
            <Button variant="outlined" size="small" onClick={() => selectSerialPort('orders')}>Elegir Puerto</Button>
            {isSerialConnectedOrders && (
              <Button variant="outlined" size="small" onClick={() => disconnectRole('orders')}>Desconectar</Button>
            )}
          </Box>
          <PrefInfo pref={preferred?.orders} />
        </CardContent>
      </Card>

      <Divider sx={{ my: 2 }} />

      <Card>
        <CardContent>
          <Chip icon={<Print />} label="Cocina" variant="outlined" sx={{ mb: 1 }} />
          <StatusRow label="Serial Cocina" connected={isSerialConnectedKitchen} />
          <Box display="flex" gap={1} mb={1}>
            <Button variant="outlined" size="small" onClick={() => connectSerial('kitchen')} disabled={isSerialConnectingKitchen}>
              {isSerialConnectingKitchen ? 'Conectando...' : (isSerialConnectedKitchen ? 'Reconectar' : 'Conectar')}
            </Button>
            <Button variant="outlined" size="small" onClick={() => selectSerialPort('kitchen')}>Elegir Puerto</Button>
            {isSerialConnectedKitchen && (
              <Button variant="outlined" size="small" onClick={() => disconnectRole('kitchen')}>Desconectar</Button>
            )}
          </Box>
          <PrefInfo pref={preferred?.kitchen} />
        </CardContent>
      </Card>
    </Box>
  );
}