
# Backend de TaxiPro con Firebase Functions

Este directorio contiene todo el código de backend para la aplicación TaxiPro, implementado con Firebase Functions en TypeScript.

## Funciones Implementadas

A continuación se lista el API de funciones HTTP invocables (onCall) y funciones programadas (pubsub).

### Módulo de Viajes

- **requestTrip**: `(onCall)` - Un pasajero solicita un nuevo viaje.
- **acceptTrip**: `(onCall)` - Un chofer acepta un viaje pendiente.
- **updateTripStatus**: `(onCall)` - (Admin/Backend) Actualiza el estado de un viaje (ej. a 'active', 'completed').
- **driverArrived**: `(onCall)` - Un chofer notifica que ha llegado al punto de recogida.
- **cancelTrip**: `(onCall)` - Un pasajero cancela un viaje. Aplica penalización si el chofer ya ha llegado y han pasado más de 5 minutos.
- **markAsNoShow**: `(onCall)` - Un chofer marca que el pasajero no se presentó después de 5 minutos de espera. Aplica penalización.

### Módulo de Pagos y Membresías

- **stripeWebhook**: `(onRequest)` - Endpoint HTTP para recibir y procesar webhooks de Stripe (pagos, facturas, etc.).
- **createDriverSubscriptionSession**: `(onCall)` - Crea una sesión de Stripe Checkout para que un nuevo chofer se suscriba.
- **processMembershipPayments**: `(pubsub)` - Se ejecuta (Vie-Dom, 5 AM) para intentar el cobro automático de membresías a los choferes.
- **suspendOverdueMemberships**: `(pubsub)` - Se ejecuta (Lun, 5 AM) para suspender las cuentas de choferes cuyo pago no se pudo procesar el fin de semana.

### Módulo de Seguridad (Escudo TaxiPro)

- **updateTrustedContacts**: `(onCall)` - Permite al usuario añadir o modificar su lista de contactos de confianza.
- **updateSafetyConsents**: `(onCall)` - Permite al usuario dar o revocar su consentimiento para funciones de seguridad como la grabación de audio.
- **enableShare**: `(onCall)` - Activa la compartición de un viaje y devuelve un token único.
- **disableShare**: `(onCall)` - Desactiva la compartición de un viaje usando el token.
- **getShareStatus**: `(onRequest)` - Endpoint HTTP público que devuelve el estado mínimo y seguro de un viaje a partir de un token de compartición.
- **startRecording**: `(onCall)` - El cliente notifica al backend que ha iniciado una grabación de audio.
- **stopRecording**: `(onCall)` - El cliente notifica al backend que ha detenido la grabación.
- **logSafetyEvent**: `(onCall)` - Registra un evento de seguridad genérico (ej. botón de pánico).

## Pruebas

El proyecto utiliza Jest para pruebas unitarias de las reglas de seguridad de Firestore.

Para ejecutar las pruebas:

```bash
npm run test
```

Las suites de pruebas se encuentran en `firestore-tests/tests/`:
- `trips_rules.test.js`: Valida la lógica de creación, modificación y cancelación de viajes.
- `safety_rules.test.js`: Valida los permisos sobre perfiles de seguridad y logs de eventos.

## Despliegue

Para desplegar todas las funciones a Firebase, utiliza el siguiente comando:

```bash
npm run deploy:functions
```
