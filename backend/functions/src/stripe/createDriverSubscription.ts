
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { stripe } from './service';

interface CreateSubscriptionData {
  paymentMethodId: string;
}

/**
 * Crea la suscripción semanal para un conductor.
 */
export const createDriverSubscriptionCallable = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Autenticación requerida.');
  }

  const { paymentMethodId } = data as CreateSubscriptionData;
  const driverId = auth.uid;
  const email = auth.token.email || '';

  const priceId = process.env.STRIPE_WEEKLY_PRICE_ID;
  if (!priceId) {
    throw new HttpsError('internal', 'El ID del precio de la suscripción no está configurado en el servidor.');
  }

  // 1. Crear un cliente de Stripe para el conductor
  const customer = await stripe.customers.create({ email, payment_method: paymentMethodId, invoice_settings: { default_payment_method: paymentMethodId } });

  // 2. Crear la suscripción
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId }],
    expand: ['latest_invoice.payment_intent'],
  });

  // 3. Guardar los IDs en Firestore
  const driverRef = admin.firestore().collection('drivers').doc(driverId);
  await driverRef.update({
    stripeCustomerId: customer.id,
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionStatus: subscription.status,
  });

  return { subscriptionId: subscription.id, status: subscription.status };
});
