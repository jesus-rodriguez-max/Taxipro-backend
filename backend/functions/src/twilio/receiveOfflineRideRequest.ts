
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { URLSearchParams } from 'url';
import { assignOfflineDriver } from './assignOfflineDriver';
import { notifyUserBySMS } from './notifyUserBySMS';

// Expresión regular para parsear el SMS
const SMS_REGEX = /TAXIPRO Solicito taxi desde (.+) hacia (.+)/i;

/**
 * Webhook que recibe solicitudes de viaje por SMS desde Twilio.
 */
export const receiveOfflineRideRequest = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const params = new URLSearchParams(req.body);
  const from = params.get('From');
  const body = params.get('Body');

  if (!from || !body) {
    res.status(400).send('Bad Request: Missing From or Body');
    return;
  }

  const match = body.match(SMS_REGEX);
  if (!match) {
    await notifyUserBySMS(from, 'Formato de mensaje incorrecto. Usa: TAXIPRO Solicito taxi desde [origen] hacia [destino]');
    res.status(200).send('OK'); // Respondemos 200 para que Twilio no reintente
    return;
  }

  const [, origin, destination] = match;

  try {
    const db = admin.firestore();

    // 1. Verificar que el número de teléfono pertenece a un usuario registrado
    const userQuery = await db.collection('users').where('phone', '==', from).limit(1).get();
    if (userQuery.empty) {
      await notifyUserBySMS(from, 'Tu número no está registrado. Por favor, regístrate en la app de TaxiPro primero.');
      res.status(200).send('OK');
      return;
    }
    const userId = userQuery.docs[0].id;

    // 2. Crear el viaje offline
    const tripRef = db.collection('offline_trips').doc();
    await tripRef.set({
      from,
      userId,
      origin: origin.trim(),
      destination: destination.trim(),
      status: 'pending_sms',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. (Bonus) Crear log de auditoría
    await db.collection('offline_trip_logs').doc(tripRef.id).collection('events').add({ 
      event: 'request_received', 
      timestamp: admin.firestore.FieldValue.serverTimestamp() 
    });

    // 4. Asignar un chofer
    const assignment = await assignOfflineDriver(tripRef.id);
    if (!assignment.success) {
      await notifyUserBySMS(from, 'No hay choferes disponibles en este momento. Por favor, intenta más tarde.');
      res.status(200).send('OK');
      return;
    }

    // 5. Notificar al usuario con la confirmación
    const confirmationMessage = `TaxiPro: ¡Viaje confirmado!\nTaxi: ${assignment.vehicleInfo}\nLlega en: ${assignment.eta}\nTarifa aprox: ${assignment.estimatedFare}\nViaje en efectivo. Chofer conocerá destino al abordarte.`;
    await notifyUserBySMS(from, confirmationMessage);

    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(`<Response></Response>`); // Respuesta vacía a Twilio

  } catch (error) {
    console.error('Error procesando solicitud de viaje offline:', error);
    // No notificamos al usuario para evitar bucles de error
    res.status(500).send('Internal Server Error');
  }
});
