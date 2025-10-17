import * as admin from 'firebase-admin';
import { createPassengerCheckoutSessionCallable } from '../../src/payments/createPassengerCheckoutSession';

// Mock Stripe SDK for this test file
const createMock = jest.fn(async (_args: any) => ({ id: 'cs_test_trip_1', url: 'https://checkout.stripe.com/test/cs_test_trip_1' }));
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: createMock } },
  }));
});

describe('createPassengerCheckoutSessionCallable', () => {
  it('creates a Checkout Session with transfer_data.destination and stores session in trip', async () => {
    const db = admin.firestore();

    const userId = 'user_1';
    const driverStripeId = 'acct_123456789';

    await db.collection('users').doc(userId).set({ stripeCustomerId: 'cus_abc' });

    const tripId = 'trip_pay_1';
    await db.collection('trips').doc(tripId).set({
      passengerId: userId,
      status: 'pending',
      fare: { total: 150, currency: 'mxn' },
      payment: { method: 'cash', isSettledToDriver: false },
      createdAt: new Date(),
      updatedAt: new Date(),
      audit: { lastActor: 'passenger', lastAction: 'requestTrip' },
    });

    const res = await createPassengerCheckoutSessionCallable(
      { tripId, amount: 150, driverStripeId, userId },
      { auth: { uid: userId } } as any
    );

    expect(res.sessionId).toBe('cs_test_trip_1');
    expect(res.url).toContain('https://checkout.stripe.com');

    const after = await db.collection('trips').doc(tripId).get();
    const data = after.data() as any;
    expect(data.stripeSessionId).toBe('cs_test_trip_1');
    expect(typeof data.checkoutUrl).toBe('string');

    // Assert transfer_data.destination was set
    const lastCallArgs = createMock.mock.calls[0][0];
    expect(lastCallArgs.payment_intent_data.transfer_data.destination).toBe(driverStripeId);
    expect(lastCallArgs.metadata.tripId).toBe(tripId);
    expect(lastCallArgs.metadata.userId).toBe(userId);
  });

  it('rejects when trip is not pending', async () => {
    const db = admin.firestore();

    const userId = 'user_2';
    const driverStripeId = 'acct_zzzz';
    const tripId = 'trip_not_pending';

    await db.collection('trips').doc(tripId).set({
      passengerId: userId,
      status: 'active',
      payment: { method: 'cash', isSettledToDriver: false },
      createdAt: new Date(),
      updatedAt: new Date(),
      audit: { lastActor: 'passenger', lastAction: 'requestTrip' },
    });

    await expect(
      createPassengerCheckoutSessionCallable(
        { tripId, amount: 100, driverStripeId, userId },
        { auth: { uid: userId } } as any
      )
    ).rejects.toBeDefined();
  });
});
