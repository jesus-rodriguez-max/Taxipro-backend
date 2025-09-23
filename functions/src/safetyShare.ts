import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { Request, Response } from 'express';
import { Trip } from './lib/types';
import * as crypto from 'crypto';

interface EnableShareData {
  tripId: string;
}

interface DisableShareData {
  shareToken: string;
}

// Función para generar un token seguro
const generateShareToken = () => crypto.randomBytes(20).toString('hex');

/**
 * Habilita la compartición de un viaje, generando un token de acceso.
 */
export const enableShareCallable = functions.https.onCall(async (data: EnableShareData, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'El usuario no está autenticado.');
  }

  const { tripId } = data;
  const tripRef = admin.firestore().collection('trips').doc(tripId);
  const tripDoc = await tripRef.get();

  if (!tripDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'El viaje no existe.');
  }
  const trip = tripDoc.data() as Trip;

  if (trip.passengerId !== context.auth.uid && trip.driverId !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'No puedes compartir este viaje.');
  }

  const shareToken = generateShareToken();
  const shareRef = admin.firestore().collection('shared_trips').doc(shareToken);

  await shareRef.set({
    tripId: tripId,
    passengerId: trip.passengerId,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000), // Expira en 24h
  });

  return { success: true, shareToken };
});

/**
 * Deshabilita la compartición de un viaje.
 */
export const disableShareCallable = functions.https.onCall(async (data: DisableShareData, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'El usuario no está autenticado.');
  }

  const { shareToken } = data;
  const shareRef = admin.firestore().collection('shared_trips').doc(shareToken);
  const shareDoc = await shareRef.get();

  if (!shareDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'El token de compartición no es válido.');
  }

  if (shareDoc.data()?.passengerId !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'No tienes permiso para detener esta compartición.');
  }

  await shareRef.update({ isActive: false });

  return { success: true, message: 'Se ha detenido la compartición del viaje.' };
});

/**
 * Función HTTP para obtener el estado de un viaje compartido usando un token.
 * Es pública pero solo expone datos mínimos y seguros.
 */
export const getShareStatus = functions.https.onRequest(async (req: Request, res: Response) => {
  const { token } = req.query;
  if (typeof token !== 'string') {
    res.status(400).send('Token no proporcionado.');
    return;
  }

  const shareRef = admin.firestore().collection('shared_trips').doc(token);
  const shareDoc = await shareRef.get();

  if (!shareDoc.exists || !shareDoc.data()?.isActive) {
    res.status(404).send('El viaje compartido no está activo o no existe.');
    return;
  }

  const tripId = shareDoc.data()?.tripId;
  const tripRef = admin.firestore().collection('trips').doc(tripId);
  const tripDoc = await tripRef.get();

  if (!tripDoc.exists) {
    res.status(404).send('El viaje asociado no fue encontrado.');
    return;
  }

  const trip = tripDoc.data() as Trip;

  // Exponer solo datos seguros y mínimos
  const safeData = {
    status: trip.status,
    lastKnownLocation: trip.lastKnownLocation || null,
    driverArrivedAt: trip.driverArrivedAt || null,
    startedAt: trip.startedAt || null,
    completedAt: trip.completedAt || null,
  };

  res.status(200).json(safeData);
});