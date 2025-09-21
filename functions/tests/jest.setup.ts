import { mockFirestore, mockApp, mockFieldValue } from './mocks/firebase';
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
      },
    }),
  };
});

// Mock de firebase-admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(() => mockApp),
  firestore: Object.assign(mockFirestore, { FieldValue: mockFieldValue }), // Asigna FieldValue al mock
  getFirestore: mockFirestore,
}));

console.log('Firebase Admin SDK and Functions Config have been mocked for tests.');
