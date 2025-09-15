import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { TripStatus } from './lib/types.js';
import { log } from './lib/logging.js';

/**
 * Habilita el modo compartir viaje. Crea un token público, lo guarda en
 * `safety_shares/{token}` y actualiza el subdocumento safety.share del viaje.
 *
 * data: { tripId: string, recipients?: string[] }
 */
export const enableShareCallable = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debe iniciar sesión');
  }
  const { tripId, recipients } = data;
  if (!tripId) {
    throw new functions.https.HttpsError('invalid-argument', 'tripId es obligatorio');
  }

  const userId = context.auth.uid;
  const tripRef = admin.firestore().collection('trips').doc(tripId);
  const tripSnap = await tripRef.get();
  if (!tripSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'El viaje no existe');
  }
  const trip = tripSnap.data();
  if (trip!.passengerId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Solo el pasajero puede compartir su viaje');
  }
  if (![TripStatus.ACTIVE, TripStatus.ASSIGNED].includes(trip!.status)) {
    throw new functions.https.HttpsError('failed-precondition', 'Solo se puede compartir un viaje activo o asignado');
  }

  // Generar token único y establecer expiración de 24 horas
  const token = admin.firestore().collection('safety_shares').doc().id;
  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);

  await admin.firestore().collection('safety_shares').doc(token).set({
    tripId,
    active: true,
    expiresAt,
    lastLocation: trip!.location || null,
    status: trip!.status,
    createdAt: now,
  });

  await tripRef.update({
    'safety.share': {
      active: true,
      linkToken: token,
      recipients: recipients ?? null,
      startedAt: now,
    },
  });

  await log('ShareEnabled', { tripId, token });
  return { token, expiresAt: expiresAt.toDate().toISOString() };
});

/**
 * Deshabilita el modo compartir viaje. Marca share.active = false y expira el token.
 *
 * data: { tripId: string }
 */
export const disableShareCallable = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debe iniciar sesión');
  }
  const { tripId } = data;
  if (!tripId) {
    throw new functions.https.HttpsError('invalid-argument', 'tripId es obligatorio');
  }

  const userId = context.auth.uid;
  const tripRef = admin.firestore().collection('trips').doc(tripId);
  const tripSnap = await tripRef.get();
  if (!tripSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'El viaje no existe');
  }
  const trip = tripSnap.data();
  if (trip!.passengerId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Solo el pasajero puede desactivar el compartir');
  }
  const token = trip?.safety?.share?.linkToken;
  if (!token) {
    throw new functions.https.HttpsError('failed-precondition', 'El viaje no tiene enlace activo');
  }

  const now = admin.firestore.Timestamp.now();

  await admin.firestore().collection('safety_shares').doc(token).update({
    active: false,
    expiresAt: now,
  });

  await tripRef.update({
    'safety.share.active': false,
    'safety.share.endedAt': now,
  });

  await log('ShareDisabled', { tripId, token });
  return { success: true };
});

/**
 * Devuelve la ubicación y estado del viaje para un token dado.
 * Este endpoint es HTTP público y se usa desde el enlace compartido.
 */
export const getShareStatus = functions.https.onRequest(async (req, res) => {
  const token = (req.query.token as string) || (req.params.token as string);
  if (!token) {
    res.status(400).json({ error: 'token requerido' });
    return;
  }

  const shareSnap = await admin.firestore().collection('safety_shares').doc(token).get();
  if (!shareSnap.exists) {
    res.status(404).json({ error: 'enlace no encontrado' });
    return;
  }
  const share = shareSnap.data()!;
  const now = admin.firestore.Timestamp.now();
  if (!share.active || share.expiresAt.toMillis() <= now.toMillis()) {
    res.status(410).json({ error: 'enlace expirado' });
    return;
  }

  const tripSnap = await admin.firestore().collection('trips').doc(share.tripId).get();
  const trip = tripSnap.data();

  // Devolver solo los campos necesarios
  res.json({
    tripId: share.tripId,
    status: share.status,
    lastLocation: share.lastLocation ?? null,
    driver: trip?.driverId
      ? {
          id: trip.driverId,
          name: trip.driver?.name ?? null,
          vehicle: trip.driver?.vehicle ?? null,
        }
      : null,
  });
});
