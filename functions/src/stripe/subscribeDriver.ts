import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import Stripe from 'stripe';

interface SubscribeDriverData {
  successUrl?: string;
  cancelUrl?: string;
}

export const subscribeDriverCallable = async (data: SubscribeDriverData, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debe iniciar sesión');
  }
  const driverId = context.auth.uid;

  const driverRef = admin.firestore().collection('drivers').doc(driverId);
  const driverSnap = await driverRef.get();
  if (!driverSnap.exists) {
    throw new functions.https.HttpsError('failed-precondition', 'Solo los conductores pueden suscribirse');
  }
  const driver = driverSnap.data() as any;
  if (driver?.billingConsent !== true) {
    throw new functions.https.HttpsError('failed-precondition', 'Debe aceptar el consentimiento de cobro (billingConsent) antes de suscribirse');
  }

  const stripeSecret = functions.config().stripe?.secret;
  const priceId = functions.config().stripe?.weekly_price_id; // Precio recurrente semanal (149 MXN)
  if (!stripeSecret || !priceId) {
    throw new functions.https.HttpsError('failed-precondition', 'La configuración de Stripe no está completa');
  }
  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-04-10' });

  // Crear o reutilizar Customer de Stripe
  let stripeCustomerId: string | undefined = driver?.stripeCustomerId;
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
