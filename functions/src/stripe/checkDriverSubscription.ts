import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { isDriverSubscriptionActive } from '../lib/subscription';

export const checkDriverSubscriptionCallable = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debe iniciar sesión.');
  }
  const driverId = request.auth.uid;
  const active = await isDriverSubscriptionActive(driverId);
  return { active };
});
