import { https } from 'firebase-functions';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { TripStatus } from '../lib/types.js';
import { canTransition } from '../lib/state.js';
import { log } from '../lib/logging.js';
export const acceptTrip = https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { tripId } = data;
    const driverId = context.auth.uid;
    if (!tripId) {
        throw new https.HttpsError('invalid-argument', 'Missing tripId.');
    }
    const firestore = getFirestore();
    const tripRef = firestore.collection('trips').doc(tripId);
    const tripDoc = await tripRef.get();
    if (!tripDoc.exists) {
        throw new https.HttpsError('not-found', 'Trip not found.');
    }
    const trip = tripDoc.data();
    if (!canTransition(trip.status, TripStatus.ASSIGNED)) {
        throw new https.HttpsError('failed-precondition', `Cannot transition from ${trip.status} to ${TripStatus.ASSIGNED}.`);
    }
    await tripRef.update({
        driverId,
        status: TripStatus.ASSIGNED,
        updatedAt: FieldValue.serverTimestamp(),
        audit: { lastActor: 'driver', lastAction: 'acceptTrip' },
    });
    await log(tripId, 'Trip accepted by driver', { driverId });
    return { success: true };
});
//# sourceMappingURL=acceptTrip.js.map