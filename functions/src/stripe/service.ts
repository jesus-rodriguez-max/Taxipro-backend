import Stripe from 'stripe';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { TripStatus, DriverMembershipStatus } from '../lib/types';
import { STRIPE_SUBSCRIPTION_DAYS, STRIPE_SECRET, STRIPE_API_VERSION } from '../config';

// Variable para cachear la instancia de Stripe

let stripe: Stripe;

export const getStripe = () => {
  if (!stripe) {
    stripe = new Stripe(STRIPE_SECRET, { apiVersion: STRIPE_API_VERSION as any });
  }
  return stripe;
};

/**
 * Crea un PaymentIntent para un nuevo cobro.
 * @param {number} amount - El monto a cobrar en la unidad más pequeña (ej. centavos).
 * @param {string} currency - La moneda del cobro (ej. 'mxn').
 * @param {string} customerId - El ID de cliente de Stripe.
 * @param {string} paymentMethodId - El ID del método de pago de Stripe.
 * @returns {Promise<Stripe.PaymentIntent>} El PaymentIntent creado.
 */
export const createPaymentIntent = async (
  amount: number,
  currency: string,
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.PaymentIntent> => {
  return getStripe().paymentIntents.create({
    amount,
    currency,
    customer: customerId,
    payment_method: paymentMethodId,
    off_session: true, // Indica que el cliente no está presente en el flujo de pago
    confirm: true, // Intenta confirmar el pago inmediatamente
  });
};

/**
 * Gestiona los eventos recibidos desde el webhook de Stripe.
 * @param {Stripe.Event} event - El evento de Stripe.
 */
export const handleStripeWebhook = async (event: Stripe.Event) => {
  const db = admin.firestore();
  switch (event.type) {
    // Suscripción iniciada mediante Checkout
    case 'checkout.session.completed': {
      try {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta: any = (session.metadata || {}) as any;
        const tripId = meta.tripId as string | undefined;
        if (tripId) {
          // Passenger trip payment flow: mark trip as paid
          const tripRef = db.collection('trips').doc(tripId);
          await tripRef.set(
            {
              paymentStatus: 'paid',
              paymentMethod: 'card',
              stripeSessionId: session.id,
              paidAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            } as any,
            { merge: true }
          );
          functions.logger.info(`Trip ${tripId} marked as paid from Checkout session ${session.id}.`);
          break;
        }

        // Driver subscription activation flow (legacy behavior)
        const driverId = (session.client_reference_id as string) || '';
        if (!driverId) {
          functions.logger.warn('checkout.session.completed without client_reference_id');
          break;
        }
        const driverRef = db.collection('drivers').doc(driverId);
        const driverSnap = await driverRef.get();
        if (!driverSnap.exists) {
          functions.logger.warn(`Driver ${driverId} not found on checkout.session.completed`);
          break;
        }
        const driverData = driverSnap.data() as any;
        if (driverData?.subscriptionId === session.subscription) {
          functions.logger.warn(`Subscription ${session.subscription} already activated for driver ${driverId}.`);
          break;
        }
        if (driverData?.billingConsent !== true) {
          functions.logger.warn(`Driver ${driverId} has not accepted billingConsent. Skipping activation.`);
          break;
        }
        const subscriptionDays = STRIPE_SUBSCRIPTION_DAYS || 7;
        const expiresAt = new Date(Date.now() + subscriptionDays * 24 * 60 * 60 * 1000);
        await driverRef.set({
          stripeCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
          subscriptionId: typeof session.subscription === 'string' ? session.subscription : undefined,
          subscriptionActive: true,
          subscriptionExpiration: expiresAt,
          membership: {
            status: DriverMembershipStatus.ACTIVE,
            lastPaymentAttempt: admin.firestore.FieldValue.serverTimestamp(),
          },
        } as any, { merge: true });
        functions.logger.info(`Driver ${driverId} subscription activated via Checkout.`);
      } catch (error) {
        functions.logger.error('Error in checkout.session.completed:', error);
      }
      break;
    }

    // Falla de cobro de suscripción
    case 'invoice.payment_failed': {
      try {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = (invoice.customer as string) || '';
        if (!customerId) break;
        await updateDriverByField('stripeCustomerId', customerId, {
          subscriptionActive: false,
          membership: { status: DriverMembershipStatus.SUSPENDED, lastPaymentAttempt: admin.firestore.FieldValue.serverTimestamp() },
        });
        functions.logger.warn(`Invoice payment failed for customer ${customerId}. Driver suspended.`);
      } catch (error) {
        functions.logger.error('Error in invoice.payment_failed:', error);
      }
      break;
    }

    // Cuenta Connect actualizada (KYC / habilitaciones)
    case 'account.updated': {
      try {
        const account = event.data.object as Stripe.Account;
        const verified = !!account.charges_enabled && !!account.details_submitted;
        await updateDriverByField('stripeAccountId', account.id, {
          isApproved: verified,
          kyc: { verified },
        });
        functions.logger.info(`Account ${account.id} updated. KYC verified=${verified}`);
      } catch (error) {
        functions.logger.error('Error in account.updated:', error);
      }
      break;
    }

    // Cancelación de suscripción
    case 'customer.subscription.deleted': {
      try {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = (sub.customer as string) || '';
        if (!customerId) break;
        await updateDriverByField('stripeCustomerId', customerId, {
          subscriptionActive: false,
          subscriptionId: null,
          subscriptionExpiration: new Date(0),
          membership: { status: DriverMembershipStatus.UNPAID },
        });
        functions.logger.info(`Subscription deleted for customer ${customerId}. Driver set to UNPAID.`);
      } catch (error) {
        functions.logger.error('Error in customer.subscription.deleted:', error);
      }
      break;
    }

    case 'payment_intent.succeeded': {
      try {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const { tripId } = paymentIntent.metadata || {};
        if (tripId) {
          const tripRef = db.collection('trips').doc(tripId);
          // Guardar subcolección de pagos (idempotente)
          const paymentRef = tripRef.collection('payment').doc(paymentIntent.id);
          await paymentRef.set({
            status: 'succeeded',
            chargeId: paymentIntent.latest_charge,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });

          await tripRef.set({
            paymentStatus: 'paid',
            paymentMethod: 'card',
            stripePaymentId: paymentIntent.id,
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          } as any, { merge: true });
          functions.logger.info(`Trip ${tripId} payment recorded from PaymentIntent ${paymentIntent.id}.`);
        } else {
          functions.logger.warn('payment_intent.succeeded without tripId metadata');
        }
      } catch (error) {
        functions.logger.error('Error in payment_intent.succeeded:', error);
      }
      break;
    }
    case 'charge.succeeded': {
      try {
        const charge = event.data.object as Stripe.Charge;
        const piId = (charge.payment_intent as string) || '';
        if (!piId) {
          functions.logger.warn('charge.succeeded without payment_intent');
          break;
        }
        const stripe = getStripe();
        const pi = await stripe.paymentIntents.retrieve(piId);
        const tripId = (pi.metadata as any)?.tripId as string | undefined;
        if (tripId) {
          const db = admin.firestore();
          const tripRef = db.collection('trips').doc(tripId);
          await tripRef.collection('payment').doc(piId).set({
            status: 'succeeded',
            chargeId: charge.id,
            amount: charge.amount,
            currency: charge.currency,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          await tripRef.set({
            paymentStatus: 'paid',
            paymentMethod: 'card',
            stripePaymentId: piId,
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          } as any, { merge: true });
          functions.logger.info(`Trip ${tripId} marked paid from charge ${charge.id}.`);
        } else {
          functions.logger.warn('charge.succeeded but no tripId in PI metadata');
        }
      } catch (error) {
        functions.logger.error('Error in charge.succeeded:', error);
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      try {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const { tripId } = paymentIntent.metadata;
        if (tripId) {
          const paymentRef = db.collection('trips').doc(tripId).collection('payment').doc(paymentIntent.id);
          await paymentRef.update({ status: 'failed' });
          await db.collection('trips').doc(tripId).update({ status: TripStatus.PAYMENT_FAILED });
          functions.logger.error(`Pago fallido para el viaje ${tripId}.`);
        }
      } catch (error) {
        functions.logger.error('Error in payment_intent.payment_failed:', error);
      }
      break;
    }
    case 'charge.refunded': {
      try {
        const charge = event.data.object as Stripe.Charge;
        console.log('Charge refunded:', charge.id);
        // Mark the trip as refunded
        await updateTripStatusByCharge(charge.id, TripStatus.REFUNDED);
        // Adjust data in Firestore (e.g., update fare details, balance)
        functions.logger.info(`Charge ${charge.id} refunded. Trip status updated to REFUNDED.`);
      } catch (error) {
        functions.logger.error('Error in charge.refunded:', error);
      }
      break;
    }

    default:
      functions.logger.warn(`Unhandled event type: ${event.type}`);
  }
};

// Helper function to update trip status by payment intent ID
async function updateTripStatusByPaymentIntent(paymentIntentId: string, status: TripStatus) {
  const db = admin.firestore();
  const tripQuery = await db.collection('trips').where('payment.transactionId', '==', paymentIntentId).limit(1).get();
  if (!tripQuery.empty) {
    const tripRef = tripQuery.docs[0].ref;
    await tripRef.update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    functions.logger.info(`Trip ${tripRef.id} status updated to ${status} for PaymentIntent ${paymentIntentId}.`);
  } else {
    functions.logger.warn(`No trip found for PaymentIntent ${paymentIntentId} to update status to ${status}.`);
  }
}

// Helper function to update trip status by charge ID (for refunds)
async function updateTripStatusByCharge(chargeId: string, status: TripStatus) {
  const db = admin.firestore();
  const paymentQuery = await db.collectionGroup('payment').where('chargeId', '==', chargeId).limit(1).get();
  if (!paymentQuery.empty) {
    const tripRef = paymentQuery.docs[0].ref.parent.parent!;
    await tripRef.update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    functions.logger.info(`Trip ${tripRef.id} status updated to ${status} for Charge ${chargeId}.`);
  } else {
    functions.logger.warn(`No trip found for Charge ${chargeId} to update status to ${status}.`);
  }
}

// Helper to update a driver by a unique field (e.g., stripeCustomerId or stripeAccountId)
async function updateDriverByField(field: 'stripeCustomerId' | 'stripeAccountId', value: string, updates: any) {
  const db = admin.firestore();
  const snap = await db.collection('drivers').where(field, '==', value).limit(1).get();
  if (snap.empty) {
    functions.logger.warn(`No driver found for ${field}=${value}`);
    return;
  }
  const ref = snap.docs[0].ref;
  await ref.update(updates);
}