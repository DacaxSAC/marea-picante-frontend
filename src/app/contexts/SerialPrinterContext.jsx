import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const SerialPrinterContext = createContext(null);

const ROLES = { orders: 'orders', kitchen: 'kitchen' };
const STORAGE_KEYS = {
  [ROLES.orders]: 'serial.preferred.orders',
  [ROLES.kitchen]: 'serial.preferred.kitchen',
};

const readPreferred = (role) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[role]);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
};

const writePreferred = (role, pref) => {
  try {
    localStorage.setItem(STORAGE_KEYS[role], JSON.stringify(pref || {}));
  } catch (_) {}
};

export const SerialPrinterProvider = ({ children }) => {
  const [ports, setPorts] = useState({ orders: null, kitchen: null });
  const [isConnected, setIsConnected] = useState({ orders: false, kitchen: false });
  const [isConnecting, setIsConnecting] = useState({ orders: false, kitchen: false });
  const [autoConnectEnabled, setAutoConnectEnabled] = useState({ orders: true, kitchen: true });
  const [preferred, setPreferred] = useState({
    orders: readPreferred(ROLES.orders),
    kitchen: readPreferred(ROLES.kitchen),
  });

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
      // Al desconectar, marcar estados en falso si afecta a algún rol
      setIsConnected((prev) => ({ orders: false, kitchen: false }));
      setPorts((prev) => ({ orders: null, kitchen: null }));
    };
    navigator.serial.addEventListener('connect', onConnect);
    navigator.serial.addEventListener('disconnect', onDisconnect);
    return () => {
      navigator.serial.removeEventListener('connect', onConnect);
      navigator.serial.removeEventListener('disconnect', onDisconnect);
    };
  }, []);

  // Auto-conexión: si hay preferencias guardadas y puertos autorizados disponibles,
  // intentar abrir el puerto preferido para cada rol al cargar.
  useEffect(() => {
    let cancelled = false;
    const tryAutoConnect = async () => {
      if (!('serial' in navigator)) return;
      const granted = await navigator.serial.getPorts();
      for (const role of [ROLES.orders, ROLES.kitchen]) {
        if (cancelled) break;
        if (isConnected[role]) continue;
        if (!autoConnectEnabled[role]) continue; // no auto-reconectar si fue desconectado manualmente
        const selected = pickPort(granted, preferred[role]);
        if (selected) {
          try {
            await openPort(selected);
            if (cancelled) break;
            setPorts((prev) => ({ ...prev, [role]: selected }));
            setIsConnected((prev) => ({ ...prev, [role]: true }));
            const info = selected.getInfo?.() || {};
            console.log(`[Serial] (${role}) Auto-conectado. Info:`, info);
          } catch (err) {
            console.warn(`[Serial] (${role}) Auto-conexión fallida:`, err?.message || err);
          }
        }
      }
    };
    tryAutoConnect();
    return () => { cancelled = true; };
  }, [preferred, isConnected, autoConnectEnabled]);

  const listGrantedPorts = useCallback(async () => {
    if (!('serial' in navigator)) return [];
    const granted = await navigator.serial.getPorts();
    console.log('[Serial] Puertos autorizados:', granted.length);
    granted.forEach((p, idx) => {
      const info = p.getInfo?.() || {};
      console.log(`[Serial] Granted #${idx}:`, info);
    });
    return granted;
  }, []);

  const pickPort = (granted, pref) => {
    if (!granted || granted.length === 0) return null;
    const { usbVendorId, usbProductId, fallbackIndex } = pref || {};
    if (usbVendorId && usbProductId) {
      for (let i = 0; i < granted.length; i++) {
        const info = granted[i].getInfo?.() || {};
        if (info.usbVendorId === usbVendorId && info.usbProductId === usbProductId) {
          return granted[i];
        }
      }
    }
    if (typeof fallbackIndex === 'number' && granted[fallbackIndex]) {
      return granted[fallbackIndex];
    }
    return granted[0];
  };

  const openPort = async (selected) => {
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
  };

  const selectSerialPort = useCallback(async (role) => {
    if (!('serial' in navigator)) throw new Error('Web Serial no está disponible en este navegador');
    console.log(`[Serial] (${role}) Solicitando selección de puerto...`);
    const selected = await navigator.serial.requestPort();
    const granted = await navigator.serial.getPorts();
    const idx = granted.findIndex((p) => p === selected);
    const info = selected.getInfo?.() || {};
    console.log(`[Serial] (${role}) Puerto seleccionado. Info:`, info, 'index:', idx);

    // Abrir el puerto recién seleccionado
    await openPort(selected);
    console.log(`[Serial] (${role}) Puerto abierto.`);

    // Guardar preferencia
    const newPref = {
      usbVendorId: info.usbVendorId || null,
      usbProductId: info.usbProductId || null,
      fallbackIndex: idx >= 0 ? idx : 0,
    };
    setPreferred((prev) => {
      const updated = { ...prev, [role]: newPref };
      writePreferred(role, newPref);
      return updated;
    });

    // Actualizar estado del rol
    setPorts((prev) => ({ ...prev, [role]: selected }));
    setIsConnected((prev) => ({ ...prev, [role]: true }));
    setAutoConnectEnabled((prev) => ({ ...prev, [role]: true }));
    return selected;
  }, []);

  const connectSerial = useCallback(async (role) => {
    try {
      console.log(`[Serial] (${role}) Iniciando conexión...`);
      setIsConnecting((prev) => ({ ...prev, [role]: true }));
      if (!('serial' in navigator)) {
        throw new Error('Web Serial no está disponible en este navegador');
      }

      const existing = ports[role];
      if (existing && existing.writable) {
        console.log(`[Serial] (${role}) Reutilizando puerto ya abierto`);
        setIsConnected((prev) => ({ ...prev, [role]: true }));
        return existing;
      }

      const granted = await listGrantedPorts();
      let selected = pickPort(granted, preferred[role]);
      if (!selected) {
        console.log(`[Serial] (${role}) No hay puertos autorizados, solicitando selección`);
        selected = await navigator.serial.requestPort();
      }

      await openPort(selected);
      setPorts((prev) => ({ ...prev, [role]: selected }));
      setIsConnected((prev) => ({ ...prev, [role]: true }));
      const info = selected.getInfo?.() || {};
      console.log(`[Serial] (${role}) Conectado. Info:`, info, 'opened:', selected.opened, 'readable:', !!selected.readable, 'writable:', !!selected.writable);
      setAutoConnectEnabled((prev) => ({ ...prev, [role]: true }));
      return selected;
    } finally {
      setIsConnecting((prev) => ({ ...prev, [role]: false }));
    }
  }, [ports, preferred, listGrantedPorts]);

  const printTextFor = useCallback(async (role, text) => {
    console.log(`[Serial] (${role}) Preparando impresión. Longitud de datos:`, text?.length ?? 0);
    if (!('serial' in navigator)) {
      throw new Error('Web Serial no está disponible en este navegador');
    }
    const active = ports[role] && ports[role].writable ? ports[role] : await connectSerial(role);
    const writer = active.writable.getWriter();
    console.log(`[Serial] (${role}) Writer adquirido. Comenzando envío...`);
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    try {
      const CHUNK = 128;
      let sent = 0;
      for (let i = 0; i < data.length; i += CHUNK) {
        const chunk = data.slice(i, i + CHUNK);
        await writer.write(chunk);
        sent += chunk.length;
        console.log(`[Serial] (${role}) Enviado chunk ${i}-${Math.min(i + CHUNK, data.length)} (${chunk.length} bytes). Total enviados: ${sent}`);
        await new Promise((res) => setTimeout(res, 10));
      }
      console.log(`[Serial] (${role}) Impresión completada. Bytes totales enviados:`, sent);
    } finally {
      writer.releaseLock();
      console.log(`[Serial] (${role}) Writer liberado.`);
    }
  }, [ports, connectSerial]);

  const disconnectRole = useCallback(async (role) => {
    try {
      const p = ports[role];
      if (p) {
        console.log(`[Serial] (${role}) Cerrando puerto...`);
        await p.close();
        console.log(`[Serial] (${role}) Puerto cerrado.`);
      }
    } catch (_) {}
    setIsConnected((prev) => ({ ...prev, [role]: false }));
    setPorts((prev) => ({ ...prev, [role]: null }));
    setAutoConnectEnabled((prev) => ({ ...prev, [role]: false }));
  }, [ports]);

  // Compatibilidad: funciones sin rol (por defecto cocina)
  const connectToSerial = useCallback(() => connectSerial(ROLES.kitchen), [connectSerial]);
  const printText = useCallback((text) => printTextFor(ROLES.kitchen, text), [printTextFor]);
  const disconnectSerial = useCallback(() => disconnectRole(ROLES.kitchen), [disconnectRole]);

  const value = {
    // Estados por rol
    isSerialConnectedOrders: isConnected.orders,
    isSerialConnectingOrders: isConnecting.orders,
    isSerialConnectedKitchen: isConnected.kitchen,
    isSerialConnectingKitchen: isConnecting.kitchen,
    // Preferencias
    preferred,
    selectSerialPort,
    // API por rol
    connectSerial,
    printTextFor,
    disconnectRole,
    listGrantedPorts,
    // Compat (Kitchen por defecto)
    isSerialConnected: isConnected.kitchen,
    isSerialConnecting: isConnecting.kitchen,
    connectToSerial,
    printText,
    disconnectSerial,
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