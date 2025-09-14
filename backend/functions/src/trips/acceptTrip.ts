import * as functions from 'firebase-functions';

/**
 * Stub for the acceptTrip callable function (v1).
 * @param data The data passed to the function.
 * @param context The metadata for the function invocation.
 * @returns {object} A success message and the trip ID.
 */
export const acceptTripCallable = (data: { tripId?: string }, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  const tripId = data.tripId || `trip_${Date.now()}`;

  functions.logger.info(`Trip ${tripId} accepted successfully by user: ${context.auth?.uid || 'unauthenticated'}`);

  // This is a stub, so we just return a success message.
  // In a real implementation, you would update the trip status in Firestore.
  return {
    status: "not_implemented",
    success: true,
    message: "Trip accepted successfully (stub)",
    tripId: tripId,
  };
};
