import { stripeWebhook } from '../src/stripe/webhook';
import * as functions from 'firebase-functions';
import Stripe from 'stripe';
import { stripe as stripeService } from '../src/stripe/service';

jest.mock('firebase-admin', () => ({ initializeApp: jest.fn() }));

describe('Stripe Webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle a valid event', async () => {
    // Mock de evento más completo
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
});