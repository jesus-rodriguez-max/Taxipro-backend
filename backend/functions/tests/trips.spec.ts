import { requestTrip } from '../src/trips/requestTrip.js';
import { acceptTrip } from '../src/trips/acceptTrip.js';
import { updateTripStatus } from '../src/trips/updateTripStatus.js';
import { https } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { TripStatus } from '../src/lib/types.js';

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: () => ({
    collection: (collectionName: string) => ({
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
      add: jest.fn(() => Promise.resolve({ id: 'test-trip-id' })),
      doc: (docId: string) => ({
        get: jest.fn(() => Promise.resolve({
          exists: true,
          data: () => ({
            passengerId: 'test-passenger-id',
            status: TripStatus.PENDING,
            origin: { lat: 1, lng: 1 },
            destination: { lat: 2, lng: 2 },
          }),
        })),
        update: jest.fn(() => Promise.resolve()),
        collection: () => ({
          add: jest.fn(() => Promise.resolve()),
        }),
      }),
    }),
  }),
}));

const wrapped = (fn: any) => (data: any, context: https.CallableContext) => fn(data, context);

describe('Trip Functions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestTrip', () => {
    const wrappedRequestTrip = wrapped(requestTrip);
    it('should throw an error if not authenticated', async () => {
      const context = {};
      await expect(wrappedRequestTrip({}, context as https.CallableContext)).rejects.toThrow('The function must be called while authenticated.');
    });

    it('should create a new trip', async () => {
      const context = { auth: { uid: 'test-passenger-id' } };
      const data = {
        origin: { lat: 1, lng: 1 },
        destination: { lat: 2, lng: 2 },
      };
      const result = await wrappedRequestTrip(data, context as any);
      expect(result).toEqual({ tripId: 'test-trip-id' });
    });
  });

  describe('acceptTrip', () => {
    const wrappedAcceptTrip = wrapped(acceptTrip);
    it('should throw an error if not authenticated', async () => {
      const context = {};
      await expect(wrappedAcceptTrip({ tripId: 'test-trip-id' }, context as https.CallableContext)).rejects.toThrow('The function must be called while authenticated.');
    });

    it('should accept a trip', async () => {
      const context = { auth: { uid: 'test-driver-id' } };
      const data = { tripId: 'test-trip-id' };
      const result = await wrappedAcceptTrip(data, context as any);
      expect(result).toEqual({ success: true });
    });
  });

  describe('updateTripStatus', () => {
    const wrappedUpdateTripStatus = wrapped(updateTripStatus);
    it('should throw an error if not authenticated', async () => {
      const context = {};
      await expect(wrappedUpdateTripStatus({ tripId: 'test-trip-id', newStatus: TripStatus.ACTIVE }, context as https.CallableContext)).rejects.toThrow('The function must be called while authenticated.');
    });

    it('should update trip status to active', async () => {
      const context = { auth: { uid: 'test-driver-id' } };
      const data = {
        tripId: 'test-trip-id',
        newStatus: TripStatus.ACTIVE,
        currentLocation: { lat: 1, lng: 1 },
      };

      // Mock the trip data for this specific test
      const firestore = admin.firestore() as any;
      firestore.collection('trips').doc('test-trip-id').get.mockResolvedValue({
        exists: true,
        data: () => ({
          passengerId: 'test-passenger-id',
          status: TripStatus.ASSIGNED,
          origin: { lat: 1, lng: 1 },
          destination: { lat: 2, lng: 2 },
        }),
      });

      const result = await wrappedUpdateTripStatus(data, context as any);
      expect(result).toEqual({ success: true });
    });

    it('should fail geofence validation', async () => {
        const context = { auth: { uid: 'test-driver-id' } };
        const data = {
            tripId: 'test-trip-id',
            newStatus: TripStatus.ACTIVE,
            currentLocation: { lat: 3, lng: 3 },
        };

        const firestore = admin.firestore() as any;
        firestore.collection('trips').doc('test-trip-id').get.mockResolvedValue({
            exists: true,
            data: () => ({
                passengerId: 'test-passenger-id',
                status: TripStatus.ASSIGNED,
                origin: { lat: 1, lng: 1 },
                destination: { lat: 2, lng: 2 },
            }),
        });

        await expect(wrappedUpdateTripStatus(data, context as any)).rejects.toThrow('Driver is not within the origin geofence.');
    });
  });
});