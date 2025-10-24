"use strict";
// This file reads configuration from environment variables.
// In production, these are populated by Google Secret Manager when the function is deployed.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRIPS_PENALTY_AMOUNT = exports.SAFETY_DAILY_LIMIT = exports.SAFETY_RATE_LIMIT_MINUTES = exports.REGION = exports.GOOGLE_API_KEY = exports.TWILIO_PHONE_NUMBER = exports.TWILIO_WHATSAPP_NUMBER = exports.TWILIO_AUTH_TOKEN = exports.TWILIO_ACCOUNT_SID = exports.STRIPE_SUBSCRIPTION_DAYS = exports.STRIPE_ONBOARDING_RETURN_URL = exports.STRIPE_ONBOARDING_REFRESH_URL = exports.STRIPE_PUBLISHABLE_KEY = exports.STRIPE_WEEKLY_PRICE_ID = exports.STRIPE_WEBHOOK_SECRET_V2 = exports.STRIPE_WEBHOOK_SECRET = exports.STRIPE_SECRET = void 0;
// Stripe
exports.STRIPE_SECRET = process.env.STRIPE_SECRET ?? '';
exports.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';
exports.STRIPE_WEBHOOK_SECRET_V2 = process.env.STRIPE_WEBHOOK_SECRET_V2 ?? '';
exports.STRIPE_WEEKLY_PRICE_ID = process.env.STRIPE_WEEKLY_PRICE_ID ?? '';
exports.STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY ?? '';
exports.STRIPE_ONBOARDING_REFRESH_URL = process.env.STRIPE_ONBOARDING_REFRESH_URL ?? 'https://taxipro.mx/stripe/onboarding/retry';
exports.STRIPE_ONBOARDING_RETURN_URL = process.env.STRIPE_ONBOARDING_RETURN_URL ?? 'https://taxipro.mx/stripe/onboarding/complete';
exports.STRIPE_SUBSCRIPTION_DAYS = Number(process.env.STRIPE_SUBSCRIPTION_DAYS ?? 7);
// Twilio
exports.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? '';
exports.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? '';
exports.TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER ?? '';
exports.TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER ?? '';
// Google Cloud
exports.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY ?? '';
// App Settings
exports.REGION = process.env.REGION ?? 'us-central1';
// Safety
exports.SAFETY_RATE_LIMIT_MINUTES = Number(process.env.SAFETY_RATE_LIMIT_MINUTES ?? 10);
exports.SAFETY_DAILY_LIMIT = Number(process.env.SAFETY_DAILY_LIMIT ?? 3);
// Trips / penalties
exports.TRIPS_PENALTY_AMOUNT = Number(process.env.TRIPS_PENALTY_AMOUNT ?? 2300);
//# sourceMappingURL=config.js.map