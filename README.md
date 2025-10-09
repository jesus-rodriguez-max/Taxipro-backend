# TaxiPro Backend

![Backend CI](https://github.com/jesus-rodriguez-max/Taxipro-backend/actions/workflows/backend-ci.yml/badge.svg)
![Functions Deploy](https://github.com/jesus-rodriguez-max/Taxipro-backend/actions/workflows/functions-deploy.yml/badge.svg)

Backend de TaxiPro basado en Firebase Functions (Node.js 20, TypeScript).

Este repositorio contiene:
- Código de Cloud Functions en `functions/`
- Reglas de Firestore en `firestore.rules`
- Documentación técnica en `docs/`

## Requisitos
- Node.js 20
- Firebase CLI

## Entorno y configuración
- Variables de entorno administradas con `.env` y cargadas por `functions/src/config.ts` (usa `dotenv`).
- Ejemplos y guía completa: `functions/README_ENV.md`.

Variables comunes:
```env
STRIPE_SECRET=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_WEEKLY_PRICE_ID=price_weekly_149mxn
STRIPE_ONBOARDING_REFRESH_URL=https://tu-dominio.com/stripe/onboarding/retry
STRIPE_ONBOARDING_RETURN_URL=https://tu-dominio.com/stripe/onboarding/complete
```

> Importante: evitar `functions.config()` (API deprecada en marzo 2026). El proyecto ya está migrado a `.env`.

## Desarrollo local
```bash
npm --prefix functions install
npm --prefix functions run build
firebase emulators:start
```

## Despliegue
El repositorio incluye un hook de predeploy que compila TypeScript antes de desplegar.

```bash
firebase deploy --only functions
```

## Endpoints principales
- `createStripeAccountLink` (Callable)
- `createCheckoutSession` (Callable, alias de `createDriverSubscriptionSession`)
- `subscribeDriver` (Callable)
- `checkDriverSubscription` (Callable)
- `stripeWebhook` (HTTP)

## Documentación relacionada
- Guía de entorno: `functions/README_ENV.md`
- Stripe (Connect + Suscripciones): `docs/stripe.md`
- Manual técnico Stripe: `docs/stripe/manual-stripe.md`

## Estructura
```
Taxipro-backend/
├─ functions/
│  ├─ src/
│  ├─ dist/
│  ├─ package.json
│  └─ tsconfig.json
├─ docs/
├─ firestore.rules
└─ firebase.json
```

## Troubleshooting rápido
- Si una función no aparece tras deploy, verifica que el build exista en `functions/dist/` (el predeploy lo compila automáticamente).
- Asegúrate de tener `.env` o `.env.<projectId>` con las claves necesarias.
- Webhooks de Stripe: setear `STRIPE_WEBHOOK_SECRET` en `.env` y apuntar `stripeWebhook`.
