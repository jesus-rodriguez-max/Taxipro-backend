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
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = void 0;
const firebase_functions_1 = require("firebase-functions");
const service_1 = require("./service");
const functions = __importStar(require("firebase-functions"));
// Obtiene el secreto del webhook de la configuración de entorno de Firebase.
const webhookSecret = functions.config().stripe.webhook_secret;
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
    try {
        // Verifica la firma para asegurar que la solicitud viene de Stripe
        event = service_1.stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
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