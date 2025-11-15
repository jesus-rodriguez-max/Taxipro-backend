import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Calcula una cotización de tarifa SIN crear documento en Firestore.
 * Entrada: { estimatedDistanceKm: number, estimatedDurationMin?: number, isPhoneRequest?: boolean }
 * Salida: { ok: true, baseFare, distanceCost, totalFare, currency }
 */
export const quoteFareCallable = onCall(async (request) => {
  try {
    const { estimatedDistanceKm, estimatedDurationMin = 0, isPhoneRequest = false } = (request.data || {}) as any;

    if (typeof estimatedDistanceKm !== 'number' || isNaN(estimatedDistanceKm)) {
      throw new HttpsError('invalid-argument', 'estimatedDistanceKm must be a number');
    }

    const firestore = getFirestore();
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
    } as any;

    const tariffsSnap = await firestore.collection('fares').doc('tariffs').get();
    const tariffs = { ...defaults, ...(tariffsSnap.exists ? tariffsSnap.data() : {}) } as any;

    const now = new Date();
    const hour = now.getHours();
    const isDayTime = hour >= 6 && hour <= 20; // 06:00–20:59

    const baseFare = (isPhoneRequest
      ? (isDayTime ? tariffs.phoneBaseFareDay : tariffs.phoneBaseFareNight)
      : (isDayTime ? tariffs.baseFareDay : tariffs.baseFareNight));

    const distanceMeters = Math.max(0, Number(estimatedDistanceKm) * 1000);
    const durationSeconds = Math.max(0, Number(estimatedDurationMin || 0) * 60);
    const perMeters = Math.max(1, Number(tariffs.advanceMeters));
    const perSeconds = Math.max(1, Number(tariffs.advanceSeconds));
    const stepPrice = Number(tariffs.advancePrice);

    const byDistance = distanceMeters / perMeters;
    const byTime = durationSeconds / perSeconds;
    const advances = Math.ceil(Math.max(byDistance, byTime));
    const advancesCost = advances * stepPrice;

    const totalFare = baseFare + advancesCost;

    return {
      ok: true,
      baseFare,
      distanceCost: advancesCost,
      totalFare,
      currency: tariffs.currency,
    };
  } catch (e: any) {
    if (e instanceof HttpsError) throw e;
    throw new HttpsError('internal', e?.message || 'Unknown error');
  }
});
