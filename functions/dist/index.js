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
exports.getPassengerAppConfig = exports.autoAssignDriver = exports.createPassengerEphemeralKey = exports.listPassengerPaymentMethods = exports.savePassengerPaymentMethod = exports.createPassengerSetupIntent = exports.createPassengerCustomer = exports.createDirectPaymentSession = exports.createPassengerCheckoutSession = exports.createPaymentIntent = exports.checkDisconnectedTripsScheduled = exports.cleanupSharedTripsScheduled = exports.cancelTripWithPenalty = exports.logSafetyEventV2 = exports.downloadTripAudio = exports.getAllTrips = exports.suspendDriver = exports.updateTariffs = exports.submitRating = exports.updateSafetyConsents = exports.updateTrustedContacts = exports.getDriverStatusAdmin = exports.syncDriverSubscriptionStatus = exports.finalizeDriverSubscriptionFromSession = exports.createCheckoutSession = exports.createDriverSubscriptionSession = exports.updateShareLocationFn = exports.getShareStatusFn = exports.disableShare = exports.enableShare = exports.stopRecording = exports.startRecording = exports.suspendOverdueMemberships = exports.processMembershipPayments = exports.createStripeAccountLink = exports.checkDriverSubscription = exports.subscribeDriver = exports.createDriverAccount = exports.stripeWebhookV2 = exports.requestTripOffline = exports.markAsNoShow = exports.cancelTrip = exports.driverArrived = exports.updateTripStatus = exports.acceptTrip = exports.requestTrip = exports.updateDriverOnboarding = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
// Import all callable function handlers
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
const processMembershipPayments_1 = require("./membership/processMembershipPayments");
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
const createDirectPaymentSession_1 = require("./payments/createDirectPaymentSession");
const createPassengerCustomer_1 = require("./payments/createPassengerCustomer");
const createPassengerSetupIntent_1 = require("./payments/createPassengerSetupIntent");
const savePassengerPaymentMethod_1 = require("./payments/savePassengerPaymentMethod");
const createPassengerEphemeralKey_1 = require("./payments/createPassengerEphemeralKey");
const listPassengerPaymentMethods_1 = require("./payments/listPassengerPaymentMethods");
const requestTripOffline_1 = require("./trips/requestTripOffline");
const autoAssignDriver_1 = require("./trips/autoAssignDriver");
Object.defineProperty(exports, "autoAssignDriver", { enumerable: true, get: function () { return autoAssignDriver_1.autoAssignDriver; } });
const updateTariffs_1 = require("./fares/updateTariffs");
const suspendDriver_1 = require("./admin/suspendDriver");
const getAllTrips_1 = require("./admin/getAllTrips");
const downloadTripAudio_1 = require("./admin/downloadTripAudio");
const logSafetyEvent_1 = require("./safety/logSafetyEvent");
const cancelTripWithPenalty_1 = require("./trips/cancelTripWithPenalty");
const app_1 = require("./app");
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
exports.updateDriverOnboarding = functions.https.onCall(driverOnboarding_1.updateDriverOnboardingCallable);
exports.requestTrip = functions.runWith({ secrets }).https.onCall(requestTrip_1.requestTripCallable);
exports.acceptTrip = functions.runWith({ secrets }).https.onCall(acceptTrip_1.acceptTripCallable);
exports.updateTripStatus = functions.runWith({ secrets }).https.onCall(updateTripStatus_1.updateTripStatusCallable);
exports.driverArrived = functions.runWith({ secrets }).https.onCall(driverArrived_1.driverArrivedCallable);
exports.cancelTrip = functions.runWith({ secrets }).https.onCall(cancelTrip_1.cancelTripCallable);
exports.markAsNoShow = functions.runWith({ secrets }).https.onCall(markAsNoShow_1.markAsNoShowCallable);
exports.requestTripOffline = functions.runWith({ secrets }).https.onCall(requestTripOffline_1.requestTripOfflineCallable);
exports.createDriverAccount = functions.runWith({ secrets }).https.onCall(createDriverAccount_1.createDriverAccountCallable);
exports.subscribeDriver = functions.runWith({ secrets }).https.onCall(subscribeDriver_1.subscribeDriverCallable);
exports.checkDriverSubscription = functions.runWith({ secrets }).https.onCall(checkDriverSubscription_1.checkDriverSubscriptionCallable);
exports.createStripeAccountLink = functions.runWith({ secrets }).https.onCall(accountLink_1.createStripeAccountLink);
exports.processMembershipPayments = processMembershipPayments_1.processMembershipPayments;
exports.suspendOverdueMemberships = processMembershipPayments_1.suspendOverdueMemberships;
exports.startRecording = safety_1.startRecordingCallable;
exports.stopRecording = safety_1.stopRecordingCallable;
exports.enableShare = safetyShare_1.enableShareCallable;
exports.disableShare = safetyShare_1.disableShareCallable;
exports.getShareStatusFn = safetyShare_1.getShareStatus;
exports.updateShareLocationFn = updateShareLocation_1.updateShareLocation;
exports.createDriverSubscriptionSession = functions.runWith({ secrets }).https.onCall(createDriverSubscription_1.createDriverSubscriptionSessionCallable);
exports.createCheckoutSession = functions.runWith({ secrets }).https.onCall(createDriverSubscription_1.createDriverSubscriptionSessionCallable);
exports.finalizeDriverSubscriptionFromSession = functions.runWith({ secrets }).https.onCall(finalizeSubscriptionFromSession_1.finalizeDriverSubscriptionFromSessionCallable);
exports.syncDriverSubscriptionStatus = functions.runWith({ secrets }).https.onCall(syncSubscription_1.syncDriverSubscriptionStatusCallable);
exports.getDriverStatusAdmin = functions.runWith({ secrets }).https.onCall(getDriverStatusAdmin_1.getDriverStatusAdminCallable);
exports.updateTrustedContacts = functions.runWith({ secrets }).https.onCall(safetyProfile_1.updateTrustedContactsCallable);
exports.updateSafetyConsents = functions.runWith({ secrets }).https.onCall(safetyProfile_1.updateSafetyConsentsCallable);
exports.submitRating = functions.runWith({ secrets }).https.onCall(submitRating_1.submitRatingCallable);
exports.updateTariffs = functions.runWith({ secrets }).https.onCall(updateTariffs_1.updateTariffsCallable);
exports.suspendDriver = functions.runWith({ secrets }).https.onCall(suspendDriver_1.suspendDriverCallable);
exports.getAllTrips = functions.runWith({ secrets }).https.onCall(getAllTrips_1.getAllTripsCallable);
exports.downloadTripAudio = functions.runWith({ secrets }).https.onCall(downloadTripAudio_1.downloadTripAudioCallable);
exports.logSafetyEventV2 = functions.runWith({ secrets }).https.onCall(logSafetyEvent_1.logSafetyEventV2Callable);
exports.cancelTripWithPenalty = functions.runWith({ secrets }).https.onCall(cancelTripWithPenalty_1.cancelTripWithPenaltyCallable);
exports.cleanupSharedTripsScheduled = cleanupSharedTrips_1.cleanupSharedTrips;
exports.checkDisconnectedTripsScheduled = checkDisconnectedTrips_1.checkDisconnectedTrips;
exports.createPaymentIntent = functions.runWith({ secrets }).https.onCall(createPaymentIntent_1.createPaymentIntentCallable);
exports.createPassengerCheckoutSession = functions.runWith({ secrets }).https.onCall(createPassengerCheckoutSession_1.createPassengerCheckoutSessionCallable);
exports.createDirectPaymentSession = functions.runWith({ secrets }).https.onCall(createDirectPaymentSession_1.createDirectPaymentSessionCallable);
exports.createPassengerCustomer = functions.runWith({ secrets }).https.onCall(createPassengerCustomer_1.createPassengerCustomerCallable);
exports.createPassengerSetupIntent = functions.runWith({ secrets }).https.onCall(createPassengerSetupIntent_1.createPassengerSetupIntentCallable);
exports.savePassengerPaymentMethod = functions.runWith({ secrets }).https.onCall(savePassengerPaymentMethod_1.savePassengerPaymentMethodCallable);
exports.listPassengerPaymentMethods = functions.runWith({ secrets }).https.onCall(listPassengerPaymentMethods_1.listPassengerPaymentMethodsCallable);
exports.createPassengerEphemeralKey = functions.runWith({ secrets }).https.onCall(createPassengerEphemeralKey_1.createPassengerEphemeralKeyCallable);
exports.getPassengerAppConfig = functions.runWith({ secrets }).https.onCall(app_1.getPassengerAppConfig);
//# sourceMappingURL=index.js.map