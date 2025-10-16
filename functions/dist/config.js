"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENABLE_SCHEDULED_TASKS = exports.LOG_LEVEL = exports.REGION = exports.NODE_ENV = exports.FIREBASE_STORAGE_BUCKET = exports.FIREBASE_AUTH_DOMAIN = exports.FIREBASE_API_KEY = exports.FIREBASE_APP_ID = exports.FIREBASE_PROJECT_NUMBER = exports.FIREBASE_PROJECT_ID = exports.TRIPS_PENALTY_AMOUNT = exports.SAFETY_DAILY_LIMIT = exports.SAFETY_RATE_LIMIT_MINUTES = exports.TWILIO_PHONE_NUMBER = exports.TWILIO_WHATSAPP_NUMBER = exports.TWILIO_AUTH_TOKEN = exports.TWILIO_ACCOUNT_SID = exports.STRIPE_SUBSCRIPTION_DAYS = exports.STRIPE_ONBOARDING_RETURN_URL = exports.STRIPE_ONBOARDING_REFRESH_URL = exports.STRIPE_WEEKLY_PRICE_ID = exports.STRIPE_WEBHOOK_SECRET = exports.STRIPE_SECRET_SOURCE = exports.STRIPE_SECRET = void 0;
const functions = __importStar(require("firebase-functions"));
// Prefer Firebase Functions config() over process.env, but support env as fallback (for local dev)
const stripeCfg = functions.config()?.stripe || {};
const envSecret = (process.env.STRIPE_SECRET || process.env.STRIPE_SECRET_KEY || '').trim();
const cfgSecret = (stripeCfg.secret || '').trim();
exports.STRIPE_SECRET = (cfgSecret || envSecret);
exports.STRIPE_SECRET_SOURCE = cfgSecret ? 'functions_config' : (envSecret ? 'env' : 'none');
const envWebhook = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
const cfgWebhook = (stripeCfg.webhook_secret || '').trim();
exports.STRIPE_WEBHOOK_SECRET = (cfgWebhook || envWebhook);
const envWeeklyPrice = (process.env.STRIPE_WEEKLY_PRICE_ID || '').trim();
const cfgWeeklyPrice = (stripeCfg.weekly_price_id || '').trim();
exports.STRIPE_WEEKLY_PRICE_ID = (cfgWeeklyPrice || envWeeklyPrice);
exports.STRIPE_ONBOARDING_REFRESH_URL = process.env.STRIPE_ONBOARDING_REFRESH_URL || stripeCfg.onboarding_refresh_url || 'https://taxipro.mx/stripe/onboarding/retry';
exports.STRIPE_ONBOARDING_RETURN_URL = process.env.STRIPE_ONBOARDING_RETURN_URL || stripeCfg.onboarding_return_url || 'https://taxipro.mx/stripe/onboarding/complete';
exports.STRIPE_SUBSCRIPTION_DAYS = Number(process.env.STRIPE_SUBSCRIPTION_DAYS || 7);
// Twilio
exports.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
exports.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
exports.TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || '';
exports.TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';
// Safety
exports.SAFETY_RATE_LIMIT_MINUTES = Number(process.env.SAFETY_RATE_LIMIT_MINUTES || 10);
exports.SAFETY_DAILY_LIMIT = Number(process.env.SAFETY_DAILY_LIMIT || 3);
// Trips / penalties
exports.TRIPS_PENALTY_AMOUNT = Number(process.env.TRIPS_PENALTY_AMOUNT || 2300);
// Firebase (optional, for reference in tooling/tests)
exports.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || '';
exports.FIREBASE_PROJECT_NUMBER = process.env.FIREBASE_PROJECT_NUMBER || '';
exports.FIREBASE_APP_ID = process.env.FIREBASE_APP_ID || '';
exports.FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || '';
exports.FIREBASE_AUTH_DOMAIN = process.env.FIREBASE_AUTH_DOMAIN || '';
exports.FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || '';
// App
exports.NODE_ENV = process.env.NODE_ENV || 'development';
exports.REGION = process.env.REGION || 'us-central1';
exports.LOG_LEVEL = process.env.LOG_LEVEL || 'info';
exports.ENABLE_SCHEDULED_TASKS = (process.env.ENABLE_SCHEDULED_TASKS || 'true') === 'true';
//# sourceMappingURL=config.js.map