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
exports.createDriverAccountCallable = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const stripe_1 = __importDefault(require("stripe"));
const createDriverAccountCallable = async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Debe iniciar sesión.');
    }
    const driverId = context.auth.uid;
    const stripeSecret = functions.config().stripe?.secret;
    if (!stripeSecret) {
        throw new functions.https.HttpsError('failed-precondition', 'Stripe secret no configurado.');
    }
    const stripe = new stripe_1.default(stripeSecret, { apiVersion: '2024-04-10' });
    const driverRef = admin.firestore().collection('drivers').doc(driverId);
    const snap = await driverRef.get();
    if (!snap.exists) {
        throw new functions.https.HttpsError('failed-precondition', 'Solo los conductores pueden crear cuenta.');
    }
    const driverData = snap.data() || {};
    let stripeAccountId = driverData.stripeAccountId;
    // Crear cuenta Connect Express si no existe
    if (!stripeAccountId) {
        const account = await stripe.accounts.create({
            type: 'express',
            country: 'MX',
            email: data?.email,
            business_type: 'individual',
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            metadata: { driverId },
        });
        stripeAccountId = account.id;
        await driverRef.update({ stripeAccountId });
    }
    const refreshUrl = data?.refreshUrl || functions.config().stripe?.onboarding_refresh_url || 'https://taxipro.mx/stripe/onboarding/retry';
    const returnUrl = data?.returnUrl || functions.config().stripe?.onboarding_return_url || 'https://taxipro.mx/stripe/onboarding/complete';
    // Crear Account Link para onboarding/KYC
    const link = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
    });
    return { accountId: stripeAccountId, url: link.url };
};
exports.createDriverAccountCallable = createDriverAccountCallable;
//# sourceMappingURL=createDriverAccount.js.map