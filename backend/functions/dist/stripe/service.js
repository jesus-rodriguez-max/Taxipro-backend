export const stripeService = {
    verifySignature: (body, sig, secret) => {
        // mock simple para tests
        return { id: 'evt_test', type: 'payment_intent.succeeded' };
    },
    handleAccountUpdated: async (account) => {
        console.log('Mock: Handling account.updated', account.id);
    },
    handleSubscriptionChange: async (subscription) => {
        console.log('Mock: Handling customer.subscription.*', subscription.id);
    },
    handlePaymentIntentSucceeded: async (paymentIntent) => {
        console.log('Mock: Handling payment_intent.succeeded', paymentIntent.id);
    },
    handlePaymentIntentFailed: async (paymentIntent) => {
        console.log('Mock: Handling payment_intent.payment_failed', paymentIntent.id);
    },
};
//# sourceMappingURL=service.js.map