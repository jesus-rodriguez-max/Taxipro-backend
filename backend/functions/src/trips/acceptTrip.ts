import * as functions from 'firebase-functions';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { TripStatus } from '../lib/types.js';
import { isDriverSubscriptionActive } from '../lib/subscription.js';
import { log } from '../lib/logging.js';

/**
 * Callable that allows a driver to accept a pending trip.
 * @param data expects an object { tripId: string }
 * @param context firebase context with auth
 */
export const acceptTripCallable = async (data: { tripId: string }, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const driverId = context.auth.uid;
  const { tripId } = data;

  if (!tripId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing tripId.');
  }

  // Check if driver has an active subscription or free trial
  const isActive = await isDriverSubscriptionActive(driverId);
  if (!isActive) {
    throw new functions.https.HttpsError('permission-denied', 'Driver does not have an active subscription.');
  }

  const firestore = getFirestore();
  const tripRef = firestore.collection('trips').doc(tripId);
  const tripDoc = await tripRef.get();

  if (!tripDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Trip not found.');
  }

  const trip = tripDoc.data() as any;

  // Only allow accepting trips that are requested/pending
  if (trip.status && trip.status !== TripStatus.PENDING && trip.status !== 'pending') {
    throw new functions.https.HttpsError('failed-precondition', 'Trip cannot be accepted in its current status.');
  }

  // Assign driver and update status to assigned
  await tripRef.update({
    driverId,
    status: TripStatus.ASSIGNED ?? 'assigned',
    acceptedAt: FieldValue.serverTimestamp(),
  });

  // Log acceptance
  await log(tripId, `Driver ${driverId} accepted trip`, { driverId });

  return {
    success: true,
    message: 'Trip accepted successfully',
    tripId,
    status: TripStatus.ASSIGNED ?? 'assigned',
  };
};
