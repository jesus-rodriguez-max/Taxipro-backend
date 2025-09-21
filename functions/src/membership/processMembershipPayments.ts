import * as admin from 'firebase-admin';
import { pubsub } from 'firebase-functions';
import { Driver, DriverMembershipStatus, User } from '../lib/types';
import { createPaymentIntent } from '../stripe/service';

const MEMBERSHIP_FEE = 20000; // 200.00 MXN en centavos

/**
 * Función programada para procesar los pagos de membresía de los choferes.
 * Se ejecuta todos los días a las 5:00 AM.
 */
export const processMembershipPayments = pubsub
  .schedule('0 5 * * *') // Todos los días a las 5 AM
  .timeZone('America/Mexico_City')
  .onRun(async (context) => {
    const firestore = admin.firestore();
    const today = new Date().getDay(); // Domingo=0, Lunes=1, ..., Sábado=6

    // Solo se ejecuta los viernes, sábados y domingos
    if (![5, 6, 0].includes(today)) {
      console.log('Hoy no es día de cobro de membresía. Omitiendo ejecución.');
      return null;
    }

    const driversToChargeQuery = firestore
      .collection('drivers')
      .where('membership.status', 'in', [DriverMembershipStatus.ACTIVE, DriverMembershipStatus.GRACE_PERIOD]);

    const snapshot = await driversToChargeQuery.get();
    if (snapshot.empty) {
      console.log('No hay choferes para procesar el pago de membresía.');
      return null;
    }

    const chargePromises = snapshot.docs.map(async (doc) => {
      const driver = doc.data() as Driver;
      const driverId = doc.id;
      const userRef = firestore.collection('users').doc(driverId); // Asumimos que el driver es un user

      try {
        const userDoc = await userRef.get();
        if (!userDoc.exists) throw new Error(`Usuario ${driverId} no encontrado.`);
        
        const user = userDoc.data() as User;
        if (!user.stripeCustomerId || !user.defaultPaymentMethodId) {
          throw new Error(`El chofer ${driverId} no tiene un método de pago configurado.`);
        }

        // Intenta realizar el cobro
        await createPaymentIntent(MEMBERSHIP_FEE, 'mxn', user.stripeCustomerId, user.defaultPaymentMethodId);

        // Si el pago es exitoso, actualiza el estado a ACTIVO
        return doc.ref.update({
          'membership.status': DriverMembershipStatus.ACTIVE,
          'membership.lastPaymentAttempt': admin.firestore.FieldValue.serverTimestamp(),
        });

      } catch (error) {
        console.error(`Fallo el cobro para el chofer ${driverId}:`, error);
        // Si falla, se mueve a PERIODO DE GRACIA
        return doc.ref.update({
          'membership.status': DriverMembershipStatus.GRACE_PERIOD,
          'membership.lastPaymentAttempt': admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    await Promise.all(chargePromises);
    console.log(`Proceso de pago de membresías completado para ${snapshot.size} choferes.`);
    return null;
  });

/**
 * Función programada para suspender a los miembros con pagos vencidos.
 * Se ejecuta todos los lunes a las 5:00 AM.
 */
export const suspendOverdueMemberships = pubsub
  .schedule('0 5 * * 1') // Todos los lunes a las 5 AM
  .timeZone('America/Mexico_City')
  .onRun(async (context) => {
    const firestore = admin.firestore();
    const driversToSuspendQuery = firestore
      .collection('drivers')
      .where('membership.status', '==', DriverMembershipStatus.GRACE_PERIOD);

    const snapshot = await driversToSuspendQuery.get();
    if (snapshot.empty) {
      console.log('No hay choferes para suspender.');
      return null;
    }

    const suspensionPromises = snapshot.docs.map((doc) => {
      return doc.ref.update({ 'membership.status': DriverMembershipStatus.SUSPENDED });
    });

    await Promise.all(suspensionPromises);
    console.log(`${snapshot.size} choferes han sido suspendidos por falta de pago.`);
    return null;
  });