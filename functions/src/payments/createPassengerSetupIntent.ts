import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getStripe } from '../stripe/service';

interface CreatePassengerSetupIntentInput {
  userId: string;
}

/**
 * Crea un SetupIntent para registrar tarjeta del pasajero.
 * Asegura que exista un stripeCustomerId para el usuario y regresa client_secret.
 */
export const createPassengerSetupIntentCallable = async (
  data: CreatePassengerSetupIntentInput,
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
  let stripeCustomerId = userSnap.exists ? (userSnap.data() as any)?.stripeCustomerId : undefined;

  const stripe = getStripe();
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({ metadata: { userId } });
    stripeCustomerId = customer.id;
    await userRef.set({ stripeCustomerId }, { merge: true });
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: stripeCustomerId,
    payment_method_types: ['card'],
    usage: 'off_session',
  } as any);

  return { clientSecret: setupIntent.client_secret, setupIntentId: setupIntent.id };
};
