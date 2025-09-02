jest.mock('stripe', () => {
  const constructEvent = jest.fn((body, sig) => {
    if (!sig) {
      const err = new Error('Webhook Error: Invalid signature');
      err.statusCode = 400;
      throw err;
    }
    return { id: 'evt_test', type: 'payment_intent.succeeded', data: { object: { id: 'pi_test' } } };
  });

  function Stripe() {
    return { webhooks: { constructEvent } };
  }
  Stripe.webhooks = { constructEvent }; // API estática usada por los tests

  return Stripe;
});