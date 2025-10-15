import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const SerialPrinterContext = createContext(null);

export const SerialPrinterProvider = ({ children }) => {
  const [port, setPort] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (!('serial' in navigator)) {
      console.warn('[Serial] Web Serial no soportado en este navegador/origen');
      return;
    }
    const onConnect = (event) => {
      console.log('[Serial] Dispositivo conectado:', event);
    };
    const onDisconnect = (event) => {
      console.warn('[Serial] Dispositivo desconectado:', event);
      setIsConnected(false);
      setPort(null);
    };
    navigator.serial.addEventListener('connect', onConnect);
    navigator.serial.addEventListener('disconnect', onDisconnect);
    return () => {
      navigator.serial.removeEventListener('connect', onConnect);
      navigator.serial.removeEventListener('disconnect', onDisconnect);
    };
  }, []);

  const connectToSerial = useCallback(async () => {
    try {
      console.log('[Serial] Iniciando conexión...');
      setIsConnecting(true);
      if (!('serial' in navigator)) {
        throw new Error('Web Serial no está disponible en este navegador');
      }

      if (port && port.writable) {
        console.log('[Serial] Reutilizando puerto ya abierto');
        setIsConnected(true);
        return port;
      }

      // Reutilizar puertos previamente autorizados (p. ej., COM5), si existen
      const granted = await navigator.serial.getPorts();
      console.log('[Serial] Puertos previamente autorizados:', granted.length);
      granted.forEach((p, idx) => {
        const info = p.getInfo?.() || {};
        console.log(`[Serial] Puerta #${idx}:`, info);
      });
      const selected = (granted && granted.length > 0)
        ? (console.log('[Serial] Usando puerto previamente autorizado'), granted[0])
        : (console.log('[Serial] Solicitando selección de puerto'), await navigator.serial.requestPort());

      // Intentar abrir con baudRate común en impresoras RS232/USB-Serial
      try {
        console.log('[Serial] Abriendo puerto a 9600 baud');
        await selected.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none' });
        console.log('[Serial] Puerto abierto a 9600 baud');
      } catch (err) {
        // Fallback a 115200 si 9600 falla
        console.warn('[Serial] Falló abrir a 9600:', err?.message || err);
        console.log('[Serial] Probando abrir a 115200 baud');
        await selected.open({ baudRate: 115200, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none' });
        console.log('[Serial] Puerto abierto a 115200 baud');
      }

      setPort(selected);
      setIsConnected(true);
      const info = selected.getInfo?.() || {};
      console.log('[Serial] Conectado. Info:', info, 'opened:', selected.opened, 'readable:', !!selected.readable, 'writable:', !!selected.writable);
      return selected;
    } finally {
      setIsConnecting(false);
    }
  }, [port]);

  const printText = useCallback(async (text) => {
    console.log('[Serial] Preparando impresión. Longitud de datos:', text?.length ?? 0);
    if (!('serial' in navigator)) {
      throw new Error('Web Serial no está disponible en este navegador');
    }
    const active = port && port.writable ? port : await connectToSerial();
    const writer = active.writable.getWriter();
    console.log('[Serial] Writer adquirido. Comenzando envío...');
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    try {
      const CHUNK = 128;
      let sent = 0;
      for (let i = 0; i < data.length; i += CHUNK) {
        const chunk = data.slice(i, i + CHUNK);
        await writer.write(chunk);
        sent += chunk.length;
        console.log(`[Serial] Enviado chunk ${i}-${Math.min(i + CHUNK, data.length)} (${chunk.length} bytes). Total enviados: ${sent}`);
        await new Promise((res) => setTimeout(res, 10));
      }
      console.log('[Serial] Impresión completada. Bytes totales enviados:', sent);
    } finally {
      writer.releaseLock();
      console.log('[Serial] Writer liberado.');
    }
  }, [port, connectToSerial]);

  const disconnect = useCallback(async () => {
    try {
      if (port) {
        console.log('[Serial] Cerrando puerto...');
        await port.close();
        console.log('[Serial] Puerto cerrado.');
      }
    } catch (_) {}
    setIsConnected(false);
    setPort(null);
  }, [port]);

  const value = {
    isSerialConnected: isConnected,
    isSerialConnecting: isConnecting,
    connectToSerial,
    printText,
    disconnectSerial: disconnect,
  };

  return (
    <SerialPrinterContext.Provider value={value}>
      {children}
    </SerialPrinterContext.Provider>
  );
};

export const useSerialPrinter = () => {
  const ctx = useContext(SerialPrinterContext);
  if (!ctx) throw new Error('useSerialPrinter must be used within SerialPrinterProvider');
  return ctx;
};