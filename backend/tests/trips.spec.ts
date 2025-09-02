import { requestTripCallable as requestTrip } from '../functions/src/trips/requestTrip.ts';
import { acceptTripCallable as acceptTrip } from '../functions/src/trips/acceptTrip.ts';
import { updateTripStatusCallable as updateTripStatus } from '../functions/src/trips/updateTripStatus.ts';
import { https } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { TripStatus } from '../functions/src/lib/types.ts';

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => {
  const mockFirestore = () => ({
    collection: jest.fn((collectionName: string) => ({
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
      add: jest.fn(() => Promise.resolve({ id: 'test-trip-id' })),
      doc: jest.fn((docId: string) => ({
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
        collection: jest.fn(() => ({ add: jest.fn(() => Promise.resolve()) })),
      })),
    })),
  });

  const mockApp = {
    firestore: mockFirestore,
  };

  return {
    initializeApp: jest.fn(() => mockApp),
    firestore: mockFirestore,
    getFirestore: mockFirestore,
  };
});

// Mock firebase-functions to control https.onCall behavior
jest.mock('firebase-functions', () => ({
  https: {
    onCall: jest.fn((handler) => handler), // Directly return the handler function
    HttpsError: jest.fn((code, message) => {
      const error = new Error(message);
      (error as any).code = code;
      return error;
    }),
  },
}));

describe('Trip Functions', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestTrip', () => {
    it('should throw an error if not authenticated', async () => {
      const context = {};
      await expect(requestTrip({}, context as https.CallableContext)).rejects.toThrow('The function must be called while authenticated.');
    });

    it('should create a new trip', async () => {
      const context = { auth: { uid: 'test-passenger-id' } };
      const data = {
        origin: { lat: 1, lng: 1 },
        destination: { lat: 2, lng: 2 },
      };
      const result = await requestTrip(data, context as any);
      expect(result).toEqual({ tripId: 'test-trip-id' });
    });

    it('should prevent a new trip if an active trip already exists for the passenger', async () => {
      const context = { auth: { uid: 'test-passenger-id' } };
      const data = {
        origin: { lat: 1, lng: 1 },
        destination: { lat: 2, lng: 2 },
      };

      const firestore = admin.firestore() as any;
      const tripsCol = firestore.collection('trips');
      jest.spyOn(tripsCol, 'where').mockReturnValue({
        where: tripsCol.where,
        limit: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ empty: false, docs: [{ id: 'existing-active' }] }),
        }),
        get: jest.fn().mockResolvedValue({ empty: false, docs: [{ id: 'existing-active' }] }),
      });

      await expect(requestTrip(data, context as any)).rejects.toThrow('An active trip already exists for this passenger.');
    });
  });

  describe('acceptTrip', () => {
    it('should throw an error if not authenticated', async () => {
      const context = {};
      await expect(acceptTrip({ tripId: 'test-trip-id' }, context as https.CallableContext)).rejects.toThrow('The function must be called while authenticated.');
    });

    it('should accept a trip', async () => {
      const context = { auth: { uid: 'test-driver-id' } };
      const data = { tripId: 'test-trip-id' };
      const result = await acceptTrip(data, context as any);
      expect(result).toEqual({ success: true });
    });
  });

  describe('updateTripStatus', () => {
    it('should throw an error if not authenticated', async () => {
      const context = {};
      await expect(updateTripStatus({ tripId: 'test-trip-id', newStatus: TripStatus.ACTIVE }, context as https.CallableContext)).rejects.toThrow('The function must be called while authenticated.');
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

      const result = await updateTripStatus(data, context as any);
      expect(result).toEqual({ success: true });
    });

    it('should fail geocence validation', async () => {
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

        await expect(updateTripStatus(data, context as any)).rejects.toThrow('Driver is not within the origin geofence.');
    });
  });
});