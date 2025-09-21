import { stripeWebhook } from '../src/stripe/webhook';
import * as functions from 'firebase-functions';
import Stripe from 'stripe';
import { stripe as stripeService } from '../src/stripe/service';
import * as admin from 'firebase-admin';
import { TripStatus } from '../src/lib/types';

// Mock Firebase Admin
const mockUpdate = jest.fn();
const mockDoc = jest.fn(() => ({
  get: jest.fn(() => ({
    exists: true,
    ref: { update: mockUpdate },
  })),
  update: mockUpdate,
}));
const mockWhere = jest.fn(() => ({
  limit: jest.fn(() => ({
    get: jest.fn(() => ({
      empty: false,
      docs: [{ ref: { update: mockUpdate } }],
    })),
  })),
}));
const mockCollection = jest.fn(() => ({
  doc: mockDoc,
  where: mockWhere,
}));

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(() => ({
    collection: mockCollection,
  })),
  // Mock FieldValue for serverTimestamp
  firestore: {
    FieldValue: {
      serverTimestamp: jest.fn(() => 'MOCKED_SERVER_TIMESTAMP'),
    },
    collection: mockCollection,
  },
}));

describe('Stripe Webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks for each test
    mockUpdate.mockClear();
    mockDoc.mockClear();
    mockWhere.mockClear();
    mockCollection.mockClear();
  });

  it('should handle a valid event', async () => {
    const mockEvent = {
      type: 'payment_intent.succeeded',
      data: {
        object: { id: 'pi_test', amount: 2000, currency: 'usd' },
      },
    } as Stripe.Event;

    jest.spyOn(stripeService.webhooks, 'constructEvent').mockReturnValue(mockEvent);

    const req = { headers: { 'stripe-signature': 'test_signature' }, rawBody: Buffer.from(JSON.stringify(mockEvent)) } as unknown as functions.https.Request;
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() } as unknown as functions.Response;

    await stripeWebhook(req, res);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('should handle an invalid signature', async () => {
    jest.spyOn(stripeService.webhooks, 'constructEvent').mockImplementation(() => { throw new Error('Invalid signature'); });

    const req = { headers: { 'stripe-signature': 'invalid_signature' }, rawBody: Buffer.from(JSON.stringify({})) } as unknown as functions.https.Request;
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() } as unknown as functions.Response;

    await stripeWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Webhook Error: Invalid signature');
  });

  it('✅ Simular un webhook de payment_failed y validar que el viaje cambia de estado', async () => {
    const paymentIntentId = 'pi_failed_test';
    const mockEvent = {
      type: 'payment_intent.payment_failed',
      data: {
        object: { id: paymentIntentId, amount: 1000, currency: 'mxn' },
      },
    } as Stripe.Event;

    jest.spyOn(stripeService.webhooks, 'constructEvent').mockReturnValue(mockEvent);

    // Mock the trip document to be found
    mockWhere.mockImplementationOnce(() => ({
      limit: jest.fn(() => ({
        get: jest.fn(() => ({
          empty: false,
          docs: [{ ref: { update: mockUpdate } }],
        })),
      })),
    }));

    const req = { headers: { 'stripe-signature': 'test_signature' }, rawBody: Buffer.from(JSON.stringify(mockEvent)) } as unknown as functions.https.Request;
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() } as unknown as functions.Response;

    await stripeWebhook(req, res);

    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect(mockWhere).toHaveBeenCalledWith('payment.transactionId', '==', paymentIntentId);
    expect(mockUpdate).toHaveBeenCalledWith({
      status: TripStatus.PAYMENT_FAILED,
      updatedAt: 'MOCKED_SERVER_TIMESTAMP',
    });
  });

  it('✅ Simular un webhook de charge.refunded y validar que se marca el viaje como refund', async () => {
    const chargeId = 'ch_refunded_test';
    const mockEvent = {
      type: 'charge.refunded',
      data: {
        object: { id: chargeId, amount: 500, currency: 'mxn' },
      },
    } as Stripe.Event;

    jest.spyOn(stripeService.webhooks, 'constructEvent').mockReturnValue(mockEvent);

    // Mock the trip document to be found
    mockWhere.mockImplementationOnce(() => ({
      limit: jest.fn(() => ({
        get: jest.fn(() => ({
          empty: false,
          docs: [{ ref: { update: mockUpdate } }],
        })),
      })),
    }));

    const req = { headers: { 'stripe-signature': 'test_signature' }, rawBody: Buffer.from(JSON.stringify(mockEvent)) } as unknown as functions.https.Request;
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() } as unknown as functions.Response;

    await stripeWebhook(req, res);

    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect(mockWhere).toHaveBeenCalledWith('payment.transactionId', '==', chargeId);
    expect(mockUpdate).toHaveBeenCalledWith({
      status: TripStatus.REFUNDED,
      updatedAt: 'MOCKED_SERVER_TIMESTAMP',
    });
  });
});