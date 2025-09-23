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
exports.handleStripeWebhook = exports.createPaymentIntent = exports.stripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const types_1 = require("../lib/types");
// Inicializa el cliente de Stripe con la clave secreta obtenida de forma segura
// desde la configuración de entorno de Firebase.
exports.stripe = new stripe_1.default(functions.config().stripe.secret, {
    apiVersion: '2024-04-10', // Usa una versión de API fija y soportada
    typescript: true,
});
/**
 * Crea un PaymentIntent para un nuevo cobro.
 * @param {number} amount - El monto a cobrar en la unidad más pequeña (ej. centavos).
 * @param {string} currency - La moneda del cobro (ej. 'mxn').
 * @param {string} customerId - El ID de cliente de Stripe.
 * @param {string} paymentMethodId - El ID del método de pago de Stripe.
 * @returns {Promise<Stripe.PaymentIntent>} El PaymentIntent creado.
 */
const createPaymentIntent = async (amount, currency, customerId, paymentMethodId) => {
    return exports.stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true, // Indica que el cliente no está presente en el flujo de pago
        confirm: true, // Intenta confirmar el pago inmediatamente
    });
};
exports.createPaymentIntent = createPaymentIntent;
/**
 * Gestiona los eventos recibidos desde el webhook de Stripe.
 * @param {Stripe.Event} event - El evento de Stripe.
 */
const handleStripeWebhook = async (event) => {
    const db = admin.firestore();
    switch (event.type) {
        // Suscripción iniciada mediante Checkout
        case 'checkout.session.completed': {
            const session = event.data.object;
            const driverId = session.client_reference_id || '';
            if (!driverId) {
                functions.logger.warn('checkout.session.completed without client_reference_id');
                break;
            }
            const driverRef = db.collection('drivers').doc(driverId);
            const driverSnap = await driverRef.get();
            if (!driverSnap.exists) {
                functions.logger.warn(`Driver ${driverId} not found on checkout.session.completed`);
                break;
            }
            const driverData = driverSnap.data();
            if (driverData?.billingConsent !== true) {
                functions.logger.warn(`Driver ${driverId} has not accepted billingConsent. Skipping activation.`);
                break;
            }
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await driverRef.set({
                stripeCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
                subscriptionId: typeof session.subscription === 'string' ? session.subscription : undefined,
                subscriptionActive: true,
                subscriptionExpiration: expiresAt,
                membership: {
                    status: types_1.DriverMembershipStatus.ACTIVE,
                    lastPaymentAttempt: admin.firestore.FieldValue.serverTimestamp(),
                },
            }, { merge: true });
            functions.logger.info(`Driver ${driverId} subscription activated via Checkout.`);
            break;
        }
        // Falla de cobro de suscripción
        case 'invoice.payment_failed': {
            const invoice = event.data.object;
            const customerId = invoice.customer || '';
            if (!customerId)
                break;
            await updateDriverByField('stripeCustomerId', customerId, {
                subscriptionActive: false,
                membership: { status: types_1.DriverMembershipStatus.SUSPENDED, lastPaymentAttempt: admin.firestore.FieldValue.serverTimestamp() },
            });
            functions.logger.warn(`Invoice payment failed for customer ${customerId}. Driver suspended.`);
            break;
        }
        // Cuenta Connect actualizada (KYC / habilitaciones)
        case 'account.updated': {
            const account = event.data.object;
            const verified = !!account.charges_enabled && !!account.details_submitted;
            await updateDriverByField('stripeAccountId', account.id, {
                isApproved: verified,
                kyc: { verified },
            });
            functions.logger.info(`Account ${account.id} updated. KYC verified=${verified}`);
            break;
        }
        // Cancelación de suscripción
        case 'customer.subscription.deleted': {
            const sub = event.data.object;
            const customerId = sub.customer || '';
            if (!customerId)
                break;
            await updateDriverByField('stripeCustomerId', customerId, {
                subscriptionActive: false,
                subscriptionId: null,
                subscriptionExpiration: new Date(0),
                membership: { status: types_1.DriverMembershipStatus.UNPAID },
            });
            functions.logger.info(`Subscription deleted for customer ${customerId}. Driver set to UNPAID.`);
            break;
        }
        // Eventos de pagos a viajes ya existentes
        case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object;
            console.log('PaymentIntent successful:', paymentIntent.id);
            // Find trip by paymentIntent.id and update its status if needed
            // Example: await updateTripStatusByPaymentIntent(paymentIntent.id, TripStatus.COMPLETED);
            break;
        }
        case 'payment_intent.payment_failed': {
            const paymentIntent = event.data.object;
            console.error('PaymentIntent failed:', paymentIntent.id);
            // Mark the trip as payment_failed
            await updateTripStatusByPaymentIntent(paymentIntent.id, types_1.TripStatus.PAYMENT_FAILED);
            // Log notification (e.g., send email to admin or passenger)
            functions.logger.warn(`Payment failed for PaymentIntent ${paymentIntent.id}. Trip status updated to PAYMENT_FAILED.`);
            break;
        }
        case 'charge.refunded': {
            const charge = event.data.object;
            console.log('Charge refunded:', charge.id);
            // Mark the trip as refunded
            await updateTripStatusByCharge(charge.id, types_1.TripStatus.REFUNDED);
            // Adjust data in Firestore (e.g., update fare details, balance)
            functions.logger.info(`Charge ${charge.id} refunded. Trip status updated to REFUNDED.`);
            break;
        }
        default:
            functions.logger.warn(`Unhandled event type: ${event.type}`);
    }
};
exports.handleStripeWebhook = handleStripeWebhook;
// Helper function to update trip status by payment intent ID
async function updateTripStatusByPaymentIntent(paymentIntentId, status) {
    const db = admin.firestore();
    const tripQuery = await db.collection('trips').where('payment.transactionId', '==', paymentIntentId).limit(1).get();
    if (!tripQuery.empty) {
        const tripRef = tripQuery.docs[0].ref;
        await tripRef.update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        functions.logger.info(`Trip ${tripRef.id} status updated to ${status} for PaymentIntent ${paymentIntentId}.`);
    }
    else {
        functions.logger.warn(`No trip found for PaymentIntent ${paymentIntentId} to update status to ${status}.`);
    }
}
// Helper function to update trip status by charge ID (for refunds)
async function updateTripStatusByCharge(chargeId, status) {
    const db = admin.firestore();
    // Assuming charge ID is also stored in payment.transactionId or a separate field
    // For simplicity, let's assume transactionId can be either PaymentIntent ID or Charge ID for now
    const tripQuery = await db.collection('trips').where('payment.transactionId', '==', chargeId).limit(1).get();
    if (!tripQuery.empty) {
        const tripRef = tripQuery.docs[0].ref;
        await tripRef.update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        functions.logger.info(`Trip ${tripRef.id} status updated to ${status} for Charge ${chargeId}.`);
    }
    else {
        functions.logger.warn(`No trip found for Charge ${chargeId} to update status to ${status}.`);
    }
}
// Helper to update a driver by a unique field (e.g., stripeCustomerId or stripeAccountId)
async function updateDriverByField(field, value, updates) {
    const db = admin.firestore();
    const snap = await db.collection('drivers').where(field, '==', value).limit(1).get();
    if (snap.empty) {
        functions.logger.warn(`No driver found for ${field}=${value}`);
        return;
    }
    const ref = snap.docs[0].ref;
    // Merge nested membership updates preserving structure
    await ref.set(updates, { merge: true });
}
//# sourceMappingURL=service.js.map