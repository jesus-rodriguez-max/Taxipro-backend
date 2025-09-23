"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptTripCallable = void 0;
const functions = __importStar(require("firebase-functions"));
const firestore_1 = require("firebase-admin/firestore");
const types_js_1 = require("../lib/types.js");
const subscription_js_1 = require("../lib/subscription.js");
const logging_js_1 = require("../lib/logging.js");
/**
 * Callable that allows a driver to accept a pending trip.
 * @param data expects an object { tripId: string }
 * @param context firebase context with auth
 */
const acceptTripCallable = async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const driverId = context.auth.uid;
    const { tripId } = data;
    if (!tripId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing tripId.');
    }
    // Check if driver has an active subscription or free trial
    const isActive = await (0, subscription_js_1.isDriverSubscriptionActive)(driverId);
    if (!isActive) {
        throw new functions.https.HttpsError('permission-denied', 'Driver does not have an active subscription.');
    }
    const firestore = (0, firestore_1.getFirestore)();
    const tripRef = firestore.collection('trips').doc(tripId);
    const tripDoc = await tripRef.get();
    if (!tripDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Trip not found.');
    }
    const trip = tripDoc.data();
    // Only allow accepting trips that are requested/pending
    if (trip.status && trip.status !== types_js_1.TripStatus.PENDING && trip.status !== 'pending') {
        throw new functions.https.HttpsError('failed-precondition', 'Trip cannot be accepted in its current status.');
    }
    // Assign driver and update status to assigned
    await tripRef.update({
        driverId,
        status: types_js_1.TripStatus.ASSIGNED ?? 'assigned',
        acceptedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    // Log acceptance
    await (0, logging_js_1.log)(tripId, `Driver ${driverId} accepted trip`, { driverId });
    return {
        success: true,
        message: 'Trip accepted successfully',
        tripId,
        status: types_js_1.TripStatus.ASSIGNED ?? 'assigned',
    };
};
exports.acceptTripCallable = acceptTripCallable;
//# sourceMappingURL=acceptTrip.js.map