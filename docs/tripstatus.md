# 📗 Manual de Estados (TripStatus)

## Introducción

Taxi Pro utiliza una **máquina de estados finita** para controlar el ciclo de vida de los viajes. Este enfoque garantiza que cada viaje siga un flujo lógico y predecible, evitando inconsistencias y estados inválidos.

### ¿Por qué una máquina de estados?
- **Predictibilidad**: Cada estado tiene transiciones específicas permitidas
- **Consistencia**: Imposible llegar a estados inválidos
- **Auditoría**: Historial claro de cambios de estado
- **Debugging**: Fácil identificación de problemas en el flujo

## Estados Definidos

### Estados Principales

| Estado | Descripción | Duración Típica |
|--------|-------------|-----------------|
| `PENDING`  | Viaje solicitado, buscando conductor | 1-5 minutos |
| `ASSIGNED`  | Conductor aceptó el viaje | 5-15 minutos |
| `ARRIVED`  | Conductor llegó al punto de origen | 1-5 minutos |
| `ACTIVE`  | Viaje en curso | Variable |
| `COMPLETED`  | Viaje finalizado exitosamente | Final |

### Estados de Cancelación

| Estado | Descripción | Quién puede activarlo |
|--------|-------------|----------------------|
| `CANCELLED`  | Cancelación general del sistema | Admin/Sistema |
| `CANCELLED_BY_PASSENGER`  | Pasajero canceló | Pasajero |
| `CANCELLED_BY_DRIVER`  | Conductor canceló | Conductor |
| `CANCELLED_WITH_PENALTY`  | Cancelación con penalización | Admin/Sistema |
| `NO_SHOW`  | Pasajero no se presentó | Conductor |

### Estados Especiales

| Estado | Descripción | Acción Requerida |
|--------|-------------|------------------|
| `DISCONNECTED`  | Conductor perdió conexión durante viaje activo | Reconexión automática |
| `PENDING_REVIEW`  | Viaje requiere revisión manual | Intervención de compliance |
| `PAYMENT_FAILED`  | Error en el procesamiento del pago | Reintento de pago |
| `REFUNDED`  | Viaje devuelto al pasajero | Ninguna |

## Transiciones Válidas

### Diagrama de Flujo Principal

```
PENDING ──→ ASSIGNED ──→ ARRIVED ──→ ACTIVE ──→ COMPLETED
   │           │           │          │
   │           │           │          └──→ DISCONNECTED ──→ PENDING_REVIEW
   │           │           │
   │           │           └──→ NO_SHOW
   │           │           └──→ CANCELLED_BY_PASSENGER
   │           │           └──→ CANCELLED_BY_DRIVER
   │           │
   │           └──→ CANCELLED_BY_PASSENGER
   │           └──→ CANCELLED_BY_DRIVER
   │           └──→ CANCELLED_WITH_PENALTY
   │
   └──→ CANCELLED
   └──→ CANCELLED_BY_PASSENGER
```

### Tabla de Transiciones

| Estado Actual | Estados Permitidos |
|---------------|-------------------|
| `PENDING`  | `ASSIGNED` , `CANCELLED` , `CANCELLED_BY_PASSENGER`  |
| `ASSIGNED`  | `ARRIVED` , `ACTIVE` , `CANCELLED_BY_PASSENGER` , `CANCELLED_BY_DRIVER` , `CANCELLED_WITH_PENALTY`  |
| `ARRIVED`  | `ACTIVE` , `NO_SHOW` , `CANCELLED_BY_PASSENGER` , `CANCELLED_BY_DRIVER` , `CANCELLED_WITH_PENALTY`  |
| `ACTIVE`  | `COMPLETED` , `CANCELLED` , `DISCONNECTED`  |
| `COMPLETED`  | `PAYMENT_FAILED` , `REFUNDED`  |
| `DISCONNECTED`  | `PENDING_REVIEW` , `ACTIVE`  (reconexión) |
| `PENDING_REVIEW`  | `COMPLETED` , `REFUNDED` , `CANCELLED`  |

## Transiciones Inválidas (Ejemplos)

❌ **Prohibidas**:
- `PENDING → COMPLETED`  (saltarse asignación y viaje)
- `COMPLETED → ACTIVE`  (reactivar viaje finalizado)
- `CANCELLED → ASSIGNED`  (reasignar viaje cancelado)
- `REFUNDED → PENDING`  (reutilizar viaje devuelto)

## Validación en Código

### Función `canTransition()` 

```javascript
function canTransition(currentStatus, newStatus) {
  const validTransitions = {
    'PENDING': ['ASSIGNED', 'CANCELLED', 'CANCELLED_BY_PASSENGER'],
    'ASSIGNED': ['ARRIVED', 'ACTIVE', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER', 'CANCELLED_WITH_PENALTY'],
    'ARRIVED': ['ACTIVE', 'NO_SHOW', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER', 'CANCELLED_WITH_PENALTY'],
    'ACTIVE': ['COMPLETED', 'CANCELLED', 'DISCONNECTED'],
    'COMPLETED': ['PAYMENT_FAILED', 'REFUNDED'],
    'DISCONNECTED': ['PENDING_REVIEW', 'ACTIVE'],
    'PENDING_REVIEW': ['COMPLETED', 'REFUNDED', 'CANCELLED']
  };
  
  return validTransitions[currentStatus]?.includes(newStatus) || false;
}
```

### Uso en funciones Cloud

```javascript
// Dentro de updateTripStatus()
if (!canTransition(currentTrip.status, newStatus)) {
  throw new functions.https.HttpsError(
    'invalid-argument', 
    `Invalid transition from ${currentTrip.status} to ${newStatus}` 
  );
}
```

## Eventos y Notificaciones

Cada cambio de estado puede disparar:
- **Push notifications** a conductor/pasajero
- **Webhooks** a sistemas externos
- **Logs de auditoría** para compliance
- **Métricas** para analytics
