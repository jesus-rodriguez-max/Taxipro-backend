// ===== Minimal Functions (v1) =====
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Timestamp } = require("firebase-admin/firestore");

if (!admin.apps?.length) admin.initializeApp();
const db = admin.firestore();

// Callable simple: crea un ride y confirma timestamps
exports.requestRide = functions.https.onCall(async (data, context) => {
  if (!context?.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Falta token");
  }
  const { pickupLocation, destination, fare } = data || {};
  const ok = (p) => p && typeof p.lat === "number" && typeof p.lng === "number";
  if (!ok(pickupLocation) || !ok(destination) || typeof fare !== "number" || fare <= 0) {
    throw new functions.https.HttpsError("invalid-argument","pickupLocation, destination y fare válidos son obligatorios.");
  }

  const now = Timestamp.now();
  const rideDoc = {
    userId: context.auth.uid,
    pickupLocation,
    destination,
    fare,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  const rideRef = await db.collection("rides").add(rideDoc);
  const snap = await rideRef.get();
  const saved = snap.data() || {};
  const hasCreated = !!saved.createdAt;
  const hasUpdated = !!saved.updatedAt;

  return { rideId: rideRef.id, hasCreated, hasUpdated };
});
exports.assignDriverToRide = require("firebase-functions").https.onCall(async (data, context) => {
  const admin = require("firebase-admin");
  const { Timestamp } = require("firebase-admin/firestore");
  if (!context?.auth) throw new (require("firebase-functions")).https.HttpsError("unauthenticated","Falta token");
  const { rideId } = data || {};
  if (!rideId) throw new (require("firebase-functions")).https.HttpsError("invalid-argument","rideId requerido");

  const db = admin.firestore();
  const STATUS = { PENDING: "pending", ASSIGNED: "assigned" };

  const rideRef = db.collection("rides").doc(rideId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(rideRef);
    if (!snap.exists) throw new (require("firebase-functions")).https.HttpsError("not-found","Ride inexistente");
    const ride = snap.data();
    if (ride.status !== STATUS.PENDING) {
      throw new (require("firebase-functions")).https.HttpsError("failed-precondition","Solo rides pending pueden asignarse");
    }
    tx.update(rideRef, {
      driverId: context.auth.uid,
      status: STATUS.ASSIGNED,
      acceptedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });

  return { ok: true };
});
exports.getRideLite = require("firebase-functions").https.onCall(async (data, context) => {
  const admin = require("firebase-admin");
  if (!context?.auth) throw new (require("firebase-functions")).https.HttpsError("unauthenticated","Falta token");
  const { rideId } = data || {};
  if (!rideId) throw new (require("firebase-functions")).https.HttpsError("invalid-argument","rideId requerido");

  const snap = await admin.firestore().collection("rides").doc(rideId).get();
  if (!snap.exists) throw new (require("firebase-functions")).https.HttpsError("not-found","Ride inexistente");
  const r = snap.data() || {};
  return { driverId: r.driverId || null, status: r.status || null };
});
exports.updateRideStatus = require("firebase-functions").https.onCall(async (data, context) => {
  const functions = require("firebase-functions");
  const admin = require("firebase-admin");
  const { Timestamp } = require("firebase-admin/firestore");
  if (!context?.auth) throw new functions.https.HttpsError("unauthenticated","Falta token");
  const { rideId, nextStatus } = data || {};
  if (!rideId || !nextStatus) throw new functions.https.HttpsError("invalid-argument","rideId y nextStatus requeridos");

  const db = admin.firestore();
  const STATUS = { ASSIGNED: "assigned", ACTIVE: "active", COMPLETED: "completed" };
  const isAdmin = !!context?.auth?.token?.admin;

  const rideRef = db.collection("rides").doc(rideId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(rideRef);
    if (!snap.exists) throw new functions.https.HttpsError("not-found","Ride inexistente");
    const ride = snap.data();

    const isDriver = ride.driverId && ride.driverId === context.auth.uid;
    if (!(isDriver || isAdmin)) throw new functions.https.HttpsError("permission-denied","Solo chofer asignado o admin");

    const valid =
      (ride.status === STATUS.ASSIGNED && nextStatus === STATUS.ACTIVE) ||
      (ride.status === STATUS.ACTIVE && nextStatus === STATUS.COMPLETED);
    if (!valid) throw new functions.https.HttpsError("failed-precondition", `Transición inválida ${ride.status} → ${nextStatus}`);

    const patch = { status: nextStatus, updatedAt: Timestamp.now() };
    if (nextStatus === STATUS.ACTIVE) patch.startedAt = Timestamp.now();
    if (nextStatus === STATUS.COMPLETED) patch.completedAt = Timestamp.now();

    tx.update(rideRef, patch);
  });

  return { ok: true };
});
exports.simulatePayment = require("firebase-functions").https.onCall(async (data, context) => {
  const functions = require("firebase-functions");
  const admin = require("firebase-admin");
  const { Timestamp } = require("firebase-admin/firestore");
  if (!context?.auth) throw new functions.https.HttpsError("unauthenticated","Falta token");
  const { rideId } = data || {};
  if (!rideId) throw new functions.https.HttpsError("invalid-argument","rideId requerido");

  const db = admin.firestore();
  const rideRef = db.collection("rides").doc(rideId);
  const snap = await rideRef.get();
  if (!snap.exists) throw new functions.https.HttpsError("not-found","Ride inexistente");
  const ride = snap.data();
  if (ride.status !== "completed") {
    throw new functions.https.HttpsError("failed-precondition","Pago solo con ride COMPLETED");
  }

  const platformFee = Math.round(ride.fare * 0.15);
  const driverNet = ride.fare - platformFee;

  await rideRef.update({
    payment: { simulated: true, amount: ride.fare, platformFee, driverNet, paidAt: Timestamp.now() },
    updatedAt: Timestamp.now(),
  });
  return { ok: true };
});
