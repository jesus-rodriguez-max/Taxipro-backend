import * as functions from 'firebase-functions';

// Prefer Firebase Functions config() over process.env, but support env as fallback (for local dev)
const stripeCfg = (functions.config()?.stripe as any) || {};

const envSecret = (process.env.STRIPE_SECRET || process.env.STRIPE_SECRET_KEY || '').trim();
const cfgSecret = (stripeCfg.secret || '').trim();
export const STRIPE_SECRET = (cfgSecret || envSecret);
export const STRIPE_SECRET_SOURCE = cfgSecret ? 'functions_config' : (envSecret ? 'env' : 'none');

const envWebhook = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
const cfgWebhook = (stripeCfg.webhook_secret || '').trim();
export const STRIPE_WEBHOOK_SECRET = (cfgWebhook || envWebhook);

const envWeeklyPrice = (process.env.STRIPE_WEEKLY_PRICE_ID || '').trim();
const cfgWeeklyPrice = (stripeCfg.weekly_price_id || '').trim();
export const STRIPE_WEEKLY_PRICE_ID = (cfgWeeklyPrice || envWeeklyPrice);

export const STRIPE_ONBOARDING_REFRESH_URL =
  process.env.STRIPE_ONBOARDING_REFRESH_URL || stripeCfg.onboarding_refresh_url || 'https://taxipro.mx/stripe/onboarding/retry';
export const STRIPE_ONBOARDING_RETURN_URL =
  process.env.STRIPE_ONBOARDING_RETURN_URL || stripeCfg.onboarding_return_url || 'https://taxipro.mx/stripe/onboarding/complete';
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

// Firebase (optional, for reference in tooling/tests)
export const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || '';
export const FIREBASE_PROJECT_NUMBER = process.env.FIREBASE_PROJECT_NUMBER || '';
export const FIREBASE_APP_ID = process.env.FIREBASE_APP_ID || '';
export const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || '';
export const FIREBASE_AUTH_DOMAIN = process.env.FIREBASE_AUTH_DOMAIN || '';
export const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || '';

// App
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const REGION = process.env.REGION || 'us-central1';
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
export const ENABLE_SCHEDULED_TASKS = (process.env.ENABLE_SCHEDULED_TASKS || 'true') === 'true';
