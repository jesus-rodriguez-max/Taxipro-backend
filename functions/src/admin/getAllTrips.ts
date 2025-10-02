import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Obtiene una lista paginada de todos los viajes.
 * @param {object} data - Datos de la llamada, puede contener `pageSize` y `startAfter`.
 * @param {functions.https.CallableContext} context - Contexto de la función.
 * @returns {Promise<any>} - Lista de viajes.
 */
export const getAllTripsCallable = async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden ver todos los viajes.');
  }

  const { pageSize = 10, startAfter } = data;
  let query = admin.firestore().collection('trips').orderBy('createdAt', 'desc').limit(pageSize);

  if (startAfter) {
    const startAfterDoc = await admin.firestore().collection('trips').doc(startAfter).get();
    if (startAfterDoc.exists) {
      query = query.startAfter(startAfterDoc);
    }
  }

  try {
    const snapshot = await query.get();
    const trips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { trips };
  } catch (error: any) {
    console.error('Error al obtener los viajes:', error);
    throw new functions.https.HttpsError('internal', 'No se pudieron obtener los viajes.', error.message);
  }
};
