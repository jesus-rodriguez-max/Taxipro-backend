import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { submitRatingCallable } from '../src/ratings/submitRating';
import { resetMockFirestore } from './mocks/firebase';

// Helper to build callable context
const authenticatedContext = (uid: string) => ({
  auth: { uid },
  app: { name: 'test-app', projectId: 'test-project' },
});

// Helpers to create trips
const createCompletedTrip = async (tripId: string, passengerId: string, driverId: string) => {
  const db = admin.firestore();
  await db.collection('trips').doc(tripId).set({
    passengerId,
    driverId,
    status: 'completed',
    fare: 100,
    createdAt: Timestamp.now(),
  });
};

const createUncompletedTrip = async (tripId: string, passengerId: string, driverId: string) => {
  const db = admin.firestore();
  await db.collection('trips').doc(tripId).set({
    passengerId,
    driverId,
    status: 'started',
    fare: 100,
    createdAt: Timestamp.now(),
  });
};

describe('submitRating Callable Function', () => {
  beforeAll(() => {
    try { admin.initializeApp(); } catch {}
  });

  afterEach(async () => {
    // Clean up in-memory Firestore after each test
    resetMockFirestore();
  });

  it('✅ Pasajero califica un viaje completado → éxito', async () => {
    const passengerId = 'passenger1';
    const driverId = 'driver1';
    const tripId = 'trip1';
    await createCompletedTrip(tripId, passengerId, driverId);

    const data = { tripId, rating: 5, comment: 'Great trip!' };
    const context = authenticatedContext(passengerId);

    const result = await submitRatingCallable(data as any, context as any);
    expect(result).toEqual({ status: 'success', message: 'Rating submitted successfully.' });

    const db = admin.firestore();
    const ratingDoc = await db
      .collection('ratings')
      .where('tripId', '==', tripId)
      .where('passengerId', '==', passengerId)
      .limit(1)
      .get();

    expect(ratingDoc.empty).toBeFalsy();
    expect(ratingDoc.docs[0].data().rating).toBe(5);
    expect(ratingDoc.docs[0].data().comment).toBe('Great trip!');
    expect(ratingDoc.docs[0].data().driverId).toBe(driverId);
  });

  it('❌ Pasajero intenta calificar un viaje no completado → error', async () => {
    const passengerId = 'passenger2';
    const driverId = 'driver2';
    const tripId = 'trip2';
    await createUncompletedTrip(tripId, passengerId, driverId);

    const data = { tripId, rating: 4 };
    const context = authenticatedContext(passengerId);

    await expect(submitRatingCallable(data as any, context as any)).rejects.toThrow('Cannot rate an uncompleted trip.');
  });

  it('❌ Pasajero intenta calificar un trip que no es suyo → error', async () => {
    const passengerId = 'passenger3';
    const driverId = 'driver3';
    const tripId = 'trip3';
    await createCompletedTrip(tripId, passengerId, driverId); // Trip belongs to passenger3

    const data = { tripId, rating: 5 };
    const context = authenticatedContext('anotherPassenger'); // Another passenger

    await expect(submitRatingCallable(data as any, context as any)).rejects.toThrow(
      'You can only rate trips you were a passenger on.'
    );
  });

  it('❌ Pasajero intenta calificar dos veces el mismo trip → error', async () => {
    const passengerId = 'passenger4';
    const driverId = 'driver4';
    const tripId = 'trip4';
    await createCompletedTrip(tripId, passengerId, driverId);

    const data = { tripId, rating: 5 };
    const context = authenticatedContext(passengerId);

    // First rating (should succeed)
    await submitRatingCallable(data as any, context as any);

    // Second rating (should fail)
    await expect(submitRatingCallable(data as any, context as any)).rejects.toThrow(
      'You have already submitted a rating for this trip.'
    );
  });

  it('❌ Usuario no autenticado no puede crear ratings → error', async () => {
    const tripId = 'trip5';
    const data = { tripId, rating: 3 };
    const context = {};

    await expect(submitRatingCallable(data as any, context as any)).rejects.toThrow(
      'Only authenticated users can submit ratings.'
    );
  });
});
