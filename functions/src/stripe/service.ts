import Stripe from 'stripe';
import * as functions from 'firebase-functions';

// Inicializa el cliente de Stripe con la clave secreta obtenida de forma segura
// desde la configuración de entorno de Firebase.
export const stripe = new Stripe(functions.config().stripe.secret, {
  apiVersion: '2024-04-10', // Usa una versión de API fija y soportada
  typescript: true,
});

/**
 * Crea un PaymentIntent para un nuevo cobro.
 * @param {number} amount - El monto a cobrar en la unidad más pequeña (ej. centavos).
 * @param {string} currency - La moneda del cobro (ej. 'mxn').
 * @param {string} customerId - El ID de cliente de Stripe.
 * @param {string} paymentMethodId - El ID del método de pago de Stripe.
 * @returns {Promise<Stripe.PaymentIntent>} El PaymentIntent creado.
 */
export const createPaymentIntent = async (
  amount: number,
  currency: string,
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.PaymentIntent> => {
  return stripe.paymentIntents.create({
    amount,
    currency,
    customer: customerId,
    payment_method: paymentMethodId,
    off_session: true, // Indica que el cliente no está presente en el flujo de pago
    confirm: true, // Intenta confirmar el pago inmediatamente
  });
};

/**
 * Gestiona los eventos recibidos desde el webhook de Stripe.
 * @param {Stripe.Event} event - El evento de Stripe.
 */
export const handleStripeWebhook = async (event: Stripe.Event) => {
  switch (event.type) {
    case 'payment_intent.succeeded':
      // Lógica para cuando un pago es exitoso
      // Ej: Actualizar el estado del viaje, liquidar saldo pendiente.
      console.log('PaymentIntent successful:', event.data.object);
      break;
    case 'payment_intent.payment_failed':
      // Lógica para cuando un pago falla
      // Ej: Notificar al usuario, reintentar cobro de membresía.
      console.error('PaymentIntent failed:', event.data.object);
      break;
    // Añadir más casos de eventos según sea necesario (ej. cancelaciones)
    default:
      console.warn(`Unhandled event type: ${event.type}`);
  }
  // Aquí se añadiría la lógica para actualizar Firestore
};