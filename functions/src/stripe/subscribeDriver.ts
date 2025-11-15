import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getStripe } from './service';
import { STRIPE_WEEKLY_PRICE_ID } from '../config';

interface SubscribeDriverData {
  successUrl?: string;
  cancelUrl?: string;
}

export const subscribeDriverCallable = onCall({ secrets: ['STRIPE_SECRET'] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debe iniciar sesión');
  }
  const driverId = request.auth.uid;
  const data = request.data as SubscribeDriverData;

  const driverRef = admin.firestore().collection('drivers').doc(driverId);
  const driverSnap = await driverRef.get();
  if (!driverSnap.exists) {
    throw new HttpsError('failed-precondition', 'Solo los conductores pueden suscribirse');
  }
  const driver = driverSnap.data() as any;
  if (driver?.billingConsent !== true) {
    throw new HttpsError('failed-precondition', 'Debe aceptar el consentimiento de cobro (billingConsent) antes de suscribirse');
  }

  const priceId = STRIPE_WEEKLY_PRICE_ID; // Precio recurrente semanal (149 MXN)
  if (!priceId) {
    throw new HttpsError('failed-precondition', 'La configuración de Stripe no está completa');
  }
  const stripe = getStripe();

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
});
