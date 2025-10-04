"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = void 0;
const firebase_functions_1 = require("firebase-functions");
const service_1 = require("./service");
const config_1 = require("../config");
/**
 * Endpoint HTTP para recibir y procesar webhooks de Stripe.
 */
exports.stripeWebhook = firebase_functions_1.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    if (!sig) {
        res.status(400).send('Webhook Error: No signature found');
        return;
    }
    let event;
    const webhookSecret = config_1.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        res.status(500).send('Webhook Error: Missing webhook secret configuration');
        return;
    }
    try {
        // Verifica la firma para asegurar que la solicitud viene de Stripe
        event = (0, service_1.getStripe)().webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        res.status(400).send(`Webhook Error: ${errorMessage}`);
        return;
    }
    // Llama al manejador de eventos para procesar el evento
    await (0, service_1.handleStripeWebhook)(event);
    // Responde a Stripe que el evento fue recibido correctamente
    res.status(200).json({ received: true });
});
//# sourceMappingURL=webhook.js.map