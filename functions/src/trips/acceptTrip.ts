import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { TripStatus } from '../lib/types';
import { isDriverSubscriptionActive } from '../lib/subscription';
import { log } from '../lib/logging';

/**
 * Callable that allows a driver to accept a pending trip.
 */
export const acceptTripCallable = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const driverId = request.auth.uid;
  const { tripId } = request.data;

  if (!tripId) {
    throw new HttpsError('invalid-argument', 'Missing tripId.');
  }

  // Check if driver has an active subscription or free trial
  const isActive = await isDriverSubscriptionActive(driverId);
  if (!isActive) {
    throw new HttpsError('permission-denied', 'Driver does not have an active subscription.');
  }

  const firestore = getFirestore();
  const tripRef = firestore.collection('trips').doc(tripId);
  const tripDoc = await tripRef.get();

  if (!tripDoc.exists) {
    throw new HttpsError('not-found', 'Trip not found.');
  }

  const trip = tripDoc.data() as any;

  // Only allow accepting trips that are requested/pending
  if (trip.status && trip.status !== TripStatus.PENDING && trip.status !== 'pending') {
    throw new HttpsError('failed-precondition', 'Trip cannot be accepted in its current status.');
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
});
