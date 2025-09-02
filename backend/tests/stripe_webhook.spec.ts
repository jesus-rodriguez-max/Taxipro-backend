import { webhook } from '../functions/src/stripe/webhook.ts';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Mock Firebase Admin SDK is now handled by setupFirebaseMock.js
// jest.mock('firebase-admin', () => ({
//   initializeApp: jest.fn(),
//   firestore: () => ({
//     collection: () => ({
//       doc: () => ({
//         set: jest.fn(() => Promise.resolve()),
//       }),
//     }),
//   }),
// }));

// Mock Stripe is now handled by setupStripeMock.ts
// jest.mock('stripe', () => {
//   const originalStripe = jest.requireActual('stripe');
//   return {
//     ...originalStripe,
//     webhooks: {
//       constructEvent: jest.fn(),
//     },
//   };
// });

describe('Stripe Webhook', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      method: 'POST',
      rawBody: Buffer.from('{"id":"evt_test"}'),
      headers: { 'stripe-signature': 't=1,v1=x' }
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  it('should handle a valid event', async () => {
    // Mock constructEvent to return a valid event
    (Stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce({
      id: 'evt_test',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test' } },
    });

    await webhook(req, res);

    expect(res.json).toHaveBeenCalledWith({ received: true });
    const firestore = admin.firestore() as any;
    expect(firestore.collection).toHaveBeenCalledWith('stripe_events');
    expect(firestore.collection('stripe_events').doc).toHaveBeenCalledWith('evt_test');
    expect(firestore.collection('stripe_events').doc('evt_test').set).toHaveBeenCalledWith({
      id: 'evt_test',
      type: 'payment_intent.succeeded',
      receivedAt: expect.any(String),
    });
  });

  it('should handle an invalid signature', async () => {
    // Mock constructEvent to throw an error
    (Stripe.webhooks.constructEvent as jest.Mock).mockImplementationOnce(() => {
      const error = new Error('Webhook Error: Invalid signature');
      (error as any).statusCode = 400;
      throw error;
    });

    const reqInvalid = { method: 'POST', rawBody: Buffer.from('{}'), headers: { } };

    await webhook(reqInvalid, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Webhook Error: Invalid signature');
  });
});