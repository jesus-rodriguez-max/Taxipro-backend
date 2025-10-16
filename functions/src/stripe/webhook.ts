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

    if (!sig) {
      console.error("❌ No se encontró la firma de Stripe");
      res.status(400).send("Webhook Error: No signature found");
      return;
    }

    const webhookSecret = functions.config().stripe.webhook_secret;
    if (!webhookSecret) {
      console.error("❌ Falta stripe.webhook_secret en las configuraciones de Functions");
      res.status(500).send("Webhook Error: Missing webhook secret configuration");
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err: any) {
      console.error("❌ Error verificando la firma del webhook:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Maneja los tipos de eventos de Stripe
    try {
      switch (event.type) {
        case "invoice.payment_succeeded":
          console.log("✅ Pago exitoso:", event.data.object["id"]);
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
