import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { stripe } from '../stripe/service';

/**
 * Crea un PaymentIntent de Stripe para un viaje específico.
 * @param {object} data - Datos de la llamada, debe contener `tripId`.
 * @param {functions.https.CallableContext} context - Contexto de la función.
 * @returns {Promise<{clientSecret: string}>} - El clientSecret del PaymentIntent.
 */
export const createPaymentIntentCallable = async (data: any, context: functions.https.CallableContext) => {
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

  const tripData = tripDoc.data()!;

  if (tripData.passengerId !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'No tienes permiso para pagar este viaje.');
  }

  const amount = Math.round(tripData.fare.total * 100); // Stripe requiere el monto en centavos

  try {
    const paymentIntent = await stripe.paymentIntents.create({
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
  } catch (error: any) {
    console.error('Error al crear el PaymentIntent:', error);
    throw new functions.https.HttpsError('internal', 'No se pudo crear la intención de pago.', error.message);
  }
};
