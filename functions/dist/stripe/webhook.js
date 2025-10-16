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
exports.stripeWebhook = void 0;
const functions = __importStar(require("firebase-functions"));
const stripe_1 = __importDefault(require("stripe"));
// Inicializa Stripe con la clave secreta desde las variables de entorno
const stripe = new stripe_1.default(functions.config().stripe.secret, {
    apiVersion: "2024-06-20",
});
/**
 * Webhook de Stripe: recibe notificaciones de pagos y suscripciones
 */
exports.stripeWebhook = functions
    .region("us-central1")
    .https.onRequest(async (req, res) => {
    const sig = req.headers["stripe-signature"];
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
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    }
    catch (err) {
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
    }
    catch (error) {
        console.error("💥 Error procesando evento Stripe:", error);
        res.status(500).send("Error interno procesando evento");
        return;
    }
    // Stripe necesita recibir 200 para confirmar recepción
    res.status(200).json({ received: true });
});
//# sourceMappingURL=webhook.js.map