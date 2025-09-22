import { requestTripCallable } from '../src/trips/requestTrip';
import { https } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { docGetMock } from './mocks/firebase';

const wrapped = (fn: any) => (data: any, context: https.CallableContext) => fn(data, context);

describe('Fare Calculation in requestTrip', () => {
  const passengerContext = { auth: { uid: 'test-passenger-id' } };
  const defaultTripData = {
    origin: { lat: 1, lng: 1 },
    destination: { lat: 2, lng: 2 },
    estimatedDistanceKm: 10,
  };

  const mockTariffs = {
    city: 'San Luis Potosí',
    zone: 'Zona Metropolitana',
    year: 2025,
    currency: 'MXN',
    baseFareDay: 16.20,
    baseFareNight: 21.00,
    perKm: 7.30,
    waitingIncrement: 1.825,
    waitingUnit: { seconds: 39, meters: 250 },
    phoneBaseFareDay: 21.00,
    phoneBaseFareNight: 25.90,
    active: true,
  };

  beforeAll(() => {
    try { admin.initializeApp(); } catch (e) {}
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock para que siempre encuentre las tarifas activas
    docGetMock.mockImplementation((docRef: any) => {
      if (docRef.path === 'fares/tariffs') {
        return Promise.resolve({ exists: true, data: () => mockTariffs });
      }
      // Comportamiento por defecto para otros documentos
      return Promise.resolve({ exists: false });
    });
  });

  it('should use baseFareDay and calculate distance cost during daytime (app request)', async () => {
    // Mock Date para simular horario diurno (ej. 10 AM)
    const mockDate = new Date('2025-01-01T10:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    const result = await wrapped(requestTripCallable)(defaultTripData, passengerContext as any);

    const expectedFare = mockTariffs.baseFareDay + (defaultTripData.estimatedDistanceKm * mockTariffs.perKm);
    expect(result.totalFare).toBeCloseTo(expectedFare);
    expect(result.tripId).toBeDefined();

    // Restaurar Date original
    (global.Date as jest.Mock).mockRestore();
  });

  it('should use baseFareNight and calculate distance cost during nighttime (app request)', async () => {
    // Mock Date para simular horario nocturno (ej. 11 PM)
    const mockDate = new Date('2025-01-01T23:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    const result = await wrapped(requestTripCallable)(defaultTripData, passengerContext as any);

    const expectedFare = mockTariffs.baseFareNight + (defaultTripData.estimatedDistanceKm * mockTariffs.perKm);
    expect(result.totalFare).toBeCloseTo(expectedFare);

    (global.Date as jest.Mock).mockRestore();
  });

  it('should use phoneBaseFareDay during daytime (phone request)', async () => {
    const mockDate = new Date('2025-01-01T10:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    const phoneRequestData = { ...defaultTripData, isPhoneRequest: true };
    const result = await wrapped(requestTripCallable)(phoneRequestData, passengerContext as any);

    const expectedFare = mockTariffs.phoneBaseFareDay + (defaultTripData.estimatedDistanceKm * mockTariffs.perKm);
    expect(result.totalFare).toBeCloseTo(expectedFare);

    (global.Date as jest.Mock).mockRestore();
  });

  it('should use phoneBaseFareNight during nighttime (phone request)', async () => {
    const mockDate = new Date('2025-01-01T23:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    const phoneRequestData = { ...defaultTripData, isPhoneRequest: true };
    const result = await wrapped(requestTripCallable)(phoneRequestData, passengerContext as any);

    const expectedFare = mockTariffs.phoneBaseFareNight + (defaultTripData.estimatedDistanceKm * mockTariffs.perKm);
    expect(result.totalFare).toBeCloseTo(expectedFare);

    (global.Date as jest.Mock).mockRestore();
  });

  it('should throw an error if no active tariffs are found', async () => {
    docGetMock.mockImplementation((docRef: any) => {
      if (docRef.path === 'fares/tariffs') {
        return Promise.resolve({ exists: false }); // Simula que no hay tarifas
      }
      return Promise.resolve({ exists: false });
    });

    await expect(wrapped(requestTripCallable)(defaultTripData, passengerContext as any))
      .rejects
      .toThrow('No active tariffs found.');
  });
});
