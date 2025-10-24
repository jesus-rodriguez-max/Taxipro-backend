import * as functions from 'firebase-functions';
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
export const createPassengerCustomerCallable = async (
  data: CreatePassengerCustomerInput,
  context: functions.https.CallableContext
) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }
  const { userId, email, name } = data || ({} as any);
  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'Falta userId.');
  }
  if (context.auth.uid !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'No puedes operar sobre otro usuario.');
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
};
