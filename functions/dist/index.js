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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
admin.initializeApp();
console.log('[✔] Backend initialized');
// Export all functions by re-exporting from their modules.
// This is the cleanest way for Gen 2 and avoids ambiguity for the bundler.
// Admin
__exportStar(require("./admin/downloadTripAudio"), exports);
__exportStar(require("./admin/getAllTrips"), exports);
__exportStar(require("./admin/suspendDriver"), exports);
// App
__exportStar(require("./app"), exports);
// Fares
__exportStar(require("./fares/updateTariffs"), exports);
// Membership
__exportStar(require("./membership/processMembershipPayments"), exports);
// Payments
__exportStar(require("./payments/createDirectPaymentSession"), exports);
__exportStar(require("./payments/createPassengerCheckoutSession"), exports);
__exportStar(require("./payments/createPassengerCustomer"), exports);
__exportStar(require("./payments/createPassengerEphemeralKey"), exports);
__exportStar(require("./payments/createPassengerSetupIntent"), exports);
__exportStar(require("./payments/createPaymentIntent"), exports);
__exportStar(require("./payments/listPassengerPaymentMethods"), exports);
__exportStar(require("./payments/savePassengerPaymentMethod"), exports);
// Ratings
__exportStar(require("./ratings/submitRating"), exports);
// Safety
__exportStar(require("./safety"), exports);
__exportStar(require("./safetyProfile"), exports);
__exportStar(require("./safetyShare"), exports);
__exportStar(require("./safety/logSafetyEvent"), exports);
// Services
// Note: service files like twilio.ts or stripe/service.ts are not exported as they don't contain triggers.
__exportStar(require("./maps"), exports);
// Stripe (triggers)
__exportStar(require("./stripe/checkDriverSubscription"), exports);
__exportStar(require("./stripe/createDriverAccount"), exports);
__exportStar(require("./stripe/finalizeSubscriptionFromSession"), exports);
__exportStar(require("./stripe/subscribeDriver"), exports);
__exportStar(require("./stripe/syncSubscription"), exports);
__exportStar(require("./stripe/webhookV2"), exports);
// Trips
__exportStar(require("./trips/acceptTrip"), exports);
__exportStar(require("./trips/autoAssignDriver"), exports);
__exportStar(require("./trips/cancelTrip"), exports);
__exportStar(require("./trips/cancelTripWithPenalty"), exports);
__exportStar(require("./trips/checkDisconnectedTrips"), exports);
__exportStar(require("./trips/driverArrived"), exports);
__exportStar(require("./trips/markAsNoShow"), exports);
__exportStar(require("./trips/requestTrip"), exports);
__exportStar(require("./trips/requestTripOffline"), exports);
__exportStar(require("./trips/updateTripStatus"), exports);
__exportStar(require("./trips/quoteFare"), exports);
// Root level triggers
__exportStar(require("./driverOnboarding"), exports);
__exportStar(require("./updateShareLocation"), exports);
//# sourceMappingURL=index.js.map