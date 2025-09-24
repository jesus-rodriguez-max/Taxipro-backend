const firebase = require("@firebase/rules-unit-testing");
const fs = require("fs");

const projectId = "demo-taxipro"; // usar projectId demo para tests
const rules = fs.readFileSync("firestore.rules", "utf8");

beforeAll(async () => {
  await firebase.loadFirestoreRules({
    projectId,
    rules,
  });
});

afterAll(async () => {
  await Promise.all(firebase.apps().map(app => app.delete()));
});

function getAuthedDb(auth) {
  return firebase
    .initializeTestEnvironment({
      projectId,
    })
    .authenticatedContext(auth ? auth.uid : null, auth || {})
    .firestore();
}

test("Usuario autenticado puede leer su propio perfil", async () => {
  const db = getAuthedDb({ uid: "user_123" });
  const doc = db.collection("users").doc("user_123");
  await firebase.assertSucceeds(doc.get());
});

test("Usuario no autenticado no puede escribir en users", async () => {
  const db = getAuthedDb(null);
  const doc = db.collection("users").doc("otro");
  await firebase.assertFails(doc.set({ nombre: "test" }));
});
