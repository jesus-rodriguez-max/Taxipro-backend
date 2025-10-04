import { stripeWebhook } from '../src/stripe/webhook';
import * as functions from 'firebase-functions';
import Stripe from 'stripe';
import * as serviceModule from '../src/stripe/service';
import * as admin from 'firebase-admin';
import { TripStatus } from '../src/constants/tripStatus';

describe('Stripe Webhook', () => {
  beforeAll(() => {
    try { admin.initializeApp(); } catch {}
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle a valid event', async () => {
    const mockEvent = {
      id: 'evt_test',
      object: 'event',
      api_version: '2020-08-27',
      created: 1620000000,
      livemode: false,
      pending_webhooks: 0,
      request: { id: 'req_test', idempotency_key: null },
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test', amount: 2000, currency: 'usd', metadata: { tripId: 'trip_for_succeeded' } } },
    } as unknown as Stripe.Event;

    const fakeStripe = { webhooks: { constructEvent: jest.fn().mockReturnValue(mockEvent) } } as unknown as Stripe;
    jest.spyOn(serviceModule, 'getStripe').mockReturnValue(fakeStripe as any);

    const req = { headers: { 'stripe-signature': 'test_signature' }, rawBody: Buffer.from(JSON.stringify(mockEvent)) } as unknown as functions.https.Request;
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() } as unknown as functions.Response;

    await stripeWebhook(req, res);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('should handle an invalid signature', async () => {
    const fakeStripe = { webhooks: { constructEvent: jest.fn(() => { throw new Error('Invalid signature'); }) } } as unknown as Stripe;
    jest.spyOn(serviceModule, 'getStripe').mockReturnValue(fakeStripe as any);

    const req = { headers: { 'stripe-signature': 'invalid_signature' }, rawBody: Buffer.from(JSON.stringify({})) } as unknown as functions.https.Request;
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() } as unknown as functions.Response;

    await stripeWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Webhook Error: Invalid signature');
  });

  it('✅ payment_failed → el viaje cambia a PAYMENT_FAILED', async () => {
    const paymentIntentId = 'pi_failed_test';
    const mockEvent = {
      id: 'evt_test_failed',
      object: 'event',
      api_version: '2020-08-27',
      created: 1620000000,
      livemode: false,
      pending_webhooks: 0,
      request: { id: 'req_test_failed', idempotency_key: null },
      type: 'payment_intent.payment_failed',
      data: { object: { id: paymentIntentId, amount: 1000, currency: 'mxn', metadata: { tripId: 'trip_for_failed' } } },
    } as unknown as Stripe.Event;

    const fakeStripe = { webhooks: { constructEvent: jest.fn().mockReturnValue(mockEvent) } } as unknown as Stripe;
    jest.spyOn(serviceModule, 'getStripe').mockReturnValue(fakeStripe as any);

    // Prepare a trip with matching transactionId
    const db = admin.firestore();
    const tripRef = db.collection('trips').doc('trip_for_failed');
    await tripRef.set({ payment: { transactionId: paymentIntentId, method: 'stripe', isSettledToDriver: false }, status: TripStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date() });

    const req = { headers: { 'stripe-signature': 'test_signature' }, rawBody: Buffer.from(JSON.stringify(mockEvent)) } as unknown as functions.https.Request;
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() } as unknown as functions.Response;

    await stripeWebhook(req, res);

    expect(res.json).toHaveBeenCalledWith({ received: true });
    const updatedDoc = await tripRef.get();
    expect(updatedDoc.data()?.status).toBe(TripStatus.PAYMENT_FAILED);
    expect(updatedDoc.data()?.updatedAt).toBeDefined();
  });

  it('✅ charge.refunded → el viaje cambia a REFUNDED', async () => {
    const chargeId = 'ch_refunded_test';
    const mockEvent = {
      type: 'charge.refunded',
      data: { object: { id: chargeId, amount: 500, currency: 'mxn' } },
    } as Stripe.Event;

    const fakeStripe = { webhooks: { constructEvent: jest.fn().mockReturnValue(mockEvent) } } as unknown as Stripe;
    jest.spyOn(serviceModule, 'getStripe').mockReturnValue(fakeStripe as any);

    // Prepare a trip with matching transactionId
    const db = admin.firestore();
    const tripRef = db.collection('trips').doc('trip_for_refund');
    await tripRef.set({ status: TripStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date() });
    const paymentRef = tripRef.collection('payment').doc('payment_123');
    await paymentRef.set({ chargeId: chargeId, method: 'stripe', isSettledToDriver: false });

    const req = { headers: { 'stripe-signature': 'test_signature' }, rawBody: Buffer.from(JSON.stringify(mockEvent)) } as unknown as functions.https.Request;
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() } as unknown as functions.Response;

    await stripeWebhook(req, res);

    expect(res.json).toHaveBeenCalledWith({ received: true });
    const updatedDoc = await tripRef.get();
    expect(updatedDoc.data()?.status).toBe(TripStatus.REFUNDED);
    expect(updatedDoc.data()?.updatedAt).toBeDefined();
  });
});