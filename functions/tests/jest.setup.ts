import { mockFirestore, mockApp, mockFieldValue, Timestamp, resetMockFirestore } from './mocks/firebase';

beforeEach(() => {
  resetMockFirestore();
});
import * as functions from 'firebase-functions';

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
