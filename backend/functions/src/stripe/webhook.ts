import { https } from 'firebase-functions';
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe, handleStripeWebhook } from './service';

// Obtiene el secreto del webhook de la configuración de entorno de Firebase.
const webhookSecret = functions.config().stripe.webhook_secret;

/**
 * Endpoint HTTP para recibir y procesar webhooks de Stripe.
 */
export const stripeWebhook = https.onRequest(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    res.status(400).send('Webhook Error: No signature found');
    return;
  }

  let event: Stripe.Event;

  try {
    // Verifica la firma para asegurar que la solicitud viene de Stripe
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).send(`Webhook Error: ${errorMessage}`);
    return;
  }

  // Llama al manejador de eventos para procesar el evento
  await handleStripeWebhook(event);

  // Responde a Stripe que el evento fue recibido correctamente
  res.status(200).json({ received: true });
});