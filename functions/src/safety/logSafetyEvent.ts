import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { SafetyProfile, SafetyLog, SafetyEventType } from '../models/safety';
import { SAFETY_RATE_LIMIT_MINUTES, SAFETY_DAILY_LIMIT } from '../config';

import * as crypto from 'crypto';
import { sendWhatsApp, makeCall } from '../services/twilio';


interface LogSafetyEventData {
  tripId: string;
  eventType: SafetyEventType;
  actorId: string;
  coords: { latitude: number; longitude: number };
  audioBase64?: string; // Audio opcional en base64
}

export const logSafetyEventV2Callable = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }
  const { tripId, eventType, actorId, coords, audioBase64 } = request.data as LogSafetyEventData;
  if (!Object.values(SafetyEventType).includes(eventType)) {
    throw new HttpsError('invalid-argument', 'El tipo de evento no es válido.');
  }
  const userId = request.auth.uid;
  const db = admin.firestore();

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
  const timeLimit = SAFETY_RATE_LIMIT_MINUTES * 60 * 1000;
  const dailyLimit = SAFETY_DAILY_LIMIT;

  const now = admin.firestore.Timestamp.now();
  const tenMinutesAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - timeLimit);
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
    throw new HttpsError('resource-exhausted', `Solo puedes enviar una alerta cada ${SAFETY_RATE_LIMIT_MINUTES} minutos.`);
  }

  if (dailyLogsSnap.size >= dailyLimit) {
    throw new HttpsError('resource-exhausted', `Has alcanzado el límite de ${dailyLimit} alertas diarias.`);
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

  // Determinar destinatarios (mínimo seguro)
  const recipients: string[] = [];
  if (safetyProfile.trustedContactPhone) {
    recipients.push(safetyProfile.trustedContactPhone);
  }

  // Calcular hash y construir el SafetyLog final
  const baseForHash = { ...logPayload, recipients };
  const hashPayload = crypto.createHash('sha256').update(JSON.stringify(baseForHash)).digest('hex');
  const safetyLog: SafetyLog = { ...baseForHash, hashPayload };

  const logRef = db.collection('trips').doc(tripId).collection('safety_logs').doc();
  await logRef.set(safetyLog);

  return { status: 'success', message: 'Evento de seguridad registrado.' };
});
