import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { STRIPE_SECRET, STRIPE_SUBSCRIPTION_DAYS } from '../config';

export const syncDriverSubscriptionStatusCallable = async (_data: unknown, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debe iniciar sesión.');
  }
  const uid = context.auth.uid;

  const stripeSecret = STRIPE_SECRET;
  if (!stripeSecret) {
    throw new functions.https.HttpsError('failed-precondition', 'Stripe secret no configurado.');
  }
  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' as any });

  try {
    // Obtener la suscripción más reciente del cliente asociado al driver
    const driverRef = admin.firestore().collection('drivers').doc(uid);
    const driver = await driverRef.get();
    const customerId = (driver.data() as any)?.stripeCustomerId as string | undefined;

    let subscriptionId: string | undefined;
    let status: string | undefined;
    let expiresAt: Date | undefined;

    if (customerId) {
      const subs = await stripe.subscriptions.list({ limit: 10, status: 'all', customer: customerId });
      const latest = subs.data
        .sort((a, b) => (b.created || 0) - (a.created || 0))[0] as (Stripe.Subscription & { current_period_end?: number }) | undefined;
      if (latest) {
        subscriptionId = latest.id;
        status = latest.status;
        if (latest.current_period_end) {
          expiresAt = new Date(latest.current_period_end * 1000);
        }
      }
    } else {
      // Fallback: buscar sesiones de checkout del usuario si no hay customer guardado
      const sessions = await stripe.checkout.sessions.list({ limit: 20 });
      const ownSessions = sessions.data
        .filter(s => (s.client_reference_id as string) === uid)
        .filter(s => s.mode === 'subscription' && s.payment_status === 'paid' && !!s.subscription);
      if (ownSessions.length > 0) {
        const latest = ownSessions.sort((a, b) => (b.created || 0) - (a.created || 0))[0];
        subscriptionId = typeof latest.subscription === 'string' ? latest.subscription : undefined;
        if (subscriptionId) {
          const sub = (await stripe.subscriptions.retrieve(subscriptionId)) as Stripe.Subscription & { current_period_end?: number };
          status = sub.status;
          if (sub.current_period_end) {
            expiresAt = new Date(sub.current_period_end * 1000);
          }
        }
      }
    }

    const isActive = status === 'active' || status === 'trialing';
    if (!expiresAt) {
      const subscriptionDays = STRIPE_SUBSCRIPTION_DAYS;
      expiresAt = new Date(Date.now() + subscriptionDays * 24 * 60 * 60 * 1000);
    }

    await admin.firestore().collection('drivers').doc(uid).set({
      subscriptionActive: isActive,
      subscriptionId: subscriptionId || null,
      subscriptionStatus: status || null,
      subscriptionExpiration: expiresAt,
      membership: {
        status: isActive ? 'ACTIVE' : 'SUSPENDED',
        lastPaymentAttempt: admin.firestore.FieldValue.serverTimestamp(),
      },
    } as any, { merge: true });

    return {
      active: isActive,
      subscriptionId,
      status,
      expiresAt: expiresAt?.toISOString(),
    };
  } catch (error: any) {
    console.error('[syncSubscription] Error:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', error?.message || 'Error al sincronizar la suscripción.');
  }
};
