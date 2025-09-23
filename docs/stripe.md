# 🚖 Stripe Connect - Membresía Semanal de Conductores (TaxiPro)

Este documento describe el flujo técnico completo para integrar Stripe Connect (Express) y la suscripción semanal de $149 MXN para conductores.

- Backend: Firebase Functions (Node.js 20, TypeScript)
- Servicios: Firestore, Auth, Storage, FCM
- Módulo: `functions/src/stripe/`

## Resumen del flujo

1) El conductor crea su cuenta de Stripe Connect (Express) mediante `createDriverAccount()` y completa su KYC desde el `accountLink`.
2) El conductor inicia su suscripción semanal mediante `subscribeDriver()` (Checkout Session → Subscription).
3) Webhooks de Stripe actualizan el estado del conductor:
   - `checkout.session.completed` → activa la suscripción.
   - `invoice.payment_failed` → suspende conductor.
   - `account.updated` → refleja estado de KYC.
   - `customer.subscription.deleted` → cancela/baja voluntaria.
4) La app valida si el conductor puede recibir viajes llamando `checkDriverSubscription()` o en flujos críticos del backend con `isDriverSubscriptionActive()`.

---

## Configuración requerida (Firebase Functions Config)

Definir las llaves y parámetros de Stripe en Functions:

```bash
firebase functions:config:set \
  stripe.secret="sk_live_xxx" \
  stripe.webhook_secret="whsec_xxx" \
  stripe.weekly_price_id="price_weekly_149mxn" \
  stripe.onboarding_refresh_url="https://tu-dominio.com/stripe/onboarding/retry" \
  stripe.onboarding_return_url="https://tu-dominio.com/stripe/onboarding/complete"

firebase deploy --only functions
```

- `stripe.secret`: Clave secreta de Stripe.
- `stripe.webhook_secret`: Secreto del endpoint de webhook.
- `stripe.weekly_price_id`: ID del precio semanal ($149 MXN). Debe estar asociado al producto "Membresía Chofer".
- `stripe.onboarding_*_url`: URLs para el flujo de onboarding de Connect.

---

## Endpoints HTTPS (Callable y HTTP)

Ubicación: `functions/src/index.ts`

- `createDriverAccount` (callable): Crea cuenta Connect Express y devuelve `accountLink` para KYC.
- `subscribeDriver` (callable): Crea Checkout Session de suscripción semanal.
- `checkDriverSubscription` (callable): Devuelve `{ active: boolean }` según Firestore.
- `stripeWebhook` (HTTP onRequest): Recibe y procesa eventos de Stripe.

### 1) createDriverAccount()
Archivo: `functions/src/stripe/createDriverAccount.ts`

Entrada (opcional):
```ts
{
  refreshUrl?: string;
  returnUrl?: string;
  email?: string;
}
```
Salida:
```ts
{ accountId: string; url: string }
```

Lógica:
- Si la cuenta Connect no existe, se crea `type: 'express'` (país MX) y se guarda `stripeAccountId` en `drivers/{driverId}`.
- Se crea un `accountLink` para que el chofer complete su KYC (INE, RFC, cuenta bancaria).

### 2) subscribeDriver()
Archivo: `functions/src/stripe/subscribeDriver.ts`

Entrada (opcional):
```ts
{
  successUrl?: string;
  cancelUrl?: string;
}
```
Salida:
```ts
{ sessionId: string; url: string }
```

Lógica:
- Crea/reutiliza `stripeCustomerId`.
- Crea una Checkout Session `mode: 'subscription'` con `price: stripe.weekly_price_id`.
- El cliente completa la suscripción en Stripe.

### 3) checkDriverSubscription()
Archivo: `functions/src/stripe/checkDriverSubscription.ts`

- Obtiene `subscriptionExpiration` de `drivers/{driverId}` y devuelve `active: boolean`.
- Considera ausencia de expiración como periodo de prueba (activo) por compatibilidad.

### 4) stripeWebhook
Archivos: `functions/src/stripe/webhook.ts` y `functions/src/stripe/service.ts`

Eventos manejados:
- `checkout.session.completed`
  - Activa suscripción del conductor, guarda `subscriptionId`, `stripeCustomerId` y establece `subscriptionActive: true`.
  - Estima `subscriptionExpiration` (+7 días) como próxima fecha de expiración.
- `invoice.payment_failed`
  - Suspende conductor: `subscriptionActive: false`, `membership.status: 'suspended'`.
- `account.updated`
  - Actualiza KYC: si `charges_enabled` y `details_submitted` → `kyc.verified = true`, `isApproved = true`.
- `customer.subscription.deleted`
  - Marca baja/cancelación: `subscriptionActive: false`, `membership.status: 'unpaid'`.

---

## Modelo de datos en Firestore

Colección: `drivers/{driverId}`

Campos relevantes:
```ts
{
  stripeAccountId?: string,
  stripeCustomerId?: string,
  subscriptionId?: string,
  subscriptionActive?: boolean,
  subscriptionExpiration?: Timestamp | Date,
  isApproved?: boolean,
  kyc?: { verified: boolean },
  membership?: {
    status: 'active' | 'grace_period' | 'suspended' | 'unpaid',
    lastPaymentAttempt?: Timestamp,
  }
}
```

### Validación de viajes
- Antes de aceptar o recibir viajes, validar `isDriverSubscriptionActive(driverId)` (ya integrado en `functions/src/trips/acceptTrip.ts`).
- El front-end puede consultar `checkDriverSubscription()` para bloquear UI de recepción de viajes cuando no esté activo.

---

## Reglas de Firestore (ejemplo)

Asegura que campos sensibles de suscripción sean administrados por backend.

```ruby
rules_version = '2'
service cloud.firestore {
  match /databases/{database}/documents {
    function hasAdminRole() {
      return request.auth != null && (
        request.auth.token.admin == true || request.auth.token.role == 'admin'
      );
    }

    match /drivers/{driverId} {
      // Lectura: conductor dueño, admin o compliance
      allow read: if request.auth != null && (
        request.auth.uid == driverId || hasAdminRole()
      );

      // Escritura: solo backend/admin para campos de membresía
      allow update, create: if hasAdminRole();

      // (Opcional) Ejemplo granular si se desea permitir auto-edición limitada
      // allow update: if request.auth.uid == driverId &&
      //   !(('subscriptionActive' in request.resource.data) ||
      //     ('subscriptionId' in request.resource.data) ||
      //     ('stripeCustomerId' in request.resource.data) ||
      //     ('stripeAccountId' in request.resource.data) ||
      //     ('membership' in request.resource.data));
    }
  }
}
```

> Nota: En este repo, las reglas existentes ya restringen la escritura a admin/compliance en `drivers/`, lo cual satisface la protección de `subscriptionActive`.

---

## Pruebas automatizadas (Jest)

Ubicación de tests: `functions/tests/stripe/`

- `createDriverAccount.spec.ts`: valida creación de cuenta Express y generación de `accountLink`.
- `subscribeDriver.spec.ts`: valida creación de Checkout Session y persistencia de `stripeCustomerId`.
- `checkDriverSubscription.spec.ts`: valida cálculo de `active` según expiración.
- `webhookHandler.spec.ts`: valida efectos de webhooks en el documento del conductor.

Ejecutar:
```bash
cd functions
npm test
```

---

## Simulación de webhooks (Stripe CLI)

```bash
# 1) Escuchar eventos y reenviarlos a tu función (local o deploy)
stripe listen --forward-to http://localhost:5001/YOUR_PROJECT_ID/us-central1/stripeWebhook

# 2) Disparar manualmente eventos de prueba
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
stripe trigger account.updated
stripe trigger customer.subscription.deleted
```

Asegúrate de configurar `STRIPE_WEBHOOK_SECRET` en `functions.config().stripe.webhook_secret` si usas validación de firma.

---

## Consideraciones adicionales

- Usa un producto en Stripe: "Membresía Chofer" con precio `recurring` semanal (149 MXN), currency `mxn`.
- Para producción, protege URLs de onboarding con dominios reales (HTTPS) y agrega manejo de errores.
- Si deseas reconexión automática tras `DISCONNECTED`, puedes revalidar membresía en cada reconexión.
- Para conciliación de pagos, registra `membership.lastPaymentAttempt` con el timestamp del webhook de `invoice.payment_*`.
