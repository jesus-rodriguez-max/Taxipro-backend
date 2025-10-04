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
  if (auth?.sub) {
    return testEnv.authenticatedContext(auth.sub, auth).firestore();
  }
  return testEnv.unauthenticatedContext().firestore();
}

describe('Firestore Rules', () => {
  describe('Users', () => {
    test("Usuario autenticado puede leer su propio perfil", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("users").doc("user_123").set({ displayName: "Demo User", role: "passenger" });
      });
  
      const db = getAuthedDb({ sub: "user_123" });
      const doc = db.collection("users").doc("user_123");
      await assertSucceeds(doc.get());
    });

    test("Usuario no autenticado no puede escribir en users", async () => {
      const db = getAuthedDb(null);
      const doc = db.collection("users").doc("otro");
      await assertFails(doc.set({ acceptedTerms: true, acceptedPrivacy: true }));
    });

    test("Usuario puede actualizar su propio displayName, phoneNumber y email", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("users").doc("user_123").set({});
      });
      const db = getAuthedDb({ sub: "user_123" });
      const doc = db.collection("users").doc("user_123");
      await assertSucceeds(doc.update({ displayName: "New Name", phoneNumber: "123456789", email: "new@test.com" }));
    });

    test("Usuario no puede actualizar otros campos en su perfil", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("users").doc("user_123").set({});
      });
      const db = getAuthedDb({ sub: "user_123" });
      const doc = db.collection("users").doc("user_123");
      await assertFails(doc.update({ role: "admin" }));
    });

    test("Usuario puede crear su perfil con los campos correctos", async () => {
      const db = getAuthedDb({ sub: "user_123" });
      const doc = db.collection("users").doc("user_123");
      await assertSucceeds(doc.set({ displayName: "Test User", phoneNumber: "123456789", email: "test@test.com", acceptedTerms: true, acceptedPrivacy: true, createdAt: new Date() }));
    });

    test("Usuario no puede crear su perfil con campos incorrectos", async () => {
      const db = getAuthedDb({ sub: "user_123" });
      const doc = db.collection("users").doc("user_123");
      await assertFails(doc.set({ displayName: "Test User", phoneNumber: "123456789", email: "test@test.com", acceptedTerms: true, acceptedPrivacy: true, createdAt: new Date(), role: "admin" }));
    });
  });

  describe('Drivers', () => {
    test("Chofer puede crear su perfil con los campos correctos", async () => {
      const db = getAuthedDb({ sub: "driver_123" });
      const doc = db.collection("drivers").doc("driver_123");
      await assertSucceeds(doc.set({ status: 'pending', createdAt: new Date(), displayName: "Test Driver", phoneNumber: "123456789", email: "driver@test.com" }));
    });

    test("Chofer no puede crear su perfil con campos incorrectos", async () => {
      const db = getAuthedDb({ sub: "driver_123" });
      const doc = db.collection("drivers").doc("driver_123");
      await assertFails(doc.set({ status: 'pending', createdAt: new Date(), displayName: "Test Driver", phoneNumber: "123456789", email: "driver@test.com", role: "admin" }));
    });
  });

  describe('Trips', () => {
    test("Admin puede actualizar status y updatedAt de un viaje", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("trips").doc("trip_123").set({});
      });
      const db = getAuthedDb({ sub: "admin_user", admin: true });
      const doc = db.collection("trips").doc("trip_123");
      await assertSucceeds(doc.update({ status: "completed", updatedAt: new Date() }));
    });

    test("Admin no puede actualizar otros campos de un viaje", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("trips").doc("trip_123").set({});
      });
      const db = getAuthedDb({ sub: "admin_user", admin: true });
      const doc = db.collection("trips").doc("trip_123");
      await assertFails(doc.update({ passengerId: "new_passenger" }));
    });
  });
});