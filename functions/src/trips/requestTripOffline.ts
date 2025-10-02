import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Permite a un pasajero solicitar un viaje sin conexión a internet.
 * El viaje se guarda como 'offline' y se notificará al backend.
 * @param {object} data - Datos de la llamada, debe contener `passengerName`, `passengerPhone`, `origin`, `destination`.
 * @param {functions.https.CallableContext} context - Contexto de la función.
 * @returns {Promise<{tripId: string}>} - El ID del viaje creado.
 */
export const requestTripOfflineCallable = async (data: any, context: functions.https.CallableContext) => {
  const { passengerName, passengerPhone, origin, destination } = data;

  if (!passengerName || !passengerPhone || !origin || !destination) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan datos para solicitar el viaje sin conexión.');
  }

  const tripData = {
    passengerName,
    passengerPhone,
    origin,
    destination,
    status: 'offline',
    offline: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    const tripRef = await admin.firestore().collection('trips').add(tripData);
    // Aquí se podría integrar un servicio de mensajería (ej. Twilio) para notificar al backend.
    console.log(`Viaje offline solicitado: ${tripRef.id}`);
    return { tripId: tripRef.id };
  } catch (error: any) {
    console.error('Error al solicitar viaje offline:', error);
    throw new functions.https.HttpsError('internal', 'No se pudo procesar la solicitud de viaje sin conexión.', error.message);
  }
};
