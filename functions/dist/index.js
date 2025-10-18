"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoAssignDriver = exports.createPassengerCheckoutSession = exports.createPaymentIntent = exports.checkDisconnectedTripsScheduled = exports.cleanupSharedTripsScheduled = exports.cancelTripWithPenalty = exports.logSafetyEventV2 = exports.downloadTripAudio = exports.getAllTrips = exports.suspendDriver = exports.updateTariffs = exports.submitRating = exports.updateSafetyConsents = exports.updateTrustedContacts = exports.getDriverStatusAdmin = exports.syncDriverSubscriptionStatus = exports.finalizeDriverSubscriptionFromSession = exports.createCheckoutSession = exports.createDriverSubscriptionSession = exports.updateShareLocationFn = exports.getShareStatusFn = exports.disableShare = exports.enableShare = exports.stopRecording = exports.startRecording = exports.suspendOverdueMemberships = exports.processMembershipPayments = exports.createStripeAccountLink = exports.checkDriverSubscription = exports.subscribeDriver = exports.createDriverAccount = exports.stripeWebhookV2 = exports.requestTripOffline = exports.markAsNoShow = exports.cancelTrip = exports.driverArrived = exports.updateTripStatus = exports.acceptTrip = exports.requestTrip = exports.updateDriverOnboarding = void 0;
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions"); // Añadido pubsub
const requestTrip_1 = require("./trips/requestTrip");
const acceptTrip_1 = require("./trips/acceptTrip");
const updateTripStatus_1 = require("./trips/updateTripStatus");
const driverArrived_1 = require("./trips/driverArrived");
const cancelTrip_1 = require("./trips/cancelTrip");
const markAsNoShow_1 = require("./trips/markAsNoShow");
const webhookV2_1 = require("./stripe/webhookV2");
Object.defineProperty(exports, "stripeWebhookV2", { enumerable: true, get: function () { return webhookV2_1.stripeWebhookV2; } });
const finalizeSubscriptionFromSession_1 = require("./stripe/finalizeSubscriptionFromSession");
const getDriverStatusAdmin_1 = require("./stripe/getDriverStatusAdmin");
const createDriverAccount_1 = require("./stripe/createDriverAccount");
const accountLink_1 = require("./stripe/accountLink");
const subscribeDriver_1 = require("./stripe/subscribeDriver");
const checkDriverSubscription_1 = require("./stripe/checkDriverSubscription");
const driverOnboarding_1 = require("./driverOnboarding");
const processMembershipPayments_1 = require("./membership/processMembershipPayments"); // Añadido
const safety_1 = require("./safety");
const safetyShare_1 = require("./safetyShare");
const updateShareLocation_1 = require("./updateShareLocation");
const createDriverSubscription_1 = require("./createDriverSubscription");
const syncSubscription_1 = require("./stripe/syncSubscription");
const safetyProfile_1 = require("./safetyProfile");
const submitRating_1 = require("./ratings/submitRating");
const cleanupSharedTrips_1 = require("./sharedTrips/cleanupSharedTrips");
const checkDisconnectedTrips_1 = require("./trips/checkDisconnectedTrips");
const createPaymentIntent_1 = require("./payments/createPaymentIntent");
const createPassengerCheckoutSession_1 = require("./payments/createPassengerCheckoutSession");
const requestTripOffline_1 = require("./trips/requestTripOffline");
const autoAssignDriver_1 = require("./trips/autoAssignDriver");
Object.defineProperty(exports, "autoAssignDriver", { enumerable: true, get: function () { return autoAssignDriver_1.autoAssignDriver; } });
const updateTariffs_1 = require("./fares/updateTariffs");
const suspendDriver_1 = require("./admin/suspendDriver");
const getAllTrips_1 = require("./admin/getAllTrips");
const downloadTripAudio_1 = require("./admin/downloadTripAudio");
const logSafetyEvent_1 = require("./safety/logSafetyEvent");
const cancelTripWithPenalty_1 = require("./trips/cancelTripWithPenalty");
// Initialize Firebase Admin
admin.initializeApp();
console.log('[✔] Backend iniciado');
// Onboarding
exports.updateDriverOnboarding = firebase_functions_1.https.onCall(driverOnboarding_1.updateDriverOnboardingCallable);
// Trip-related callables
exports.requestTrip = firebase_functions_1.https.onCall(requestTrip_1.requestTripCallable);
exports.acceptTrip = firebase_functions_1.https.onCall(acceptTrip_1.acceptTripCallable);
exports.updateTripStatus = firebase_functions_1.https.onCall(updateTripStatus_1.updateTripStatusCallable);
exports.driverArrived = firebase_functions_1.https.onCall(driverArrived_1.driverArrivedCallable);
exports.cancelTrip = firebase_functions_1.https.onCall(cancelTrip_1.cancelTripCallable);
exports.markAsNoShow = firebase_functions_1.https.onCall(markAsNoShow_1.markAsNoShowCallable);
exports.requestTripOffline = firebase_functions_1.https.onCall(requestTripOffline_1.requestTripOfflineCallable);
// Stripe Connect endpoints (Express account onboarding and subscription)
exports.createDriverAccount = firebase_functions_1.https.onCall(createDriverAccount_1.createDriverAccountCallable);
exports.subscribeDriver = firebase_functions_1.https.onCall(subscribeDriver_1.subscribeDriverCallable);
exports.checkDriverSubscription = firebase_functions_1.https.onCall(checkDriverSubscription_1.checkDriverSubscriptionCallable);
exports.createStripeAccountLink = firebase_functions_1.https.onCall(accountLink_1.createStripeAccountLink);
// Scheduled functions
exports.processMembershipPayments = processMembershipPayments_1.processMembershipPayments; // Añadido
exports.suspendOverdueMemberships = processMembershipPayments_1.suspendOverdueMemberships; // Añadido
// Safety-related callables (already wrapped in v2 onCall in safety.ts)
exports.startRecording = safety_1.startRecordingCallable;
exports.stopRecording = safety_1.stopRecordingCallable;
// Share-related functions
exports.enableShare = safetyShare_1.enableShareCallable;
exports.disableShare = safetyShare_1.disableShareCallable;
exports.getShareStatusFn = safetyShare_1.getShareStatus;
exports.updateShareLocationFn = updateShareLocation_1.updateShareLocation;
// Stripe subscription for drivers (already onCall)
exports.createDriverSubscriptionSession = createDriverSubscription_1.createDriverSubscriptionSessionCallable;
exports.createCheckoutSession = createDriverSubscription_1.createDriverSubscriptionSessionCallable;
exports.finalizeDriverSubscriptionFromSession = firebase_functions_1.https.onCall(finalizeSubscriptionFromSession_1.finalizeDriverSubscriptionFromSessionCallable);
exports.syncDriverSubscriptionStatus = firebase_functions_1.https.onCall(syncSubscription_1.syncDriverSubscriptionStatusCallable);
exports.getDriverStatusAdmin = firebase_functions_1.https.onCall(getDriverStatusAdmin_1.getDriverStatusAdminCallable);
// Safety profile functions
exports.updateTrustedContacts = firebase_functions_1.https.onCall(safetyProfile_1.updateTrustedContactsCallable);
exports.updateSafetyConsents = firebase_functions_1.https.onCall(safetyProfile_1.updateSafetyConsentsCallable);
// Ratings functions
exports.submitRating = firebase_functions_1.https.onCall(submitRating_1.submitRatingCallable);
// Fares functions
exports.updateTariffs = firebase_functions_1.https.onCall(updateTariffs_1.updateTariffsCallable);
// Admin functions
exports.suspendDriver = firebase_functions_1.https.onCall(suspendDriver_1.suspendDriverCallable);
exports.getAllTrips = firebase_functions_1.https.onCall(getAllTrips_1.getAllTripsCallable);
exports.downloadTripAudio = firebase_functions_1.https.onCall(downloadTripAudio_1.downloadTripAudioCallable);
// Safety Shield
exports.logSafetyEventV2 = firebase_functions_1.https.onCall(logSafetyEvent_1.logSafetyEventV2Callable);
// Cancellations
exports.cancelTripWithPenalty = firebase_functions_1.https.onCall(cancelTripWithPenalty_1.cancelTripWithPenaltyCallable);
// Shared Trips functions
exports.cleanupSharedTripsScheduled = cleanupSharedTrips_1.cleanupSharedTrips;
// Disconnection handling functions
exports.checkDisconnectedTripsScheduled = checkDisconnectedTrips_1.checkDisconnectedTrips;
// Payment-related functions
exports.createPaymentIntent = firebase_functions_1.https.onCall(createPaymentIntent_1.createPaymentIntentCallable);
exports.createPassengerCheckoutSession = firebase_functions_1.https.onCall(createPassengerCheckoutSession_1.createPassengerCheckoutSessionCallable);
//# sourceMappingURL=index.js.map