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
exports.checkDisconnectedTrips = void 0;
exports.checkDisconnectedTripsHandler = checkDisconnectedTripsHandler;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const types_1 = require("../lib/types");
const DISCONNECTION_TIMEOUT_MINUTES = 5; // X minutes without update to be marked as disconnected
const PENDING_REVIEW_TIMEOUT_MINUTES = 60; // Y minutes in disconnected state to be marked as pending_review
async function checkDisconnectedTripsHandler() {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    // 1. Find active trips that haven't been updated for DISCONNECTION_TIMEOUT_MINUTES
    const disconnectionThreshold = new admin.firestore.Timestamp(now.seconds - DISCONNECTION_TIMEOUT_MINUTES * 60, now.nanoseconds);
    const disconnectedTripsQuery = await db.collection('trips')
        .where('status', '==', types_1.TripStatus.ACTIVE)
        .where('updatedAt', '<', disconnectionThreshold)
        .get();
    const batch = db.batch();
    disconnectedTripsQuery.forEach(doc => {
        const trip = doc.data();
        functions.logger.warn(`Trip ${doc.id} (status: ${trip.status}) disconnected. Marking as DISCONNECTED.`);
        batch.update(doc.ref, {
            status: types_1.TripStatus.DISCONNECTED,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            audit: {
                lastActor: 'system',
                lastAction: 'Trip marked as disconnected due to no updates.',
            },
        });
    });
    // 2. Find disconnected trips that haven't been resolved for PENDING_REVIEW_TIMEOUT_MINUTES
    const pendingReviewThreshold = new admin.firestore.Timestamp(now.seconds - PENDING_REVIEW_TIMEOUT_MINUTES * 60, now.nanoseconds);
    const pendingReviewTripsQuery = await db.collection('trips')
        .where('status', '==', types_1.TripStatus.DISCONNECTED)
        .where('updatedAt', '<', pendingReviewThreshold)
        .get();
    pendingReviewTripsQuery.forEach(doc => {
        const trip = doc.data();
        functions.logger.error(`Trip ${doc.id} (status: ${trip.status}) requires manual review. Marking as PENDING_REVIEW.`);
        batch.update(doc.ref, {
            status: types_1.TripStatus.PENDING_REVIEW,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            audit: {
                lastActor: 'system',
                lastAction: 'Trip marked as pending_review due to prolonged disconnection.',
            },
        });
    });
    if (!disconnectedTripsQuery.empty || !pendingReviewTripsQuery.empty) {
        await batch.commit();
        functions.logger.info(`Processed ${disconnectedTripsQuery.size} disconnected trips and ${pendingReviewTripsQuery.size} pending review trips.`);
    }
    else {
        functions.logger.info('No disconnected or pending review trips to process.');
    }
}
exports.checkDisconnectedTrips = functions.pubsub
    .schedule(`every 1 minute`)
    .onRun(async () => {
    await checkDisconnectedTripsHandler();
    return null;
});
//# sourceMappingURL=checkDisconnectedTrips.js.map