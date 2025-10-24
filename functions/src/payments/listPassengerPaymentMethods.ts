import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getStripe } from '../stripe/service';

interface ListPassengerPaymentMethodsInput {
  userId: string;
}

export const listPassengerPaymentMethodsCallable = async (
  data: ListPassengerPaymentMethodsInput,
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
};
