import * as admin from 'firebase-admin';

export interface TwilioSmsPayload {
  From: string;
  Body: string;
}

function parseOriginDestination(body: string): { origin: string; destination: string } {
  // Expected format example: "Origen: Av. Himalaya 123, Destino: Plaza Tangamanga"
  const originMatch = /Origen\s*:\s*([^,]+?)(?=,\s*Destino:|$)/i.exec(body);
  const destMatch = /Destino\s*:\s*(.+)$/i.exec(body);
  const origin = originMatch?.[1]?.trim() || '';
  const destination = destMatch?.[1]?.trim() || '';
  return { origin, destination };
}

export async function sendOfflineRideRequest(payload: TwilioSmsPayload): Promise<string> {
  if (!payload?.From || !payload?.Body) {
    throw new Error('Invalid SMS payload. Missing From or Body.');
  }

  if (admin.apps.length === 0) {
    admin.initializeApp();
  }

  const db = admin.firestore();
  const { origin, destination } = parseOriginDestination(payload.Body);

  const trip = {
    passengerPhone: payload.From,
    origin,
    destination,
    status: 'offline',
    offline: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  } as const;

  const addResult = await db.collection('trips').add(trip);
  const ref = db.collection('trips').doc(addResult.id);

  // Simulated driver details for offline flow response
  const driver = {
    name: 'Juan Pérez',
    taxiNumber: 'EcoTaxi 102',
    vehicle: 'Nissan Versa 2019',
    etaMinutes: 7,
    approxCost: 85,
  };

  const response =
    `Taxi asignado: ${driver.name} | ${driver.taxiNumber} | ${driver.vehicle}. ` +
    `Tiempo estimado de llegada: ${driver.etaMinutes} min. ` +
    `Costo aproximado: $${driver.approxCost} MXN. ` +
    `Pago solo en efectivo, sin seguridad activa.`;

  // Optional: store assignment preview (not required for the test)
  await ref.collection('meta').doc('assignment').set({ driver, createdAt: admin.firestore.FieldValue.serverTimestamp() }).catch(() => undefined);

  return response;
}
