import * as admin from 'firebase-admin';

const queryGetMock = jest.fn(() => Promise.resolve({ empty: true, docs: [] }));
const limitMock = jest.fn(() => ({ get: queryGetMock }));
const whereMock: any = jest.fn(() => ({ where: whereMock, limit: limitMock, get: queryGetMock }));

const setMock = jest.fn(() => Promise.resolve());
const updateMock = jest.fn(() => Promise.resolve());

const tripsDocGetDefault = () => Promise.resolve({
  exists: true,
  data: () => ({
    passengerId: 'test-passenger-id',
    status: 'pending',
    origin: { lat: 1, lng: 1 },
    destination: { lat: 2, lng: 2 },
  }),
});

export const docGetMock = jest.fn(() => tripsDocGetDefault());

const collectionMock: any = jest.fn();
const docMock: any = jest.fn((docId: string) => ({
  get: docGetMock,
  set: setMock,
  update: updateMock,
  collection: collectionMock,
  add: jest.fn(() => Promise.resolve({ id: 'log-id' }))
}));

collectionMock.mockImplementation((name: string) => ({
  doc: docMock,
  where: whereMock,
  limit: limitMock,
  get: queryGetMock,
  add: jest.fn(() => Promise.resolve({ id: 'test-trip-id' }))
}));

export const mockFirestore = () => ({
  collection: collectionMock,
});

export const mockApp = {
  firestore: mockFirestore,
};

export const mockFieldValue = {
  serverTimestamp: () => new Date(),
};