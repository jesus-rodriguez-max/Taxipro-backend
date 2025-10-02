import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { Trip, TripStatus, GeoPoint } from '../lib/types';
import { isWithinGeofence } from '../lib/geo';

const ARRIVAL_RADIUS_METERS = 150;

interface DriverArrivedData {
  tripId: string;
  location: GeoPoint;
}

/**
 * Función invocable que un chofer llama para marcar que ha llegado
 * al punto de recogida del pasajero.
 */
export const driverArrivedCallable = async (data: DriverArrivedData, context: any) => {
  // 1. Validar autenticación
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'El usuario no está autenticado.');
  }

  const driverId = context.auth.uid;
  const { tripId, location } = data;

  if (!tripId || !location) {
    throw new HttpsError('invalid-argument', 'Faltan parámetros (tripId, location).');
  }

  const tripRef = admin.firestore().collection('trips').doc(tripId);

  try {
    const tripDoc = await tripRef.get();
    if (!tripDoc.exists) {
      throw new HttpsError('not-found', `El viaje con ID ${tripId} no existe.`);
    }

    const trip = tripDoc.data() as Trip;

    // 2. Validaciones de negocio
    if (trip.driverId !== driverId) {
      throw new HttpsError('permission-denied', 'No tienes permiso para modificar este viaje.');
    }

    if (trip.status !== TripStatus.ASSIGNED) {
      throw new HttpsError('failed-precondition', `El viaje no está en estado 'ASSIGNED', sino '${trip.status}'.`);
    }

    // 3. Validar geolocalización
    if (!isWithinGeofence(location, trip.origin.point, ARRIVAL_RADIUS_METERS)) {
      throw new HttpsError('failed-precondition', `Debes estar a menos de ${ARRIVAL_RADIUS_METERS} metros del punto de recogida.`);
    }

    // 4. Actualizar el estado del viaje
    await tripRef.update({
      status: TripStatus.ARRIVED,
      driverArrivedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      'audit.lastActor': 'driver',
      'audit.lastAction': 'driverArrived',
    });

    return { success: true, message: 'Estado del viaje actualizado a ARRIVED.' };

  } catch (error) {
    console.error('Error en driverArrived:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Ocurrió un error al procesar la llegada.');
  }
};
