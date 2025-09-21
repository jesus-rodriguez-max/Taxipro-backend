import * as functions from 'firebase-functions';
import Stripe from 'stripe';
export const webhook = functions.https.onRequest((req, res) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-04-10',
    });
    const sig = req.headers['stripe-signature'];
    if (!sig) {
        console.error('Stripe signature missing from header.');
        res.status(400).send('Stripe signature missing.');
        return;
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    console.log(`Received Stripe event: ${event.type}`);
    res.status(200).send({ received: true });
});
//# sourceMappingURL=webhook.js.map