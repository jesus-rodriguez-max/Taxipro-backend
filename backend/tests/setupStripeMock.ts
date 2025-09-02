jest.mock('stripe', () => {
  return function Stripe() {
    return {
      webhooks: {
        constructEvent: jest.fn((rawBody, sig, secret) => {
          if (!sig) {
            throw new Error('Webhook Error: Invalid signature');
          }
          return { id: 'evt_test', type: 'payment_intent.succeeded', data: { object: { id: 'pi_test' } } };
        }),
      },
    };
  };
});