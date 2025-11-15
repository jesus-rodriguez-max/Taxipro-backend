import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getStripe } from './service';
import { STRIPE_ONBOARDING_REFRESH_URL, STRIPE_ONBOARDING_RETURN_URL } from '../config';

interface CreateDriverAccountData {
  refreshUrl?: string;
  returnUrl?: string;
  email?: string; // opcional, si se desea enviar a Stripe
}

export const createDriverAccountCallable = onCall({ secrets: ['STRIPE_SECRET'] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debe iniciar sesión.');
  }
  const driverId = request.auth.uid;
  const data = request.data as CreateDriverAccountData;

  const stripe = getStripe();

  const driverRef = admin.firestore().collection('drivers').doc(driverId);
  const snap = await driverRef.get();
  if (!snap.exists) {
    throw new HttpsError('failed-precondition', 'Solo los conductores pueden crear cuenta.');
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
});
