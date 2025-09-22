import { https } from 'firebase-functions';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { Trip, TripStatus, GeoPoint } from '../lib/types';

import { log } from '../lib/logging.js';

export const requestTripCallable = async (data: any, context: https.CallableContext) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { origin, destination, estimatedDistanceKm, isPhoneRequest } = data;

  const passengerId = context.auth.uid;

  if (!origin || !destination || typeof estimatedDistanceKm !== 'number') {
    throw new https.HttpsError('invalid-argument', 'Missing origin, destination, or estimatedDistanceKm.');
  }

  const firestore = getFirestore();

  // Check for existing active trips
  const activeTrips = await firestore.collection('trips')
    .where('passengerId', '==', passengerId)
    .where('status', 'in', ['assigned', 'active'])
    .limit(1)
    .get();

  if (!activeTrips.empty) {
    throw new https.HttpsError('failed-precondition', 'An active trip already exists for this passenger.');
  }

  // --- Normalizar origen/destino al tipo Trip ---
  const normalize = (loc: any) => {
    if (loc?.point && typeof loc.point.lat === 'number' && typeof loc.point.lng === 'number') {
      return { point: loc.point as GeoPoint, address: loc.address ?? '' };
    }
    if (typeof loc?.lat === 'number' && typeof loc?.lng === 'number') {
      return { point: { lat: loc.lat, lng: loc.lng } as GeoPoint, address: loc.address ?? '' };
    }
    throw new https.HttpsError('invalid-argument', 'Invalid origin/destination format.');
  };
  const normalizedOrigin = normalize(origin);
  const normalizedDestination = normalize(destination);

  // --- Lógica de Cálculo de Tarifas ---
  const tariffsDoc = await firestore.collection('fares').doc('tariffs').get();
  if (!tariffsDoc.exists || !tariffsDoc.data()?.active) {
    throw new https.HttpsError('unavailable', 'No active tariffs found.');
  }
  const tariffs = tariffsDoc.data() as any; // Castear a any para acceso fácil

  const now = new Date();
  const hour = now.getHours();
  const isDayTime = hour >= 6 && hour < 21; // 6 AM a 9 PM es día

  let baseFare = 0;
  if (isPhoneRequest) {
    baseFare = isDayTime ? tariffs.phoneBaseFareDay : tariffs.phoneBaseFareNight;
  } else {
    baseFare = isDayTime ? tariffs.baseFareDay : tariffs.baseFareNight;
  }

  const distanceCost = estimatedDistanceKm * tariffs.perKm;
  const totalFare = baseFare + distanceCost; // Simplificado, sin waitingIncrement por ahora

  const newTrip: Omit<Trip, 'id'> = {
    passengerId,
    status: TripStatus.PENDING,
    origin: normalizedOrigin,
    destination: normalizedDestination,
    estimatedDistanceKm,
    isPhoneRequest: isPhoneRequest || false,
    fare: {
      base: baseFare,
      perKm: tariffs.perKm,
      distanceCost: distanceCost,
      total: totalFare,
      currency: tariffs.currency,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    audit: { lastActor: 'passenger', lastAction: 'requestTrip' },
    payment: { method: 'cash', isSettledToDriver: false }, // Método de pago por defecto
  };

  const tripRef = await firestore.collection('trips').add(newTrip);

  await log(tripRef.id, 'Trip requested by passenger', { passengerId, origin, destination, totalFare });

  return { tripId: tripRef.id, totalFare };
};