import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';

// Import all callable function handlers
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
import { processMembershipPayments as processMembershipPaymentsFunction, suspendOverdueMemberships as suspendOverdueMembershipsFunction } from './membership/processMembershipPayments';
import { startRecordingCallable, stopRecordingCallable } from './safety';
import { enableShareCallable, disableShareCallable, getShareStatus } from './safetyShare';
import { updateShareLocation } from './updateShareLocation';
import { createDriverSubscriptionSessionCallable } from './createDriverSubscription';
import { syncDriverSubscriptionStatusCallable } from './stripe/syncSubscription';
import { updateTrustedContactsCallable, updateSafetyConsentsCallable } from './safetyProfile';
import { submitRatingCallable } from './ratings/submitRating';
import { cleanupSharedTrips } from './sharedTrips/cleanupSharedTrips';
import { checkDisconnectedTrips } from './trips/checkDisconnectedTrips';
import { createPaymentIntentCallable } from './payments/createPaymentIntent';
import { createPassengerCheckoutSessionCallable } from './payments/createPassengerCheckoutSession';
import { createDirectPaymentSessionCallable } from './payments/createDirectPaymentSession';
import { createPassengerCustomerCallable } from './payments/createPassengerCustomer';
import { createPassengerSetupIntentCallable } from './payments/createPassengerSetupIntent';
import { savePassengerPaymentMethodCallable } from './payments/savePassengerPaymentMethod';
import { createPassengerEphemeralKeyCallable } from './payments/createPassengerEphemeralKey';
import { listPassengerPaymentMethodsCallable } from './payments/listPassengerPaymentMethods';
import { requestTripOfflineCallable } from './trips/requestTripOffline';
import { autoAssignDriver } from './trips/autoAssignDriver';
import { updateTariffsCallable } from './fares/updateTariffs';
import { suspendDriverCallable } from './admin/suspendDriver';
import { getAllTripsCallable } from './admin/getAllTrips';
import { downloadTripAudioCallable } from './admin/downloadTripAudio';
import { logSafetyEventV2Callable } from './safety/logSafetyEvent';
import { cancelTripWithPenaltyCallable } from './trips/cancelTripWithPenalty';
import { getPassengerAppConfig as getPassengerAppConfigCallable } from './app';

// All secrets used in the backend
const secrets = [
  'STRIPE_SECRET',
  'STRIPE_WEBHOOK_SECRET_V2',
  'STRIPE_PUBLISHABLE_KEY',
  'GOOGLE_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_NUMBER',
  'TWILIO_PHONE_NUMBER'
];

// Initialize Firebase Admin
admin.initializeApp();
console.log('[✔] Backend initialized');

// Export all functions with secrets bound
export const updateDriverOnboarding = functions.https.onCall(updateDriverOnboardingCallable);
export const requestTrip = functions.runWith({ secrets }).https.onCall(requestTripCallable);
export const acceptTrip = functions.runWith({ secrets }).https.onCall(acceptTripCallable);
export const updateTripStatus = functions.runWith({ secrets }).https.onCall(updateTripStatusCallable);
export const driverArrived = functions.runWith({ secrets }).https.onCall(driverArrivedCallable);
export const cancelTrip = functions.runWith({ secrets }).https.onCall(cancelTripCallable);
export const markAsNoShow = functions.runWith({ secrets }).https.onCall(markAsNoShowCallable);
export const requestTripOffline = functions.runWith({ secrets }).https.onCall(requestTripOfflineCallable);
export { stripeWebhookV2 };
export const createDriverAccount = functions.runWith({ secrets }).https.onCall(createDriverAccountCallable);
export const subscribeDriver = functions.runWith({ secrets }).https.onCall(subscribeDriverCallable);
export const checkDriverSubscription = functions.runWith({ secrets }).https.onCall(checkDriverSubscriptionCallable);
export const createStripeAccountLink = functions.runWith({ secrets }).https.onCall(createStripeAccountLinkCallable);
export const processMembershipPayments = processMembershipPaymentsFunction;
export const suspendOverdueMemberships = suspendOverdueMembershipsFunction;
export const startRecording = startRecordingCallable;
export const stopRecording = stopRecordingCallable;
export const enableShare = enableShareCallable;
export const disableShare = disableShareCallable;
export const getShareStatusFn = getShareStatus;
export const updateShareLocationFn = updateShareLocation;
export const createDriverSubscriptionSession = functions.runWith({ secrets }).https.onCall(createDriverSubscriptionSessionCallable as any);
export const createCheckoutSession = functions.runWith({ secrets }).https.onCall(createDriverSubscriptionSessionCallable as any);
export const finalizeDriverSubscriptionFromSession = functions.runWith({ secrets }).https.onCall(finalizeDriverSubscriptionFromSessionCallable as any);
export const syncDriverSubscriptionStatus = functions.runWith({ secrets }).https.onCall(syncDriverSubscriptionStatusCallable);
export const getDriverStatusAdmin = functions.runWith({ secrets }).https.onCall(getDriverStatusAdminCallable);
export const updateTrustedContacts = functions.runWith({ secrets }).https.onCall(updateTrustedContactsCallable);
export const updateSafetyConsents = functions.runWith({ secrets }).https.onCall(updateSafetyConsentsCallable);
export const submitRating = functions.runWith({ secrets }).https.onCall(submitRatingCallable);
export const updateTariffs = functions.runWith({ secrets }).https.onCall(updateTariffsCallable);
export const suspendDriver = functions.runWith({ secrets }).https.onCall(suspendDriverCallable);
export const getAllTrips = functions.runWith({ secrets }).https.onCall(getAllTripsCallable);
export const downloadTripAudio = functions.runWith({ secrets }).https.onCall(downloadTripAudioCallable);
export const logSafetyEventV2 = functions.runWith({ secrets }).https.onCall(logSafetyEventV2Callable);
export const cancelTripWithPenalty = functions.runWith({ secrets }).https.onCall(cancelTripWithPenaltyCallable);
export const cleanupSharedTripsScheduled = cleanupSharedTrips;
export const checkDisconnectedTripsScheduled = checkDisconnectedTrips;
export const createPaymentIntent = functions.runWith({ secrets }).https.onCall(createPaymentIntentCallable);
export const createPassengerCheckoutSession = functions.runWith({ secrets }).https.onCall(createPassengerCheckoutSessionCallable);
export const createDirectPaymentSession = functions.runWith({ secrets }).https.onCall(createDirectPaymentSessionCallable);
export const createPassengerCustomer = functions.runWith({ secrets }).https.onCall(createPassengerCustomerCallable);
export const createPassengerSetupIntent = functions.runWith({ secrets }).https.onCall(createPassengerSetupIntentCallable);
export const savePassengerPaymentMethod = functions.runWith({ secrets }).https.onCall(savePassengerPaymentMethodCallable);
export const listPassengerPaymentMethods = functions.runWith({ secrets }).https.onCall(listPassengerPaymentMethodsCallable);
export const createPassengerEphemeralKey = functions.runWith({ secrets }).https.onCall(createPassengerEphemeralKeyCallable);
export { autoAssignDriver };
export const getPassengerAppConfig = functions.runWith({ secrets }).https.onCall(getPassengerAppConfigCallable as any);
