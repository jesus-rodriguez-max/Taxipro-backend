export const stripeService = {
  verifySignature: (body: Buffer, sig: string, secret: string) => {
    // mock simple para tests
    return { id: 'evt_test', type: 'payment_intent.succeeded' };
  },
  handleAccountUpdated: async (account: any) => {
    console.log('Mock: Handling account.updated', account.id);
  },
  handleSubscriptionChange: async (subscription: any) => {
    console.log('Mock: Handling customer.subscription.*', subscription.id);
  },
  handlePaymentIntentSucceeded: async (paymentIntent: any) => {
    console.log('Mock: Handling payment_intent.succeeded', paymentIntent.id);
  },
  handlePaymentIntentFailed: async (paymentIntent: any) => {
    console.log('Mock: Handling payment_intent.payment_failed', paymentIntent.id);
  },
};