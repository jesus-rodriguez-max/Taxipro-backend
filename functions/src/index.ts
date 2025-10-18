import * as admin from 'firebase-admin';
import { https, pubsub } from 'firebase-functions'; // Añadido pubsub
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { requestTripCallable } from './trips/requestTrip';
import { acceptTripCallable } from './trips/acceptTrip';
import { updateTripStatusCallable } from './trips/updateTripStatus';
import { driverArrivedCallable } from './trips/driverArrived';
import { cancelTripCallable } from './trips/cancelTrip';
import { markAsNoShowCallable } from './trips/markAsNoShow';
import { stripeWebhookV2 } from './stripe/webhookV2';
import { finalizeDriverSubscriptionFromSessionCallable } from './stripe/finalizeSubscriptionFromSession';
import { getDriverStatusAdminCallable } from './stripe/getDriverStatusAdmin';
import { createDriverAccountCallable } from './stripe/createDriverAccount';
import { createStripeAccountLink as createStripeAccountLinkCallable } from './stripe/accountLink';
import { subscribeDriverCallable } from './stripe/subscribeDriver';
import { checkDriverSubscriptionCallable } from './stripe/checkDriverSubscription';
import { updateDriverOnboardingCallable } from './driverOnboarding';
import {
  processMembershipPayments as processMembershipPaymentsFunction,
  suspendOverdueMemberships as suspendOverdueMembershipsFunction,
} from './membership/processMembershipPayments'; // Añadido
import {
  startRecordingCallable,
  stopRecordingCallable
} from './safety';

import {
  enableShareCallable,
  disableShareCallable,
  getShareStatus,
} from './safetyShare';
import { updateShareLocation } from './updateShareLocation';
import { createDriverSubscriptionSessionCallable } from './createDriverSubscription';
import { syncDriverSubscriptionStatusCallable } from './stripe/syncSubscription';
import {
  updateTrustedContactsCallable,
  updateSafetyConsentsCallable,
} from './safetyProfile';
import { submitRatingCallable } from './ratings/submitRating';
import { cleanupSharedTrips } from './sharedTrips/cleanupSharedTrips';
import { checkDisconnectedTrips } from './trips/checkDisconnectedTrips';
import { createPaymentIntentCallable } from './payments/createPaymentIntent';
import { createPassengerCheckoutSessionCallable } from './payments/createPassengerCheckoutSession';
import { requestTripOfflineCallable } from './trips/requestTripOffline';
import { autoAssignDriver } from './trips/autoAssignDriver';
import { updateTariffsCallable } from './fares/updateTariffs';
import { suspendDriverCallable } from './admin/suspendDriver';
import { getAllTripsCallable } from './admin/getAllTrips';
import { downloadTripAudioCallable } from './admin/downloadTripAudio';
import { logSafetyEventV2Callable } from './safety/logSafetyEvent';
import { cancelTripWithPenaltyCallable } from './trips/cancelTripWithPenalty';

// Initialize Firebase Admin
admin.initializeApp();

console.log('[✔] Backend iniciado');

// Onboarding
export const updateDriverOnboarding = https.onCall(updateDriverOnboardingCallable);

// Trip-related callables
export const requestTrip = https.onCall(requestTripCallable);
export const acceptTrip = https.onCall(acceptTripCallable);
export const updateTripStatus = https.onCall(updateTripStatusCallable);
export const driverArrived = https.onCall(driverArrivedCallable);
export const cancelTrip = https.onCall(cancelTripCallable);
export const markAsNoShow = https.onCall(markAsNoShowCallable);
export const requestTripOffline = https.onCall(requestTripOfflineCallable);

// Stripe webhook (HTTP request)
export { stripeWebhookV2 };

// Stripe Connect endpoints (Express account onboarding and subscription)
export const createDriverAccount = https.onCall(createDriverAccountCallable);
export const subscribeDriver = https.onCall(subscribeDriverCallable);
export const checkDriverSubscription = https.onCall(checkDriverSubscriptionCallable);
export const createStripeAccountLink = https.onCall(createStripeAccountLinkCallable);

// Scheduled functions
export const processMembershipPayments = processMembershipPaymentsFunction; // Añadido
export const suspendOverdueMemberships = suspendOverdueMembershipsFunction; // Añadido

// Safety-related callables (already wrapped in v2 onCall in safety.ts)
export const startRecording = startRecordingCallable;
export const stopRecording = stopRecordingCallable;

// Share-related functions
export const enableShare = enableShareCallable;
export const disableShare = disableShareCallable;
export const getShareStatusFn = getShareStatus;
export const updateShareLocationFn = updateShareLocation;

// Stripe subscription for drivers (already onCall)
export const createDriverSubscriptionSession = createDriverSubscriptionSessionCallable;
export const createCheckoutSession = createDriverSubscriptionSessionCallable;
export const finalizeDriverSubscriptionFromSession = https.onCall(finalizeDriverSubscriptionFromSessionCallable);
export const syncDriverSubscriptionStatus = https.onCall(syncDriverSubscriptionStatusCallable);
export const getDriverStatusAdmin = https.onCall(getDriverStatusAdminCallable);

// Safety profile functions
export const updateTrustedContacts = https.onCall(updateTrustedContactsCallable);
export const updateSafetyConsents = https.onCall(updateSafetyConsentsCallable);

// Ratings functions
export const submitRating = https.onCall(submitRatingCallable);

// Fares functions
export const updateTariffs = https.onCall(updateTariffsCallable);

// Admin functions
export const suspendDriver = https.onCall(suspendDriverCallable);
export const getAllTrips = https.onCall(getAllTripsCallable);
export const downloadTripAudio = https.onCall(downloadTripAudioCallable);

// Safety Shield
export const logSafetyEventV2 = https.onCall(logSafetyEventV2Callable);

// Cancellations
export const cancelTripWithPenalty = https.onCall(cancelTripWithPenaltyCallable);

// Shared Trips functions
export const cleanupSharedTripsScheduled = cleanupSharedTrips;

// Disconnection handling functions
export const checkDisconnectedTripsScheduled = checkDisconnectedTrips;

// Payment-related functions
export const createPaymentIntent = https.onCall(createPaymentIntentCallable);
export const createPassengerCheckoutSession = https.onCall(createPassengerCheckoutSessionCallable);

// Trip triggers
export { autoAssignDriver };

