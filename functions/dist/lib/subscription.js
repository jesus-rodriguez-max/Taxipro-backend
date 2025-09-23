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
exports.isDriverSubscriptionActive = isDriverSubscriptionActive;
const admin = __importStar(require("firebase-admin"));
/**
 * Check if the driver's subscription is currently active (paid or within free trial).
 *
 * Drivers have a subscriptionExpiration field in their Firestore document
 * under the "drivers" collection representing the timestamp when their paid subscription expires.
 * If subscriptionExpiration is missing or in the future, the subscription is considered active.
 *
 * @param driverId The uid of the driver
 * @returns true if the subscription is active, false otherwise
 */
async function isDriverSubscriptionActive(driverId) {
    const doc = await admin.firestore().collection('drivers').doc(driverId).get();
    if (!doc.exists) {
        return false;
    }
    const data = doc.data() || {};
    const expiration = data.subscriptionExpiration;
    // If no expiration, treat as active (trial)
    if (!expiration) {
        return true;
    }
    let expirationDate;
    // expiration can be a Firestore Timestamp or Date
    if (typeof expiration.toDate === 'function') {
        expirationDate = expiration.toDate();
    }
    else {
        expirationDate = new Date(expiration);
    }
    return expirationDate.getTime() > Date.now();
}
//# sourceMappingURL=subscription.js.map