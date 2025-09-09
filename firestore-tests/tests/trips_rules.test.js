import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";

const rules = readFileSync(new URL("../rules/firestore.rules", import.meta.url), "utf8");

describe("Rules - trips", () => {
  let env;

  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: "taxipro-test",
      firestore: { rules }
    });
  });

  afterAll(async () => { await env.cleanup(); });

  // Utilidad para construir un trip válido
  function buildTrip(overrides = {}) {
    return {
      userId: overrides.userId ?? "user_1",
      status: overrides.status ?? "pending",
      pickup: overrides.pickup ?? {
        address: "Origen",
        coords: { lat: 20.0, lng: -100.0 }
      },
      destination: overrides.destination ?? {
        address: "Destino",
        coords: { lat: 21.0, lng: -101.0 }
      },
      ...overrides
    };
  }

  test("Passenger puede crear trip con pickup/destination válidos", async () => {
    const user = env.authenticatedContext("user_1", { role: "user" });
    const db = user.firestore();
    const ref = db.collection("trips").doc("t1");

    await assertSucceeds(ref.set(buildTrip()));
  });

  test("Passenger NO puede crear trip sin pickup", async () => {
    const user = env.authenticatedContext("user_1", { role: "user" });
    const db = user.firestore();
    const ref = db.collection("trips").doc("t2");

    await assertFails(ref.set(buildTrip({ pickup: null })));
  });

  test("Passenger NO puede crear trip sin destination", async () => {
    const user = env.authenticatedContext("user_1", { role: "user" });
    const db = user.firestore();
    const ref = db.collection("trips").doc("t3");

    await assertFails(ref.set(buildTrip({ destination: null })));
  });

  test("Passenger NO puede incluir timestamps de backend", async () => {
    const user = env.authenticatedContext("user_1", { role: "user" });
    const db = user.firestore();
    const ref = db.collection("trips").doc("t4");

    await assertFails(ref.set(buildTrip({ acceptedAt: new Date() })));
  });

  test("Passenger NO puede modificar status", async () => {
    const user = env.authenticatedContext("user_1", { role: "user" });
    const db = user.firestore();
    const ref = db.collection("trips").doc("t5");

    await ref.set(buildTrip());
    await assertFails(ref.update({ status: "active" }));
  });

  test("Admin puede actualizar trip", async () => {
    const admin = env.authenticatedContext("admin_1", { admin: true, role: "admin" });
    const db = admin.firestore();
    const ref = db.collection("trips").doc("t6");

    await ref.set(buildTrip());
    await assertSucceeds(ref.update({ status: "assigned", acceptedAt: "server" }));
  });
});
