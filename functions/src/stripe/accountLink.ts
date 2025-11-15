import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getStripe } from './service';
import { STRIPE_ONBOARDING_RETURN_URL, STRIPE_ONBOARDING_REFRESH_URL } from '../config';

/**
 * Creates a Stripe Express account for a driver and returns an onboarding link.
 */
export const createStripeAccountLink = onCall({ secrets: ['STRIPE_SECRET'] }, async (request) => {
  // 1. Check for authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in to create a Stripe account.');
  }
  const uid = request.auth.uid;
  const data = request.data;
  const driverRef = admin.firestore().collection('drivers').doc(uid);

  try {
    const stripe = getStripe();

    const driverDoc = await driverRef.get();
    if (!driverDoc.exists) {
      throw new HttpsError('not-found', 'Driver profile not found.');
    }

    let accountId = driverDoc.data()?.stripeAccountId;

    // 2. Create a Stripe account if it doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: request.auth.token.email || undefined,
        country: 'MX', // Assuming Mexico, configure as needed
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      // 3. Save the account ID to the driver's profile
      await driverRef.update({ stripeAccountId: accountId });
    }

    // 4. Create an account link for onboarding
    const returnUrl = data.returnUrl || STRIPE_ONBOARDING_RETURN_URL;
    const refreshUrl = data.refreshUrl || STRIPE_ONBOARDING_REFRESH_URL;

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    // 5. Return the link URL to the client
    return { url: accountLink.url };

  } catch (error) {
    console.error('Error creating Stripe account link:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'An unexpected error occurred while creating the Stripe link.');
  }
});
