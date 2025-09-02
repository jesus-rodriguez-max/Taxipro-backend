const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')('sk_test_YOUR_STRIPE_SECRET_KEY'); // Reemplaza con tu clave secreta de Stripe

admin.initializeApp();
const db = admin.firestore();

/**
 * Crea una solicitud de viaje para un usuario.
 * Valida que el usuario no tenga otros viajes en estado activo, pendiente o asignado.
 * @param {object} data - Datos de la función, debe contener userId, origin y destination.
 * @param {object} context - Contexto de la función, incluyendo la autenticación del usuario.
 * @returns {Promise<{tripId: string}>} - El ID del viaje creado.
 */
exports.requestRide = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'El usuario no está autenticado.');
  }

  const { userId, origin, destination } = data;
  if (context.auth.uid !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'No puedes crear un viaje para otro usuario.');
  }

  // 1. Validar que el usuario no tenga un viaje activo
  const activeTripsQuery = await db.collection('trips')
    .where('userId', '==', userId)
    .where('status', 'in', ['pending', 'assigned', 'active'])
    .limit(1)
    .get();

  if (!activeTripsQuery.empty) {
    throw new functions.https.HttpsError('failed-precondition', 'Ya tienes un viaje en curso.');
  }

  // Lógica para calcular la tarifa (ejemplo simple)
  const fare = Math.floor(Math.random() * (50 - 10) + 10) * 100; // Tarifa aleatoria entre 10 y 50

  // 2. Crear el nuevo viaje
  const tripRef = await db.collection('trips').add({
    userId,
    origin,
    destination,
    status: 'pending', // Estado inicial
    driverId: null,
    fare: fare,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { tripId: tripRef.id };
});

/**
 * Permite a un conductor aceptar un viaje.
 * Valida que el conductor esté disponible (suscripción activa) y que el viaje esté pendiente.
 * @param {object} data - Debe contener tripId y driverId.
 * @param {object} context - Contexto de autenticación.
 * @returns {Promise<{success: boolean}>}
 */
exports.acceptRide = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'El conductor no está autenticado.');
  }

  const { tripId, driverId } = data;
  if (context.auth.uid !== driverId) {
    throw new functions.https.HttpsError('permission-denied', 'No puedes aceptar un viaje con otra identidad.');
  }

  const tripRef = db.collection('trips').doc(tripId);
  const driverSubRef = db.collection('subscriptions').doc(driverId);

  return db.runTransaction(async (transaction) => {
    // 1. Validar la suscripción del conductor
    const driverSubDoc = await transaction.get(driverSubRef);
    if (!driverSubDoc.exists || (driverSubDoc.data().status !== 'active' && driverSubDoc.data().status !== 'trialing')) {
      throw new functions.https.HttpsError('failed-precondition', 'Tu suscripción no está activa. No puedes aceptar viajes.');
    }

    // 2. Validar el estado del viaje
    const tripDoc = await transaction.get(tripRef);
    if (!tripDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'El viaje no existe.');
    }
    if (tripDoc.data().status !== 'pending') {
      throw new functions.https.HttpsError('failed-precondition', 'Este viaje ya no está disponible.');
    }

    // 3. Asignar el viaje al conductor
    transaction.update(tripRef, {
      status: 'assigned',
      driverId: driverId,
    });

    return { success: true };
  });
});

/**
 * Actualiza el estado de un viaje por parte del conductor asignado.
 * Valida las transiciones de estado permitidas (assigned -> active -> completed).
 * @param {object} data - Debe contener tripId, driverId y newStatus.
 * @param {object} context - Contexto de autenticación.
 * @returns {Promise<{success: boolean}>}
 */
exports.updateTripStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'El conductor no está autenticado.');
  }

  const { tripId, driverId, newStatus } = data;
  if (context.auth.uid !== driverId) {
    throw new functions.https.HttpsError('permission-denied', 'Acción no permitida.');
  }

  const allowedTransitions = {
    assigned: 'active',
    active: 'completed',
  };

  const tripRef = db.collection('trips').doc(tripId);

  return db.runTransaction(async (transaction) => {
    const tripDoc = await transaction.get(tripRef);
    if (!tripDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'El viaje no existe.');
    }

    const currentStatus = tripDoc.data().status;
    // Validar que el conductor que actualiza es el conductor asignado
    if (tripDoc.data().driverId !== driverId) {
      throw new functions.https.HttpsError('permission-denied', 'No estás asignado a este viaje.');
    }

    // Validar la transición de estado
    if (allowedTransitions[currentStatus] !== newStatus) {
      throw new functions.https.HttpsError('failed-precondition', `No se puede cambiar el estado de ${currentStatus} a ${newStatus}.`);
    }

    transaction.update(tripRef, { status: newStatus });
    return { success: true };
  });
});

/**
 * Maneja los webhooks de Stripe para actualizar el estado de las suscripciones.
 * Escucha eventos de creación, actualización y eliminación de suscripciones.
 */
exports.handleStripeWebhook = functions.https.onRequest(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const endpointSecret = 'whsec_YOUR_WEBHOOK_SIGNING_SECRET'; // Reemplaza con tu clave del webhook

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, signature, endpointSecret);
  } catch (err) {
    console.error('Error al verificar la firma del webhook:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const subscription = event.data.object;
  const customerId = subscription.customer;

  // Buscar al conductor por su ID de cliente de Stripe
  const driversQuery = await db.collection('drivers').where('stripeCustomerId', '==', customerId).limit(1).get();
  if (driversQuery.empty) {
    // Si no se encuentra el conductor, no podemos hacer nada.
    return res.status(404).send('No se encontró un conductor para este cliente de Stripe.');
  }
  const driverId = driversQuery.docs[0].id;
  const driverRef = db.collection('drivers').doc(driverId);
  const subRef = db.collection('subscriptions').doc(driverId);

  // Manejar el evento de Stripe
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const status = subscription.status;
      const currentPeriodEnd = subscription.current_period_end;
      
      await subRef.set({
        stripeSubscriptionId: subscription.id,
        status: status,
        current_period_end: admin.firestore.Timestamp.fromMillis(currentPeriodEnd * 1000),
      }, { merge: true });

      // Actualizar el estado 'isAvailable' del conductor
      const isAvailable = (status === 'active' || status === 'trialing');
      await driverRef.update({ isAvailable: isAvailable });
      break;

    case 'customer.subscription.deleted':
      await subRef.update({ status: 'expired' });
      await driverRef.update({ isAvailable: false });
      break;

    default:
      console.log(`Evento de webhook no manejado: ${event.type}`);
  }

  // Devolver una respuesta 200 para confirmar la recepción del evento
  res.status(200).send();
});
