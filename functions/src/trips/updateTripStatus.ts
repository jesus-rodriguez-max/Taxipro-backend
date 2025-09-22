import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { Trip, TripStatus, GeoPoint, Stop } from '../lib/types';
import { getDistanceInMeters } from '../lib/geo';

// --- Constantes de Configuración ---
const BASE_FARE = 5000; // 50.00 MXN en centavos
const COST_PER_KM_CENTS = 1500; // 15.00 MXN
const COST_PER_MIN_CENTS = 200; // 2.00 MXN

interface UpdateTripData {
  tripId: string;
  newStatus?: TripStatus;
  currentLocation?: GeoPoint;
  newDestination?: { point: GeoPoint; address: string };
  newStop?: { location: GeoPoint; address: string };
}

/**
 * Gestiona todas las actualizaciones de un viaje: cambio de estado, taxímetro, etc.
 */
export const updateTripStatusCallable = async (data: UpdateTripData, context: any) => {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'El usuario no está autenticado.');
  }

  const { tripId, newStatus, currentLocation, newDestination, newStop } = data;
  const tripRef = admin.firestore().collection('trips').doc(tripId);
  const tripDoc = await tripRef.get();
  if (!tripDoc.exists) {
    throw new HttpsError('not-found', 'Viaje no encontrado.');
  }

  const trip = tripDoc.data() as Trip;
  const batch = admin.firestore().batch();
  let response = { success: true, message: 'Viaje actualizado.' };

  // 1. Cambio de Destino
  if (newDestination) {
    handleDestinationChange(trip, newDestination, batch, tripRef);
  }

  // 2. Añadir Parada Extra
  if (newStop) {
    handleAddStop(trip, newStop, batch, tripRef);
  }

  // 3. Actualización de Ubicación (Taxímetro en tiempo real)
  if (currentLocation && trip.status === TripStatus.ACTIVE) {
    handleLocationUpdate(trip, currentLocation, batch, tripRef);
  }

  // 4. Cambio de Estado
  if (newStatus) {
    await handleStatusChange(tripDoc.id, trip, newStatus, batch, tripRef);
    if (newStatus === TripStatus.COMPLETED) {
      response.message = 'Viaje completado. Calculando tarifa final.';
    }
  }

  await batch.commit();
  return response;
};

// --- Lógica Modularizada ---

function handleDestinationChange(trip: Trip, dest: any, batch: admin.firestore.WriteBatch, ref: admin.firestore.DocumentReference) {
  const progress = (trip.distance?.travelled || 0) / (trip.distance?.planned || 1);
  const update: any = { 'destination': dest };
  if (progress > 0.6) {
    update['fare.surcharges'] = admin.firestore.FieldValue.increment(BASE_FARE);
  }
  batch.update(ref, update);
}

function handleAddStop(trip: Trip, stop: any, batch: admin.firestore.WriteBatch, ref: admin.firestore.DocumentReference) {
  batch.update(ref, {
    stops: admin.firestore.FieldValue.arrayUnion(stop),
    'fare.stops': admin.firestore.FieldValue.increment(BASE_FARE),
  });
}

function handleLocationUpdate(trip: Trip, loc: GeoPoint, batch: admin.firestore.WriteBatch, ref: admin.firestore.DocumentReference) {
  const lastKnownLocation = trip.lastKnownLocation || trip.origin.point; // Asume un campo `lastKnownLocation`
  const distanceIncrement = getDistanceInMeters(lastKnownLocation, loc);
  batch.update(ref, {
    'distance.travelled': admin.firestore.FieldValue.increment(distanceIncrement),
    lastKnownLocation: loc,
  });
}

async function handleStatusChange(tripId: string, trip: Trip, newStatus: TripStatus, batch: admin.firestore.WriteBatch, ref: admin.firestore.DocumentReference) {
  // Aquí iría la validación de transición de estados (canTransition)
  const update: any = { status: newStatus, updatedAt: admin.firestore.FieldValue.serverTimestamp() };

  if (newStatus === TripStatus.ACTIVE && trip.status !== TripStatus.ACTIVE) {
    update.startedAt = admin.firestore.FieldValue.serverTimestamp();
  } else if (newStatus === TripStatus.COMPLETED || newStatus === TripStatus.CANCELLED) {
    update.completedAt = admin.firestore.FieldValue.serverTimestamp(); // Use completedAt for both for simplicity, or add cancelledAt

    // Update shared trip to inactive
    const sharedTripsQuery = await admin.firestore().collection('shared_trips').where('tripId', '==', tripId).get();
    sharedTripsQuery.forEach(doc => {
      batch.update(doc.ref, { active: false });
    });

    if (newStatus === TripStatus.COMPLETED) {
      // Cálculo de tarifa final
      const finalTripState = { ...trip, ...update }; // Simula el estado final para el cálculo
      const travelledSeconds = (finalTripState.completedAt.toMillis() - finalTripState.startedAt.toMillis()) / 1000;
      const distanceKm = (finalTripState.distance?.travelled || 0) / 1000;

      const timeFare = travelledSeconds * (COST_PER_MIN_CENTS / 60);
      const distanceFare = distanceKm * COST_PER_KM_CENTS;
      const stopsFare = finalTripState.fare?.stops || 0;
      const surcharges = finalTripState.fare?.surcharges || 0;

      const total = BASE_FARE + timeFare + distanceFare + stopsFare + surcharges;

      update['fare.total'] = Math.round(total);
      update['time.travelled'] = travelledSeconds;

      // Aquí se añadiría la lógica de cobro (Stripe o efectivo)
      // y la gestión del saldo pendiente.
    }

  batch.update(ref, update);
}