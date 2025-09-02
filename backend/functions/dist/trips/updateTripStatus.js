import { https } from 'firebase-functions';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { TripStatus } from '../lib/types.js';
import { canTransition } from '../lib/state.js';
import { isWithinGeofence } from '../lib/geo.js';
import { log } from '../lib/logging.js';
export const updateTripStatus = https.onCall(async (data, context) => {
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
    const trip = tripDoc.data();
    if (!canTransition(trip.status, newStatus)) {
        throw new https.HttpsError('failed-precondition', `Cannot transition from ${trip.status} to ${newStatus}.`);
    }
    const geofenceRadius = parseInt(process.env.GEOFENCE_RADIUS_M || '150', 10);
    if (newStatus === TripStatus.ACTIVE) {
        if (!isWithinGeofence(currentLocation, trip.origin, geofenceRadius)) {
            throw new https.HttpsError('failed-precondition', 'Driver is not within the origin geofence.');
        }
    }
    else if (newStatus === TripStatus.COMPLETED) {
        if (!isWithinGeofence(currentLocation, trip.destination, geofenceRadius)) {
            throw new https.HttpsError('failed-precondition', 'Driver is not within the destination geofence.');
        }
    }
    const updateData = {
        status: newStatus,
        updatedAt: FieldValue.serverTimestamp(),
        audit: { lastActor: 'driver', lastAction: `updateTripStatus: ${newStatus}` },
    };
    if (newStatus === TripStatus.ACTIVE) {
        updateData.startedAt = FieldValue.serverTimestamp();
    }
    else if (newStatus === TripStatus.COMPLETED) {
        updateData.completedAt = FieldValue.serverTimestamp();
    }
    await tripRef.update(updateData);
    await log(tripId, `Trip status updated to ${newStatus}`, { actorId, newStatus });
    return { success: true };
});
//# sourceMappingURL=updateTripStatus.js.map