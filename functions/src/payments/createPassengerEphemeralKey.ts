import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getStripe } from '../stripe/service';
import { STRIPE_API_VERSION } from '../config';

interface CreatePassengerEphemeralKeyInput {
  userId: string;
}

/**
 * Creates a Stripe Ephemeral Key for a passenger's customer to be used with PaymentSheet.
 * Returns the ephemeral key secret and the customerId.
 */
export const createPassengerEphemeralKeyCallable = onCall({ secrets: ['STRIPE_SECRET'] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }
  const { userId } = request.data as CreatePassengerEphemeralKeyInput;
  if (!userId) {
    throw new HttpsError('invalid-argument', 'Falta userId.');
  }
  if (request.auth.uid !== userId) {
    throw new HttpsError('permission-denied', 'No puedes operar sobre otro usuario.');
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
    { apiVersion: STRIPE_API_VERSION as any }
  );

  return { secret: eph.secret, customerId: stripeCustomerId };
});
