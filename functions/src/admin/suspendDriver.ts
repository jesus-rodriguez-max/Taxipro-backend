import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Permite a un administrador suspender a un conductor.
 * @param {object} data - Datos de la llamada, debe contener `driverId`.
 * @param {functions.https.CallableContext} context - Contexto de la función.
 * @returns {Promise<{status: string}>} - Estado de la operación.
 */
export const suspendDriverCallable = async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden suspender a un conductor.');
  }

  const { driverId } = data;
  if (!driverId) {
    throw new functions.https.HttpsError('invalid-argument', 'Se requiere el `driverId`.');
  }

  try {
    const driverRef = admin.firestore().collection('drivers').doc(driverId);
    await driverRef.update({ status: 'suspended' });
    // Aquí se podría enviar una notificación al conductor.
    return { status: 'success' };
  } catch (error: any) {
    console.error('Error al suspender al conductor:', error);
    throw new functions.https.HttpsError('internal', 'No se pudo suspender al conductor.', error.message);
  }
};
