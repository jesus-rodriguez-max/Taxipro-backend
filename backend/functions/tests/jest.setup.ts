import { mockFirestore, mockApp, mockFieldValue } from './mocks/firebase';

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(() => mockApp),
  firestore: mockFirestore,
  getFirestore: mockFirestore,
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: mockFirestore,
  FieldValue: mockFieldValue,
}));

console.log('Firebase Admin SDK has been mocked for tests.');