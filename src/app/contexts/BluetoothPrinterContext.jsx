import React, { createContext, useContext, useState, useCallback } from 'react';

const BluetoothPrinterContext = createContext(null);

// UUIDs comunes en impresoras BLE (varía por fabricante)
const BT_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Algunos modelos usan 0x18F0
  '0000fff0-0000-1000-8000-00805f9b34fb', // Muy común (FFF0)
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10/compatibles (FFE0)
];

const BT_CHARACTERISTIC_UUIDS = [
  '00002af1-0000-1000-8000-00805f9b34fb', // Emparejado con 0x18F0 en algunos modelos
  '0000fff2-0000-1000-8000-00805f9b34fb', // Con FFF0 suelen usar FFF2 para escritura
  '0000ffe1-0000-1000-8000-00805f9b34fb', // HM-10/compatibles (FFE1)
];

export const BluetoothPrinterProvider = ({ children }) => {
  const [device, setDevice] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);

  const connectToPrinter = useCallback(async () => {
    try {
      setIsConnecting(true);
      if (!navigator.bluetooth) {
        throw new Error('Bluetooth no está disponible en este navegador');
      }

      if (device && device.gatt.connected) {
        setIsConnected(true);
        return device;
      }

      const selected = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'POS' },
          { namePrefix: 'Printer' },
          { namePrefix: 'BT' },
          { namePrefix: 'BlueTooth Printer' }
        ],
        optionalServices: BT_SERVICE_UUIDS
      });

      await selected.gatt.connect();
      // Log de servicios disponibles para diagnóstico en Windows 11
      try {
        const services = await selected.gatt.getPrimaryServices();
        console.log('Servicios BLE disponibles:', services.map(s => s.uuid));
      } catch (err) {
        console.warn('No se pudieron listar servicios BLE:', err?.message);
      }

      selected.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
      });

      setDevice(selected);
      setIsConnected(true);
      return selected;
    } catch (err) {
      setIsConnected(false);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [device]);

  const printText = useCallback(async (text) => {
    const active = device && device.gatt.connected ? device : await connectToPrinter();

    // Reintento simple si se desconectó justo antes de obtener servicios
    if (!active.gatt.connected) {
      try {
        await active.gatt.connect();
      } catch (err) {
        console.warn('No se pudo reconectar antes de obtener servicio:', err?.message);
      }
    }

    // Buscar el primer servicio disponible de la lista
    let service = null;
    for (const uuid of BT_SERVICE_UUIDS) {
      try {
        service = await active.gatt.getPrimaryService(uuid);
        console.log('Servicio Bluetooth obtenido:', uuid);
        break;
      } catch (err) {
        // Intentar siguiente UUID
      }
    }
    if (!service) {
      throw new Error('No se pudo obtener el servicio BLE de la impresora');
    }

    // Buscar la primera característica de escritura disponible
    let characteristic = null;
    for (const cuuid of BT_CHARACTERISTIC_UUIDS) {
      try {
        characteristic = await service.getCharacteristic(cuuid);
        console.log('Característica de escritura obtenida:', cuuid);
        break;
      } catch (err) {
        // Probar siguiente
      }
    }
    if (!characteristic) {
      throw new Error('No se pudo obtener la característica de escritura BLE');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    const supportsNoResp = characteristic.properties?.writeWithoutResponse === true;
    const writeWithResponse = async (buf) => characteristic.writeValue(buf);
    const writeWithoutResponse = characteristic.writeValueWithoutResponse
      ? async (buf) => characteristic.writeValueWithoutResponse(buf)
      : null;

    const sendChunks = async (chunkSize, delayMs, writer) => {
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await writer(chunk);
        if (delayMs > 0) {
          await new Promise((res) => setTimeout(res, delayMs));
        }
      }
    };

    try {
      if (supportsNoResp && writeWithoutResponse) {
        // Mayor throughput: chunks grandes y sin pausa
        await sendChunks(180, 0, writeWithoutResponse);
      } else {
        // Con respuesta: chunks pequeños y mínima pausa
        await sendChunks(20, 10, writeWithResponse);
      }
    } catch (err) {
      // Fallback conservador en caso de error
      await sendChunks(20, 20, writeWithResponse);
    }
  }, [device, connectToPrinter]);

  const value = {
    isConnected,
    isConnecting,
    deviceName: device?.name || null,
    autoPrintEnabled,
    setAutoPrintEnabled,
    connectToPrinter,
    printText,
  };

  return (
    <BluetoothPrinterContext.Provider value={value}>
      {children}
    </BluetoothPrinterContext.Provider>
  );
};

export const useBluetoothPrinter = () => {
  const ctx = useContext(BluetoothPrinterContext);
  if (!ctx) throw new Error('useBluetoothPrinter must be used within BluetoothPrinterProvider');
  return ctx;
};