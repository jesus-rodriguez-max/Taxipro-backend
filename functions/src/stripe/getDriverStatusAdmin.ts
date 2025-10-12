import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const getDriverStatusAdminCallable = async (_data: unknown, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debe iniciar sesión.');
  }
  const uid = context.auth.uid;
  const doc = await admin.firestore().collection('drivers').doc(uid).get();
  if (!doc.exists) {
    throw new functions.https.HttpsError('not-found', 'Perfil de conductor no encontrado.');
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
};
