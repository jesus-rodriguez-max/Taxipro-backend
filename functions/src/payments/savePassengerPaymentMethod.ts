import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getStripe } from '../stripe/service';
import * as functions from 'firebase-functions';

interface SavePassengerPaymentMethodInput {
  userId: string;
  setupIntentId?: string;
  paymentMethodId?: string;
}

export const savePassengerPaymentMethodCallable = onCall({ secrets: ['STRIPE_SECRET'] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }
  const { userId, setupIntentId, paymentMethodId } = request.data as SavePassengerPaymentMethodInput;
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
  let stripeCustomerId: string | undefined = userData.stripeCustomerId;

  const stripe = getStripe();

  let pmId = paymentMethodId;
  if (!pmId && setupIntentId) {
    const si = await stripe.setupIntents.retrieve(setupIntentId);
    pmId = (si as any).payment_method as string | undefined;
    if (!stripeCustomerId) {
      stripeCustomerId = (si as any).customer as string | undefined;
    }
  }

  if (!pmId) {
    throw new HttpsError('invalid-argument', 'Falta paymentMethodId o setupIntentId.');
  }

  if (!stripeCustomerId) {
    throw new HttpsError('failed-precondition', 'El usuario no tiene stripeCustomerId.');
  }

  try {
    await stripe.paymentMethods.attach(pmId, { customer: stripeCustomerId });
  } catch {}

  try {
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: pmId },
    } as any);
  } catch {}

  await userRef.set({ stripeCustomerId, defaultPaymentMethodId: pmId }, { merge: true });
  functions.logger.info('Payment method saved', { userId, stripeCustomerId, paymentMethodId: pmId });
  return { saved: true, paymentMethodId: pmId, stripeCustomerId };
});
