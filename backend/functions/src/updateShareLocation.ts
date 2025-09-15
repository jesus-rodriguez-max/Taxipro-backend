import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Scheduled function to update lastLocation and status for active share links.
 * Runs every minute.
 */
export const updateShareLocation = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
  const activeSharesSnap = await admin.firestore().collection('safety_shares')
    .where('active', '==', true)
    .get();

  const updates: Promise<any>[] = [];
  for (const doc of activeSharesSnap.docs) {
    const data = doc.data();
    const tripId = data.tripId;
    if (!tripId) continue;
    const tripSnap = await admin.firestore().collection('trips').doc(tripId).get();
    const trip = tripSnap.data();
    if (!trip) continue;
    updates.push(doc.ref.update({
      lastLocation: trip.location ?? null,
      status: trip.status,
    }));
  }
  await Promise.all(updates);
  return null;
});
