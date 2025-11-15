import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getStripe } from '../stripe/service';

interface ListPassengerPaymentMethodsInput {
  userId: string;
}

export const listPassengerPaymentMethodsCallable = onCall({ secrets: ['STRIPE_SECRET'] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }
  const { userId } = request.data as ListPassengerPaymentMethodsInput;
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
  const stripeCustomerId: string | undefined = userData.stripeCustomerId;
  const defaultPaymentMethodId: string | undefined = userData.defaultPaymentMethodId;
  if (!stripeCustomerId) {
    return { methods: [], defaultPaymentMethodId: null };
  }

  const stripe = getStripe();
  const list = await stripe.paymentMethods.list({ customer: stripeCustomerId, type: 'card', limit: 20 });
  const methods = list.data.map(pm => ({
    id: pm.id,
    brand: (pm.card && pm.card.brand) || 'card',
    last4: (pm.card && pm.card.last4) || '****',
    exp_month: pm.card?.exp_month,
    exp_year: pm.card?.exp_year,
  }));

  return { methods, defaultPaymentMethodId: defaultPaymentMethodId || null };
});
