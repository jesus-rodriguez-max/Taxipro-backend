import Stripe from 'stripe';
import * as admin from 'firebase-admin';
import { DriverMembershipStatus } from '../lib/types';

// Inicializa el cliente de Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10',
  typescript: true,
});

/**
 * Procesa los eventos de webhook de Stripe y actualiza Firestore.
 */
export const handleStripeEvent = async (event: Stripe.Event) => {
  const db = admin.firestore();

  switch (event.type) {
    // Evento: La suscripción se actualizó (ej. cambió de estado)
    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const subscription = event.data.object as Stripe.Subscription;
      const driver = await findDriverByCustomerId(db, subscription.customer as string);
      if (driver) {
        await driver.ref.update({
          stripeSubscriptionId: subscription.id,
          stripeSubscriptionStatus: subscription.status,
          'membership.status': subscription.status === 'active' ? DriverMembershipStatus.ACTIVE : DriverMembershipStatus.GRACE_PERIOD,
        });
      }
      break;
    }

    // Evento: La suscripción fue cancelada
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const driver = await findDriverByCustomerId(db, subscription.customer as string);
      if (driver) {
        await driver.ref.update({
          stripeSubscriptionStatus: 'deleted',
          'membership.status': DriverMembershipStatus.SUSPENDED,
        });
      }
      break;
    }

    // Evento: Una factura se pagó correctamente
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const driver = await findDriverByCustomerId(db, invoice.customer as string);
      if (driver) {
        await driver.ref.update({ 'membership.status': DriverMembershipStatus.ACTIVE });
      }
      break;
    }

    // Evento: Falló el pago de una factura
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const driver = await findDriverByCustomerId(db, invoice.customer as string);
      if (driver) {
        // Si el reintento de pago falla, se mueve a suspendido
        await driver.ref.update({ 'membership.status': DriverMembershipStatus.SUSPENDED });
      }
      break;
    }

    // Evento: Una cuenta de Connect fue actualizada
    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      const driverQuery = await db.collection('drivers').where('stripeAccountId', '==', account.id).limit(1).get();
      if (!driverQuery.empty) {
        const driverRef = driverQuery.docs[0].ref;
        await driverRef.update({ 
          stripeChargesEnabled: account.charges_enabled,
          stripeDetailsSubmitted: account.details_submitted,
        });
      }
      break;
    }

    default:
      console.log(`Webhook no manejado: ${event.type}`);
  }
};

// Helper para encontrar un chofer por su ID de cliente de Stripe
async function findDriverByCustomerId(db: admin.firestore.Firestore, customerId: string) {
  const query = await db.collection('drivers').where('stripeCustomerId', '==', customerId).limit(1).get();
  if (!query.empty) {
    return query.docs[0];
  }
  return null;
}