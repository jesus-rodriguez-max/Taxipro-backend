import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { Trip, TripStatus, User } from '../lib/types';
import { createPaymentIntent } from '../stripe/service';

const CANCELLATION_GRACE_PERIOD_MINUTES = 5;
const PENALTY_FARE = 5000; // Ejemplo: 50.00 MXN en centavos

interface CancelTripData {
  tripId: string;
}

/**
 * Función invocable para que un pasajero cancele un viaje.
 * Aplica una penalización si es necesario.
 */
import { onCall } from 'firebase-functions/v2/https';

export const cancelTripCallable = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'El usuario no está autenticado.');
  }

  const passengerId = request.auth.uid;
  const { tripId } = request.data as CancelTripData;
  const tripRef = admin.firestore().collection('trips').doc(tripId);
  const userRef = admin.firestore().collection('users').doc(passengerId);

  const tripDoc = await tripRef.get();
  if (!tripDoc.exists) {
    throw new HttpsError('not-found', `El viaje ${tripId} no existe.`);
  }
  const trip = tripDoc.data() as Trip;

  if (trip.passengerId !== passengerId) {
    throw new HttpsError('permission-denied', 'No puedes cancelar este viaje.');
  }

  const isCancellable = [TripStatus.PENDING, TripStatus.ASSIGNED, TripStatus.ARRIVED].includes(trip.status);
  if (!isCancellable) {
    throw new HttpsError('failed-precondition', `No se puede cancelar un viaje en estado '${trip.status}'.`);
  }

  // Lógica de penalización
  let applyPenalty = false;
  if (trip.status === TripStatus.ARRIVED && trip.driverArrivedAt) {
    const now = new Date();
    const arrivedAt = (trip.driverArrivedAt as any).toDate();
    const diffMinutes = (now.getTime() - arrivedAt.getTime()) / (1000 * 60);

    if (diffMinutes > CANCELLATION_GRACE_PERIOD_MINUTES) {
      applyPenalty = true;
    }
  }

  if (applyPenalty) {
    // Aplicar penalización
    const userDoc = await userRef.get();
    const user = userDoc.data() as User;

    try {
      // Intento de cobro con Stripe
      if (user.stripeCustomerId && user.defaultPaymentMethodId) { // Asumiendo que tenemos defaultPaymentMethodId
        await createPaymentIntent(PENALTY_FARE, 'mxn', user.stripeCustomerId, user.defaultPaymentMethodId);
        await tripRef.update({
          status: TripStatus.CANCELLED_WITH_PENALTY,
          'fare.penalty': PENALTY_FARE,
          'payment.method': 'stripe',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, message: 'Viaje cancelado. Se ha cobrado una penalización.' };
      } else {
        throw new Error('No payment method'); // Forzar fallback a saldo pendiente
      }
    } catch (error) {
      // Si falla el cobro o no hay tarjeta, se usa el saldo pendiente
      await userRef.update({ pendingBalance: admin.firestore.FieldValue.increment(PENALTY_FARE) });
      await tripRef.update({
        status: TripStatus.CANCELLED_WITH_PENALTY,
        'fare.penalty': PENALTY_FARE,
        'payment.method': 'pending_balance',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { success: true, message: 'Viaje cancelado. Se añadió una penalización a tu saldo pendiente.' };
    }
  } else {
    // Cancelación gratuita
    await tripRef.update({
      status: TripStatus.CANCELLED_BY_PASSENGER,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: 'Viaje cancelado gratuitamente.' };
  }
});
