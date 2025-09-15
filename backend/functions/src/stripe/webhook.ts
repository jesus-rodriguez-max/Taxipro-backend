import * as functions from 'firebase-functions';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';

export const webhook = functions.https.onRequest(async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-04-10',
  });
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    console.error('Stripe signature missing from header.');
    res.status(400).send('Stripe signature missing.');
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Persist the event to Firestore
  try {
    const db = admin.firestore();
    await db.collection('stripe_events').doc(event.id).set({
      id: event.id,
      type: event.type,
      data: event.data,
      created: event.created,
    });
  } catch (err) {
    console.error('Failed to persist Stripe event', err);
  }

  // Handle completed checkout session to update driver subscription
  if (event.type === 'checkout.session.completed') {
    const session: any = event.data.object;
    const driverId = session?.metadata?.driverId;
    const weeksStr = session?.metadata?.weeks;
    const weeks = weeksStr ? parseInt(weeksStr, 10) : 1;

    if (driverId) {
      try {
        const newExpiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 * weeks);
        const db = admin.firestore();
        await db.collection('drivers').doc(driverId).set(
          {
            subscriptionExpiration: newExpiration,
          },
          { merge: true }
        );
      } catch (err) {
        console.error('Failed to update driver subscription', err);
      }
    }
  }

  res.status(200).send({ received: true });
});
