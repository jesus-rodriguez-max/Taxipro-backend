import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getStripe } from '../stripe/service';

interface CreatePassengerCustomerInput {
  userId: string;
  email?: string;
  name?: string;
}

/**
 * Crea un cliente de Stripe para el pasajero si no existe y lo guarda en Firestore.
 */
export const createPassengerCustomerCallable = onCall({ secrets: ['STRIPE_SECRET'] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }
  const { userId, email, name } = request.data as CreatePassengerCustomerInput;
  if (!userId) {
    throw new HttpsError('invalid-argument', 'Falta userId.');
  }
  if (request.auth.uid !== userId) {
    throw new HttpsError('permission-denied', 'No puedes operar sobre otro usuario.');
  }

  const db = admin.firestore();
  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();
  const userData = (userSnap.exists ? (userSnap.data() as any) : {}) || {};
  if (userData.stripeCustomerId) {
    return { stripeCustomerId: userData.stripeCustomerId, created: false };
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: email || userData.email,
    name: name || userData.name,
    metadata: { userId },
  });

  await userRef.set({ stripeCustomerId: customer.id }, { merge: true });

  return { stripeCustomerId: customer.id, created: true };
});
