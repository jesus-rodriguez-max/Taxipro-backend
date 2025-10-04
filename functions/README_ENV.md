# TaxiPro Functions: Migración a .env (dotenv)

Este backend migró de `functions.config()` a variables de entorno (`process.env`) usando `dotenv` y un módulo centralizado `src/config.ts`.

## Archivos clave

- `src/config.ts` carga `dotenv.config()` y expone constantes tipadas para todo el código.
- `.env.example` lista todas las claves necesarias (sin valores sensibles).
- `.env` (ignorado por Git) contiene los valores reales para desarrollo local.

## Variables requeridas

Stripe
- STRIPE_SECRET
- STRIPE_WEBHOOK_SECRET
- STRIPE_WEEKLY_PRICE_ID
- STRIPE_ONBOARDING_REFRESH_URL (default: https://taxipro.mx/stripe/onboarding/retry)
- STRIPE_ONBOARDING_RETURN_URL (default: https://taxipro.mx/stripe/onboarding/complete)
- STRIPE_SUBSCRIPTION_DAYS (default: 7)

Twilio
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_WHATSAPP_NUMBER
- TWILIO_PHONE_NUMBER

Safety
- SAFETY_RATE_LIMIT_MINUTES (default: 10)
- SAFETY_DAILY_LIMIT (default: 3)

Trips / penalizaciones
- TRIPS_PENALTY_AMOUNT (centavos; default: 2300)

## Uso local

1) Copia `.env.example` a `.env` dentro de `functions/` y coloca tus valores reales.
2) Ejecuta:

```bash
npm --prefix functions install
npm --prefix functions run build
firebase deploy --only functions
```

`src/config.ts` ya invoca `dotenv.config()` y el código lee de `process.env`.

## Producción (Firebase deploy)

Opciones recomendadas para inyectar variables:

- Archivos `.env` específicos de proyecto: crea `functions/.env.<projectId>` con variables para ese proyecto.
  - Para este proyecto: `functions/.env.taxipro-chofer`.
  - El CLI cargará estas variables en tiempo de build/deploy, y tu código las verá en `process.env`.
- O bien, usa variables de entorno del sistema en tu pipeline CI/CD (ver sección siguiente).

Evita `functions.config()` (será descontinuado en marzo 2026).

## CI/CD (GitHub Actions) – ejemplo

Define secretos en GitHub (Settings → Secrets and variables → Actions):
- STRIPE_SECRET, STRIPE_WEBHOOK_SECRET, STRIPE_WEEKLY_PRICE_ID
- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, TWILIO_PHONE_NUMBER
- SAFETY_RATE_LIMIT_MINUTES, SAFETY_DAILY_LIMIT, TRIPS_PENALTY_AMOUNT

Ejemplo de job para pruebas y build:

```yaml
name: Functions CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: functions
    env:
      STRIPE_SECRET: ${{ secrets.STRIPE_SECRET }}
      STRIPE_WEBHOOK_SECRET: ${{ secrets.STRIPE_WEBHOOK_SECRET }}
      STRIPE_WEEKLY_PRICE_ID: ${{ secrets.STRIPE_WEEKLY_PRICE_ID }}
      STRIPE_ONBOARDING_REFRESH_URL: https://taxipro.mx/stripe/onboarding/retry
      STRIPE_ONBOARDING_RETURN_URL: https://taxipro.mx/stripe/onboarding/complete
      STRIPE_SUBSCRIPTION_DAYS: 7
      TWILIO_ACCOUNT_SID: ${{ secrets.TWILIO_ACCOUNT_SID }}
      TWILIO_AUTH_TOKEN: ${{ secrets.TWILIO_AUTH_TOKEN }}
      TWILIO_WHATSAPP_NUMBER: ${{ secrets.TWILIO_WHATSAPP_NUMBER }}
      TWILIO_PHONE_NUMBER: ${{ secrets.TWILIO_PHONE_NUMBER }}
      SAFETY_RATE_LIMIT_MINUTES: 10
      SAFETY_DAILY_LIMIT: 3
      TRIPS_PENALTY_AMOUNT: 2300
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test --silent
      - run: npm run build
```

Para deploy desde Actions, agrega autenticación del CLI de Firebase (con un token o service account) y ejecuta `firebase deploy --only functions` en un paso posterior, heredando las mismas variables de entorno.

## Buenas prácticas

- No subas `.env` al repositorio; solo `.env.example`.
- Mantén `config.ts` como única fuente de lectura de `process.env` para evitar `dotenv.config()` duplicado.
- Usa variables por entorno (`.env.local`, `.env.<projectId>`) cuando aplique.

## Preguntas frecuentes

- ¿Por qué veo avisos deprecados de `functions.config()` en el CLI?
  - El aviso es general del CLI. Este código ya no usa `functions.config()`.
- ¿Necesito `dotenv` si el CLI de Firebase soporta `.env`?
  - `dotenv` asegura que `process.env` esté disponible también al ejecutar pruebas o scripts locales fuera del CLI. El CLI puede cargar `.env.<projectId>` en deploy/build, pero `dotenv` centraliza todo en tiempo de ejecución local.
