# 📘 Manual Técnico de Stripe - TaxiPro

## 📋 Índice
1. [Objetivo y Arquitectura](#objetivo-y-arquitectura)
2. [Configuración y Claves](#configuración-y-claves)
3. [Endpoints de Cloud Functions](#endpoints-de-cloud-functions)
4. [Sistema de Webhooks](#sistema-de-webhooks)
5. [Estructura de Datos en Firestore](#estructura-de-datos-en-firestore)
6. [Flujo de Onboarding KYC](#flujo-de-onboarding-kyc)
7. [Gestión de Suscripciones](#gestión-de-suscripciones)
8. [Testing y Validación](#testing-y-validación)
9. [Reglas de Firestore](#reglas-de-firestore)
10. [Aspectos Financieros](#aspectos-financieros)
11. [Troubleshooting](#troubleshooting)
12. [Próximos Pasos](#próximos-pasos)
13. [Recursos Adicionales](#recursos-adicionales)

---

## 🎯 Objetivo y Arquitectura

Implementar la membresía semanal para conductores de TaxiPro ($149 MXN, semanal, con 60 días de prueba) usando Stripe, y Stripe Connect (cuentas Express) para el onboarding/KYC de conductores. El backend valida que sólo los conductores con suscripción activa puedan recibir viajes.

- Backend: Firebase Functions (Node.js 22, TypeScript)
- Servicios: Firestore, Auth, Storage, FCM
- Módulo principal: `functions/src/stripe/`
- Arquitectura:
  - Cuentas Connect Express para conductores (onboarding KYC y capacidades).
  - Suscripción semanal gestionada por Checkout de Stripe (trial 60 días definido en el `Price`).
  - Webhooks para activar/suspender/cancelar membresías y reflejar KYC.
  - Campo de consentimiento obligatorio en Firestore: `drivers/{driverId}.billingConsent = true`.
  - Método de pago aceptado: únicamente tarjeta (`card`).

---

## 🔑 Configuración y Claves (.env / dotenv)

Usa variables de entorno cargadas por `functions/src/config.ts` (que hace `dotenv.config()`). Opciones:

- `functions/.env` para desarrollo local.
- `functions/.env.<projectId>` por proyecto (ej.: `functions/.env.taxipro-chofer`).
- Variables de entorno inyectadas por tu pipeline CI/CD.

Variables comunes (ejemplo):

```env
STRIPE_SECRET=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_WEEKLY_PRICE_ID=price_weekly_149mxn
STRIPE_ONBOARDING_REFRESH_URL=https://tu-dominio.com/stripe/onboarding/retry
STRIPE_ONBOARDING_RETURN_URL=https://tu-dominio.com/stripe/onboarding/complete
```

Notas:
- Evita `functions.config()` (API deprecada en marzo 2026) y no uses `.runtimeconfig.json`.
- El deploy ya ejecuta un predeploy (build) y el CLI carga `.env`.

Creación de Producto/Price (Stripe CLI):

- Producto: "Membresía Chofer TaxiPro"
- Precio: 14900 centavos (MXN), `recurring.interval=week`, `trial_period_days=60`.

```bash
stripe products create \
  --name "Membresía Chofer TaxiPro" \
  --description "Suscripción semanal de $149 MXN con 60 días gratis de prueba"

stripe prices create \
  --unit-amount 14900 \
  --currency mxn \
  --recurring "interval=week,trial_period_days=60" \
  --product prod_xxx
```

---

## 📂 Endpoints de Cloud Functions

Ubicación de exportes: `functions/src/index.ts`.

- `createDriverAccount` (Callable)
  - Archivo: `functions/src/stripe/createDriverAccount.ts`
  - Crea/recupera cuenta Connect Express (MX) para el conductor y devuelve un `accountLink` para completar KYC.
  - Entrada opcional: `{ refreshUrl?: string; returnUrl?: string; email?: string }`
  - Salida: `{ accountId: string; url: string }`

- `subscribeDriver` (Callable)
  - Archivo: `functions/src/stripe/subscribeDriver.ts`
  - Requiere `billingConsent=true` en `drivers/{driverId}`.
  - Crea/reutiliza `stripeCustomerId` y genera una Checkout Session de tipo `subscription` con `stripe.weekly_price_id`.
  - Sólo tarjeta: `payment_method_types: ['card']`.
  - Entrada opcional: `{ successUrl?: string; cancelUrl?: string }`
  - Salida: `{ sessionId: string; url: string }`

- `checkDriverSubscription` (Callable)
  - Archivo: `functions/src/stripe/checkDriverSubscription.ts`
  - Devuelve `{ active: boolean }` según expiración/estado de suscripción del conductor.

- `stripeWebhook` (HTTP onRequest)
  - Archivos: `functions/src/stripe/webhook.ts` y `functions/src/stripe/service.ts`
  - Verifica la firma del webhook (si está habilitada) y delega a manejadores de eventos.

- (Opcional legado) `createDriverSubscriptionSessionCallable`
  - Archivo: `functions/src/createDriverSubscription.ts`
  - Variante de creación de Checkout Session (usa `apiVersion: '2024-04-10'`).

---

## 🔄 Sistema de Webhooks

Eventos manejados (ubicación: `functions/src/stripe/service.ts`):

- `checkout.session.completed`
  - Activa la suscripción del conductor sólo si `drivers/{driverId}.billingConsent === true`.
  - Guarda `subscriptionId`, `stripeCustomerId`, `subscriptionActive: true` y `subscriptionExpiration: now + 7 días`.

- `invoice.payment_failed`
  - Suspende: `subscriptionActive: false`, `membership.status: 'suspended'`.

- `account.updated`
  - Refleja estado de KYC. Si `charges_enabled` y `details_submitted` → `kyc.verified = true`, `isApproved = true`.

- `customer.subscription.deleted`
  - Baja/cancelación: `subscriptionActive: false`, `subscriptionId: null`, `membership.status: 'unpaid'`, `subscriptionExpiration: epoch`.

Stripe CLI (local):

```bash
stripe listen --forward-to http://localhost:5001/<PROJECT_ID>/us-central1/stripeWebhook

stripe trigger checkout.session.completed \
  --override "data.object.client_reference_id=driver_e2e" \
  --override "data.object.customer=cus_test_123" \
  --override "data.object.subscription=sub_test_123"

stripe trigger invoice.payment_failed \
  --override "data.object.customer=cus_test_123"

stripe trigger customer.subscription.deleted \
  --override "data.object.customer=cus_test_123" \
  --override "data.object.id=sub_test_123"
```

---

## 🗂️ Estructura de Datos en Firestore

Colección: `drivers/{driverId}`

```ts
{
  billingConsent?: boolean,            // Requerido: true para permitir suscripción/activación
  stripeAccountId?: string,            // Cuenta Connect Express del conductor
  stripeCustomerId?: string,           // Customer de Stripe (suscripción)
  subscriptionId?: string | null,
  subscriptionActive?: boolean,
  subscriptionExpiration?: Timestamp | Date,
  isApproved?: boolean,                // KYC aprobado
  kyc?: { verified: boolean },
  membership?: {
    status: 'active' | 'grace_period' | 'suspended' | 'unpaid',
    lastPaymentAttempt?: Timestamp,
  }
}
```

---

## 🔄 Flujo de Onboarding KYC

1) `createDriverAccount` crea o recupera la cuenta Connect Express y genera un `accountLink` (onboarding).
2) El conductor completa KYC en Stripe.
3) El webhook `account.updated` marca `kyc.verified`/`isApproved` cuando Stripe habilita `charges_enabled` y `details_submitted`.

---

## 💳 Gestión de Suscripciones

- Precondiciones:
  - Usuario autenticado y con documento en `drivers/`.
  - `billingConsent === true` (obligatorio), controlado por el propio conductor.
- Alta:
  - `subscribeDriver` crea Checkout Session `mode: 'subscription'` con `stripe.weekly_price_id`.
  - Sólo tarjeta (`payment_method_types: ['card']`), sin efectivo/Oxxo.
  - Trial de 60 días definido en el `Price`.
- Activación:
  - `checkout.session.completed` (webhook) activa sólo si `billingConsent === true`.
- Suspensión/Baja:
  - `invoice.payment_failed` → `suspended`.
  - `customer.subscription.deleted` → `unpaid` y `subscriptionId: null`.
- Validación:
  - Front-end: `checkDriverSubscription()`.
  - Backend crítico: `isDriverSubscriptionActive(driverId)` (en `functions/src/lib/subscription.ts`).

---

## 🧪 Testing y Validación

- Unit tests (Jest): `functions/tests/stripe/`
  - `createDriverAccount.spec.ts`: Crea cuenta Express y `accountLink`.
  - `subscribeDriver.spec.ts`: Checkout Session; bloquea si `billingConsent=false`.
  - `checkDriverSubscription.spec.ts`: Cálculo de `active`.
  - `webhookHandler.spec.ts`: Webhooks; activa sólo con `billingConsent=true` y prueba suspensión/baja.
- Ejecutar pruebas:

```bash
cd functions
npm test
```

- Prueba manual con Stripe CLI: ver sección de Webhooks.

---

## 🔒 Reglas de Firestore

Se exige consentimiento explícito del conductor:

```ruby
rules_version = '2'
service cloud.firestore {
  match /databases/{database}/documents {
    function hasAdminRole() {
      return request.auth != null && (
        request.auth.token.admin == true || request.auth.token.role == 'admin'
      );
    }
    function hasComplianceRole() {
      return request.auth != null && (
        request.auth.token.compliance == true || request.auth.token.role == 'compliance'
      );
    }
    function driverSetsOnlyBillingConsent(driverId) {
      return request.auth != null && request.auth.uid == driverId
        && request.resource.data.diff(resource.data).changedKeys().hasOnly(['billingConsent']);
    }
    function noChangeToBillingConsent() {
      return !request.resource.data.diff(resource.data).changedKeys().hasAny(['billingConsent']);
    }

    match /drivers/{driverId} {
      // Crear por el propio chofer (consentimiento puede marcarse después)
      allow create: if request.auth != null && request.auth.uid == driverId
        && request.resource.data.status == 'pending';

      // Lectura: chofer dueño, admin o compliance
      allow read: if request.auth != null && (request.auth.uid == driverId || hasAdminRole() || hasComplianceRole());

      // Actualizaciones generales: admin/compliance, sin modificar billingConsent
      allow update: if (hasAdminRole() || hasComplianceRole()) && noChangeToBillingConsent();

      // Excepción: el propio chofer puede marcar/actualizar únicamente billingConsent
      allow update: if driverSetsOnlyBillingConsent(driverId);
    }
  }
}
```

Notas:
- El backend escribe `subscriptionActive`, `subscriptionId`, `membership` y fechas; el cliente no puede.
- `billingConsent` sólo lo puede modificar el conductor (ni admin ni compliance).

---

## 💰 Aspectos Financieros

- Método de pago: únicamente tarjeta (card) en Checkout; no se aceptan efectivo/Oxxo.
- Trial de 60 días definido a nivel de `Price`.
- Moneda: MXN; monto semanal: $149 MXN.
- La suscripción se procesa en la cuenta de la plataforma; las cuentas Connect Express del driver se usan principalmente para KYC y otros flujos (p. ej., pagos por viajes si aplica en el futuro).

---

## 🚨 Troubleshooting

- Firma de webhook inválida (`signature verification failed`):
  - Asegura que `stripe.webhook_secret` coincide con el `whsec_` del `stripe listen` activo.
  - Reinicia emuladores tras actualizar `.runtimeconfig.json`.

- `checkout.session.completed without client_reference_id`:
  - En pruebas, usa `--override "data.object.client_reference_id=<driverId>"`.

- `Driver not found on checkout.session.completed`:
  - Crea `drivers/{driverId}` antes de disparar eventos.

- `Driver has not accepted billingConsent. Skipping activation.`:
  - Establece `billingConsent=true` en el documento del driver.

- No se actualiza con `invoice.payment_failed` o `subscription.deleted`:
  - Primero ejecuta `checkout.session.completed` para guardar `stripeCustomerId` del driver.

- `permission-denied` en Firestore desde cliente:
  - Verifica reglas; el Admin SDK del backend no está restringido.

---

## 🚀 Próximos Pasos

- UI para que el conductor marque `billingConsent` (checkbox claro y auditable).
- Configurar Webhook de Stripe en producción apuntando a `stripeWebhook` desplegado.
- Observabilidad: logs estructurados y métricas (duración webhooks, eventos por estado, etc.).
- Recordatorios previos a expiración (notificaciones push/FCM).
- Reintentos automáticos o colas para idempotencia avanzada si aplica.

---

## 📚 Recursos Adicionales

- Stripe Connect Express: https://stripe.com/docs/connect/express-accounts
- Subscriptions via Checkout: https://stripe.com/docs/billing/subscriptions/checkout
- Webhooks: https://stripe.com/docs/webhooks
- Firebase Functions Config: https://firebase.google.com/docs/functions/config-env
- Firebase Emulators: https://firebase.google.com/docs/emulator-suite

---

**Versión del Manual**: 1.2  
**Última Actualización**: 22 de septiembre de 2025  
**Próxima Revisión**: 22 de diciembre de 2025
