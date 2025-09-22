import Stripe from 'stripe';
import * as functions from 'firebase-functions';
import *s admin from 'firebase-admin';
import { TripStatus } from '../lib/types';

// Mock functions.config() for testing purposes if not already mocked globally
if (process.env.NODE_ENV === 'test') {
  functions.config = jest.fn(() => ({
    stripe: {
      secret: 'sk_test_mock_secret',
    },
  }));
}

// Inicializa el cliente de Stripe con la clave secreta obtenida de forma segura
// desde la configuración de entorno de Firebase.
export const stripe = new Stripe(functions.config().stripe.secret, {
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
export const createPaymentIntent = async (
  amount: number,
  currency: string,
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.PaymentIntent> => {
  return stripe.paymentIntents.create({
    amount,
    currency,
    customer: customerId,
    payment_method: paymentMethodId,
    off_session: true, // Indica que el cliente no está presente en el flujo de pago
    confirm: true, // Intenta confirmar el pago inmediatamente
  });
};

/**
 * Gestiona los eventos recibidos desde el webhook de Stripe.
 * @param {Stripe.Event} event - El evento de Stripe.
 */
export const handleStripeWebhook = async (event: Stripe.Event) => {
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('PaymentIntent successful:', paymentIntent.id);
      // Find trip by paymentIntent.id and update its status if needed
      // Example: await updateTripStatusByPaymentIntent(paymentIntent.id, TripStatus.COMPLETED);
      break;
    }
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.error('PaymentIntent failed:', paymentIntent.id);
      // Mark the trip as payment_failed
      await updateTripStatusByPaymentIntent(paymentIntent.id, TripStatus.PAYMENT_FAILED);
      // Log notification (e.g., send email to admin or passenger)
      functions.logger.warn(`Payment failed for PaymentIntent ${paymentIntent.id}. Trip status updated to PAYMENT_FAILED.`);
      break;
    }
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      console.log('Charge refunded:', charge.id);
      // Mark the trip as refunded
      await updateTripStatusByCharge(charge.id, TripStatus.REFUNDED);
      // Adjust data in Firestore (e.g., update fare details, balance)
      functions.logger.info(`Charge ${charge.id} refunded. Trip status updated to REFUNDED.`);
      break;
    }
    default:
      console.warn(`Unhandled event type: ${event.type}`);
  }
};

// Helper function to update trip status by payment intent ID
async function updateTripStatusByPaymentIntent(paymentIntentId: string, status: TripStatus) {
  const db = admin.firestore();
  const tripQuery = await db.collection('trips').where('payment.transactionId', '==', paymentIntentId).limit(1).get();
  if (!tripQuery.empty) {
    const tripRef = tripQuery.docs[0].ref;
    await tripRef.update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    functions.logger.info(`Trip ${tripRef.id} status updated to ${status} for PaymentIntent ${paymentIntentId}.`);
  } else {
    functions.logger.warn(`No trip found for PaymentIntent ${paymentIntentId} to update status to ${status}.`);
  }
}

// Helper function to update trip status by charge ID (for refunds)
async function updateTripStatusByCharge(chargeId: string, status: TripStatus) {
  const db = admin.firestore();
  // Assuming charge ID is also stored in payment.transactionId or a separate field
  // For simplicity, let's assume transactionId can be either PaymentIntent ID or Charge ID for now
  const tripQuery = await db.collection('trips').where('payment.transactionId', '==', chargeId).limit(1).get();
  if (!tripQuery.empty) {
    const tripRef = tripQuery.docs[0].ref;
    await tripRef.update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    functions.logger.info(`Trip ${tripRef.id} status updated to ${status} for Charge ${chargeId}.`);
  } else {
    functions.logger.warn(`No trip found for Charge ${chargeId} to update status to ${status}.`);
  }
}