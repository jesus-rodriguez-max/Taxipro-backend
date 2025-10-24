"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = exports.stripeWebhookHandler = void 0;
const functions = __importStar(require("firebase-functions"));
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const service_1 = require("./service");
const config_1 = require("../config");
/**
 * Webhook de Stripe: recibe notificaciones de pagos y suscripciones
 */
const stripeWebhookHandler = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    console.log("[stripeWebhook] Headers:", req.headers);
    console.log("[stripeWebhook] Stripe-Signature:", sig);
    console.log("[stripeWebhook] body is buffer:", Buffer.isBuffer(req.body));
    console.log("[stripeWebhook] rawBody is buffer:", Buffer.isBuffer(req.rawBody));
    if (!sig) {
        console.error("❌ No se encontró la firma de Stripe");
        res.status(403).send("Webhook Error: No signature found");
        return;
    }
    const webhookSecret = config_1.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error("❌ Falta stripe.webhook_secret en las configuraciones de Functions");
        res.status(500).send("Webhook Error: Missing webhook secret configuration");
        return;
    }
    let event;
    try {
        try {
            const len = Buffer.isBuffer(req.rawBody) ? req.rawBody.length : -1;
            console.log("[stripeWebhook] Payload recibido bytes:", len);
        }
        catch { }
        const stripe = (0, service_1.getStripe)(); // Initialize lazily
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
        console.log("[stripeWebhook] constructEvent OK:", event.type);
    }
    catch (err) {
        console.error("❌ Error verificando la firma del webhook:", err?.message || err);
        console.error("Stack:", err?.stack);
        res.status(403).send(`Webhook Signature Error: ${err?.message || 'Invalid signature'}`);
        return;
    }
    // Maneja los tipos de eventos de Stripe
    try {
        console.log("Evento recibido:", event.type);
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
        // Procesamiento centralizado de eventos (suscripciones y pagos por viaje)
        await (0, service_1.handleStripeWebhook)(event);
    }
    catch (error) {
        console.error("💥 Error procesando evento Stripe:", error);
        res.status(500).send("Error interno procesando evento");
        return;
    }
    // Stripe necesita recibir 200 para confirmar recepción
    res.status(200).json({ received: true });
};
exports.stripeWebhookHandler = stripeWebhookHandler;
const app = (0, express_1.default)();
// Montar en '/' para mantener la misma URL del webhook (no duplicar path)
app.post("/", body_parser_1.default.raw({ type: "*/*" }), exports.stripeWebhookHandler);
exports.stripeWebhook = functions.region("us-central1").https.onRequest(app);
//# sourceMappingURL=webhook.js.map