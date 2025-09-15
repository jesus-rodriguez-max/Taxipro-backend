import * as admin from 'firebase-admin';
import { https } from 'firebase-functions';
import { requestTripCallable } from './trips/requestTrip.js';
import { acceptTripCallable } from './trips/acceptTrip.js';
import { updateTripStatusCallable } from './trips/updateTripStatus.js';
import { webhook as stripeWebhook } from './stripe/webhook.js';
import {
  startRecordingCallable,
  stopRecordingCallable,
  logSafetyEventCallable,
} from './safety.js';
import {
  enableShareCallable,
  disableShareCallable,
  getShareStatus,
} from './safetyShare.js';
import { updateShareLocation } from './updateShareLocation.js';
import { createDriverSubscriptionSessionCallable } from './createDriverSubscription.js';
import {
  updateTrustedContactsCallable,
  updateSafetyConsentsCallable,
} from './safetyProfile.js';

// Initialize Firebase Admin
admin.initializeApp();

// Trip-related callables
export const requestTrip = https.onCall(requestTripCallable);
export const acceptTrip = https.onCall(acceptTripCallable);
export const updateTripStatus = https.onCall(updateTripStatusCallable);

// Stripe webhook (HTTP request)
export const stripe = https.onRequest(stripeWebhook);

// Safety-related callables
export const startRecording = https.onCall(startRecordingCallable);
export const stopRecording = https.onCall(stopRecordingCallable);
export const logSafetyEvent = https.onCall(logSafetyEventCallable);

// Share-related functions
export const enableShare = enableShareCallable;
export const disableShare = disableShareCallable;
export const getShareStatusFn = getShareStatus;
export const updateShareLocationFn = updateShareLocation;

// Stripe subscription for drivers
export const createDriverSubscriptionSession = https.onCall(
  createDriverSubscriptionSessionCallable,
);

// Safety profile functions
export const updateTrustedContacts = https.onCall(updateTrustedContactsCallable);
export const updateSafetyConsents = https.onCall(updateSafetyConsentsCallable);
