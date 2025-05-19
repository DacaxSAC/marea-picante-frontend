import React, { useState } from 'react';

const BluetoothPrinterTest = () => {
  const [status, setStatus] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(null);

  const connectToPrinter = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          {
            services: ['000018f0-0000-1000-8000-00805f9b34fb']
          }
        ]
      });

      setSelectedDevice(device);
      setStatus('Dispositivo conectado: ' + device.name);

      // Conectar al dispositivo
      const server = await device.gatt.connect();
      
      // Obtener el servicio de impresión
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      
      // Obtener la característica de escritura
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      // Datos de prueba para imprimir
      const encoder = new TextEncoder();
      const data = encoder.encode('¡Prueba de impresión!\n------------------------\nConexión exitosa\n');
      
      // Enviar datos a la impresora
      await characteristic.writeValue(data);
      
      setStatus('Impresión completada');

    } catch (error) {
      setStatus('Error: ' + error.message);
      console.error('Error al conectar:', error);
    }
  };

  return (
    <div className="bluetooth-printer-container">
      <h2>Prueba de Impresora Bluetooth</h2>
      <button 
        onClick={connectToPrinter}
        className="connect-button"
      >
        Conectar Impresora
      </button>
      <div className="status-container">
        <p>Estado: {status}</p>
        {selectedDevice && (
          <p>Dispositivo conectado: {selectedDevice.name}</p>
        )}
      </div>

      <style jsx>{`
        .bluetooth-printer-container {
          padding: 20px;
          border: 1px solid #ccc;
          border-radius: 8px;
          max-width: 400px;
          margin: 20px auto;
        }

        .connect-button {
          background-color: #007bff;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          margin: 10px 0;
        }

        .connect-button:hover {
          background-color: #0056b3;
        }

        .status-container {
          margin-top: 15px;
          padding: 10px;
          background-color: #f8f9fa;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default BluetoothPrinterTest;