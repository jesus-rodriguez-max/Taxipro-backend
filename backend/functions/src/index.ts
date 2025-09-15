import * as admin from 'firebase-admin';
import { https } from 'firebase-functions';

import { requestTripCallable } from './trips/requestTrip.js';
import { acceptTripCallable } from './trips/acceptTrip.js';
import { updateTripStatusCallable } from './trips/updateTripStatus.js';
import { webhook as stripeWebhook } from './stripe/webhook.js';
import { startRecordingCallable, stopRecordingCallable, logSafetyEventCallable } from './safety.js';

admin.initializeApp();

export const requestTrip = https.onCall(requestTripCallable);
export const acceptTrip = https.onCall(acceptTripCallable);
export const updateTripStatus = https.onCall(updateTripStatusCallable);
export const stripe = https.onRequest(stripeWebhook);
export const startRecording = https.onCall(startRecordingCallable);
export const stopRecording = https.onCall(stopRecordingCallable);
export const logSafetyEvent = https.onCall(logSafetyEventCallable);
