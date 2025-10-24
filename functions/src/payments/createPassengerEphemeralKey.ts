import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getStripe } from '../stripe/service';

interface CreatePassengerEphemeralKeyInput {
  userId: string;
}

/**
 * Creates a Stripe Ephemeral Key for a passenger's customer to be used with PaymentSheet.
 * Returns the ephemeral key secret and the customerId.
 */
export const createPassengerEphemeralKeyCallable = async (
  data: CreatePassengerEphemeralKeyInput,
  context: functions.https.CallableContext
) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }
  const { userId } = data || ({} as any);
  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'Falta userId.');
  }
  if (context.auth.uid !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'No puedes operar sobre otro usuario.');
  }

  const db = admin.firestore();
  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();
  let stripeCustomerId: string | undefined = userSnap.exists ? (userSnap.data() as any)?.stripeCustomerId : undefined;

  const stripe = getStripe();
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({ metadata: { userId } });
    stripeCustomerId = customer.id;
    await userRef.set({ stripeCustomerId }, { merge: true });
  }

  // Stripe requires apiVersion when creating ephemeral keys
  const eph = await stripe.ephemeralKeys.create(
    { customer: stripeCustomerId },
    { apiVersion: '2024-06-20' as any }
  );

  return { secret: eph.secret, customerId: stripeCustomerId };
};
