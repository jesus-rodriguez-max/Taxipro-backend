import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { Trip, TripStatus, User } from '../lib/types';
import { createPaymentIntent } from '../stripe/service';

const NO_SHOW_WAIT_MINUTES = 5;
const PENALTY_FARE = 5000; // Ejemplo: 50.00 MXN en centavos

interface MarkAsNoShowData {
  tripId: string;
}

/**
 * Función invocable para que un chofer marque que el pasajero no se presentó.
 */
export const markAsNoShowCallable = async (data: MarkAsNoShowData, context: any) => {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'El usuario no está autenticado.');
  }

  const driverId = context.auth.uid;
  const { tripId } = data;
  const tripRef = admin.firestore().collection('trips').doc(tripId);

  const tripDoc = await tripRef.get();
  if (!tripDoc.exists) {
    throw new HttpsError('not-found', `El viaje ${tripId} no existe.`);
  }
  const trip = tripDoc.data() as Trip;

  if (trip.driverId !== driverId) {
    throw new HttpsError('permission-denied', 'No tienes permiso para modificar este viaje.');
  }

  if (trip.status !== TripStatus.ARRIVED) {
    throw new HttpsError('failed-precondition', `No puedes marcar 'no presentado' en un viaje que no está en estado 'ARRIVED'.`);
  }

  // Validar que han pasado los 5 minutos
  const now = new Date();
  const arrivedAt = (trip.driverArrivedAt as any).toDate();
  const diffMinutes = (now.getTime() - arrivedAt.getTime()) / (1000 * 60);

  if (diffMinutes <= NO_SHOW_WAIT_MINUTES) {
    throw new HttpsError('failed-precondition', `Debes esperar al menos ${NO_SHOW_WAIT_MINUTES} minutos antes de marcar 'no presentado'.`);
  }

  // Lógica de cobro de penalización (idéntica a cancelTrip)
  const userRef = admin.firestore().collection('users').doc(trip.passengerId);
  const userDoc = await userRef.get();
  const user = userDoc.data() as User;

  try {
    if (user.stripeCustomerId && user.defaultPaymentMethodId) {
      await createPaymentIntent(PENALTY_FARE, 'mxn', user.stripeCustomerId, user.defaultPaymentMethodId);
      await tripRef.update({
        status: TripStatus.NO_SHOW,
        'fare.penalty': PENALTY_FARE,
        'payment.method': 'stripe',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { success: true, message: 'Pasajero marcado como no presentado. Se ha cobrado una penalización.' };
    } else {
      throw new Error('No payment method');
    }
  } catch (error) {
    await userRef.update({ pendingBalance: admin.firestore.FieldValue.increment(PENALTY_FARE) });
    await tripRef.update({
      status: TripStatus.NO_SHOW,
      'fare.penalty': PENALTY_FARE,
      'payment.method': 'pending_balance',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: 'Pasajero marcado como no presentado. Se añadió penalización a su saldo pendiente.' };
  }
};
