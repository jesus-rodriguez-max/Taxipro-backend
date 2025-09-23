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
exports.subscribeDriverCallable = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const stripe_1 = __importDefault(require("stripe"));
const subscribeDriverCallable = async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Debe iniciar sesión');
    }
    const driverId = context.auth.uid;
    const driverRef = admin.firestore().collection('drivers').doc(driverId);
    const driverSnap = await driverRef.get();
    if (!driverSnap.exists) {
        throw new functions.https.HttpsError('failed-precondition', 'Solo los conductores pueden suscribirse');
    }
    const driver = driverSnap.data();
    if (driver?.billingConsent !== true) {
        throw new functions.https.HttpsError('failed-precondition', 'Debe aceptar el consentimiento de cobro (billingConsent) antes de suscribirse');
    }
    const stripeSecret = functions.config().stripe?.secret;
    const priceId = functions.config().stripe?.weekly_price_id; // Precio recurrente semanal (149 MXN)
    if (!stripeSecret || !priceId) {
        throw new functions.https.HttpsError('failed-precondition', 'La configuración de Stripe no está completa');
    }
    const stripe = new stripe_1.default(stripeSecret, { apiVersion: '2024-04-10' });
    // Crear o reutilizar Customer de Stripe
    let stripeCustomerId = driver?.stripeCustomerId;
    if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
            metadata: { driverId },
        });
        stripeCustomerId = customer.id;
        await driverRef.update({ stripeCustomerId });
    }
    const successUrl = data?.successUrl ?? 'https://taxipro.mx/suscripcion-exitosa?session_id={CHECKOUT_SESSION_ID}';
    const cancelUrl = data?.cancelUrl ?? 'https://taxipro.mx/suscripcion-cancelada';
    // Crear Checkout Session para suscripción
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer: stripeCustomerId,
        client_reference_id: driverId,
    });
    return { sessionId: session.id, url: session.url };
};
exports.subscribeDriverCallable = subscribeDriverCallable;
//# sourceMappingURL=subscribeDriver.js.map