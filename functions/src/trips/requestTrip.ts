import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { Trip, TripStatus, GeoPoint } from '../lib/types';

import { log } from '../lib/logging';

export const requestTripCallable = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { origin, destination, estimatedDistanceKm, estimatedDurationMin, isPhoneRequest } = request.data;

  const passengerId = request.auth.uid;

  if (!origin || !destination || typeof estimatedDistanceKm !== 'number') {
    throw new HttpsError('invalid-argument', 'Missing origin, destination, or estimatedDistanceKm.');
  }

  const firestore = getFirestore();

  // Check for existing active trips
  const activeTrips = await firestore.collection('trips')
    .where('passengerId', '==', passengerId)
    .where('status', 'in', ['assigned', 'active'])
    .limit(1)
    .get();

  if (!activeTrips.empty) {
    throw new HttpsError('failed-precondition', 'An active trip already exists for this passenger.');
  }

  // --- Normalizar origen/destino al tipo Trip ---
  const normalize = (loc: any) => {
    if (loc?.point && typeof loc.point.lat === 'number' && typeof loc.point.lng === 'number') {
      return { point: loc.point as GeoPoint, address: loc.address ?? '' };
    }
    if (typeof loc?.lat === 'number' && typeof loc?.lng === 'number') {
      return { point: { lat: loc.lat, lng: loc.lng } as GeoPoint, address: loc.address ?? '' };
    }
    throw new HttpsError('invalid-argument', 'Invalid origin/destination format.');
  };
  const normalizedOrigin = normalize(origin);
  const normalizedDestination = normalize(destination);

  // --- Lógica de Cálculo de Tarifas Oficial (SLP) ---
  // Defaults si el documento no existe
  const defaults = {
    baseFareDay: 21.0,
    baseFareNight: 25.90,
    phoneBaseFareDay: 21.0,
    phoneBaseFareNight: 25.90,
    advancePrice: 2.025, // MXN por avance
    advanceSeconds: 39,   // segundos por avance
    advanceMeters: 250,   // metros por avance
    currency: 'MXN',
    active: true,
  };

  const tariffsSnap = await firestore.collection('fares').doc('tariffs').get();
  const tariffs = { ...defaults, ...(tariffsSnap.exists ? tariffsSnap.data() : {}) } as any;

  const now = new Date();
  const hour = now.getHours();
  // Horario diurno: 06:00 – 20:59, nocturno: 21:00 – 05:59
  const isDayTime = hour >= 6 && hour <= 20;

  const baseFare = (isPhoneRequest ? (isDayTime ? tariffs.phoneBaseFareDay : tariffs.phoneBaseFareNight)
                                   : (isDayTime ? tariffs.baseFareDay : tariffs.baseFareNight));

  const distanceMeters = Math.max(0, Number(estimatedDistanceKm) * 1000);
  const durationSeconds = Math.max(0, Number(estimatedDurationMin || 0) * 60);
  const perMeters = Math.max(1, Number(tariffs.advanceMeters));
  const perSeconds = Math.max(1, Number(tariffs.advanceSeconds));
  const stepPrice = Number(tariffs.advancePrice);

  // Número de avances cobrables: lo que ocurra primero en cada paso => aproximación por máximo total
  const byDistance = distanceMeters / perMeters;
  const byTime = durationSeconds / perSeconds;
  const advances = Math.ceil(Math.max(byDistance, byTime));
  const advancesCost = advances * stepPrice;

  const totalFare = baseFare + advancesCost;

  const newTrip: Omit<Trip, 'id'> = {
    passengerId,
    status: TripStatus.PENDING,
    origin: normalizedOrigin,
    destination: normalizedDestination,
    estimatedDistanceKm,
    isPhoneRequest: isPhoneRequest || false,
    fare: {
      base: baseFare,
      distanceCost: advancesCost,
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
});