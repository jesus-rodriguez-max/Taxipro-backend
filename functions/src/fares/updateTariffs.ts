import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Permite a un administrador actualizar las tarifas de la aplicación.
 * @param {object} data - Nuevos datos de las tarifas.
 * @param {functions.https.CallableContext} context - Contexto de la función.
 * @returns {Promise<{status: string}>} - Estado de la operación.
 */
export const updateTariffsCallable = async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden actualizar las tarifas.');
  }

  try {
    const tariffsRef = admin.firestore().collection('fares').doc('tariffs');
    await tariffsRef.set(data, { merge: true });
    return { status: 'success' };
  } catch (error: any) {
    console.error('Error al actualizar las tarifas:', error);
    throw new functions.https.HttpsError('internal', 'No se pudieron actualizar las tarifas.', error.message);
  }
};
