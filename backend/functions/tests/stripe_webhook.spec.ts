import { webhook } from '../src/stripe/webhook.js';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: () => ({
    collection: () => ({
      doc: () => ({
        set: jest.fn(() => Promise.resolve()),
      }),
    }),
  }),
}));

// Mock Stripe
jest.mock('stripe', () => {
  const originalStripe = jest.requireActual('stripe');
  return {
    ...originalStripe,
    webhooks: {
      constructEvent: jest.fn(),
    },
  };
});

describe('Stripe Webhook', () => {
  it('should handle a valid event', async () => {
    const mockEvent = {
      id: 'evt_test',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test',
          amount: 1000,
          currency: 'usd',
        },
      },
    } as Stripe.Event;

    (Stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

    const req = {
      headers: { 'stripe-signature': 'test_signature' },
      rawBody: Buffer.from(JSON.stringify(mockEvent)),
    } as any;

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as any;

    await webhook(req, res);

    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('should handle an invalid signature', async () => {
    (Stripe.webhooks.constructEvent as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const req = {
      headers: { 'stripe-signature': 'invalid_signature' },
      rawBody: Buffer.from(JSON.stringify({})),
    } as any;

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as any;

    await webhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Webhook Error: Invalid signature');
  });
});
