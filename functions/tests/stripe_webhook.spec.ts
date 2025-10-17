import * as admin from 'firebase-admin';
import { TripStatus } from '../src/constants/tripStatus';
import { handleStripeWebhook } from '../src/stripe/service';

describe('Stripe Webhook', () => {
  beforeAll(() => {
    try { admin.initializeApp(); } catch {}
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle a valid event via handler (no throw)', async () => {
    const db = admin.firestore();
    await db.collection('trips').doc('trip_for_succeeded').set({ status: TripStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date() });
    const event = {
      id: 'evt_test',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test', amount: 2000, currency: 'mxn', metadata: { tripId: 'trip_for_succeeded' } } },
    } as any;
    await handleStripeWebhook(event);
    const doc = await db.collection('trips').doc('trip_for_succeeded').get();
    expect(doc.exists).toBe(true);
  });

  it('should ignore unhandled event types without throwing', async () => {
    const event = { id: 'evt_unknown', type: 'unknown.event', data: { object: {} } } as any;
    await handleStripeWebhook(event);
  });

  it('✅ payment_failed → el viaje cambia a PAYMENT_FAILED', async () => {
    const paymentIntentId = 'pi_failed_test';
    const mockEvent = {
      id: 'evt_test_failed',
      type: 'payment_intent.payment_failed',
      data: { object: { id: paymentIntentId, amount: 1000, currency: 'mxn', metadata: { tripId: 'trip_for_failed' } } },
    } as any;

    // Prepare a trip with matching transactionId
    const db = admin.firestore();
    const tripRef = db.collection('trips').doc('trip_for_failed');
    await tripRef.set({ payment: { transactionId: paymentIntentId, method: 'stripe', isSettledToDriver: false }, status: TripStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date() });

    await handleStripeWebhook(mockEvent);

    const updatedDoc = await tripRef.get();
    expect(updatedDoc.data()?.status).toBe(TripStatus.PAYMENT_FAILED);
    expect(updatedDoc.data()?.updatedAt).toBeDefined();
  });

  it('✅ charge.refunded → el viaje cambia a REFUNDED', async () => {
    const chargeId = 'ch_refunded_test';
    const mockEvent = {
      id: 'evt_refunded',
      type: 'charge.refunded',
      data: { object: { id: chargeId, amount: 500, currency: 'mxn' } },
    } as any;

    // Prepare a trip with matching transactionId
    const db = admin.firestore();
    const tripRef = db.collection('trips').doc('trip_for_refund');
    await tripRef.set({ status: TripStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date() });
    const paymentRef = tripRef.collection('payment').doc('payment_123');
    await paymentRef.set({ chargeId: chargeId, method: 'stripe', isSettledToDriver: false });

    await handleStripeWebhook(mockEvent);

    const updatedDoc = await tripRef.get();
    expect(updatedDoc.data()?.status).toBe(TripStatus.REFUNDED);
    expect(updatedDoc.data()?.updatedAt).toBeDefined();
  });
});