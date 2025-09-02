const makeQuerySnap = (docs) => ({ empty: docs.length === 0, docs });

const logsCollection = { add: jest.fn(async () => ({ id: 'log-id' })) };

const makeTripDoc = (trip = {
  passengerId: 'test-passenger-id',
  status: 'pending',
  origin: { lat: 1, lng: 1 },
  destination: { lat: 2, lng: 2 },
}) => ({
  get: jest.fn(async () => ({ exists: true, data: () => trip })),
  set: jest.fn(async () => {}),
  update: jest.fn(async () => {}),
  collection: jest.fn(() => logsCollection),
});

const tripsCollection = {
  doc: jest.fn(() => makeTripDoc()),
  where: jest.fn(() => queryChain),
  limit: jest.fn(() => ({ get: jest.fn(async () => makeQuerySnap([])) })),
  get: jest.fn(async () => makeQuerySnap([])),
  add: jest.fn(async () => ({ id: 'new-trip' })),
};

const queryChain = {
  where: tripsCollection.where,
  limit: tripsCollection.limit,
  get: tripsCollection.get,
};

const db = {
  collection: jest.fn((name) => {
    if (name === 'trips') return tripsCollection;
    if (name === 'stripe_events') {
      return {
        doc: jest.fn((id) => ({ set: jest.fn(async () => ({ id })) })),
        add: jest.fn(async () => ({ id: 'evt-id' })),
      };
    }
    return {
      doc: jest.fn(() => ({
        get: jest.fn(async () => ({ exists: false, data: () => null })),
        set: jest.fn(async () => {}),
        update: jest.fn(async () => {}),
      })),
      add: jest.fn(async () => ({ id: 'generic-id' })),
      where: jest.fn(() => queryChain),
      limit: jest.fn(() => ({ get: jest.fn(async () => makeQuerySnap([])) })),
      get: jest.fn(async () => makeQuerySnap([])),
    };
  }),
};

const firebaseMock = { app: { name: '[mock-app]' }, db, tripsCollection, logsCollection, makeTripDoc, makeQuerySnap };

module.exports = {
  firebaseMock,
};