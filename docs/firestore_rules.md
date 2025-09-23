# 📘 Manual de Reglas Firestore

## Introducción

Las reglas de Firestore son fundamentales para **proteger los datos** y **garantizar la consistencia** de la aplicación Taxi Pro. Estas reglas actúan como una capa de seguridad que valida cada operación de lectura/escritura antes de ejecutarla en la base de datos.

### Propósitos principales:
- Proteger información sensible de usuarios y conductores
- Garantizar que solo los roles autorizados puedan modificar datos críticos
- Mantener la integridad de los estados de viajes
- Prevenir accesos no autorizados a datos de pagos y transacciones

## Roles del Sistema

El sistema de Taxi Pro maneja cuatro roles principales:

| Rol | Descripción | Permisos Generales |
|-----|-------------|-------------------|
| **admin** | Administrador del sistema | Control total sobre todas las colecciones |
| **compliance** | Auditoría y cumplimiento | Supervisión, validación de documentos, suspensiones |
| **driver** | Conductor | Gestión de sus datos personales y viajes asignados |
| **passenger** | Pasajero/Usuario | Gestión de sus datos personales y viajes solicitados |

## Funciones Helper

### Funciones de validación de roles

```javascript
// Valida si el usuario tiene permisos de administrador
function hasAdminRole() {
  return request.auth.token.admin == true || request.auth.token.role == 'admin';
}

// Valida si el usuario tiene permisos de compliance
function hasComplianceRole() {
  return request.auth.token.compliance == true || request.auth.token.role == 'compliance';
}

// Valida si es el mismo usuario (para operaciones sobre datos propios)
function isOwner(userId) {
  return request.auth.uid == userId;
}

// Valida si es un conductor verificado
function isVerifiedDriver() {
  return request.auth.token.role == 'driver' && 
         request.auth.token.verified == true;
}
```

## Colecciones Principales y Permisos

### 🧑‍🤝‍🧑 `/users/{userId}` 

**Propósito**: Almacenar información básica de usuarios (pasajeros).

**Permisos de lectura**:
- ✅ El mismo usuario (`isOwner(userId)` )
- ✅ Admin (`hasAdminRole()` )
- ✅ Compliance (`hasComplianceRole()` )

**Permisos de escritura**:
- ✅ El mismo usuario (solo campos no críticos: nombre, teléfono, foto)
- ✅ Admin (todos los campos)
- ❌ Compliance (solo lectura para auditoría)

### 🚗 `/drivers/{driverId}` 

**Propósito**: Información de conductores, documentos y estado de verificación.

**Permisos de lectura**:
- ✅ El mismo conductor
- ✅ Admin
- ✅ Compliance

**Permisos de escritura**:
- ✅ Admin (validación completa)
- ✅ Compliance (suspensiones, validación de documentos)
- ⚠️ Conductor (solo datos personales básicos, NO estado de verificación)

### 🚕 `/trips/{tripId}` 

**Propósito**: Gestión de viajes y sus estados.

**Permisos de creación**:
- ✅ Pasajeros autenticados

**Permisos de actualización de estado**:
- ✅ Conductor asignado (usando `canTransition()` )
- ✅ Admin/Compliance (cualquier transición válida)
- ❌ Otros usuarios

**Permisos de eliminación**:
- ❌ Nadie (solo soft-delete si aplica)

### ⭐ `/ratings/{ratingId}` 

**Propósito**: Calificaciones y comentarios de viajes.

**Permisos de creación**:
- ✅ Solo pasajeros sobre viajes `COMPLETED`  propios

**Permisos de lectura**:
- ✅ Admin
- ✅ Compliance
- ✅ Conductor afectado por la calificación

### 🔗 `/shared_trips/{shareId}` 

**Propósito**: Enlaces temporales para compartir viajes.

**Permisos de creación**:
- ✅ Pasajero dueño del viaje

**Nota**: Se auto-expiran con función programada (24 horas).

### 💳 `/payments/{paymentId}`  *(Futuro)*

**Propósito**: Transacciones y métodos de pago.

**Permisos**:
- ✅ Solo backend/admin (máxima seguridad)
- ❌ Usuarios finales (solo consulta a través de funciones)

## Restricciones Clave

### 1. Un viaje activo por pasajero
```javascript
// Validación en reglas: un usuario no puede tener múltiples viajes PENDING/ASSIGNED/ACTIVE
function hasActiveTrip(userId) {
  return exists(/databases/$(database)/documents/trips/$(tripId)) &&
         get(/databases/$(database)/documents/trips/$(tripId)).data.status in 
         ['PENDING', 'ASSIGNED', 'ARRIVED', 'ACTIVE'];
}
```

### 2. Geocerca en inicio/fin *(Pendiente de implementar)*
- Validar que el inicio/fin del viaje esté dentro del área de servicio
- Usar coordenadas geográficas para delimitar zonas permitidas

### 3. Timestamps controlados por backend
- `createdAt` , `updatedAt` , `startedAt` , `completedAt`  solo pueden ser establecidos por funciones del servidor
- Los clientes no pueden manipular timestamps críticos

## Mantenimiento y Pruebas

### Actualización de reglas

```bash
# Subir nuevas reglas a Firebase
firebase deploy --only firestore:rules

# Validar sintaxis localmente
firebase firestore:rules:get
```

### Pruebas en local

```bash
# Iniciar emulador con reglas
firebase emulators:start --only firestore

# Ejecutar suite de pruebas de reglas
npm run test:rules

# Ejecutar pruebas específicas
npx firebase emulators:exec --only firestore "npm run test:rules -- --grep 'user permissions'"
```

### Archivo de reglas principal
- **Ubicación**: `firestore.rules`  (raíz del proyecto)
- **Versionado**: Cambios tracked en Git
- **Respaldos**: Firebase mantiene historial automático
