import { onRequest } from 'firebase-functions/v2/https';
import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { getStripe, handleStripeWebhook } from './service';
import { STRIPE_WEBHOOK_SECRET_V2 } from '../config';

/**
 * Stripe Webhook (Functions v2) con invocador público.
 * Usa req.rawBody para verificación de firma.
 */
export const stripeWebhookV2 = onRequest(
  { region: 'us-central1', invoker: 'public' },
  async (req: Request, res: Response) => {
    console.log('[✔] Función cargada: stripeWebhookV2');

    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const sig = req.headers['stripe-signature'] as string | undefined;
    if (!sig) {
      res.status(400).send('Webhook Error: No signature found');
      return;
    }

    const webhookSecret = STRIPE_WEBHOOK_SECRET_V2;
    if (!webhookSecret) {
      res.status(500).send('Webhook Error: Missing webhook secret configuration');
      return;
    }

    let event: Stripe.Event;
    try {
      const stripe = getStripe(); // Initialize lazily
      event = stripe.webhooks.constructEvent((req as any).rawBody, sig, webhookSecret);
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[stripeWebhookV2] Signature verification failed:', message);
      res.status(400).send(`Webhook Error: ${message}`);
      return;
    }

    // Aquí manejas el evento con tu lógica
    await handleStripeWebhook(event);

    res.status(200).send('[✔] Webhook recibido correctamente.');
  }
);

