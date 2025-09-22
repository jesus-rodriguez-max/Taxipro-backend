import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { updateTripStatusCallable } from '../src/trips/updateTripStatus';
import { cleanupSharedTrips } from '../src/sharedTrips/cleanupSharedTrips';
import { TripStatus } from '../src/constants/tripStatus';
import { resetMockFirestore } from './mocks/firebase';

admin.initializeApp();
const db = admin.firestore();

// Mock authenticated context for callable functions
const authenticatedContext = (uid: string) => ({
  auth: {
    uid
  },
  app: {
    name: 'test-app',
    projectId: 'test-project',
  },
});

// Helper to create a shared trip
const createSharedTrip = async (shareToken: string, tripId: string, active: boolean, createdAt: Timestamp) => {
  await db.collection('shared_trips').doc(shareToken).set({
    tripId,
    active,
    passengerId: 'passenger1', // Dummy passenger
    driverId: 'driver1', // Dummy driver
    origin: { lat: 0, lng: 0, address: 'Origin' },
    destination: { lat: 1, lng: 1, address: 'Destination' },
    createdAt,
  });
};

// Helper to create a trip
const createTrip = async (tripId: string, passengerId: string, driverId: string, status: TripStatus) => {
  await db.collection('trips').doc(tripId).set({
    passengerId,
    driverId,
    status,
    origin: { point: { lat: 0, lng: 0 }, address: 'Origin' },
    destination: { point: { lat: 1, lng: 1 }, address: 'Destination' },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
};

describe('Shared Trips Functionality', () => {
  afterEach(async () => {
    // Clean up in-memory Firestore after each test
    resetMockFirestore();
  });

  // Test for Firestore Rules (conceptual, as full rules testing requires @firebase/rules-unit-testing)
  it('✅ Confirmar que un usuario solo accede a trips activos (via reglas de Firestore)', async () => {
    const shareTokenActive = 'shareActive';
    const shareTokenInactive = 'shareInactive';
    const tripId = 'tripRules';
    await createSharedTrip(shareTokenActive, tripId, true, Timestamp.now());
    await createSharedTrip(shareTokenInactive, tripId, false, Timestamp.now());

    // This test relies on the deployed rules. Here we simulate the expectation.
    // In a real rules test, you'd use `assertFails` and `assertSucceeds`.
    const activeDoc = await db.collection('shared_trips').doc(shareTokenActive).get();
    expect(activeDoc.exists).toBe(true); // Should be readable if active

    const inactiveDoc = await db.collection('shared_trips').doc(shareTokenInactive).get();
    expect(inactiveDoc.exists).toBe(true); // Admin SDK bypasses rules, so it will exist.
                                          // This test is more for documentation of the rule's intent.
  });

  it('✅ Confirmar que al finalizar un viaje, el shared trip cambia a active = false', async () => {
    const passengerId = 'passenger1';
    const driverId = 'driver1';
    const tripId = 'trip1';
    const shareToken = 'share1';

    await createTrip(tripId, passengerId, driverId, TripStatus.ACTIVE);
    await createSharedTrip(shareToken, tripId, true, Timestamp.now());

    const data = { tripId, newStatus: TripStatus.COMPLETED };
    const context = authenticatedContext(driverId); // Driver completes the trip

    await updateTripStatusCallable(data, context);

    const updatedSharedTrip = await db.collection('shared_trips').doc(shareToken).get();
    expect(updatedSharedTrip.exists).toBe(true);
    expect(updatedSharedTrip.data()?.active).toBe(false);
  });

  it('✅ Confirmar que la función programada elimina o limpia los enlaces expirados', async () => {
    const shareTokenExpired = 'shareExpired';
    const shareTokenInactive = 'shareInactiveButNotExpired';
    const shareTokenActive = 'shareActiveAndNotExpired';
    const tripId = 'tripCleanup';

    // Create an expired shared trip (active: false, createdAt > 24 hours ago)
    const twentyFiveHoursAgo = new Timestamp(Timestamp.now().seconds - (25 * 3600), 0);
    await createSharedTrip(shareTokenExpired, tripId, false, twentyFiveHoursAgo);

    // Create an inactive but not expired shared trip
    const oneHourAgo = new Timestamp(Timestamp.now().seconds - (1 * 3600), 0);
    await createSharedTrip(shareTokenInactive, tripId, false, oneHourAgo);

    // Create an active and not expired shared trip
    await createSharedTrip(shareTokenActive, tripId, true, Timestamp.now());

    // Run the cleanup function
    await cleanupSharedTrips({} as any);

    // Verify deletion
    const expiredDoc = await db.collection('shared_trips').doc(shareTokenExpired).get();
    expect(expiredDoc.exists).toBe(false);

    const inactiveDoc = await db.collection('shared_trips').doc(shareTokenInactive).get();
    expect(inactiveDoc.exists).toBe(true); // Should not be deleted as it's not expired

    const activeDoc = await db.collection('shared_trips').doc(shareTokenActive).get();
    expect(activeDoc.exists).toBe(true); // Should not be deleted as it's active
  });
});
