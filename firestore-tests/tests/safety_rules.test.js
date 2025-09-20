
const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { readFileSync } = require("fs");

const rules = readFileSync("../firestore.rules", "utf8");

describe("Reglas de Seguridad - Escudo TaxiPro", () => {
  let env;

  beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: "safety-test", firestore: { rules } });
  });

  afterAll(async () => await env.cleanup());

  // --- Perfiles de Seguridad (safety_profiles) ---
  test("Usuario puede crear y modificar su propio perfil de seguridad", async () => {
    const user = env.authenticatedContext("user_1");
    const db = user.firestore();
    const ref = db.collection("safety_profiles").doc("user_1");
    await assertSucceeds(ref.set({ contacts: [{ name: "Mom", phone: "555-1234" }] }));
  });

  test("Usuario NO puede modificar el perfil de seguridad de otro", async () => {
    const user = env.authenticatedContext("user_2");
    const db = user.firestore();
    const ref = db.collection("safety_profiles").doc("user_1");
    await assertFails(ref.set({ contacts: [] }));
  });

  test("Admin/Compliance pueden leer perfiles de seguridad (simulado)", async () => {
    // Simular datos y roles en la DB para que las reglas funcionen
    const adminDb = env.unauthenticatedContext().firestore();
    await adminDb.collection('users').doc('admin_user').set({ role: 'admin' });
    await adminDb.collection('users').doc('compliance_user').set({ role: 'compliance' });
    await adminDb.collection('safety_profiles').doc('user_1').set({ contacts: [] });

    const admin = env.authenticatedContext("admin_user");
    const compliance = env.authenticatedContext("compliance_user");

    const ref = admin.firestore().collection("safety_profiles").doc("user_1");
    await assertSucceeds(ref.get());
    
    const ref2 = compliance.firestore().collection("safety_profiles").doc("user_1");
    await assertSucceeds(ref2.get());
  });

  // --- Logs de Seguridad (subcolección de trips) ---
  test("Pasajero del viaje puede crear un log de seguridad", async () => {
    // Setup: Admin crea un viaje para el pasajero user_3
    const adminDb = env.unauthenticatedContext().firestore();
    const tripRef = adminDb.collection("trips").doc("trip_123");
    await tripRef.set({ passengerId: "user_3", driverId: "driver_1" });

    const passenger = env.authenticatedContext("user_3");
    const logRef = passenger.firestore().collection("trips").doc("trip_123").collection("safety_logs").doc("log_1");
    await assertSucceeds(logRef.set({ type: 'panic_button_pressed' }));
  });

  test("Otro usuario NO puede crear un log de seguridad en un viaje ajeno", async () => {
    const otherUser = env.authenticatedContext("user_4");
    const logRef = otherUser.firestore().collection("trips").doc("trip_123").collection("safety_logs").doc("log_2");
    await assertFails(logRef.set({ type: 'panic_button_pressed' }));
  });
});
