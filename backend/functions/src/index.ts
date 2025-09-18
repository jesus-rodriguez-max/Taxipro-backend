import * as admin from 'firebase-admin';
import { https, pubsub } from 'firebase-functions'; // Añadido pubsub
import { requestTripCallable } from './trips/requestTrip';
import { acceptTripCallable } from './trips/acceptTrip';
import { updateTripStatusCallable } from './trips/updateTripStatus';
import { driverArrivedCallable } from './trips/driverArrived';
import { cancelTripCallable } from './trips/cancelTrip';
import { markAsNoShowCallable } from './trips/markAsNoShow';
import { stripeWebhook } from './stripe/webhook';
import { updateDriverOnboardingCallable } from './driverOnboarding';
import { processMembershipPayments as processMembershipPaymentsFunction } from './membership/processMembershipPayments'; // Añadido
import {
  startRecordingCallable,
  stopRecordingCallable,
  logSafetyEventCallable,
} from './safety';
import {
  enableShareCallable,
  disableShareCallable,
  getShareStatus,
} from './safetyShare';
import { updateShareLocation } from './updateShareLocation';
import { createDriverSubscriptionSessionCallable } from './createDriverSubscription';
import {
  updateTrustedContactsCallable,
  updateSafetyConsentsCallable,
} from './safetyProfile';

// Initialize Firebase Admin
admin.initializeApp();

// Onboarding
export const updateDriverOnboarding = https.onCall(updateDriverOnboardingCallable);

// Trip-related callables
export const requestTrip = https.onCall(requestTripCallable);
export const acceptTrip = https.onCall(acceptTripCallable);
export const updateTripStatus = https.onCall(updateTripStatusCallable);
export const driverArrived = https.onCall(driverArrivedCallable);
export const cancelTrip = https.onCall(cancelTripCallable);
export const markAsNoShow = https.onCall(markAsNoShowCallable);

// Stripe webhook (HTTP request)
export { stripeWebhook };

// Scheduled functions
export const processMembershipPayments = processMembershipPaymentsFunction; // Añadido

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
