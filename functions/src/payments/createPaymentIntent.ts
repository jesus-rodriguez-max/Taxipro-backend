import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getStripe } from "../stripe/service";
import { logger } from "firebase-functions";

/**
 * Crea un PaymentIntent de Stripe para un viaje específico usando un Cargo Directo.
 * El dinero va del pasajero a la cuenta de Stripe Connect del chofer.
 */
export const createPaymentIntentCallable = onCall(
  { secrets: ["STRIPE_SECRET"] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }

    const { tripId, idempotencyKey } = request.data || {};
    if (!tripId) {
      return { error: true, code: 'invalid-argument', message: 'Se requiere `tripId`.' };
    }

    const db = admin.firestore();
    const tripRef = db.collection("trips").doc(tripId);

    try {
      const tripDoc = await tripRef.get();
      if (!tripDoc.exists) {
        return { error: true, code: 'not-found', message: 'El viaje no fue encontrado.' };
      }

      const tripData = tripDoc.data() as any;
      if (tripData.passengerId !== request.auth.uid) {
        return { error: true, code: 'permission-denied', message: 'No puedes pagar este viaje.' };
      }

      const { driverId, passengerId, fare } = tripData;
      const amount = Math.round((fare?.total || 0) * 100);
      if (!driverId || !passengerId || !fare || !fare.total || amount <= 0) {
        return { error: true, code: 'failed-precondition', message: 'El viaje no tiene la información necesaria (chofer, pasajero o tarifa).' };
      }

      // 3. Obtener cuenta Connect del chofer
      const driverSnap = await db.collection('drivers').doc(driverId).get();
      const driverStripeAccountId: string | undefined = driverSnap.data()?.stripeAccountId;
      if (!driverStripeAccountId) {
        return { error: true, code: 'driver-missing-stripe', message: `El chofer ${driverId} no tiene cuenta de Stripe Connect.` };
      }

      // 4. Obtener el stripeCustomerId del pasajero
      const userDoc = await db.collection('users').doc(passengerId).get();
      const passengerStripeId: string | undefined = userDoc.data()?.stripeCustomerId;
      if (!passengerStripeId) {
        return { error: true, code: 'customer-missing', message: `El pasajero ${passengerId} no tiene cliente de Stripe.` };
      }

      // 5. Crear PaymentIntent en la plataforma (destination charge)
      const stripe = getStripe();
      const piParams: any = {
        amount,
        currency: 'mxn',
        customer: passengerStripeId,
        automatic_payment_methods: { enabled: true },
        on_behalf_of: driverStripeAccountId,
        transfer_data: { destination: driverStripeAccountId },
        metadata: { tripId, driverId, passengerId },
      };

      const requestOptions: any = {};
      if (idempotencyKey && typeof idempotencyKey === 'string') {
        requestOptions.idempotencyKey = idempotencyKey;
      }

      const paymentIntent = await stripe.paymentIntents.create(piParams, requestOptions);

      await tripRef.collection('payment').doc(paymentIntent.id).set({
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status || 'requires_payment_method',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        stripeConnectId: driverStripeAccountId,
        amount: fare.total,
      }, { merge: true });

      return { error: false, clientSecret: paymentIntent.client_secret };
    } catch (err: any) {
      const code = (err?.code as string) || 'stripe-error';
      const message = (err?.message as string) || 'No se pudo crear la intención de pago.';
      logger.error('Error al crear PaymentIntent (destination charge)', { tripId, code, message });
      return { error: true, code, message };
    }
  }
);