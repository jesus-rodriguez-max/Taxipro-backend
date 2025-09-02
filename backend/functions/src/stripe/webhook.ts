import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { https } from 'firebase-functions';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2024-04-10' });

export const webhook = https.onRequest(async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'] as string | undefined;
    const event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET as string);

    const firestore = (admin as any).firestore();
    await firestore.collection('stripe_events').doc(event.id).set({
      id: event.id,
      type: event.type,
      receivedAt: new Date().toISOString(),
    });

    return res.json({ received: true });
  } catch (err: any) {
    res.status(400);
    return res.send(err?.message || 'Webhook Error');
  }
});