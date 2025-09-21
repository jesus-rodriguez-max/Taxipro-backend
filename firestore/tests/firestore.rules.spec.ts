import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const rules = readFileSync(join(__dirname, '../../firestore.rules'), 'utf8');
  testEnv = await initializeTestEnvironment({ projectId: 'taxipro-rules-test', firestore: { rules } });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Seed admin user for tests that require admin roles
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/admin_user'), { role: 'admin' });
  });
});

// --- Contextos de Usuario ---
const alice = { uid: 'alice' };
const bob = { uid: 'bob' };
const driver = { uid: 'driver_user' };
const admin = { uid: 'admin_user', token: { role: 'admin' } };

// --- Pruebas por Colección ---

describe('Firestore Rules: Users', () => {
  it('should allow user creation only with accepted terms', async () => {
    const aliceDb = testEnv.authenticatedContext(alice.uid).firestore();
    const userDoc = doc(aliceDb, `users/${alice.uid}`);
    await assertFails(setDoc(userDoc, { acceptedTerms: false, acceptedPrivacy: true }));
    await assertSucceeds(setDoc(userDoc, { acceptedTerms: true, acceptedPrivacy: true }));
  });

  it('should only allow users to read/write their own document', async () => {
    const aliceDb = testEnv.authenticatedContext(alice.uid).firestore();
    const bobDb = testEnv.authenticatedContext(bob.uid).firestore();
    const aliceDocRef = doc(aliceDb, `users/${alice.uid}`);
    const bobDocRefAsAlice = doc(aliceDb, `users/${bob.uid}`);

    await assertSucceeds(getDoc(aliceDocRef));
    await assertFails(getDoc(bobDocRefAsAlice));
  });
});

describe('Firestore Rules: Drivers', () => {
  it('should allow a driver to create their profile with pending status', async () => {
    const driverDb = testEnv.authenticatedContext(driver.uid).firestore();
    const driverDoc = doc(driverDb, `drivers/${driver.uid}`);
    await assertSucceeds(setDoc(driverDoc, { status: 'pending' }));
    await assertFails(setDoc(driverDoc, { status: 'approved' })); // Cannot self-approve
  });

  it('should only allow admin to approve a driver', async () => {
    const driverId = driver.uid;
    await testEnv.withSecurityRulesDisabled(async c => { await setDoc(doc(c.firestore(), `drivers/${driverId}`), { status: 'pending' }); });

    const driverDb = testEnv.authenticatedContext(driverId).firestore();
    const adminDb = testEnv.authenticatedContext(admin.uid, admin.token).firestore();
    const driverDocAsDriver = doc(driverDb, `drivers/${driverId}`);
    const driverDocAsAdmin = doc(adminDb, `drivers/${driverId}`);

    await assertFails(updateDoc(driverDocAsDriver, { status: 'approved' }));
    await assertSucceeds(updateDoc(driverDocAsAdmin, { status: 'approved' }));
  });
});

describe('Firestore Rules: Trips', () => {
  const tripId = 'trip123';
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async c => {
      await setDoc(doc(c.firestore(), `trips/${tripId}`), { passengerId: alice.uid, driverId: driver.uid, status: 'assigned' });
    });
  });

  it('should allow a passenger to create their own trip', async () => {
    const aliceDb = testEnv.authenticatedContext(alice.uid).firestore();
    await assertSucceeds(addDoc(collection(aliceDb, 'trips'), { passengerId: alice.uid, status: 'pending' }));
    await assertFails(addDoc(collection(aliceDb, 'trips'), { passengerId: bob.uid, status: 'pending' })); // Cannot create for others
  });

  it('should only allow assigned passenger or driver to read', async () => {
    const aliceDb = testEnv.authenticatedContext(alice.uid).firestore();
    const driverDb = testEnv.authenticatedContext(driver.uid).firestore();
    const bobDb = testEnv.authenticatedContext(bob.uid).firestore();

    await assertSucceeds(getDoc(doc(aliceDb, `trips/${tripId}`)));
    await assertSucceeds(getDoc(doc(driverDb, `trips/${tripId}`)));
    await assertFails(getDoc(doc(bobDb, `trips/${tripId}`)));
  });
});

describe('Firestore Rules: Fares', () => {
    it('should allow any authenticated user to read, but only admin to write', async () => {
        const adminDb = testEnv.authenticatedContext(admin.uid, admin.token).firestore();
        const aliceDb = testEnv.authenticatedContext(alice.uid).firestore();
        const fareDocAsAdmin = doc(adminDb, 'fares/tariffs');
        const fareDocAsAlice = doc(aliceDb, 'fares/tariffs');

        await assertSucceeds(setDoc(fareDocAsAdmin, { base: 50 }));
        await assertSucceeds(getDoc(fareDocAsAlice));
        await assertFails(updateDoc(fareDocAsAlice, { base: 60 }));
    });
});