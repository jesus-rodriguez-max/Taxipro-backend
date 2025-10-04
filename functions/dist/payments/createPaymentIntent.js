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
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const service_1 = require("../stripe/service");
/**
 * Crea un PaymentIntent de Stripe para un viaje específico.
 * @param {object} data - Datos de la llamada, debe contener `tripId`.
 * @param {functions.https.CallableContext} context - Contexto de la función.
 * @returns {Promise<{clientSecret: string}>} - El clientSecret del PaymentIntent.
 */
const createPaymentIntentCallable = async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
    }
    const { tripId } = data;
    if (!tripId) {
        throw new functions.https.HttpsError('invalid-argument', 'Se requiere el `tripId`.');
    }
    const tripRef = admin.firestore().collection('trips').doc(tripId);
    const tripDoc = await tripRef.get();
    if (!tripDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'El viaje no fue encontrado.');
    }
    const tripData = tripDoc.data();
    if (tripData.passengerId !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'No tienes permiso para pagar este viaje.');
    }
    const amount = Math.round(tripData.fare.total * 100); // Stripe requiere el monto en centavos
    try {
        const paymentIntent = await (0, service_1.getStripe)().paymentIntents.create({
            amount,
            currency: 'mxn',
            metadata: { tripId },
        });
        await tripRef.collection('payment').doc(paymentIntent.id).set({
            paymentIntentId: paymentIntent.id,
            status: 'requires_payment_method',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { clientSecret: paymentIntent.client_secret };
    }
    catch (error) {
        console.error('Error al crear el PaymentIntent:', error);
        throw new functions.https.HttpsError('internal', 'No se pudo crear la intención de pago.', error.message);
    }
};
exports.createPaymentIntentCallable = createPaymentIntentCallable;
//# sourceMappingURL=createPaymentIntent.js.map