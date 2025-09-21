import { pubsub } from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Actualiza la ubicación y estado en los documentos de viajes compartidos.
 * Se ejecuta cada minuto para mantener la información fresca para el enlace público.
 */
export const updateShareLocation = pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    const db = admin.firestore();
    const activeSharesQuery = db.collection('shared_trips').where('isActive', '==', true);
    const activeSharesSnap = await activeSharesQuery.get();

    if (activeSharesSnap.empty) {
      return null;
    }

    const updates: Promise<any>[] = [];
    for (const doc of activeSharesSnap.docs) {
      const shareData = doc.data();
      const tripId = shareData.tripId;

      if (!tripId) continue;

      const tripRef = db.collection('trips').doc(tripId);
      const tripSnap = await tripRef.get();
      const trip = tripSnap.data();

      if (!trip) {
        // Si el viaje ya no existe, desactiva la compartición
        updates.push(doc.ref.update({ isActive: false }));
        continue;
      }

      // Actualiza el documento de compartición con los datos más recientes del viaje
      updates.push(doc.ref.update({
        lastKnownLocation: trip.lastKnownLocation || null,
        tripStatus: trip.status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }));
    }

    await Promise.all(updates);
    return null;
  });