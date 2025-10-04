import { mockFirestore, mockApp, mockFieldValue, Timestamp, resetMockFirestore } from './mocks/firebase';

beforeEach(() => {
  resetMockFirestore();
});
import * as functions from 'firebase-functions';

// Ensure env vars needed by config.ts are present during tests
process.env.STRIPE_SECRET = process.env.STRIPE_SECRET || 'test_secret_key';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'test_webhook_secret';
process.env.STRIPE_WEEKLY_PRICE_ID = process.env.STRIPE_WEEKLY_PRICE_ID || 'price_weekly_149mxn';
process.env.STRIPE_ONBOARDING_REFRESH_URL = process.env.STRIPE_ONBOARDING_REFRESH_URL || 'https://example.com/refresh';
process.env.STRIPE_ONBOARDING_RETURN_URL = process.env.STRIPE_ONBOARDING_RETURN_URL || 'https://example.com/return';
process.env.STRIPE_SUBSCRIPTION_DAYS = process.env.STRIPE_SUBSCRIPTION_DAYS || '7';
process.env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'test_auth_token';
process.env.TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || '+521234567890';
process.env.TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+521234567890';
process.env.SAFETY_RATE_LIMIT_MINUTES = process.env.SAFETY_RATE_LIMIT_MINUTES || '10';
process.env.SAFETY_DAILY_LIMIT = process.env.SAFETY_DAILY_LIMIT || '3';
process.env.TRIPS_PENALTY_AMOUNT = process.env.TRIPS_PENALTY_AMOUNT || '2300';

// Mock de firebase-functions para incluir la configuración de Stripe
jest.mock('firebase-functions', () => {
  const original = jest.requireActual('firebase-functions');
  return {
    ...original,
    config: () => ({
      stripe: {
        secret: 'test_secret_key',
        webhook_secret: 'test_webhook_secret',
        weekly_price_id: 'price_weekly_149mxn',
        onboarding_refresh_url: 'https://example.com/refresh',
        onboarding_return_url: 'https://example.com/return',
      },
    }),
  };
});

// Mock de firebase-admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(() => mockApp),
  // Exponer FieldValue y Timestamp en admin.firestore y permitir admin.firestore()
  firestore: Object.assign(mockFirestore, { FieldValue: mockFieldValue, Timestamp }),
  getFirestore: mockFirestore,
}));

console.log('Firebase Admin SDK and Functions Config have been mocked for tests.');
