const { firebaseMock } = require('./mocks/firebase');

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(() => firebaseMock.app),
  app: jest.fn(() => firebaseMock.app),
  firestore: jest.fn(() => firebaseMock.db), // <- los tests usan admin.firestore()
}));

jest.mock('firebase-admin/firestore', () => {
  const { firebaseMock } = require('./mocks/firebase');
  return {
    getFirestore: () => firebaseMock.db,
    FieldValue: { serverTimestamp: () => new Date() },
  };
});