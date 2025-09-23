import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import Stripe from 'stripe';

interface CreateDriverAccountData {
  refreshUrl?: string;
  returnUrl?: string;
  email?: string; // opcional, si se desea enviar a Stripe
}

export const createDriverAccountCallable = async (data: CreateDriverAccountData, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debe iniciar sesión.');
  }
  const driverId = context.auth.uid;

  const stripeSecret = functions.config().stripe?.secret;
  if (!stripeSecret) {
    throw new functions.https.HttpsError('failed-precondition', 'Stripe secret no configurado.');
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-04-10' });

  const driverRef = admin.firestore().collection('drivers').doc(driverId);
  const snap = await driverRef.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('failed-precondition', 'Solo los conductores pueden crear cuenta.');
  }

  const driverData = snap.data() || {} as any;
  let stripeAccountId: string | undefined = driverData.stripeAccountId;

  // Crear cuenta Connect Express si no existe
  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'MX',
      email: data?.email,
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { driverId },
    });
    stripeAccountId = account.id;
    await driverRef.update({ stripeAccountId });
  }

  const refreshUrl = data?.refreshUrl || functions.config().stripe?.onboarding_refresh_url || 'https://taxipro.mx/stripe/onboarding/retry';
  const returnUrl = data?.returnUrl || functions.config().stripe?.onboarding_return_url || 'https://taxipro.mx/stripe/onboarding/complete';

  // Crear Account Link para onboarding/KYC
  const link = await stripe.accountLinks.create({
    account: stripeAccountId!,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return { accountId: stripeAccountId, url: link.url };
};
