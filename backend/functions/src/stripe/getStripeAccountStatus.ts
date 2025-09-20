
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { stripe } from './service';
import * as admin from 'firebase-admin';

/**
 * Consulta y devuelve el estado de la cuenta de Stripe Connect de un conductor.
 */
export const getStripeAccountStatusCallable = onCall(async (request) => {
  const { auth } = request;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Autenticación requerida.');
  }

  const driverDoc = await admin.firestore().collection('drivers').doc(auth.uid).get();
  const accountId = driverDoc.data()?.stripeAccountId;

  if (!accountId) {
    throw new HttpsError('not-found', 'El conductor no tiene una cuenta de Stripe asociada.');
  }

  const account = await stripe.accounts.retrieve(accountId);

  // Devolvemos solo los campos relevantes para el cliente
  return {
    details_submitted: account.details_submitted,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
  };
});
