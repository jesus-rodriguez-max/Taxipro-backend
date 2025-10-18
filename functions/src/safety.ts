import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

interface SafetyEventData {
  tripId: string;
  type: 'audio_recording_started' | 'audio_recording_stopped' | 'panic_button_pressed';
  metadata?: Record<string, any>;
}

/**
 * Registra un evento de seguridad relacionado con un viaje.
 * Esta es una función genérica para centralizar el logging de eventos de seguridad.
 */
const logEvent = async (tripId: string, type: SafetyEventData['type'], passengerId: string, metadata: any = {}) => {
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
  const logRef = admin.firestore().collection('trips').doc(tripId).collection('safety_logs').doc();
  
  await logRef.set({
    type,
    passengerId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    ...metadata,
  });
};

/**
 * Notifica al backend que la grabación de audio ha comenzado.
 */
export const startRecordingCallable = onCall({ region: 'us-central1' }, async (request) => {
  console.log('[✔] Función cargada: startRecording');
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Autenticación requerida.');

  const { tripId } = data as { tripId: string };
  await logEvent(tripId, 'audio_recording_started', auth.uid);
  return { success: true };
});

/**
 * Notifica al backend que la grabación de audio ha finalizado.
 */
export const stopRecordingCallable = onCall({ region: 'us-central1' }, async (request) => {
  console.log('[✔] Función cargada: stopRecording');
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Autenticación requerida.');

  const { tripId } = data as { tripId: string };
  await logEvent(tripId, 'audio_recording_stopped', auth.uid);
  return { success: true };
});

/**
 * Registra un evento de seguridad genérico, como la activación de un botón de pánico.
 */
export const logSafetyEventCallable = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Autenticación requerida.');

  const { tripId, type, metadata } = data as SafetyEventData;
  if (!tripId || !type) {
    throw new HttpsError('invalid-argument', 'Se requiere tripId y type.');
  }

  await logEvent(tripId, type, auth.uid, metadata);
  return { success: true, message: `Evento '${type}' registrado.` };
});