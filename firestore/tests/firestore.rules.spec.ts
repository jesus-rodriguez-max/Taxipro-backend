import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

// --- Configuración del Entorno de Pruebas ---

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // La ruta se construye desde la carpeta 'functions' donde se ejecuta Jest
  const rulesPath = join(__dirname, '../../firestore/firestore.rules');
  const rules = readFileSync(rulesPath, 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: 'taxipro-rules-test',
    firestore: { rules },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

// --- Pruebas por Colección ---

describe('Reglas de Firestore: /users', () => {
  it('should allow a user to read and write their own document', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    const docRef = doc(aliceDb, 'users/alice');
    await assertSucceeds(getDoc(docRef));
    await assertSucceeds(setDoc(docRef, { name: 'Alice' }));
  });

  it('should NOT allow a user to read or write another user\'s document', async () => {
    const bobDb = testEnv.authenticatedContext('bob').firestore();
    const docRef = doc(bobDb, 'users/alice');
    await assertFails(getDoc(docRef));
    await assertFails(setDoc(docRef, { name: 'Hacked' }));
  });
});

describe('Reglas de Firestore: /drivers', () => {
  beforeAll(async () => {
    // Se necesita un usuario admin para leer datos de otros
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'users/admin_user'), { role: 'admin' });
    });
  });

  it('should allow a driver to read and write their own document', async () => {
    const driverDb = testEnv.authenticatedContext('driver_user').firestore();
    const docRef = doc(driverDb, 'drivers/driver_user');
    await assertSucceeds(getDoc(docRef));
    await assertSucceeds(setDoc(docRef, { vehicle: 'Sedan' }));
  });

  it('should allow an admin to read a driver document but NOT write', async () => {
    const adminDb = testEnv.authenticatedContext('admin_user', { role: 'admin' }).firestore();
    const docRef = doc(adminDb, 'drivers/driver_user');
    await assertSucceeds(getDoc(docRef));
    await assertFails(updateDoc(docRef, { vehicle: 'SUV' })); // Asumiendo que la regla es solo de lectura para admin
  });
});

describe('Reglas de Firestore: /trips', () => {
  const tripId = 'trip123';
  const aliceId = 'alice';
  const driverId = 'driver_user';

  beforeEach(async () => {
    // Un admin crea el viaje para que exista en las pruebas de lectura/actualización
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, `trips/${tripId}`), {
        passengerId: aliceId,
        driverId: driverId,
        status: 'assigned',
      });
    });
  });

  it('should allow a passenger to create a trip with status "pending"', async () => {
    const aliceDb = testEnv.authenticatedContext(aliceId).firestore();
    const newTripRef = doc(collection(aliceDb, 'trips'));
    await assertSucceeds(setDoc(newTripRef, { passengerId: aliceId, status: 'pending' }));
  });

  it('should allow the assigned passenger and driver to read the trip', async () => {
    const aliceDb = testEnv.authenticatedContext(aliceId).firestore();
    const driverDb = testEnv.authenticatedContext(driverId).firestore();
    const tripRefAlice = doc(aliceDb, `trips/${tripId}`);
    const tripRefDriver = doc(driverDb, `trips/${tripId}`);

    await assertSucceeds(getDoc(tripRefAlice));
    await assertSucceeds(getDoc(tripRefDriver));
  });

  it('should NOT allow another user (bob) to read the trip', async () => {
    const bobDb = testEnv.authenticatedContext('bob').firestore();
    const docRef = doc(bobDb, `trips/${tripId}`);
    await assertFails(getDoc(docRef));
  });

  it('should allow an admin to update the trip status', async () => {
    const adminDb = testEnv.authenticatedContext('admin_user', { role: 'admin' }).firestore();
    const docRef = doc(adminDb, `trips/${tripId}`);
    await assertSucceeds(updateDoc(docRef, { status: 'active' }));
    await assertSucceeds(updateDoc(docRef, { status: 'completed' }));
  });

  it('should NOT allow a passenger or driver to update the status', async () => {
    const aliceDb = testEnv.authenticatedContext(aliceId).firestore();
    const driverDb = testEnv.authenticatedContext(driverId).firestore();
    const tripRefAlice = doc(aliceDb, `trips/${tripId}`);
    const tripRefDriver = doc(driverDb, `trips/${tripId}`);

    await assertFails(updateDoc(tripRefAlice, { status: 'active' }));
    await assertFails(updateDoc(tripRefDriver, { status: 'active' }));
  });

  describe('Subcolección: /safety_logs', () => {
    const logId = 'log1';

    it('should allow an admin (backend) to write a safety log', async () => {
      const adminDb = testEnv.authenticatedContext('admin_user', { role: 'admin' }).firestore();
      const logRef = doc(adminDb, `trips/${tripId}/safety_logs/${logId}`);
      await assertSucceeds(setDoc(logRef, { event: 'panic_button_pressed' }));
    });

    it('should allow the trip owner to read their own safety logs', async () => {
      const aliceDb = testEnv.authenticatedContext(aliceId).firestore();
      const logRef = doc(aliceDb, `trips/${tripId}/safety_logs/${logId}`);
      await assertSucceeds(getDoc(logRef));
    });

    it('should NOT allow another user to read the logs', async () => {
        const bobDb = testEnv.authenticatedContext('bob').firestore();
        const logRef = doc(bobDb, `trips/${tripId}/safety_logs/${logId}`);
        await assertFails(getDoc(logRef));
    });
  });
});

describe('Reglas de Firestore: /safety_profiles', () => {
    it('should allow a user to read and write their own safety profile', async () => {
        const aliceDb = testEnv.authenticatedContext('alice').firestore();
        const docRef = doc(aliceDb, 'safety_profiles/alice');
        await assertSucceeds(getDoc(docRef));
        await assertSucceeds(setDoc(docRef, { trustedContact: 'contact@email.com' }));
    });

    it('should NOT allow another user to access a safety profile', async () => {
        const bobDb = testEnv.authenticatedContext('bob').firestore();
        const docRef = doc(bobDb, 'safety_profiles/alice');
        await assertFails(getDoc(docRef));
        await assertFails(setDoc(docRef, { trustedContact: 'hacked' }));
    });
});

describe('Reglas de Firestore: /shared_trips', () => {
    const activeShareId = 'active_share';
    const inactiveShareId = 'inactive_share';

    beforeAll(async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const adminDb = context.firestore();
            await setDoc(doc(adminDb, `shared_trips/${activeShareId}`), { isActive: true });
            await setDoc(doc(adminDb, `shared_trips/${inactiveShareId}`), { isActive: false });
        });
    });

    it('should allow anyone to read a shared trip if isActive is true', async () => {
        const unauthenticatedDb = testEnv.unauthenticatedContext().firestore();
        const docRef = doc(unauthenticatedDb, `shared_trips/${activeShareId}`);
        await assertSucceeds(getDoc(docRef));
    });

    it('should NOT allow anyone to read a shared trip if isActive is false', async () => {
        const unauthenticatedDb = testEnv.unauthenticatedContext().firestore();
        const docRef = doc(unauthenticatedDb, `shared_trips/${inactiveShareId}`);
        // Asumiendo que la regla es `allow read: if resource.data.isActive == true;`
        await assertFails(getDoc(docRef));
    });

    it('should allow an admin to write to a shared trip', async () => {
        const adminDb = testEnv.authenticatedContext('admin_user', { role: 'admin' }).firestore();
        const docRef = doc(adminDb, `shared_trips/new_share`);
        await assertSucceeds(setDoc(docRef, { isActive: true, location: {} }));
    });

    it('should NOT allow a non-admin to write to a shared trip', async () => {
        const aliceDb = testEnv.authenticatedContext('alice').firestore();
        const docRef = doc(aliceDb, `shared_trips/${activeShareId}`);
        await assertFails(updateDoc(docRef, { location: { lat: 1, lng: 1 } }));
    });
});
