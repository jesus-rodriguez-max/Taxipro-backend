import * as functions from 'firebase-functions';
import { STRIPE_PUBLISHABLE_KEY, GOOGLE_API_KEY } from './config';

let configInitialized = false;

/**
 * Provides public configuration keys to the passenger app on startup.
 * This avoids hardcoding keys in the client application.
 */
export const getPassengerAppConfig = functions.https.onCall((data, context) => {
  return {
    stripePublishableKey: STRIPE_PUBLISHABLE_KEY,
    googleApiKey: GOOGLE_API_KEY,
  };
});
