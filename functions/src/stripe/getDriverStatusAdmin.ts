import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

export const getDriverStatusAdminCallable = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debe iniciar sesión.');
  }
  const uid = request.auth.uid;
  const doc = await admin.firestore().collection('drivers').doc(uid).get();
  if (!doc.exists) {
    throw new HttpsError('not-found', 'Perfil de conductor no encontrado.');
  }
  const d = doc.data() || {} as any;
  const kyc = (d as any).kyc || {};
  const subscriptionActive = !!(d as any).subscriptionActive || !!((d as any).subscription?.active);
  const subscriptionExpiration = (d as any).subscriptionExpiration || (d as any).subscription?.expiresAt || null;
  let expirationIso: string | null = null;
  if (subscriptionExpiration) {
    try {
      if (typeof (subscriptionExpiration as any).toDate === 'function') {
        expirationIso = (subscriptionExpiration as any).toDate().toISOString();
      } else if (typeof subscriptionExpiration === 'string') {
        expirationIso = new Date(subscriptionExpiration).toISOString();
      } else if (typeof subscriptionExpiration === 'number') {
        expirationIso = new Date(subscriptionExpiration).toISOString();
      } else if (subscriptionExpiration instanceof Date) {
        expirationIso = subscriptionExpiration.toISOString();
      }
    } catch (_) {}
  }
  return {
    stripeAccountId: (d as any).stripeAccountId || null,
    kyc: { verified: !!kyc.verified },
    subscriptionActive,
    subscriptionExpiration: expirationIso,
  };
});
