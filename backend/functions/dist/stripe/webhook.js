import { https } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import { stripeService } from './service.js';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10',
});
export const webhook = https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    }
    catch (err) {
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    const firestore = getFirestore();
    await firestore.collection('stripe_events').doc(event.id).set(event);
    // Handle the event
    switch (event.type) {
        case 'account.updated':
            await stripeService.handleAccountUpdated(event.data.object);
            break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
            await stripeService.handleSubscriptionChange(event.data.object);
            break;
        case 'payment_intent.succeeded':
            await stripeService.handlePaymentIntentSucceeded(event.data.object);
            break;
        case 'payment_intent.payment_failed':
            await stripeService.handlePaymentIntentFailed(event.data.object);
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }
    res.json({ received: true });
});
//# sourceMappingURL=webhook.js.map