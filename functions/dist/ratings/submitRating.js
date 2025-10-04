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
exports.submitRating = exports.submitRatingCallable = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const submitRatingCallable = async (data, context) => {
    // 1. Autenticación: Verificar que el usuario esté autenticado
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Only authenticated users can submit ratings.');
    }
    const { tripId, rating, comment } = data;
    const passengerId = context.auth.uid;
    const db = admin.firestore();
    // 2. Validar rating
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        throw new functions.https.HttpsError('invalid-argument', 'Rating must be a number between 1 and 5.');
    }
    // 3. Verificar que el trip exista y esté completado
    const tripRef = db.collection('trips').doc(tripId);
    const tripDoc = await tripRef.get();
    if (!tripDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Trip not found.');
    }
    const tripData = tripDoc.data();
    if (!tripData || tripData.status !== 'completed') {
        throw new functions.https.HttpsError('failed-precondition', 'Cannot rate an uncompleted trip.');
    }
    // 4. Verificar que context.auth.uid sea el passengerId del trip
    if (tripData.passengerId !== passengerId) {
        throw new functions.https.HttpsError('permission-denied', 'You can only rate trips you were a passenger on.');
    }
    // 5. Rechazar si ya existe un rating para ese tripId
    const existingRatingQuery = await db.collection('ratings')
        .where('tripId', '==', tripId)
        .where('passengerId', '==', passengerId)
        .limit(1)
        .get();
    if (!existingRatingQuery.empty) {
        throw new functions.https.HttpsError('already-exists', 'You have already submitted a rating for this trip.');
    }
    // 6. Guardar el rating
    const newRating = {
        tripId,
        passengerId,
        driverId: tripData.driverId, // Assuming driverId is available on tripData
        rating,
        comment: comment || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const driverRef = db.collection('drivers').doc(tripData.driverId);
    await db.runTransaction(async (transaction) => {
        const driverDoc = await transaction.get(driverRef);
        if (!driverDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Driver not found.');
        }
        const driverData = driverDoc.data();
        const currentTotalRatings = driverData.totalRatings || 0;
        const currentAvgRating = driverData.avgRating || 0;
        const newTotalRatings = currentTotalRatings + 1;
        const newAvgRating = ((currentAvgRating * currentTotalRatings) + rating) / newTotalRatings;
        transaction.update(driverRef, {
            totalRatings: newTotalRatings,
            avgRating: newAvgRating,
        });
        const ratingRef = db.collection('ratings').doc();
        transaction.set(ratingRef, newRating);
    });
    return { status: 'success', message: 'Rating submitted successfully.' };
};
exports.submitRatingCallable = submitRatingCallable;
exports.submitRating = functions.https.onCall(exports.submitRatingCallable);
//# sourceMappingURL=submitRating.js.map