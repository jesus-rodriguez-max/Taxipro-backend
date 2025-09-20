
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { stripe } from './service';
import { Driver } from '../lib/types';

/**
 * Crea una cuenta de Stripe Connect Standard y genera un enlace de onboarding.
 */
export const createStripeAccountLinkCallable = onCall(async (request) => {
  const { auth } = request;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Autenticación requerida.');
  }

  const driverRef = admin.firestore().collection('drivers').doc(auth.uid);
  const driverDoc = await driverRef.get();
  const driver = driverDoc.data() as Driver;

  let accountId = driver.stripeAccountId;

  // 1. Crea la cuenta de Stripe si no existe
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'standard',
      email: auth.token.email,
    });
    accountId = account.id;
    await driverRef.update({ stripeAccountId: accountId });
  }

  // 2. Crea el enlace de onboarding
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `https://taxipro.app/reauth`, // URL a la que volver si el enlace expira
    return_url: `https://taxipro.app/onboarding-success`, // URL a la que volver al completar
    type: 'account_onboarding',
  });

  return { url: accountLink.url };
});
