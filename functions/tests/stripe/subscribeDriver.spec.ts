import * as admin from 'firebase-admin';
import { subscribeDriverCallable } from '../../src/stripe/subscribeDriver';

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn(async () => ({ id: 'cus_123' })),
    },
    checkout: {
      sessions: {
        create: jest.fn(async () => ({ id: 'cs_test_123', url: 'https://checkout.stripe.com/test/cs_test_123' })),
      },
    },
  }));
});

describe('subscribeDriverCallable', () => {
  it('creates a Checkout session for weekly subscription', async () => {
    const driverId = 'driver_2';
    const driverRef = admin.firestore().collection('drivers').doc(driverId);
    await driverRef.set({ id: driverId, billingConsent: true });

    const res = await subscribeDriverCallable(
      { successUrl: 'https://example.com/success', cancelUrl: 'https://example.com/cancel' },
      { auth: { uid: driverId } } as any
    );

    expect(res.sessionId).toBe('cs_test_123');
    expect(res.url).toContain('https://checkout.stripe.com');

    const after = await driverRef.get();
    // Customer is created and saved for later webhooks
    expect(after.data()?.stripeCustomerId).toBeDefined();
  });

  it('rejects when billingConsent is false', async () => {
    const driverId = 'driver_no_consent';
    const driverRef = admin.firestore().collection('drivers').doc(driverId);
    await driverRef.set({ id: driverId, billingConsent: false });

    await expect(
      subscribeDriverCallable({ successUrl: 'https://example.com/s', cancelUrl: 'https://example.com/c' }, { auth: { uid: driverId } } as any)
    ).rejects.toThrow();
  });
});
