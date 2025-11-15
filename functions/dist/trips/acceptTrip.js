"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptTripCallable = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const types_1 = require("../lib/types");
const subscription_1 = require("../lib/subscription");
const logging_1 = require("../lib/logging");
/**
 * Callable that allows a driver to accept a pending trip.
 */
exports.acceptTripCallable = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const driverId = request.auth.uid;
    const { tripId } = request.data;
    if (!tripId) {
        throw new https_1.HttpsError('invalid-argument', 'Missing tripId.');
    }
    // Check if driver has an active subscription or free trial
    const isActive = await (0, subscription_1.isDriverSubscriptionActive)(driverId);
    if (!isActive) {
        throw new https_1.HttpsError('permission-denied', 'Driver does not have an active subscription.');
    }
    const firestore = (0, firestore_1.getFirestore)();
    const tripRef = firestore.collection('trips').doc(tripId);
    const tripDoc = await tripRef.get();
    if (!tripDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Trip not found.');
    }
    const trip = tripDoc.data();
    // Only allow accepting trips that are requested/pending
    if (trip.status && trip.status !== types_1.TripStatus.PENDING && trip.status !== 'pending') {
        throw new https_1.HttpsError('failed-precondition', 'Trip cannot be accepted in its current status.');
    }
    // Assign driver and update status to assigned
    await tripRef.update({
        driverId,
        status: types_1.TripStatus.ASSIGNED ?? 'assigned',
        acceptedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    // Log acceptance
    await (0, logging_1.log)(tripId, `Driver ${driverId} accepted trip`, { driverId });
    return {
        success: true,
        message: 'Trip accepted successfully',
        tripId,
        status: types_1.TripStatus.ASSIGNED ?? 'assigned',
    };
});
//# sourceMappingURL=acceptTrip.js.map