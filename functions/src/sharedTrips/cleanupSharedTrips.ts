import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const SHARED_TRIP_EXPIRATION_HOURS = 24; // Shared trips expire after 24 hours

export async function cleanupSharedTripsHandler(): Promise<void> {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();
  const expirationThreshold = new admin.firestore.Timestamp(
    now.seconds - SHARED_TRIP_EXPIRATION_HOURS * 3600,
    now.nanoseconds
  );

  // Query for shared trips that are inactive or older than the threshold
  const sharedTripsQuery = await db.collection('shared_trips')
    .where('active', '==', false)
    .where('createdAt', '<', expirationThreshold)
    .get();

  const batch = db.batch();
  sharedTripsQuery.forEach(doc => {
    batch.delete(doc.ref);
  });

  if (sharedTripsQuery.empty) {
    console.log('No shared trips to clean up.');
  } else {
    await batch.commit();
    console.log(`Cleaned up ${sharedTripsQuery.size} shared trips.`);
  }
}

export const cleanupSharedTrips = functions.pubsub
  .schedule(`every ${SHARED_TRIP_EXPIRATION_HOURS} hours`)
  .onRun(async () => {
    await cleanupSharedTripsHandler();
    return null;
  });
