import { FieldValue } from 'firebase-admin/firestore';

export const docGetMock = jest.fn();
const setMock = jest.fn(() => Promise.resolve());
const updateMock = jest.fn(() => Promise.resolve());

const batchUpdateMock = jest.fn();
const batchSetMock = jest.fn();
const batchCommitMock = jest.fn(() => Promise.resolve());
const batchMock = { update: batchUpdateMock, set: batchSetMock, commit: batchCommitMock };

const whereMock: any = jest.fn(() => ({ where: whereMock, limit: jest.fn(() => ({ get: jest.fn(() => Promise.resolve({ empty: true, docs: [] })) })), get: jest.fn(() => Promise.resolve({ empty: true, docs: [] })) }));

const collectionMock: any = jest.fn((name: string) => ({
  doc: jest.fn((docId: string) => ({ get: docGetMock, set: setMock, update: updateMock, collection: collectionMock, add: jest.fn(() => Promise.resolve({ id: 'log-id' })) })),
  add: jest.fn(() => Promise.resolve({ id: 'test-trip-id' })),
  where: whereMock,
}));

export const mockFirestore = () => ({ collection: collectionMock, batch: () => batchMock });

export const mockApp = { firestore: mockFirestore };

// Mockeo correcto de FieldValue
export const mockFieldValue = {
  serverTimestamp: jest.fn(() => new Date()),
};

// Se sobreescribe el mock de admin/firestore para incluir FieldValue
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: mockFirestore,
  FieldValue: mockFieldValue, // Exporta el mock
}));
