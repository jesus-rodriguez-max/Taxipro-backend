const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { readFileSync } = require("fs");

const rules = readFileSync("firestore.rules", "utf8");

describe("Safety-related Security Rules", () => {
  let testEnv;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "rules-test-project-safety",
      firestore: { rules },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  describe("/safety_profiles collection", () => {
    it("should allow a user to read and write their own safety profile", async () => {
      const self = testEnv.authenticatedContext("user123");
      const db = self.firestore();
      const profileDoc = db.collection("safety_profiles").doc("user123");

      await assertSucceeds(profileDoc.get());
      await assertSucceeds(profileDoc.set({ trusted_contact: "person@example.com" }));
    });

    it("should NOT allow a user to access another user's profile", async () => {
      const attacker = testEnv.authenticatedContext("attacker456");
      const db = attacker.firestore();
      const targetDoc = db.collection("safety_profiles").doc("user123");

      await assertFails(targetDoc.get());
      await assertFails(targetDoc.set({ data: "hacked" }));
    });

    it("should allow a compliance role to read a safety profile", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("users").doc("compliance_user").set({ role: 'compliance' });
      });

      const compliance = testEnv.authenticatedContext("compliance_user");
      const db = compliance.firestore();
      const targetDoc = db.collection("safety_profiles").doc("user123");

      await assertSucceeds(targetDoc.get());
      await assertFails(targetDoc.set({ data: "modified" })); // Compliance can read, not write
    });
  });

  describe("/shared_trips collection", () => {
    beforeAll(async () => {
      // An admin must create the shared trip document first
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("shared_trips").doc("share_token_abc").set({ tripId: "trip123", location: {} });
      });
    });

    it("should allow anyone (even unauthenticated) to read a shared trip", async () => {
      const unauthenticated = testEnv.unauthenticatedContext();
      const db = unauthenticated.firestore();
      const sharedTripDoc = db.collection("shared_trips").doc("share_token_abc");

      await assertSucceeds(sharedTripDoc.get());
    });

    it("should NOT allow a non-admin to write to a shared trip", async () => {
      const user = testEnv.authenticatedContext("user123");
      const db = user.firestore();
      const sharedTripDoc = db.collection("shared_trips").doc("share_token_abc");

      await assertFails(sharedTripDoc.set({ location: { lat: 1, lng: 1 } }));
    });
  });
});
