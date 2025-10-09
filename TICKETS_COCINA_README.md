# Sistema de Tickets de Cocina - Frontend React

## Descripción

Este sistema permite al frontend React recibir notificaciones en tiempo real de nuevas órdenes a través de WebSocket y generar tickets de cocina similares a los que genera la aplicación móvil.

## Funcionalidades Implementadas

### 1. Componente KitchenTicketManager

**Ubicación:** `src/app/components/KitchenTicketManager.jsx`

**Características:**
- ✅ Conexión automática al WebSocket del backend (puerto 3000)
- ✅ Escucha notificaciones de nuevas órdenes en tiempo real
- ✅ Interfaz visual para gestionar tickets de cocina
- ✅ Generación de tickets con formato similar al mobile
- ✅ Función de impresión de tickets
- ✅ Control de estado de notificaciones (impreso/pendiente)
- ✅ Filtrado automático de productos de delivery/envío
- ✅ Soporte para órdenes de mesa y para llevar

### 2. Integración en el Sistema

**Ruta:** `/cocina/tickets`

**Menú:** Cocina > Tickets de Cocina

**Permisos:** Requiere autenticación de administrador

## Cómo Usar

### 1. Acceso al Sistema
1. Inicia sesión en el frontend React
2. Ve al menú lateral izquierdo
3. Busca la sección "Cocina"
4. Haz clic en "Tickets de Cocina"

### 2. Configuración Inicial
1. Asegúrate de que el backend esté corriendo en `http://localhost:3000`
2. El sistema se conectará automáticamente al WebSocket
3. Verifica que el indicador muestre "Conectado" (chip verde)

### 3. Recepción de Órdenes
- Las nuevas órdenes aparecerán automáticamente en la lista
- Cada orden muestra:
  - Número de orden
  - Hora de recepción
  - Mesa(s) o "Para llevar"
  - Cantidad de productos
  - Estado de impresión

### 4. Impresión de Tickets
1. Haz clic en el botón "Imprimir" de cualquier orden
2. Se abrirá una ventana de impresión con el ticket formateado
3. El ticket incluye:
   - Título "COCINA"
   - Información de mesa o "PARA LLEVAR"
   - Lista de productos con cantidades
   - Comentarios especiales (si los hay)
   - Número de orden y fecha

### 5. Gestión de Notificaciones
- **Limpiar:** Elimina todas las notificaciones de la lista
- **Eliminar individual:** Usa el botón "X" en cada orden
- **Activar/Desactivar:** Usa el switch "Escuchar notificaciones"

## Formato del Ticket de Cocina

El ticket generado sigue el mismo formato que la aplicación móvil:

```
================================
            COCINA
================================

MESA: 5

================================
PRODUCTOS:

2  Ceviche Mixto
   >> Sin cebolla

1  F. Arroz Chaufa

3  Chicha Morada

================================
Orden #: 123
Fecha: 15/12/2024 14:30:25
================================
```

## Características Técnicas

### WebSocket
- **URL:** `http://localhost:3000`
- **Evento escuchado:** `new-order`
- **Sala:** Se une automáticamente a la sala del restaurante (ID: 1)

### Filtros Automáticos
El sistema filtra automáticamente productos que no deben aparecer en cocina:
- Productos con "delivery" en el nombre
- Productos con "domicilio" en el nombre
- Productos con "envío" en el nombre
- Productos con "taper" en el nombre

### Formato de Productos
- Productos tipo "fuente" se muestran con prefijo "F."
- Se eliminan sufijos "(Personal)" y "(Fuente)" del nombre
- Se muestran comentarios especiales con prefijo ">> "

## Instalación de Dependencias

Si es la primera vez que usas el sistema, instala las dependencias:

```bash
cd frontend
npm install
```

La dependencia `socket.io-client` ya está agregada al `package.json`.

## Solución de Problemas

### No se conecta al WebSocket
1. Verifica que el backend esté corriendo en puerto 3000
2. Revisa la consola del navegador para errores
3. Asegúrate de que no haya firewall bloqueando la conexión

### No llegan notificaciones
1. Verifica que el switch "Escuchar notificaciones" esté activado
2. Comprueba que el backend esté emitiendo eventos `new-order`
3. Revisa que el WebSocket esté conectado (indicador verde)

### Problemas de impresión
1. Verifica que el navegador permita ventanas emergentes
2. Asegúrate de tener una impresora configurada
3. Revisa la configuración de impresión del navegador

## Próximas Mejoras

- [ ] Sonido de notificación para nuevas órdenes
- [ ] Filtros por tipo de orden (mesa/delivery)
- [ ] Historial de tickets impresos
- [ ] Configuración de impresora térmica
- [ ] Agrupación de órdenes por mesa
- [ ] Tiempo estimado de preparación

## Soporte

Para reportar problemas o solicitar nuevas funcionalidades, contacta al equipo de desarrollo.