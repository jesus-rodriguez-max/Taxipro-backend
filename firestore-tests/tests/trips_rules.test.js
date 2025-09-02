const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { readFileSync } = require("fs");

/*
 * Test suite for the `trips` collection security rules.
 *
 * These tests initialise a Firestore emulator with the rules defined
 * in `../firestore.rules`.  Each document created in the tests
 * contains all of the required fields (`userId`, `driverId`,
 * `status`, `createdAt`, `pickup`, `destination`, `acceptedAt`,
 * `startedAt`, `finishedAt` and `driverLocation`).  Without these
 * fields the rules will short‑circuit with a Null value error as
 * observed in the emulator logs.  The transition tests below follow
 * the allowed state machine: pending → assigned (requires `driverId`
 * and `acceptedAt`), assigned → active (requires `startedAt`) and
 * active → completed (requires `finishedAt`).
 */

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "taxipro-usuariox",
    firestore: { rules: readFileSync("../firestore.rules", "utf8") }
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

/**
 * Returns a Firestore instance authenticated as the given UID.
 *
 * @param {string|null} uid The UID to authenticate as. Pass `null`
 *   for an unauthenticated context.
 */
const setup = async (uid) => testEnv.authenticatedContext(uid).firestore();

/**
 * Runs the provided callback with security rules disabled.  This
 * utility is used to prepopulate the emulator with documents
 * regardless of the rules; without it, writes in the test
 * setup would fail.  The callback receives an admin Firestore
 * instance which can perform arbitrary reads/writes.
 *
 * @param {(adminDb: import('@firebase/rules-unit-testing').Firestore) => Promise<void>} callback
 */
const withAdmin = async (callback) => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const adminDb = ctx.firestore();
    await callback(adminDb);
  });
};

/**
 * Constructs a well‑formed trip document.  All required fields
 * defined in the Firestore rules are provided.  Callers may
 * override any field by passing an overrides object.
 *
 * @param {object} [overrides] Partial trip fields to override.
 */
const buildTrip = (overrides = {}) => {
  const now = new Date();
  return {
    userId: overrides.userId ?? "user_123",
    driverId: overrides.hasOwnProperty("driverId") ? overrides.driverId : null,
    status: overrides.status ?? "pending",
    createdAt: overrides.createdAt ?? now,
    pickup: overrides.pickup ?? {
      address: "Origen",
      coords: { lat: 20.0, lng: -100.0 }
    },
    destination: overrides.destination ?? {
      address: "Destino",
      coords: { lat: 21.0, lng: -101.0 }
    },
    acceptedAt: overrides.hasOwnProperty("acceptedAt") ? overrides.acceptedAt : null,
    startedAt: overrides.hasOwnProperty("startedAt") ? overrides.startedAt : null,
    finishedAt: overrides.hasOwnProperty("finishedAt") ? overrides.finishedAt : null,
    driverLocation: overrides.driverLocation ?? { lat: 20.5, lng: -100.5 }
  };
};

describe("Trips security rules", () => {
  test("Usuario puede leer SOLO su viaje", async () => {
    // Arrange: create two trips, one owned by user_123 and one by user_999
    await withAdmin(async (adminDb) => {
      await adminDb.collection("trips").doc("trip_user_123").set(
        buildTrip({ userId: "user_123", status: "pending" })
      );
      await adminDb.collection("trips").doc("trip_user_999").set(
        buildTrip({ userId: "user_999", status: "pending" })
      );
    });

    // Act/Assert: user_123 should read their own trip but not others
    const db = await setup("user_123");
    await assertSucceeds(db.collection("trips").doc("trip_user_123").get());
    await assertFails(db.collection("trips").doc("trip_user_999").get());
  });

  test("Chofer puede aceptar pending -> assigned", async () => {
    // Arrange: create a pending trip with no driver assigned
    await withAdmin(async (adminDb) => {
      await adminDb.collection("trips").doc("trip1").set(
        buildTrip({ status: "pending", driverId: null })
      );
    });
    const driverUid = "driver_123";
    const db = await setup(driverUid);

    // Act/Assert: the assigned driver can claim the trip by setting driverId and acceptedAt
    await assertSucceeds(
      db.collection("trips").doc("trip1").update({
        status: "assigned",
        driverId: driverUid,
        acceptedAt: new Date()
      })
    );
  });

  test("Solo chofer asignado puede assigned -> active", async () => {
    // Arrange: create a trip already assigned to driver_123
    await withAdmin(async (adminDb) => {
      await adminDb.collection("trips").doc("trip2").set(
        buildTrip({
          status: "assigned",
          driverId: "driver_123",
          acceptedAt: new Date()
        })
      );
    });

    const assignedDriverDb = await setup("driver_123");
    const ref = assignedDriverDb.collection("trips").doc("trip2");

    // Act/Assert: assigned driver can start the trip
    await assertSucceeds(ref.update({ status: "active", startedAt: new Date() }));

    // Other drivers may not transition the trip
    const otherDb = await setup("driver_999");
    await assertFails(
      otherDb.collection("trips").doc("trip2").update({ status: "active", startedAt: new Date() })
    );
  });

  test("Solo chofer asignado puede active -> completed", async () => {
    // Arrange: create an active trip already started by driver_123
    await withAdmin(async (adminDb) => {
      await adminDb.collection("trips").doc("trip3").set(
        buildTrip({
          status: "active",
          driverId: "driver_123",
          acceptedAt: new Date(),
          startedAt: new Date()
        })
      );
    });

    const assignedDriverDb = await setup("driver_123");
    const ref = assignedDriverDb.collection("trips").doc("trip3");

    // Act/Assert: assigned driver can complete the trip
    await assertSucceeds(ref.update({ status: "completed", finishedAt: new Date() }));

    // Other drivers may not complete the trip
    const otherDb = await setup("driver_999");
    await assertFails(
      otherDb.collection("trips").doc("trip3").update({ status: "completed", finishedAt: new Date() })
    );
  });
});