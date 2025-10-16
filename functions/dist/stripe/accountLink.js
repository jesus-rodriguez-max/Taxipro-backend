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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStripeAccountLink = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const config_1 = require("../config");
// Stripe will be initialized lazily inside the function using STRIPE_SECRET from config
/**
 * Creates a Stripe Express account for a driver and returns an onboarding link.
 */
const createStripeAccountLink = async (data, context) => {
    // 1. Check for authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to create a Stripe account.');
    }
    const uid = context.auth.uid;
    const driverRef = admin.firestore().collection('drivers').doc(uid);
    try {
        const stripeSecret = config_1.STRIPE_SECRET;
        if (!stripeSecret) {
            throw new functions.https.HttpsError('failed-precondition', 'Stripe secret no configurado.');
        }
        const stripe = new stripe_1.default(stripeSecret, {
            apiVersion: '2024-06-20',
        });
        const driverDoc = await driverRef.get();
        if (!driverDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Driver profile not found.');
        }
        let accountId = driverDoc.data()?.stripeAccountId;
        // 2. Create a Stripe account if it doesn't exist
        if (!accountId) {
            const account = await stripe.accounts.create({
                type: 'express',
                email: context.auth.token.email || undefined,
                country: 'MX', // Assuming Mexico, configure as needed
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
            });
            accountId = account.id;
            // 3. Save the account ID to the driver's profile
            await driverRef.update({ stripeAccountId: accountId });
        }
        // 4. Create an account link for onboarding
        const returnUrl = data.returnUrl || config_1.STRIPE_ONBOARDING_RETURN_URL;
        const refreshUrl = data.refreshUrl || config_1.STRIPE_ONBOARDING_REFRESH_URL;
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: refreshUrl,
            return_url: returnUrl,
            type: 'account_onboarding',
        });
        // 5. Return the link URL to the client
        return { url: accountLink.url };
    }
    catch (error) {
        console.error('Error creating Stripe account link:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred while creating the Stripe link.');
    }
};
exports.createStripeAccountLink = createStripeAccountLink;
//# sourceMappingURL=accountLink.js.map