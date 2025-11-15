import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

/**
 * Genera una URL firmada para descargar el audio de un viaje.
 */
export const downloadTripAudioCallable = onCall(async (request) => {
  if (!request.auth || request.auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo los administradores pueden descargar audios.');
  }

  const { filePath } = request.data;
  if (!filePath) {
    throw new HttpsError('invalid-argument', 'Se requiere la ruta del archivo.');
  }

  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutos
    });
    return { downloadUrl: url };
  } catch (error: any) {
    console.error('Error al generar la URL de descarga:', error);
    throw new HttpsError('internal', 'No se pudo generar la URL de descarga.', error.message);
  }
});
