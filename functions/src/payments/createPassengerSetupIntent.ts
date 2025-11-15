import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getStripe } from '../stripe/service';
import { STRIPE_SECRET } from '../config';

interface CreatePassengerSetupIntentInput {
  userId: string;
}

/**
 * Crea un SetupIntent para registrar tarjeta del pasajero.
 * Asegura que exista un stripeCustomerId para el usuario y regresa client_secret.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';

export const createPassengerSetupIntentCallable = onCall({ secrets: ['STRIPE_SECRET'] }, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
    }
    const { userId } = request.data as CreatePassengerSetupIntentInput;
    if (!userId) {
      throw new HttpsError('invalid-argument', 'Falta userId.');
    }
    if (request.auth.uid !== userId) {
      throw new HttpsError('permission-denied', 'No puedes operar sobre otro usuario.');
    }

    if (!STRIPE_SECRET || typeof STRIPE_SECRET !== 'string' || STRIPE_SECRET.trim().length < 5) {
      throw new HttpsError('failed-precondition', 'Stripe Secret no configurado.');
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

    functions.logger.info('SetupIntent creado', {
      userId,
      customerId: stripeCustomerId,
      setupIntentId: setupIntent.id,
    });

    return { clientSecret: setupIntent.client_secret, setupIntentId: setupIntent.id };
  } catch (err: any) {
    const code = (err?.code as string) || 'internal';
    const message = (err?.message as string) || 'No se pudo crear el SetupIntent.';
    functions.logger.error('Error en createPassengerSetupIntentCallable', { code, message, err });
    if (err instanceof HttpsError) {
      throw err;
    }
    throw new HttpsError(code === 'failed-precondition' ? 'failed-precondition' : 'internal', message);
  }
});
