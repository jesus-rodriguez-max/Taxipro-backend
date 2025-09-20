
import * as admin from 'firebase-admin';
import { stripe, handleStripeEvent } from '../src/stripe/service';
import { DriverMembershipStatus } from '../src/lib/types';

// Mockear el SDK de Firebase Admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: () => ({
    collection: (collectionName: string) => ({
      where: (field: string, op: any, value: string) => ({
        limit: (num: number) => ({
          get: jest.fn().mockResolvedValue({
            empty: false,
            docs: [
              {
                ref: {
                  update: jest.fn().mockResolvedValue(true),
                },
              },
            ],
          }),
        }),
      }),
    }),
  }),
}));

// Mockear el SDK de Stripe
jest.mock('../src/stripe/service', () => ({
  ...jest.requireActual('../src/stripe/service'),
  stripe: {
    accounts: {
      create: jest.fn().mockResolvedValue({ id: 'acct_123' }),
      retrieve: jest.fn().mockResolvedValue({ charges_enabled: true }),
    },
    accountLinks: {
      create: jest.fn().mockResolvedValue({ url: 'https://connect.stripe.com/onboard' }),
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({ id: 'sub_123', status: 'active' }),
    },
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_123' }),
    },
  },
}));

describe('Stripe Integration Logic', () => {

  it('Webhook invoice.paid debe activar la membresía del conductor', async () => {
    const mockEvent: any = {
      type: 'invoice.paid',
      data: { object: { customer: 'cus_123' } },
    };

    await handleStripeEvent(mockEvent);
    const db = admin.firestore();
    const driverRef = (await db.collection('drivers').where('stripeCustomerId', '==', 'cus_123').limit(1).get()).docs[0].ref;

    expect(driverRef.update).toHaveBeenCalledWith({ 'membership.status': DriverMembershipStatus.ACTIVE });
  });

  it('Webhook invoice.payment_failed debe suspender la membresía', async () => {
    const mockEvent: any = {
      type: 'invoice.payment_failed',
      data: { object: { customer: 'cus_123' } },
    };

    await handleStripeEvent(mockEvent);
    const db = admin.firestore();
    const driverRef = (await db.collection('drivers').where('stripeCustomerId', '==', 'cus_123').limit(1).get()).docs[0].ref;

    expect(driverRef.update).toHaveBeenCalledWith({ 'membership.status': DriverMembershipStatus.SUSPENDED });
  });

  it('Webhook customer.subscription.deleted debe suspender la membresía', async () => {
    const mockEvent: any = {
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_123' } },
    };

    await handleStripeEvent(mockEvent);
    const db = admin.firestore();
    const driverRef = (await db.collection('drivers').where('stripeCustomerId', '==', 'cus_123').limit(1).get()).docs[0].ref;

    expect(driverRef.update).toHaveBeenCalledWith({
      stripeSubscriptionStatus: 'deleted',
      'membership.status': DriverMembershipStatus.SUSPENDED,
    });
  });
});

// Para la prueba de `acceptTrip`, necesitamos verificar que la función `isDriverSubscriptionActive` se llame.
// Esta función ya existe en `backend/functions/src/lib/subscription.js` y es usada por `acceptTrip`.
// La prueba de `acceptTrip` que falla por no estar autenticado indirectamente prueba que la seguridad se aplica antes de llegar a esta lógica.
// Una prueba más profunda requeriría mockear `isDriverSubscriptionActive` para que devuelva `false` y asegurar que `acceptTrip` arroje `permission-denied`.
