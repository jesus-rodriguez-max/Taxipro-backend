import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

/**
 * Permite a un administrador suspender a un conductor.
 */
export const suspendDriverCallable = onCall(async (request) => {
  if (!request.auth || request.auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo los administradores pueden suspender a un conductor.');
  }

  const { driverId } = request.data;
  if (!driverId) {
    throw new HttpsError('invalid-argument', 'Se requiere el `driverId`.');
  }

  try {
    const driverRef = admin.firestore().collection('drivers').doc(driverId);
    await driverRef.update({ status: 'suspended' });
    // Aquí se podría enviar una notificación al conductor.
    return { status: 'success' };
  } catch (error: any) {
    console.error('Error al suspender al conductor:', error);
    throw new HttpsError('internal', 'No se pudo suspender al conductor.', error.message);
  }
});
