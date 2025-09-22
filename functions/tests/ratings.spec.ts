import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions-test';
import { features } from 'firebase-functions-test/lib/features';
import { submitRating } from '../src/ratings/submitRating';
import { Timestamp } from 'firebase-admin/firestore';

// Initialize the Firebase Test SDK
const test = require('firebase-functions-test')();
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

// Helper to create a completed trip
const createCompletedTrip = async (tripId: string, passengerId: string, driverId: string) => {
  await db.collection('trips').doc(tripId).set({
    passengerId,
    driverId,
    status: 'completed',
    fare: 100,
    createdAt: Timestamp.now(),
  });
};

// Helper to create an uncompleted trip
const createUncompletedTrip = async (tripId: string, passengerId: string, driverId: string) => {
  await db.collection('trips').doc(tripId).set({
    passengerId,
    driverId,
    status: 'started',
    fare: 100,
    createdAt: Timestamp.now(),
  });
};

describe('submitRating Callable Function', () => {
  afterEach(async () => {
    // Clean up Firestore after each test
    await test.cleanup();
    await db.collection('ratings').listDocuments().then(docs => Promise.all(docs.map(doc => doc.delete())));
    await db.collection('trips').listDocuments().then(docs => Promise.all(docs.map(doc => doc.delete())));
  });

  it('✅ Pasajero califica un viaje completado → éxito', async () => {
    const passengerId = 'passenger1';
    const driverId = 'driver1';
    const tripId = 'trip1';
    await createCompletedTrip(tripId, passengerId, driverId);

    const data = { tripId, rating: 5, comment: 'Great trip!' };
    const context = authenticatedContext(passengerId);

    const result = await submitRating(data, context);
    expect(result).toEqual({ status: 'success', message: 'Rating submitted successfully.' });

    const ratingDoc = await db.collection('ratings')
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

    await expect(wrappedSubmitRating(data, context)).rejects.toThrow();

  it('❌ Pasajero intenta calificar un trip que no es suyo → error', async () => {
    const passengerId = 'passenger3';
    const driverId = 'driver3';
    const tripId = 'trip3';
    await createCompletedTrip(tripId, passengerId, driverId); // Trip belongs to passenger3

    const data = { tripId, rating: 5 };
    const context = authenticatedContext('anotherPassenger'); // Another passenger

    await expect(submitRating(data, context)).rejects.toThrow(
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
    await submitRating(data, context);

    // Second rating (should fail)
    await expect(submitRating(data, context)).rejects.toThrow(
      'You have already submitted a rating for this trip.'
    );
  });

  it('❌ Usuario no autenticado no puede crear ratings → error', async () => {
    const tripId = 'trip5';
    const data = { tripId, rating: 3 };
    const context = {}; // Unauthenticated context

    await expect(submitRating(data, context)).rejects.toThrow(
      'Only authenticated users can submit ratings.'
    );
  });
});

// Firestore Rules Tests (simplified, as full rules testing requires a separate setup)
// These tests are more conceptual and rely on the rules being deployed and tested separately
// For actual rules testing, use @firebase/rules-unit-testing
describe('Firestore Security Rules for Ratings', () => {
  // Mock data for rules tests
  const mockRating = {
    tripId: 'trip_rules_1',
    passengerId: 'passenger_rules_1',
    driverId: 'driver_rules_1',
    rating: 4,
    createdAt: Timestamp.now(),
  };

  const setupFirestore = async (auth: any) => {
    const projectId = `test-project-${Date.now()}`;
    const app = admin.initializeApp({ projectId });
    const db = app.firestore();

    // Mock user roles for rules testing
    if (auth && auth.uid) {
      await db.collection('users').doc(auth.uid).set({ role: auth.role || 'passenger' });
    }
    return db;
  };

  afterEach(async () => {
    await Promise.all(admin.apps.map(app => app.delete()));
  });

  it('✅ Conductor puede leer sus calificaciones', async () => {
    const driverId = 'driver_rules_read';
    const passengerId = 'passenger_rules_read';
    const tripId = 'trip_rules_read';
    const dbAsDriver = await setupFirestore({ uid: driverId, role: 'driver' });

    await db.collection('ratings').doc('rating_for_driver').set({
      ...mockRating,
      driverId: driverId,
      passengerId: passengerId,
      tripId: tripId,
    });

    // Attempt to read the rating as the driver
    const ratingDoc = await dbAsDriver.collection('ratings').doc('rating_for_driver').get();
    expect(ratingDoc.exists).toBe(true);
    expect(ratingDoc.data()?.driverId).toBe(driverId);
  });

  it('✅ Admin puede leer cualquier calificación', async () => {
    const adminId = 'admin_rules_read';
    const dbAsAdmin = await setupFirestore({ uid: adminId, role: 'admin' });

    await db.collection('ratings').doc('rating_for_admin').set(mockRating);

    // Attempt to read the rating as the admin
    const ratingDoc = await dbAsAdmin.collection('ratings').doc('rating_for_admin').get();
    expect(ratingDoc.exists).toBe(true);
    expect(ratingDoc.data()?.tripId).toBe(mockRating.tripId);
  });

  it('❌ Usuario no autenticado no puede leer ratings', async () => {
    const dbAsUnauthenticated = await setupFirestore(null);

    await db.collection('ratings').doc('rating_unauthenticated').set(mockRating);

    // Attempt to read the rating as unauthenticated user
    await expect(dbAsUnauthenticated.collection('ratings').doc('rating_unauthenticated').get())
      .rejects.toThrow(); // Firestore rules should reject this
  });
});
