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
exports.checkDisconnectedTripsScheduled = exports.cleanupSharedTripsScheduled = exports.submitRating = exports.updateSafetyConsents = exports.updateTrustedContacts = exports.createDriverSubscriptionSession = exports.updateShareLocationFn = exports.getShareStatusFn = exports.disableShare = exports.enableShare = exports.logSafetyEvent = exports.stopRecording = exports.startRecording = exports.suspendOverdueMemberships = exports.processMembershipPayments = exports.checkDriverSubscription = exports.subscribeDriver = exports.createDriverAccount = exports.stripeWebhook = exports.markAsNoShow = exports.cancelTrip = exports.driverArrived = exports.updateTripStatus = exports.acceptTrip = exports.requestTrip = exports.updateDriverOnboarding = void 0;
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions"); // Añadido pubsub
const requestTrip_1 = require("./trips/requestTrip");
const acceptTrip_1 = require("./trips/acceptTrip");
const updateTripStatus_1 = require("./trips/updateTripStatus");
const driverArrived_1 = require("./trips/driverArrived");
const cancelTrip_1 = require("./trips/cancelTrip");
const markAsNoShow_1 = require("./trips/markAsNoShow");
const webhook_1 = require("./stripe/webhook");
Object.defineProperty(exports, "stripeWebhook", { enumerable: true, get: function () { return webhook_1.stripeWebhook; } });
const createDriverAccount_1 = require("./stripe/createDriverAccount");
const subscribeDriver_1 = require("./stripe/subscribeDriver");
const checkDriverSubscription_1 = require("./stripe/checkDriverSubscription");
const driverOnboarding_1 = require("./driverOnboarding");
const processMembershipPayments_1 = require("./membership/processMembershipPayments"); // Añadido
const safety_1 = require("./safety");
const safetyShare_1 = require("./safetyShare");
const updateShareLocation_1 = require("./updateShareLocation");
const createDriverSubscription_1 = require("./createDriverSubscription");
const safetyProfile_1 = require("./safetyProfile");
const submitRating_1 = require("./ratings/submitRating");
const cleanupSharedTrips_1 = require("./sharedTrips/cleanupSharedTrips");
const checkDisconnectedTrips_1 = require("./trips/checkDisconnectedTrips");
// Initialize Firebase Admin
admin.initializeApp();
// Onboarding
exports.updateDriverOnboarding = firebase_functions_1.https.onCall(driverOnboarding_1.updateDriverOnboardingCallable);
// Trip-related callables
exports.requestTrip = firebase_functions_1.https.onCall(requestTrip_1.requestTripCallable);
exports.acceptTrip = firebase_functions_1.https.onCall(acceptTrip_1.acceptTripCallable);
exports.updateTripStatus = firebase_functions_1.https.onCall(updateTripStatus_1.updateTripStatusCallable);
exports.driverArrived = firebase_functions_1.https.onCall(driverArrived_1.driverArrivedCallable);
exports.cancelTrip = firebase_functions_1.https.onCall(cancelTrip_1.cancelTripCallable);
exports.markAsNoShow = firebase_functions_1.https.onCall(markAsNoShow_1.markAsNoShowCallable);
// Stripe Connect endpoints (Express account onboarding and subscription)
exports.createDriverAccount = firebase_functions_1.https.onCall(createDriverAccount_1.createDriverAccountCallable);
exports.subscribeDriver = firebase_functions_1.https.onCall(subscribeDriver_1.subscribeDriverCallable);
exports.checkDriverSubscription = firebase_functions_1.https.onCall(checkDriverSubscription_1.checkDriverSubscriptionCallable);
// Scheduled functions
exports.processMembershipPayments = processMembershipPayments_1.processMembershipPayments; // Añadido
exports.suspendOverdueMemberships = processMembershipPayments_1.suspendOverdueMemberships; // Añadido
// Safety-related callables (already wrapped in v2 onCall in safety.ts)
exports.startRecording = safety_1.startRecordingCallable;
exports.stopRecording = safety_1.stopRecordingCallable;
exports.logSafetyEvent = safety_1.logSafetyEventCallable;
// Share-related functions
exports.enableShare = safetyShare_1.enableShareCallable;
exports.disableShare = safetyShare_1.disableShareCallable;
exports.getShareStatusFn = safetyShare_1.getShareStatus;
exports.updateShareLocationFn = updateShareLocation_1.updateShareLocation;
// Stripe subscription for drivers (already onCall)
exports.createDriverSubscriptionSession = createDriverSubscription_1.createDriverSubscriptionSessionCallable;
// Safety profile functions
exports.updateTrustedContacts = firebase_functions_1.https.onCall(safetyProfile_1.updateTrustedContactsCallable);
exports.updateSafetyConsents = firebase_functions_1.https.onCall(safetyProfile_1.updateSafetyConsentsCallable);
// Ratings functions
exports.submitRating = firebase_functions_1.https.onCall(submitRating_1.submitRatingCallable);
// Shared Trips functions
exports.cleanupSharedTripsScheduled = cleanupSharedTrips_1.cleanupSharedTrips;
// Disconnection handling functions
exports.checkDisconnectedTripsScheduled = checkDisconnectedTrips_1.checkDisconnectedTrips;
//# sourceMappingURL=index.js.map