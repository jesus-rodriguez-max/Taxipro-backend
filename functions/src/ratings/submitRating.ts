import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface SubmitRatingData {
  tripId: string;
  rating: number; // de 1 a 5
  comment?: string;
}

export const submitRatingCallable = async (data: SubmitRatingData, context: any) => {
  // 1. Autenticación: Verificar que el usuario esté autenticado
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Only authenticated users can submit ratings.'
    );
  }

  const { tripId, rating, comment } = data;
  const passengerId = context.auth.uid;
  const db = admin.firestore();

  // 2. Validar rating
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Rating must be a number between 1 and 5.'
    );
  }

  // 3. Verificar que el trip exista y esté completado
  const tripRef = db.collection('trips').doc(tripId);
  const tripDoc = await tripRef.get();

  if (!tripDoc.exists) {
    throw new functions.https.HttpsError(
      'not-found',
      'Trip not found.'
    );
  }

  const tripData = tripDoc.data();
  if (!tripData || tripData.status !== 'completed') {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Cannot rate an uncompleted trip.'
    );
  }

  // 4. Verificar que context.auth.uid sea el passengerId del trip
  if (tripData.passengerId !== passengerId) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'You can only rate trips you were a passenger on.'
    );
  }

  // 5. Rechazar si ya existe un rating para ese tripId
  const existingRatingQuery = await db.collection('ratings')
    .where('tripId', '==', tripId)
    .where('passengerId', '==', passengerId)
    .limit(1)
    .get();

  if (!existingRatingQuery.empty) {
    throw new functions.https.HttpsError(
      'already-exists',
      'You have already submitted a rating for this trip.'
    );
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

    const driverData = driverDoc.data()!;
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

export const submitRating = functions.https.onCall(submitRatingCallable);
