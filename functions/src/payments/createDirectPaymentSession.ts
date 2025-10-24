import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getStripe } from '../stripe/service';
import { TripStatus } from '../constants/tripStatus';

interface CreateDirectPaymentInput {
  tripId: string;
  amount: number; // MXN pesos
  driverId: string;
  userId: string; // passenger uid
}

/**
 * Creates a PaymentIntent on the platform account that routes funds to the driver's
 * connected account using transfer_data.destination. Returns clientSecret for PaymentSheet.
 */
export const createDirectPaymentSessionCallable = async (
  data: CreateDirectPaymentInput,
  context: functions.https.CallableContext
) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debe iniciar sesión.');
  }

  const { tripId, amount, driverId, userId } = data || ({} as any);
  if (!tripId || !amount || !driverId || !userId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Faltan parámetros obligatorios: tripId, amount, driverId, userId'
    );
  }
  if (context.auth.uid !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Usuario no autorizado.');
  }

  const db = admin.firestore();
  const tripRef = db.collection('trips').doc(tripId);
  const tripSnap = await tripRef.get();
  if (!tripSnap.exists) throw new functions.https.HttpsError('not-found', 'Viaje no existe');
  const trip = tripSnap.data() as any;
  if (trip.passengerId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'No eres pasajero de este viaje');
  }
  if (
    trip.status !== TripStatus.PENDING &&
    trip.status !== 'pending' &&
    trip.status !== TripStatus.ASSIGNED &&
    trip.status !== 'assigned'
  ) {
    throw new functions.https.HttpsError('failed-precondition', 'El viaje no está listo para pagar');
  }

  // Read driver's connect account securely from backend
  const driverSnap = await db.collection('drivers').doc(driverId).get();
  if (!driverSnap.exists) throw new functions.https.HttpsError('not-found', 'Conductor no existe');
  const driver = driverSnap.data() as any;
  const driverStripeId: string | undefined = driver?.stripeAccountId;
  if (!driverStripeId) {
    throw new functions.https.HttpsError('failed-precondition', 'Conductor no tiene cuenta Stripe conectada');
  }

  const amountInCents = Math.round(Number(amount) * 100);
  if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Monto inválido');
  }

  // Optionally use the customer's saved payment methods
  let stripeCustomerId: string | undefined;
  try {
    const userSnap = await db.collection('users').doc(userId).get();
    if (userSnap.exists) {
      stripeCustomerId = (userSnap.data() as any)?.stripeCustomerId;
    }
  } catch {}

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: 'mxn',
    automatic_payment_methods: { enabled: true },
    customer: stripeCustomerId,
    metadata: { tripId, userId, driverId },
    transfer_data: { destination: driverStripeId },
  });

  await tripRef.set(
    {
      paymentMethod: 'card',
      paymentStatus: 'requires_payment_method',
      stripePaymentId: paymentIntent.id,
      driverId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id };
};
