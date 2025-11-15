import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

/**
 * Permite a un administrador actualizar las tarifas de la aplicación.
 */
export const updateTariffsCallable = onCall(async (request) => {
  if (!request.auth || request.auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo los administradores pueden actualizar las tarifas.');
  }
  const data = request.data;

  try {
    const tariffsRef = admin.firestore().collection('fares').doc('tariffs');
    await tariffsRef.set(data, { merge: true });
    return { status: 'success' };
  } catch (error: any) {
    console.error('Error al actualizar las tarifas:', error);
    throw new HttpsError('internal', 'No se pudieron actualizar las tarifas.', error.message);
  }
});
