import { requestTripCallable as requestTrip } from '../src/trips/requestTrip';
import { acceptTripCallable as acceptTrip } from '../src/trips/acceptTrip';
import { updateTripStatusCallable as updateTripStatus } from '../src/trips/updateTripStatus';
import { https } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { Trip, TripStatus, GeoPoint } from '../src/lib/types';
import { docGetMock } from './mocks/firebase';
import { isDriverSubscriptionActive } from '../src/lib/subscription';

jest.mock('../src/lib/subscription', () => ({
  isDriverSubscriptionActive: jest.fn(),
}));

const wrapped = (fn: any) => (data: any, context: https.CallableContext) => fn(data, context);

const getMockTrip = (overrides: Partial<Trip> = {}): Trip => {
  const defaultTrip: Omit<Trip, 'createdAt' | 'updatedAt'> = {
    id: 'test-trip-id',
    passengerId: 'test-passenger-id',
    status: TripStatus.PENDING,
    origin: { point: { lat: 1, lng: 1 }, address: 'Origin Address' },
    destination: { point: { lat: 2, lng: 2 }, address: 'Destination Address' },
    payment: { method: 'stripe', isSettledToDriver: false },
    audit: { lastActor: 'passenger', lastAction: 'requestTrip' },
  };
  return {
    ...defaultTrip,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    ...overrides,
  } as Trip;
};

describe('Trip Functions', () => {
  beforeAll(() => {
    try { admin.initializeApp(); } catch (e) {}
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestTrip', () => {
    const wrappedRequestTrip = wrapped(requestTrip);
    it('should create a new trip', async () => {
      const context = { auth: { uid: 'test-passenger-id' } };
      const data = {
        origin: { point: { lat: 1, lng: 1 }, address: 'Origin' },
        destination: { point: { lat: 2, lng: 2 }, address: 'Destination' },
      };
      const result = await wrappedRequestTrip(data, context as any);
      expect(result).toEqual({ tripId: 'test-trip-id' });
    });
  });

  describe('acceptTrip', () => {
    const wrappedAcceptTrip = wrapped(acceptTrip);
    const driverContext = { auth: { uid: 'test-driver-id', token: { role: 'driver' } } };

    it('should accept a trip successfully', async () => {
      (isDriverSubscriptionActive as jest.Mock).mockResolvedValue(true);
      docGetMock.mockResolvedValue({ exists: true, data: () => getMockTrip({ status: TripStatus.PENDING }) });

      const result = await wrappedAcceptTrip({ tripId: 'test-trip-id' }, driverContext as any);

      expect(result.success).toBe(true);
      expect(result.status).toEqual(TripStatus.ASSIGNED);
    });
  });

  describe('updateTripStatus', () => {
    const wrappedUpdateTripStatus = wrapped(updateTripStatus);
    const driverContext = { auth: { uid: 'test-driver-id' } };

    it('should update trip status to active', async () => {
      const mockTrip = getMockTrip({ status: TripStatus.ASSIGNED, origin: { point: { lat: 1, lng: 1 }, address: 'Origin' } });
      docGetMock.mockResolvedValueOnce({ exists: true, data: () => mockTrip });

      const data = {
        tripId: 'test-trip-id',
        newStatus: TripStatus.ACTIVE,
        currentLocation: { lat: 1, lng: 1 },
      };

      const result = await wrappedUpdateTripStatus(data, driverContext as any);
      expect(result).toEqual({ success: true, message: 'Viaje actualizado.' });
    });
  });
});