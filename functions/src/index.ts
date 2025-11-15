import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();
console.log('[✔] Backend initialized');

// Export all functions by re-exporting from their modules.
// This is the cleanest way for Gen 2 and avoids ambiguity for the bundler.

// Admin
export * from './admin/downloadTripAudio';
export * from './admin/getAllTrips';
export * from './admin/suspendDriver';

// App
export * from './app';

// Fares
export * from './fares/updateTariffs';

// Membership
export * from './membership/processMembershipPayments';

// Payments
export * from './payments/createDirectPaymentSession';
export * from './payments/createPassengerCheckoutSession';
export * from './payments/createPassengerCustomer';
export * from './payments/createPassengerEphemeralKey';
export * from './payments/createPassengerSetupIntent';
export * from './payments/createPaymentIntent';
export * from './payments/listPassengerPaymentMethods';
export * from './payments/savePassengerPaymentMethod';

// Ratings
export * from './ratings/submitRating';

// Safety
export * from './safety';
export * from './safetyProfile';
export * from './safetyShare';
export * from './safety/logSafetyEvent';

// Services
// Note: service files like twilio.ts or stripe/service.ts are not exported as they don't contain triggers.
export * from './maps';

// Stripe (triggers)
export * from './stripe/checkDriverSubscription';
export * from './stripe/createDriverAccount';
export * from './stripe/finalizeSubscriptionFromSession';
export * from './stripe/subscribeDriver';
export * from './stripe/syncSubscription';
export * from './stripe/webhookV2';

// Trips
export * from './trips/acceptTrip';
export * from './trips/autoAssignDriver';
export * from './trips/cancelTrip';
export * from './trips/cancelTripWithPenalty';
export * from './trips/checkDisconnectedTrips';
export * from './trips/driverArrived';
export * from './trips/markAsNoShow';
export * from './trips/requestTrip';
export * from './trips/requestTripOffline';
export * from './trips/updateTripStatus';
export * from './trips/quoteFare';

// Root level triggers
export * from './driverOnboarding';
export * from './updateShareLocation';
