import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getStripe } from '../stripe/service';
import { TripStatus } from '../constants/tripStatus';

interface CreatePassengerCheckoutInput {
  tripId: string;
  amount: number; // in MXN pesos
  driverStripeId: string; // Connected Account ID (acct_...)
  userId: string; // Passenger UID
}

/**
 * Creates a Stripe Checkout Session for a single trip payment paid by the passenger.
 * - mode: 'payment'
 * - payment_method_types: ['card']
 * - Routes funds to driver's connected account via payment_intent_data.transfer_data.destination
 *
 * Returns the session URL to redirect the passenger.
 */
export const createPassengerCheckoutSessionCallable = onCall({ secrets: ['STRIPE_SECRET'] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }

  const { tripId, amount, driverStripeId, userId } = request.data as CreatePassengerCheckoutInput;
  if (!tripId || !amount || !driverStripeId || !userId) {
    throw new HttpsError('invalid-argument', 'Faltan parámetros obligatorios: tripId, amount, driverStripeId, userId');
  }
  if (request.auth.uid !== userId) {
    throw new HttpsError('permission-denied', 'No puedes crear pago para otro usuario.');
  }

  const db = admin.firestore();
  const tripRef = db.collection('trips').doc(tripId);
  const tripSnap = await tripRef.get();
  if (!tripSnap.exists) {
    throw new HttpsError('not-found', 'El viaje no existe.');
  }
  const trip = tripSnap.data() as any;
  if (trip.passengerId !== userId) {
    throw new HttpsError('permission-denied', 'No eres el pasajero de este viaje.');
  }
  if (
    trip.status !== TripStatus.PENDING &&
    trip.status !== 'pending' &&
    trip.status !== TripStatus.ASSIGNED &&
    trip.status !== 'assigned'
  ) {
    throw new HttpsError('failed-precondition', 'Solo se puede pagar un viaje en estado pending o assigned.');
  }
  if (trip.paymentStatus === 'paid') {
    return { alreadyPaid: true, message: 'El viaje ya fue pagado.' };
  }
  if (trip.stripeSessionId && trip.checkoutUrl) {
    // Reusar sesión existente si ya está creada
    return { sessionId: trip.stripeSessionId, url: trip.checkoutUrl };
  }

  // Convertir a centavos (MXN)
  const amountInCents = Math.round(Number(amount) * 100);
  if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
    throw new HttpsError('invalid-argument', 'El monto es inválido.');
  }

  // Opcionales: customer de Stripe si existe para el usuario, y PM por defecto
  let customerId: string | undefined;
  let defaultPaymentMethodId: string | undefined;
  try {
    const userSnap = await db.collection('users').doc(userId).get();
    if (userSnap.exists) {
      const u = (userSnap.data() as any) || {};
      customerId = u.stripeCustomerId || undefined;
      defaultPaymentMethodId = u.defaultPaymentMethodId || undefined;
    }
  } catch {}

  // Success/cancel URL defaults (se puede mover a config si se define)
  const successUrl = 'https://taxipro.mx/pago-exitoso?session_id={CHECKOUT_SESSION_ID}';
  const cancelUrl = 'https://taxipro.mx/pago-cancelado';

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'mxn',
          product_data: { name: 'Pago de viaje TaxiPro' },
          unit_amount: amountInCents,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { tripId, userId },
    customer: customerId,
    payment_intent_data: Object.assign(
      {
        transfer_data: { destination: driverStripeId },
        metadata: { tripId, userId },
      },
      defaultPaymentMethodId ? { payment_method: defaultPaymentMethodId } : {}
    ),
  });

  await tripRef.set(
    {
      paymentStatus: 'in_checkout',
      paymentMethod: 'card',
      stripeSessionId: session.id,
      checkoutUrl: session.url,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { sessionId: session.id, url: session.url };
});
