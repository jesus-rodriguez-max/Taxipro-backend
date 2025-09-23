import * as functions from 'firebase-functions';
import { isDriverSubscriptionActive } from '../lib/subscription';

export const checkDriverSubscriptionCallable = async (_data: unknown, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debe iniciar sesión.');
  }
  const driverId = context.auth.uid;
  const active = await isDriverSubscriptionActive(driverId);
  return { active };
};
