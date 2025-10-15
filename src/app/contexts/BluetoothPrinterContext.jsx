import React, { createContext, useContext, useState, useCallback } from 'react';

const BluetoothPrinterContext = createContext(null);

const BT_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const BT_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

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
        optionalServices: [BT_SERVICE_UUID]
      });

      await selected.gatt.connect();

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
    const service = await active.gatt.getPrimaryService(BT_SERVICE_UUID);
    const characteristic = await service.getCharacteristic(BT_CHARACTERISTIC_UUID);

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