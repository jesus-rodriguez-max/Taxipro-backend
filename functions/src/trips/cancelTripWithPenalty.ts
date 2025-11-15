import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Trip, TripStatus } from '../lib/types';
import { getStripe } from '../stripe/service';
import { TRIPS_PENALTY_AMOUNT } from '../config';

interface CancelTripWithPenaltyData {
  tripId: string;
}

export const cancelTripWithPenaltyCallable = onCall({ secrets: ['STRIPE_SECRET'] }, async (request) => {
  if (!request.auth || !request.auth.token.role) {
    throw new HttpsError('unauthenticated', 'El usuario debe ser un conductor autenticado.');
  }

  const { tripId } = request.data as CancelTripWithPenaltyData;
  const driverId = request.auth.uid;
  const penaltyAmount: number = TRIPS_PENALTY_AMOUNT; // centavos
  const db = admin.firestore();

  const tripRef = db.collection('trips').doc(tripId);
  const tripSnap = await tripRef.get();

  if (!tripSnap.exists) {
    throw new HttpsError('not-found', 'El viaje no fue encontrado.');
  }

  const trip = tripSnap.data() as Trip;

  if (trip.penaltyCharged) {
    throw new HttpsError('already-exists', 'Ya se ha cobrado una penalización por este viaje.');
  }

  if (trip.driverId !== driverId) {
    throw new HttpsError('permission-denied', 'No puedes cancelar un viaje que no te fue asignado.');
  }

  // Lógica de validación de condiciones
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  const driverArrived = trip.status === TripStatus.ARRIVED;
  // Verificar si el conductor envió un mensaje después de llegar
  const messagesSnap = await tripRef.collection('messages')
    .where('authorId', '==', driverId)
    .where('timestamp', '>=', trip.arrivedAt!)
    .limit(1)
    .get();
  const messageSent = !messagesSnap.empty;
  const waitedEnough = trip.arrivedAt ? trip.arrivedAt.toMillis() < fiveMinutesAgo : false;
  const notStarted = trip.status === TripStatus.ASSIGNED || trip.status === TripStatus.ARRIVED;

  if (driverArrived && messageSent && waitedEnough && notStarted) {
    // Aplicar cargo de penalización
    const passengerSnap = await db.collection('users').doc(trip.passengerId).get();
    const passengerData = passengerSnap.data();

    if (passengerData?.stripeCustomerId) {
      try {
        await getStripe().charges.create({
          amount: penaltyAmount, // 23.00 MXN en centavos
          currency: 'mxn',
          customer: passengerData.stripeCustomerId,
          description: `Penalización por no-show en viaje ${tripId}`,
          metadata: { tripId },
        });
        // TODO: Enviar notificación al pasajero sobre el cobro de la penalización
      } catch (error) {
        console.error('Error al cobrar la penalización:', error);
        await tripRef.update({
          status: TripStatus.CANCELLED,
          penaltyChargeFailed: true,
          penaltyAmount: penaltyAmount / 100,
          penaltyReason: 'no_show',
          cancelledBy: 'driver',
        });
        throw new HttpsError('internal', 'No se pudo procesar el cargo de penalización.');
      }
    } else {
      // Marcar como cargo pendiente si no hay cliente de Stripe
      await db.collection('users').doc(trip.passengerId).collection('pending_charges').add({
        amount: penaltyAmount / 100,
        currency: 'mxn',
        description: `Penalización por no-show en viaje ${tripId}`,
        tripId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await tripRef.update({
      status: TripStatus.CANCELLED,
      penaltyCharged: true,
      penaltyAmount: penaltyAmount / 100, // Monto fijo
      penaltyReason: 'no_show',
      cancelledBy: 'driver',
    });

    return { status: 'success', message: 'Viaje cancelado con penalización.' };
  } else {
    // Cancelación normal sin penalización
    await tripRef.update({
      status: TripStatus.CANCELLED,
      cancelledBy: 'driver',
    });

    return { status: 'success', message: 'Viaje cancelado sin penalización.' };
  }
});
