import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import Stripe from 'stripe';
import { STRIPE_SECRET, STRIPE_ONBOARDING_REFRESH_URL, STRIPE_ONBOARDING_RETURN_URL } from '../config';

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

  const stripeSecret = STRIPE_SECRET;
  if (!stripeSecret) {
    throw new functions.https.HttpsError('failed-precondition', 'Stripe secret no configurado.');
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' as any });

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

  const refreshUrl = data?.refreshUrl || STRIPE_ONBOARDING_REFRESH_URL;
  const returnUrl = data?.returnUrl || STRIPE_ONBOARDING_RETURN_URL;

  // Crear Account Link para onboarding/KYC
  const link = await stripe.accountLinks.create({
    account: stripeAccountId!,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return { accountId: stripeAccountId, url: link.url };
};
