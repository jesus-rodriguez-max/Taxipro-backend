const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require("@firebase/rules-unit-testing");
const fs = require("fs");
const path = require("path");

const projectId = "demo-taxipro"; // usar projectId demo para tests
const rules = fs.readFileSync(path.resolve(__dirname, "../../firestore.rules"), "utf8");
console.log('Rules file content:', rules);
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const [host, portString] = emulatorHost.split(':');
const port = parseInt(portString, 10);

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { host, port },
    firestoreRules: rules,
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

function getAuthedDb(auth) {
  if (auth?.uid) {
    return testEnv.authenticatedContext(auth.uid, auth).firestore();
  }
  return testEnv.unauthenticatedContext().firestore();
}

describe('Firestore Rules', () => {
  test("Usuario autenticado puede leer su propio perfil", async () => {
    // Seed data required for this specific test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("users").doc("user_123").set({ displayName: "Demo User", role: "passenger" });
    });

    const db = getAuthedDb({ uid: "user_123" });
    const doc = db.collection("users").doc("user_123");
    try {
      await assertSucceeds(doc.get());
    } catch (e) {
      console.error('assertSucceeds failed:', e.message);
      throw e;
    }
  });

  test("Usuario no autenticado no puede escribir en users", async () => {
    const db = getAuthedDb(null);
    const doc = db.collection("users").doc("otro");
    // Attempt to create a document that complies with the rules, but as an unauthenticated user.
    // This ensures we are testing the `request.auth != null` part of the rule.
    try {
      await assertFails(doc.set({ acceptedTerms: true, acceptedPrivacy: true }));
    } catch (e) {
      console.error('assertFails failed:', e.message);
      throw e;
    }
  });
});
