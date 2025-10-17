import * as functions from "firebase-functions";
import Stripe from "stripe";

// Inicializa Stripe con la clave secreta desde las variables de entorno
const stripe = new Stripe(functions.config().stripe.secret, {
  apiVersion: "2024-06-20" as any,
});

/**
 * Webhook de Stripe: recibe notificaciones de pagos y suscripciones
 */
export const stripeWebhook = functions
  .region("us-central1")
  .https.onRequest(async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    console.log("[stripeWebhook] Headers:", req.headers);
    console.log("[stripeWebhook] Stripe-Signature:", sig);
    console.log("[stripeWebhook] rawBody is buffer:", Buffer.isBuffer((req as any).rawBody));

    if (!sig) {
      console.error("❌ No se encontró la firma de Stripe");
      res.status(403).send("Webhook Error: No signature found");
      return;
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || functions.config().stripe.webhook_secret;
    if (!webhookSecret) {
      console.error("❌ Falta stripe.webhook_secret en las configuraciones de Functions");
      res.status(500).send("Webhook Error: Missing webhook secret configuration");
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent((req as any).rawBody, sig, webhookSecret);
    } catch (err: any) {
      console.error("❌ Error verificando la firma del webhook:", err?.message || err);
      console.error("Stack:", err?.stack);
      res.status(403).send(`Webhook Signature Error: ${err?.message || 'Invalid signature'}`);
      return;
    }

    // Maneja los tipos de eventos de Stripe
    try {
      switch (event.type) {
        case "invoice.payment_succeeded":
          console.log("✅ Pago exitoso:", event.data.object["id"]);
          break;
        case "invoice.paid":
          console.log("✅ Factura pagada:", event.data.object);
          break;
        case "checkout.session.completed":
          console.log("✅ Checkout completado:", event.data.object["id"]);
          break;

        case "customer.subscription.created":
          console.log("🟢 Nueva suscripción creada:", event.data.object["id"]);
          break;

        case "customer.subscription.updated":
          console.log("🔄 Suscripción actualizada:", event.data.object["id"]);
          break;

        case "customer.subscription.deleted":
          console.log("🚫 Suscripción cancelada:", event.data.object["id"]);
          break;

        default:
          console.log(`ℹ️ Evento recibido sin manejar: ${event.type}`);
          break;
      }
    } catch (error) {
      console.error("💥 Error procesando evento Stripe:", error);
      res.status(500).send("Error interno procesando evento");
      return;
    }

    // Stripe necesita recibir 200 para confirmar recepción
    res.status(200).json({ received: true });
  });
