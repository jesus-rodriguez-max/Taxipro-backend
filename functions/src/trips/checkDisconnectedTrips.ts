import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Trip, TripStatus } from '../lib/types';

const DISCONNECTION_TIMEOUT_MINUTES = 5; // X minutes without update to be marked as disconnected
const PENDING_REVIEW_TIMEOUT_MINUTES = 60; // Y minutes in disconnected state to be marked as pending_review

export const checkDisconnectedTrips = functions.pubsub
  .schedule(`every 1 minute`) // Run frequently to catch disconnections
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    // 1. Find active trips that haven't been updated for DISCONNECTION_TIMEOUT_MINUTES
    const disconnectionThreshold = new admin.firestore.Timestamp(
      now.seconds - DISCONNECTION_TIMEOUT_MINUTES * 60,
      now.nanoseconds
    );

    const disconnectedTripsQuery = await db.collection('trips')
      .where('status', '==', TripStatus.ACTIVE)
      .where('updatedAt', '<', disconnectionThreshold)
      .get();

    const batch = db.batch();
    disconnectedTripsQuery.forEach(doc => {
      const trip = doc.data() as Trip;
      functions.logger.warn(`Trip ${doc.id} (status: ${trip.status}) disconnected. Marking as DISCONNECTED.`);
      batch.update(doc.ref, {
        status: TripStatus.DISCONNECTED,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        audit: {
          lastActor: 'system',
          lastAction: 'Trip marked as disconnected due to no updates.',
        },
      });
    });

    // 2. Find disconnected trips that haven't been resolved for PENDING_REVIEW_TIMEOUT_MINUTES
    const pendingReviewThreshold = new admin.firestore.Timestamp(
      now.seconds - PENDING_REVIEW_TIMEOUT_MINUTES * 60,
      now.nanoseconds
    );

    const pendingReviewTripsQuery = await db.collection('trips')
      .where('status', '==', TripStatus.DISCONNECTED)
      .where('updatedAt', '<', pendingReviewThreshold)
      .get();

    pendingReviewTripsQuery.forEach(doc => {
      const trip = doc.data() as Trip;
      functions.logger.error(`Trip ${doc.id} (status: ${trip.status}) requires manual review. Marking as PENDING_REVIEW.`);
      batch.update(doc.ref, {
        status: TripStatus.PENDING_REVIEW,
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
    } else {
      functions.logger.info('No disconnected or pending review trips to process.');
    }

    return null;
  });
