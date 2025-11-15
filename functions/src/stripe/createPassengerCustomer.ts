import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getStripe } from './service';

/**
 * Crea un cliente de Stripe para un pasajero y guarda el ID en Firestore.
 * Es una función HTTP onRequest para ser llamada directamente por el frontend.
 */
export const createPassengerCustomer = functions.https.onRequest(async (req, res) => {
  // Habilitar CORS para permitir solicitudes desde cualquier origen
  res.set('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    // Pre-flight request. Responde con los headers necesarios.
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    functions.logger.info('BODY RECIBIDO:', req.body);
    const { uid, email, name, phone } = req.body;

    // 1. Validar que uid y email sean obligatorios
    if (!uid || !email) {
      functions.logger.warn('Intento de crear cliente sin uid o email.', { body: req.body });
      res.status(400).json({
        success: false,
        message: 'Los campos uid y email son obligatorios.',
      });
      return;
    }

    const stripe = getStripe();

    // 2. Crear el cliente en Stripe
    const customer = await stripe.customers.create({
      email: email,
      name: name,
      phone: phone,
      metadata: {
        firebase_uid: uid,
      },
    });

    // 3. Guardar en Firestore
    const passengerStripeRef = admin.firestore().collection('passengers').doc(uid).collection('stripe').doc('data');

    await passengerStripeRef.set({
      customerId: customer.id,
      email: email,
      name: name,
      phone: phone,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    functions.logger.info(`Cliente de Stripe ${customer.id} creado para el pasajero ${uid}.`);

    // 4. Responder con éxito
    res.status(200).json({
      success: true,
      customerId: customer.id,
    });

  } catch (error) {
    functions.logger.error('Error al crear el cliente de pasajero en Stripe:', error);
    let errorMessage = 'Ocurrió un error interno.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
});
