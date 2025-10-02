import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Genera una URL firmada para descargar el audio de un viaje.
 * @param {object} data - Datos de la llamada, debe contener `filePath`.
 * @param {functions.https.CallableContext} context - Contexto de la función.
 * @returns {Promise<{downloadUrl: string}>} - URL de descarga.
 */
export const downloadTripAudioCallable = async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden descargar audios.');
  }

  const { filePath } = data;
  if (!filePath) {
    throw new functions.https.HttpsError('invalid-argument', 'Se requiere la ruta del archivo.');
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
    throw new functions.https.HttpsError('internal', 'No se pudo generar la URL de descarga.', error.message);
  }
};
