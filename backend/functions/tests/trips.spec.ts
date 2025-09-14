import { requestTripCallable as requestTrip } from '../src/trips/requestTrip';
import { acceptTripCallable as acceptTrip } from '../src/trips/acceptTrip';
import { updateTripStatusCallable as updateTripStatus } from '../src/trips/updateTripStatus';
import { https } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { TripStatus } from '../src/lib/types';
import { docGetMock } from './mocks/firebase';



const wrapped = (fn: any) => (data: any, context: https.CallableContext) => fn(data, context);

describe('Trip Functions', () => {
  beforeAll(() => {
    admin.initializeApp();
  });
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

    it('should throw an error if not authenticated', () => {
      const context = {};
      const testCall = () => wrappedAcceptTrip({ tripId: 'test-trip-id' }, context as https.CallableContext);
      expect(testCall).toThrow('The function must be called while authenticated.');
    });

    it('should return a not_implemented status', async () => {
      const context = { auth: { uid: 'test-driver-id' } };
      const data = { tripId: 'test-trip-id' };
      const result = await wrappedAcceptTrip(data, context as any);
      expect(result.status).toEqual('not_implemented');
      expect(result.success).toBe(true);
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
      docGetMock.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          passengerId: 'test-passenger-id',
          status: TripStatus.ASSIGNED, // <-- Correct starting status
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
            currentLocation: { lat: 3, lng: 3 }, // Location outside geofence
        };

        // Mock the trip data for this specific test
        docGetMock.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                passengerId: 'test-passenger-id',
                status: TripStatus.ASSIGNED, // <-- Correct starting status
                origin: { lat: 1, lng: 1 },
                destination: { lat: 2, lng: 2 },
            }),
        });

        await expect(wrappedUpdateTripStatus(data, context as any)).rejects.toThrow('Driver is not within the origin geofence.');
    });
  });
});