import { https } from 'firebase-functions';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { Trip, TripStatus } from '../lib/types.js';
import { log } from '../lib/logging.js';

export const requestTripCallable = async (data: any, context: https.CallableContext) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { origin, destination } = data;
  const passengerId = context.auth.uid;

  if (!origin || !destination) {
    throw new https.HttpsError('invalid-argument', 'Missing origin or destination.');
  }

  const firestore = getFirestore();

  // Check for existing active trips
  const activeTrips = await firestore.collection('trips')
    .where('passengerId', '==', passengerId)
    .where('status', 'in', ['assigned', 'active'])
    .limit(1)
    .get();

  if (!activeTrips.empty) {
    throw new https.HttpsError('failed-precondition', 'An active trip already exists for this passenger.');
  }

  const newTrip: Omit<Trip, 'id'> = {
    passengerId,
    status: TripStatus.PENDING,
    origin,
    destination,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    audit: { lastActor: 'passenger', lastAction: 'requestTrip' },
  };

  const tripRef = await firestore.collection('trips').add(newTrip);

  await log(tripRef.id, 'Trip requested by passenger', { passengerId, origin, destination });

  return { tripId: tripRef.id };
};
