import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";

// Load the Firestore rules from the compiled repository.  Jest will resolve
// this relative path at runtime.  If you relocate the rules file, update the
// import accordingly.
const rules = readFileSync(new URL("../rules/firestore.rules", import.meta.url), "utf8");

/**
 * Extended Firestore rules tests
 *
 * These tests cover additional scenarios introduced by the TaxiPro backend,
 * including passenger cancellations, ratings/reviews, safety reads for
 * compliance admins, and public access control on share tokens.  Each test
 * uses the rules-unit-testing library to emulate Firestore clients with
 * different authentication contexts.
 */
describe("Extended Firestore Rules", () => {
  let env;

  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: "taxipro-test",
      firestore: { rules },
    });
  });

  afterAll(async () => {
    await env.cleanup();
  });

  /**
   * Build a minimal trip document for testing.  The document includes the
   * required fields defined by the rules and allows optional overrides.
   */
  function buildTrip(overrides = {}) {
    return {
      passengerId: overrides.passengerId ?? "passenger_1",
      status: overrides.status ?? "pending",
      origin: overrides.origin ?? { address: "Orig", coords: { lat: 0, lng: 0 } },
      destination: overrides.destination ?? { address: "Dest", coords: { lat: 0, lng: 0 } },
      driverId: overrides.driverId,
      acceptedAt: overrides.acceptedAt,
      startedAt: overrides.startedAt,
      completedAt: overrides.completedAt,
      rating: overrides.rating,
      review: overrides.review,
    };
  }

  test("Passenger can cancel their own pending trip", async () => {
    const passenger = env.authenticatedContext("passenger_1", { role: "user" });
    const db = passenger.firestore();
    const ref = db.collection("trips").doc("trip_cancel_1");
    await ref.set(buildTrip());
    await assertSucceeds(ref.update({ status: "cancelled" }));
  });

  test("Passenger cannot cancel someone else's trip", async () => {
    const passenger1 = env.authenticatedContext("passenger_1", { role: "user" });
    const passenger2 = env.authenticatedContext("passenger_2", { role: "user" });
    const db1 = passenger1.firestore();
    const db2 = passenger2.firestore();
    const ref = db1.collection("trips").doc("trip_cancel_2");
    await ref.set(buildTrip());
    // passenger_2 tries to cancel trip owned by passenger_1
    await assertFails(db2.collection("trips").doc("trip_cancel_2").update({ status: "cancelled" }));
  });

  test("Passenger can rate and review a completed trip", async () => {
    const passenger = env.authenticatedContext("passenger_1", { role: "user" });
    const db = passenger.firestore();
    const ref = db.collection("trips").doc("trip_rate_1");
    await ref.set(buildTrip({ status: "completed", driverId: "driver_1", completedAt: "server" }));
    await assertSucceeds(ref.update({ rating: 5, review: "Excelente servicio" }));
  });

  test("Passenger cannot rate a trip that is not completed", async () => {
    const passenger = env.authenticatedContext("passenger_1", { role: "user" });
    const db = passenger.firestore();
    const ref = db.collection("trips").doc("trip_rate_2");
    await ref.set(buildTrip({ status: "active", driverId: "driver_1", startedAt: "server" }));
    await assertFails(ref.update({ rating: 4, review: "Buen servicio" }));
  });

  test("Compliance admin can read safety subdocuments", async () => {
    const passenger = env.authenticatedContext("passenger_1", { role: "user" });
    const compliance = env.authenticatedContext("compliance_1", { admin_compliance: true, role: "compliance" });
    const dbPassenger = passenger.firestore();
    const dbCompliance = compliance.firestore();
    const tripRef = dbPassenger.collection("trips").doc("trip_safety_1");
    await tripRef.set(buildTrip());
    const safetyRef = tripRef.collection("safety").doc("doc1");
    await safetyRef.set({ anyField: true });
    await assertSucceeds(dbCompliance.collection("trips").doc("trip_safety_1").collection("safety").doc("doc1").get());
  });

  test("Regular user cannot read another user's safety subdocuments", async () => {
    const passenger1 = env.authenticatedContext("passenger_1", { role: "user" });
    const passenger2 = env.authenticatedContext("passenger_2", { role: "user" });
    const db1 = passenger1.firestore();
    const db2 = passenger2.firestore();
    const tripRef = db1.collection("trips").doc("trip_safety_2");
    await tripRef.set(buildTrip());
    const safetyRef = tripRef.collection("safety").doc("doc2");
    await safetyRef.set({ anotherField: true });
    await assertFails(db2.collection("trips").doc("trip_safety_2").collection("safety").doc("doc2").get());
  });

  test("Public read allowed on active share and denied on expired share", async () => {
    const passenger = env.authenticatedContext("passenger_1", { role: "user" });
    const db = passenger.firestore();
    const activeRef = db.collection("safety_shares").doc("token_active");
    const expiredRef = db.collection("safety_shares").doc("token_expired");
    await activeRef.set({ tripId: "t", active: true, expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
    await expiredRef.set({ tripId: "t", active: true, expiresAt: new Date(Date.now() - 60 * 60 * 1000) });
    const anon = env.unauthenticatedContext();
    const anonDb = anon.firestore();
    await assertSucceeds(anonDb.collection("safety_shares").doc("token_active").get());
    await assertFails(anonDb.collection("safety_shares").doc("token_expired").get());
  });
});