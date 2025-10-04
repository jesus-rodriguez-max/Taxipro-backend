import * as dotenv from 'dotenv';
dotenv.config();

// Stripe
export const STRIPE_SECRET = process.env.STRIPE_SECRET || '';
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
export const STRIPE_WEEKLY_PRICE_ID = process.env.STRIPE_WEEKLY_PRICE_ID || '';
export const STRIPE_ONBOARDING_REFRESH_URL = process.env.STRIPE_ONBOARDING_REFRESH_URL || 'https://taxipro.mx/stripe/onboarding/retry';
export const STRIPE_ONBOARDING_RETURN_URL = process.env.STRIPE_ONBOARDING_RETURN_URL || 'https://taxipro.mx/stripe/onboarding/complete';
export const STRIPE_SUBSCRIPTION_DAYS = Number(process.env.STRIPE_SUBSCRIPTION_DAYS || 7);

// Twilio
export const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
export const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
export const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || '';
export const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

// Safety
export const SAFETY_RATE_LIMIT_MINUTES = Number(process.env.SAFETY_RATE_LIMIT_MINUTES || 10);
export const SAFETY_DAILY_LIMIT = Number(process.env.SAFETY_DAILY_LIMIT || 3);

// Trips / penalties
export const TRIPS_PENALTY_AMOUNT = Number(process.env.TRIPS_PENALTY_AMOUNT || 2300);
