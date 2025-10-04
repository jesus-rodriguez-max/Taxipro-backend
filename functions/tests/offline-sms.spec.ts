import * as admin from 'firebase-admin';
import { sendOfflineRideRequest } from '../src/twilio/offline';

describe('Offline SMS Ride Flow', () => {
  beforeAll(() => {
    try { admin.initializeApp(); } catch {}
  });

  it('should process an offline SMS ride request and respond with driver details', async () => {
    const payload = {
      From: '+5214440000000',
      Body: 'Origen: Av. Himalaya 123, Destino: Plaza Tangamanga',
    };

    const response = await sendOfflineRideRequest(payload);

    expect(response).toContain('Taxi asignado:');
    expect(response).toContain('Tiempo estimado de llegada:');
    expect(response).toContain('Costo aproximado:');
    expect(response).toContain('Pago solo en efectivo');

    // Validate that trip was persisted with offline flag
    const tripRef = admin.firestore().collection('trips').doc('test-trip-id');
    const snap = await tripRef.get();
    const data = snap.data() as any;
    expect(data?.offline).toBe(true);
    expect(data?.passengerPhone).toBe(payload.From);
    expect(typeof data?.origin).toBe('string');
    expect(typeof data?.destination).toBe('string');
  });
});
