import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { getStripe } from './service';
import { STRIPE_SUBSCRIPTION_DAYS } from '../config';

interface FinalizeData {
  sessionId: string;
}

export const finalizeDriverSubscriptionFromSessionCallable = onCall({ secrets: ['STRIPE_SECRET'] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debe iniciar sesión.');
  }
  const uid = request.auth.uid;
  const { sessionId } = request.data as FinalizeData;
  if (!sessionId || !sessionId.trim()) {
    throw new HttpsError('invalid-argument', 'sessionId es requerido.');
  }

  const stripe = getStripe();

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId.trim());
    if (!session) {
      throw new HttpsError('not-found', 'Sesión no encontrada en Stripe.');
    }

    const clientRef = (session.client_reference_id as string) || '';
    if (!clientRef || clientRef !== uid) {
      throw new HttpsError('permission-denied', 'La sesión no corresponde a este usuario.');
    }

    // Validar estado de la sesión
    const paid = session.payment_status === 'paid';
    const complete = (session.status === 'complete' || session.status === 'open');
    if (!paid || !complete) {
      // Si aún no está pagada, no marcamos activa
      return { active: false, reason: 'unpaid_or_incomplete' };
    }

    const customerId = typeof session.customer === 'string' ? session.customer : undefined;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : undefined;

    // Calcular expiración desde la suscripción en Stripe si es posible
    let expiresAt: Date | null = null;
    if (subscriptionId) {
      try {
        const sub = (await stripe.subscriptions.retrieve(subscriptionId)) as Stripe.Subscription & { current_period_end?: number };
        if (sub.current_period_end) {
          expiresAt = new Date(sub.current_period_end * 1000);
        }
      } catch (e) {
        console.warn('[finalizeSubscription] No se pudo obtener subscription para periodo', e);
      }
    }
    if (!expiresAt) {
      const subscriptionDays = STRIPE_SUBSCRIPTION_DAYS || 7;
      expiresAt = new Date(Date.now() + subscriptionDays * 24 * 60 * 60 * 1000);
    }

    const driverRef = admin.firestore().collection('drivers').doc(uid);
    await driverRef.set({
      stripeCustomerId: customerId,
      subscriptionId: subscriptionId,
      subscriptionActive: true,
      subscriptionExpiration: expiresAt,
      membership: {
        status: 'ACTIVE',
        lastPaymentAttempt: admin.firestore.FieldValue.serverTimestamp(),
      },
    } as any, { merge: true });

    return {
      active: true,
      customerId,
      subscriptionId,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error: any) {
    console.error('[finalizeSubscription] Error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error?.message || 'Error al finalizar la suscripción.');
  }
});
