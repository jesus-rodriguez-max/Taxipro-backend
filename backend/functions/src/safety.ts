import * as admin from 'firebase-admin';
import { https } from 'firebase-functions';
import { TripStatus } from './lib/types.js';

export const startRecordingCallable = async (data: any, context: any) => {
  const { tripId } = data || {};
  if (!context.auth || !context.auth.uid) {
    throw new https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  if (!tripId) {
    throw new https.HttpsError('invalid-argument', 'tripId is required');
  }

  const tripRef = admin.firestore().collection('trips').doc(tripId);
  const tripSnap = await tripRef.get();
  if (!tripSnap.exists) {
    throw new https.HttpsError('not-found', 'Trip not found');
  }
  const tripData = tripSnap.data() as any;
  if (tripData.passengerId !== context.auth.uid) {
    throw new https.HttpsError('permission-denied', 'Only the passenger can start recording');
  }
  if (tripData.status !== TripStatus.ACTIVE && tripData.status !== TripStatus.ASSIGNED && tripData.status !== TripStatus.PENDING) {
    throw new https.HttpsError('failed-precondition', 'Trip is not active');
  }

  await tripRef.set({
    safety: {
      recording: {
        enabled: true,
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        // endedAt will be set when stopped
      }
    }
  }, { merge: true });

  return { success: true };
};

export const stopRecordingCallable = async (data: any, context: any) => {
  const { tripId } = data || {};
  if (!context.auth || !context.auth.uid) {
    throw new https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  if (!tripId) {
    throw new https.HttpsError('invalid-argument', 'tripId is required');
  }

  const tripRef = admin.firestore().collection('trips').doc(tripId);
  const tripSnap = await tripRef.get();
  if (!tripSnap.exists) {
    throw new https.HttpsError('not-found', 'Trip not found');
  }
  const tripData = tripSnap.data() as any;
  if (tripData.passengerId !== context.auth.uid) {
    throw new https.HttpsError('permission-denied', 'Only the passenger can stop recording');
  }

  await tripRef.set({
    safety: {
      recording: {
        enabled: false,
        endedAt: admin.firestore.FieldValue.serverTimestamp(),
      }
    }
  }, { merge: true });

  return { success: true };
};

export const logSafetyEventCallable = async (data: any, context: any) => {
  const { tripId, type, meta } = data || {};
  if (!context.auth || !context.auth.uid) {
    throw new https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  if (!tripId || !type) {
    throw new https.HttpsError('invalid-argument', 'tripId and type are required');
  }

  const tripRef = admin.firestore().collection('trips').doc(tripId);
  const tripSnap = await tripRef.get();
  if (!tripSnap.exists) {
    throw new https.HttpsError('not-found', 'Trip not found');
  }
  // Accept from passenger or driver, but still ensure they belong to the trip
  const tripData = tripSnap.data() as any;
  const userId = context.auth.uid;
  if (userId !== tripData.passengerId && userId !== tripData.driverId) {
    throw new https.HttpsError('permission-denied', 'You are not part of this trip');
  }

  const event = {
    ts: admin.firestore.FieldValue.serverTimestamp(),
    type,
    meta: meta || null,
  };

  await tripRef.set({
    safety: {
      events: admin.firestore.FieldValue.arrayUnion(event),
    }
  }, { merge: true });

  return { success: true };
};
