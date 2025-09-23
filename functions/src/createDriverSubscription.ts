import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// This callable creates a Stripe Checkout session for a driver to start their weekly subscription.
// It assumes that the Stripe secret key and the price ID for the weekly subscription are set in
// Firebase functions config under stripe.secret and stripe.weekly_price_id. Drivers must be
// authenticated to call this function.
export const createDriverSubscriptionSessionCallable = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debe iniciar sesión');
  }
  const userId = context.auth.uid;

  // Verify that the caller is a driver
  const driverRef = admin.firestore().collection('drivers').doc(userId);
  const driverSnap = await driverRef.get();
  if (!driverSnap.exists) {
    throw new functions.https.HttpsError('failed-precondition', 'Solo los conductores pueden suscribirse');
  }

  // Load Stripe configuration
  const stripeSecret = functions.config().stripe?.secret;
  const priceId = functions.config().stripe?.weekly_price_id;
  if (!stripeSecret || !priceId) {
    throw new functions.https.HttpsError('failed-precondition', 'La configuración de Stripe no está completa');
  }
  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-04-10' });

  // Optional success and cancel URLs can be passed from the client
  const successUrl = data?.successUrl ?? 'https://taxipro.mx/suscripcion-exitosa?session_id={CHECKOUT_SESSION_ID}';
  const cancelUrl = data?.cancelUrl ?? 'https://taxipro.mx/suscripcion-cancelada';

  // Create a new checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [ { price: priceId, quantity: 1 } ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
  });

  return { sessionId: session.id, url: session.url };
});
