import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { join } from "path";

const rules = readFileSync(join(__dirname, "../rules/firestore.rules"), "utf8");

describe("Rules - trips", () => {
  let env;
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: "taxipro-test",
      firestore: { rules }
    });
  });
  afterAll(async () => { await env.cleanup(); });

  test("Passenger creates pending; cannot change status", async () => {
    const user = env.authenticatedContext("user_1", { role: "user" });
    const db = user.firestore();
    const tRef = db.collection("trips").doc("t1");

    await assertSucceeds(tRef.set({
      userId: "user_1",
      status: "pending",
      origin: { lat: 1, lng: 1 },
      destination: { lat: 2, lng: 2 }
    }));

    await assertFails(tRef.update({ status: "active" }));
  });

  test("Driver cannot update status; admin can", async () => {
    const admin = env.authenticatedContext("admin_1", { admin: true, role: "admin" });
    const dbA = admin.firestore();
    const tRef = dbA.collection("trips").doc("t2");
    await tRef.set({ userId: "u2", driverId: "d9", status: "assigned" });

    const driver = env.authenticatedContext("d9", { role: "driver" });
    const dbD = driver.firestore();
    await assertFails(dbD.collection("trips").doc("t2").update({ status: "active" }));

    await assertSucceeds(tRef.update({ status: "active", startedAt: "server" }));
  });
});