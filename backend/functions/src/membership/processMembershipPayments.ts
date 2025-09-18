import * as admin from 'firebase-admin';
import { pubsub } from 'firebase-functions';
import { Driver, DriverMembershipStatus } from '../lib/types';
import { createPaymentIntent } from '../stripe/service';

const MEMBERSHIP_FEE_CENTS = 20000; // 200.00 MXN en centavos

/**
 * Se ejecuta diariamente a las 8:00 AM para procesar los pagos de membresías.
 * El topic es 'membership-payments', que debe ser invocado por Cloud Scheduler.
 */
export const processMembershipPayments = pubsub.topic('membership-payments').onPublish(async (message) => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // Domingo=0, Lunes=1, ..., Sábado=6

  const driversRef = admin.firestore().collection('drivers');

  if (dayOfWeek === 5) { // Viernes: Primer intento de cobro
    const snapshot = await driversRef.where('membership.automaticChargeAuthorized', '==', true)
                                     .where('membership.status', 'in', [DriverMembershipStatus.ACTIVE, DriverMembershipStatus.UNPAID])
                                     .get();
    for (const doc of snapshot.docs) {
      await attemptCharge(doc.id, doc.data() as Driver, 'saturday');
    }
  } else if (dayOfWeek === 6) { // Sábado: Segundo intento
    const snapshot = await driversRef.where('membership.status', '==', DriverMembershipStatus.GRACE_PERIOD)
                                     .where('membership.nextPaymentDay', '==', 'saturday').get();
    for (const doc of snapshot.docs) {
      await attemptCharge(doc.id, doc.data() as Driver, 'sunday');
    }
  } else if (dayOfWeek === 0) { // Domingo: Tercer intento
    const snapshot = await driversRef.where('membership.status', '==', DriverMembershipStatus.GRACE_PERIOD)
                                     .where('membership.nextPaymentDay', '==', 'sunday').get();
    for (const doc of snapshot.docs) {
      await attemptCharge(doc.id, doc.data() as Driver, 'suspend');
    }
  } else if (dayOfWeek === 1) { // Lunes: Suspensión
    const snapshot = await driversRef.where('membership.status', '==', DriverMembershipStatus.GRACE_PERIOD)
                                     .where('membership.nextPaymentDay', '==', 'suspend').get();
    for (const doc of snapshot.docs) {
      await doc.ref.update({ 'membership.status': DriverMembershipStatus.SUSPENDED });
    }
  }
});

async function attemptCharge(driverId: string, driver: Driver, nextStep: string) {
  const userRef = admin.firestore().collection('users').doc(driverId);
  const userDoc = await userRef.get();
  const user = userDoc.data() as any; // User type from types.ts

  try {
    if (!user.stripeCustomerId || !user.defaultPaymentMethodId) {
      throw new Error('Missing Stripe customer or payment method');
    }
    await createPaymentIntent(MEMBERSHIP_FEE_CENTS, 'mxn', user.stripeCustomerId, user.defaultPaymentMethodId);
    // Si el pago es exitoso (asumimos que el webhook lo manejará, pero actualizamos aquí para simpleza)
    await admin.firestore().collection('drivers').doc(driverId).update({
      'membership.status': DriverMembershipStatus.ACTIVE,
      'membership.lastPaidAt': admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    // Si el pago falla
    await admin.firestore().collection('drivers').doc(driverId).update({
      'membership.status': DriverMembershipStatus.GRACE_PERIOD,
      'membership.nextPaymentDay': nextStep,
    });
  }
}
