import { onCall } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

/**
 * Provides public configuration keys to the passenger app on startup.
 * This avoids hardcoding keys in the client application.
 */
export const getPassengerAppConfigCallable = onCall({ secrets: ['STRIPE_PUBLISHABLE_KEY', 'GOOGLE_API_KEY'] }, (request) => {
  // In Gen 2, secrets are accessed via process.env
  return {
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    googleApiKey: process.env.GOOGLE_API_KEY,
  };
});
// Alias sin sufijo para compatibilidad con el cliente
export const getPassengerAppConfig = getPassengerAppConfigCallable;

export const getPassengerProfile = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }

  const uid = request.auth.uid;
  const db = admin.firestore();
  const passRef = db.collection('passengers').doc(uid);
  let snap = await passRef.get();

  if (!snap.exists) {
    const email = (request.auth.token?.email as string) || null;
    await passRef.set({
      uid,
      email,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    snap = await passRef.get();
  }

  const data = (snap.data() as any) || {};
  const profile = {
    uid,
    email: data.email || null,
    name: data.name || data.displayName || null,
    status: data.status || null,
    stripeCustomerId: data.stripeCustomerId || null,
    defaultPaymentMethodId: data.defaultPaymentMethodId || null,
    termsAccepted: data.termsAccepted === true,
  } as any;

  return { error: false, profile } as any;
});
// Alias con sufijo por simetría
export const getPassengerProfileCallable = getPassengerProfile;
