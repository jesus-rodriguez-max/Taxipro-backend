import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as geofire from 'geofire-common';

/**
 * Se activa al crear un nuevo viaje y asigna automáticamente el conductor más cercano.
 * @param {functions.firestore.QueryDocumentSnapshot} snap - Snapshot del documento del viaje.
 * @param {functions.EventContext} context - Contexto del evento.
 */
export const autoAssignDriver = functions.firestore
  .document('trips/{tripId}')
  .onCreate(async (snap, context) => {
    const tripData = snap.data();

    if (tripData.status !== 'pending' || tripData.offline) {
      return null; // No procesar viajes que no estén pendientes o sean offline
    }

    const { origin } = tripData;
    const center = [origin.latitude, origin.longitude];
    const radiusInM = 50 * 1000; // 50 km

    const bounds = geofire.geohashQueryBounds(center, radiusInM);
    const promises = [];
    for (const b of bounds) {
      const q = admin.firestore().collection('drivers')
        .where('status', '==', 'available')
        .orderBy('geohash')
        .startAt(b[0])
        .endAt(b[1]);
      promises.push(q.get());
    }

    const snapshots = await Promise.all(promises);
    const matchingDocs = [];

    for (const s of snapshots) {
      for (const doc of s.docs) {
        const lat = doc.data().latitude;
        const lng = doc.data().longitude;

        const distanceInKm = geofire.distanceBetween([lat, lng], center);
        const distanceInM = distanceInKm * 1000;
        if (distanceInM <= radiusInM) {
          matchingDocs.push({ ...doc.data(), id: doc.id, distance: distanceInM });
        }
      }
    }

    if (matchingDocs.length > 0) {
      matchingDocs.sort((a, b) => a.distance - b.distance);
      const closestDriver = matchingDocs[0];

      await snap.ref.update({
        driverId: closestDriver.id,
        status: 'assigned',
      });

      await admin.firestore().collection('drivers').doc(closestDriver.id).update({
        status: 'busy',
      });

      console.log(`Conductor ${closestDriver.id} asignado al viaje ${snap.id}`);
      // Aquí se podría enviar una notificación FCM al conductor y al pasajero.
    } else {
      console.log(`No se encontraron conductores disponibles para el viaje ${snap.id}`);
      await snap.ref.update({ status: 'unassigned' });
    }

    return null;
  });
