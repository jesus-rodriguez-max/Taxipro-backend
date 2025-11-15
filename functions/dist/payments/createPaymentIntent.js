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
exports.createPaymentIntentCallable = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const service_1 = require("../stripe/service");
const firebase_functions_1 = require("firebase-functions");
/**
 * Crea un PaymentIntent de Stripe para un viaje específico usando un Cargo Directo.
 * El dinero va del pasajero a la cuenta de Stripe Connect del chofer.
 */
exports.createPaymentIntentCallable = (0, https_1.onCall)({ secrets: ["STRIPE_SECRET"] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }
    const { tripId, idempotencyKey } = request.data || {};
    if (!tripId) {
        return { error: true, code: 'invalid-argument', message: 'Se requiere `tripId`.' };
    }
    const db = admin.firestore();
    const tripRef = db.collection("trips").doc(tripId);
    try {
        const tripDoc = await tripRef.get();
        if (!tripDoc.exists) {
            return { error: true, code: 'not-found', message: 'El viaje no fue encontrado.' };
        }
        const tripData = tripDoc.data();
        if (tripData.passengerId !== request.auth.uid) {
            return { error: true, code: 'permission-denied', message: 'No puedes pagar este viaje.' };
        }
        const { driverId, passengerId, fare } = tripData;
        const amount = Math.round((fare?.total || 0) * 100);
        if (!driverId || !passengerId || !fare || !fare.total || amount <= 0) {
            return { error: true, code: 'failed-precondition', message: 'El viaje no tiene la información necesaria (chofer, pasajero o tarifa).' };
        }
        // 3. Obtener cuenta Connect del chofer
        const driverSnap = await db.collection('drivers').doc(driverId).get();
        const driverStripeAccountId = driverSnap.data()?.stripeAccountId;
        if (!driverStripeAccountId) {
            return { error: true, code: 'driver-missing-stripe', message: `El chofer ${driverId} no tiene cuenta de Stripe Connect.` };
        }
        // 4. Obtener el stripeCustomerId del pasajero
        const userDoc = await db.collection('users').doc(passengerId).get();
        const passengerStripeId = userDoc.data()?.stripeCustomerId;
        if (!passengerStripeId) {
            return { error: true, code: 'customer-missing', message: `El pasajero ${passengerId} no tiene cliente de Stripe.` };
        }
        // 5. Crear PaymentIntent en la plataforma (destination charge)
        const stripe = (0, service_1.getStripe)();
        const piParams = {
            amount,
            currency: 'mxn',
            customer: passengerStripeId,
            automatic_payment_methods: { enabled: true },
            on_behalf_of: driverStripeAccountId,
            transfer_data: { destination: driverStripeAccountId },
            metadata: { tripId, driverId, passengerId },
        };
        const requestOptions = {};
        if (idempotencyKey && typeof idempotencyKey === 'string') {
            requestOptions.idempotencyKey = idempotencyKey;
        }
        const paymentIntent = await stripe.paymentIntents.create(piParams, requestOptions);
        await tripRef.collection('payment').doc(paymentIntent.id).set({
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status || 'requires_payment_method',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            stripeConnectId: driverStripeAccountId,
            amount: fare.total,
        }, { merge: true });
        return { error: false, clientSecret: paymentIntent.client_secret };
    }
    catch (err) {
        const code = err?.code || 'stripe-error';
        const message = err?.message || 'No se pudo crear la intención de pago.';
        firebase_functions_1.logger.error('Error al crear PaymentIntent (destination charge)', { tripId, code, message });
        return { error: true, code, message };
    }
});
//# sourceMappingURL=createPaymentIntent.js.map