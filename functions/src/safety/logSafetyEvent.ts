import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v1/https';
import { SafetyProfile, SafetyLog, SafetyEventType } from '../models/safety';

import * as crypto from 'crypto';
import { sendWhatsApp, makeCall } from '../services/twilio';

const db = admin.firestore();

interface LogSafetyEventData {
  tripId: string;
  eventType: SafetyEventType;
  actorId: string;
  coords: { latitude: number; longitude: number };
  audioBase64?: string; // Audio opcional en base64
}

export const logSafetyEventV2Callable = async (data: LogSafetyEventData, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }

  const { tripId, eventType, actorId, coords, audioBase64 } = data;
  const userId = context.auth.uid;

  if (userId !== actorId) {
    throw new HttpsError('permission-denied', 'No puedes reportar un evento en nombre de otro usuario.');
  }

  // 1. Verificar consentimiento y estado del perfil de seguridad
  const safetyProfileRef = db.collection('safety_profiles').doc(userId);
  const safetyProfileSnap = await safetyProfileRef.get();

  if (!safetyProfileSnap.exists) {
    throw new HttpsError('failed-precondition', 'El perfil de seguridad no existe.');
  }

  const safetyProfile = safetyProfileSnap.data() as SafetyProfile;

  if (!safetyProfile.escudoEnabled || !safetyProfile.escudoAcceptedAt) {
    throw new HttpsError('failed-precondition', 'El Escudo TaxiPro no está activado o aceptado.');
  }

  if (safetyProfile.safetySuspendedUntil && safetyProfile.safetySuspendedUntil.toMillis() > Date.now()) {
    throw new HttpsError('permission-denied', 'Tu cuenta de seguridad está suspendida temporalmente.');
  }

  // 2. Validar límites de uso (rate limiting)
  const now = admin.firestore.Timestamp.now();
  const tenMinutesAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 600000);
  const twentyFourHoursAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 86400000);

  const recentLogsQuery = db.collectionGroup('safety_logs')
    .where('actorId', '==', userId)
    .where('timestamp', '>=', tenMinutesAgo);

  const dailyLogsQuery = db.collectionGroup('safety_logs')
    .where('actorId', '==', userId)
    .where('timestamp', '>=', twentyFourHoursAgo);

  const [recentLogsSnap, dailyLogsSnap] = await Promise.all([
    recentLogsQuery.get(),
    dailyLogsQuery.get(),
  ]);

  if (!recentLogsSnap.empty) {
    throw new HttpsError('resource-exhausted', 'Solo puedes enviar una alerta cada 10 minutos.');
  }

  if (dailyLogsSnap.size >= 3) {
    throw new HttpsError('resource-exhausted', 'Has alcanzado el límite de 3 alertas diarias.');
  }

  // 3. Subir audio a Cloud Storage si existe
  let audioPath: string | undefined;
  if (audioBase64) {
    const bucket = admin.storage().bucket();
    const buffer = Buffer.from(audioBase64, 'base64');
    audioPath = `safety_audio/${tripId}/${Date.now()}.wav`;
    const file = bucket.file(audioPath);
    await file.save(buffer, { contentType: 'audio/wav' });
  }

  // 4. Crear y guardar el log de seguridad
  const logPayload: Omit<SafetyLog, 'hashPayload'> = {
    eventType,
    actorId,
    timestamp: now,
    coords: new admin.firestore.GeoPoint(coords.latitude, coords.longitude),
    audioPath,
    templateId: eventType === SafetyEventType.PANIC_PASSENGER ? 'TAXIPRO_ALERT_PAX_V1' : 'TAXIPRO_ALERT_DRV_V1',
    recipients: [], // Se llenará después de enviar las alertas
  };

  const hashPayload = crypto.createHash('sha256').update(JSON.stringify(logPayload)).digest('hex');
  const safetyLog: SafetyLog = { ...logPayload, hashPayload };

  // 5. Enviar alertas por Twilio (SMS/WhatsApp)
  const recipients: string[] = [];
  if (safetyProfile.trustedContactPhone) {
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`;
    const shareLink = `https://taxipro.app/share/${tripId}`; // Asumiendo que existe una URL para compartir viajes
    const messageBody = `Alerta de seguridad de TaxiPro: ${mapUrl} | ${shareLink}`;

    const messageSid = await sendWhatsApp(safetyProfile.trustedContactPhone, messageBody);
    if (messageSid) {
      recipients.push(safetyProfile.trustedContactPhone);
      safetyLog.twilioMessageSid = messageSid;
    }
  }

  // 6. Realizar llamada al 911 si está habilitado
  const call911Enabled = functions.config().env?.call_911_enabled === 'true';
  if (call911Enabled) {
    const tripSnap = await db.collection('trips').doc(tripId).get();
    const tripData = tripSnap.data();
    const twiml = `<Response><Say language="es-MX">Alerta de emergencia desde TaxiPro. Ubicación: ${coords.latitude}, ${coords.longitude}. ID viaje: ${tripId}, Origen: ${tripData?.origin.address}, Destino: ${tripData?.destination.address}.</Say></Response>`;
    const callSid = await makeCall('911', twiml); // Número de emergencia
    if (callSid) {
      safetyLog.twilioCallSid = callSid;
    }
  }

  safetyLog.recipients = recipients;
  const logRef = db.collection('trips').doc(tripId).collection('safety_logs').doc();
  await logRef.set(safetyLog);


  return { status: 'success', message: 'Evento de seguridad registrado.' };
};
