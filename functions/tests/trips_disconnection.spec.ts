import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { TripStatus } from '../src/lib/types.js';
const test = require('firebase-functions-test')();
admin.initializeApp();
const db = admin.firestore();

// Helper to create a trip
const createTrip = async (tripId: string, status: TripStatus, updatedAt: Timestamp) => {
  await db.collection('trips').doc(tripId).set({
    passengerId: 'passenger1',
    driverId: 'driver1',
    status,
    origin: { point: { lat: 0, lng: 0 }, address: 'Origin' },
    destination: { point: { lat: 1, lng: 1 }, address: 'Destination' },
    createdAt: Timestamp.now(),
    updatedAt,
  });
};

describe('Trip Disconnection Handling', () => {
  afterEach(async () => {
    // Clean up Firestore after each test
    await test.cleanup();
    await db.collection('trips').listDocuments().then(docs => Promise.all(docs.map(doc => doc.delete())));
  });

  it('✅ Simular un viaje activo sin updates y confirmar que se marca como disconnected', async () => {
    const tripId = 'tripDisconnected';
    const fiveMinutesAgo = new Timestamp(Timestamp.now().seconds - (5 * 60 + 1), 0); // 5 minutes and 1 second ago
    await createTrip(tripId, TripStatus.ACTIVE, fiveMinutesAgo);

    await checkDisconnectedTrips(test.pubsub.makeContext());

    const updatedTrip = await db.collection('trips').doc(tripId).get();
    expect(updatedTrip.exists).toBe(true);
    expect(updatedTrip.data()?.status).toBe(TripStatus.DISCONNECTED);
    expect(updatedTrip.data()?.audit.lastAction).toContain('disconnected');
  });

  it('✅ Confirmar que luego pasa a pending_review', async () => {
    const tripId = 'tripPendingReview';
    const sixtyMinutesAgo = new Timestamp(Timestamp.now().seconds - (60 * 60 + 1), 0); // 60 minutes and 1 second ago
    await createTrip(tripId, TripStatus.DISCONNECTED, sixtyMinutesAgo);

    await checkDisconnectedTrips(test.pubsub.makeContext());

    const updatedTrip = await db.collection('trips').doc(tripId).get();
    expect(updatedTrip.exists).toBe(true);
    expect(updatedTrip.data()?.status).toBe(TripStatus.PENDING_REVIEW);
    expect(updatedTrip.data()?.audit.lastAction).toContain('pending_review');
  });

  it('❌ No debe marcar un viaje activo como disconnected si ha sido actualizado recientemente', async () => {
    const tripId = 'tripRecentlyUpdated';
    const oneMinuteAgo = new Timestamp(Timestamp.now().seconds - (1 * 60), 0); // 1 minute ago
    await createTrip(tripId, TripStatus.ACTIVE, oneMinuteAgo);

    await checkDisconnectedTrips(test.pubsub.makeContext());

    const updatedTrip = await db.collection('trips').doc(tripId).get();
    expect(updatedTrip.exists).toBe(true);
    expect(updatedTrip.data()?.status).toBe(TripStatus.ACTIVE); // Should remain active
  });

  it('❌ No debe marcar un viaje disconnected como pending_review si no ha pasado el tiempo suficiente', async () => {
    const tripId = 'tripDisconnectedRecent';
    const thirtyMinutesAgo = new Timestamp(Timestamp.now().seconds - (30 * 60), 0); // 30 minutes ago
    await createTrip(tripId, TripStatus.DISCONNECTED, thirtyMinutesAgo);

    await checkDisconnectedTrips(test.pubsub.makeContext());

    const updatedTrip = await db.collection('trips').doc(tripId).get();
    expect(updatedTrip.exists).toBe(true);
    expect(updatedTrip.data()?.status).toBe(TripStatus.DISCONNECTED); // Should remain disconnected
  });
});
