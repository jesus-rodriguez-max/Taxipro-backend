const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { readFileSync } = require("fs");

const rules = readFileSync("firestore.rules", "utf8");

describe("User and Driver Security Rules", () => {
  let testEnv;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "rules-test-project-users",
      firestore: { rules },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  describe("/users collection", () => {
    it("should allow a user to read and write their own document", async () => {
      const self = testEnv.authenticatedContext("user123");
      const db = self.firestore();
      const userDoc = db.collection("users").doc("user123");

      await assertSucceeds(userDoc.get());
      await assertSucceeds(userDoc.set({ data: "my-data" }));
    });

    it("should NOT allow a user to read or write another user's document", async () => {
      const attacker = testEnv.authenticatedContext("attacker456");
      const db = attacker.firestore();
      const targetDoc = db.collection("users").doc("user123");

      await assertFails(targetDoc.get());
      await assertFails(targetDoc.set({ data: "hacked" }));
    });

    it("should allow an admin to read any user document", async () => {
      // Seed data with admin user to get the role
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("users").doc("admin_user").set({ role: 'admin' });
      });

      const admin = testEnv.authenticatedContext("admin_user");
      const db = admin.firestore();
      const targetDoc = db.collection("users").doc("user123");

      await assertSucceeds(targetDoc.get());
    });
  });

  describe("/drivers collection", () => {
    it("should allow a driver to read and write their own document", async () => {
      const self = testEnv.authenticatedContext("driver123");
      const db = self.firestore();
      const driverDoc = db.collection("drivers").doc("driver123");

      await assertSucceeds(driverDoc.get());
      await assertSucceeds(driverDoc.set({ vehicle: "car" }));
    });
  });
});
