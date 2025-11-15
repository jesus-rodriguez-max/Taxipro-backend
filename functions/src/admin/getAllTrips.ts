import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

/**
 * Obtiene una lista paginada de todos los viajes.
 */
export const getAllTripsCallable = onCall(async (request) => {
  if (!request.auth || request.auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo los administradores pueden ver todos los viajes.');
  }

  const { pageSize = 10, startAfter } = request.data;
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
    throw new HttpsError('internal', 'No se pudieron obtener los viajes.', error.message);
  }
});
