import { https } from 'firebase-functions';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { Trip, TripStatus, GeoPoint } from '../lib/types';
import { canTransition } from '../lib/state';
import { isWithinGeofence } from '../lib/geo';
import { log } from '../lib/logging';
import { config } from 'firebase-functions';

export const updateTripStatusCallable = async (data: any, context: https.CallableContext) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { tripId, newStatus, currentLocation } = data;
  const actorId = context.auth.uid;

  if (!tripId || !newStatus) {
    throw new https.HttpsError('invalid-argument', 'Missing tripId or newStatus.');
  }

  const firestore = getFirestore();
  const tripRef = firestore.collection('trips').doc(tripId);

  const tripDoc = await tripRef.get();

  if (!tripDoc.exists) {
    throw new https.HttpsError('not-found', 'Trip not found.');
  }

  const trip = tripDoc.data() as Trip;

  if (!canTransition(trip.status, newStatus)) {
    throw new https.HttpsError('failed-precondition', `Cannot transition from ${trip.status} to ${newStatus}.`);
  }

  const geofenceRadius = parseInt(process.env.GEOFENCE_RADIUS_M || '150', 10);

  if (newStatus === TripStatus.ACTIVE) {
    if (!isWithinGeofence(currentLocation, trip.origin, geofenceRadius)) {
      throw new https.HttpsError('failed-precondition', 'Driver is not within the origin geofence.');
    }
  } else if (newStatus === TripStatus.COMPLETED) {
    if (!isWithinGeofence(currentLocation, trip.destination, geofenceRadius)) {
      throw new https.HttpsError('failed-precondition', 'Driver is not within the destination geofence.');
    }
  }

  const updateData: any = {
    status: newStatus,
    updatedAt: FieldValue.serverTimestamp(),
    audit: { lastActor: 'driver', lastAction: `updateTripStatus: ${newStatus}` },
  };

  if (newStatus === TripStatus.ACTIVE) {
    updateData.startedAt = FieldValue.serverTimestamp();
  } else if (newStatus === TripStatus.COMPLETED) {
    updateData.completedAt = FieldValue.serverTimestamp();
  }

  await tripRef.update(updateData);

  await log(tripId, `Trip status updated to ${newStatus}`, { actorId, newStatus });

  return { success: true };
};
