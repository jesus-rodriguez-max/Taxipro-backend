import { isNightTime, getBaseFare, calculateFare, Tariffs } from '../src/fares';

describe('fares.ts - time windows and fare calculation', () => {
  const tariffs: Tariffs = {
    baseFareDay: 16.2,
    baseFareNight: 21.0,
    phoneBaseFareDay: 21.0,
    phoneBaseFareNight: 25.9,
    perKm: 7.3,
    currency: 'MXN',
  };

  // Horas explícitas en UTC para evitar problemas de zona horaria del sistema/CI
  const dateNocturna = new Date('2025-01-01T02:00:00Z');  // 02:00 → nocturno
  const dateDiurna = new Date('2025-01-01T12:00:00Z');    // 12:00 → diurno
  const dateBordeInicio = new Date('2025-01-01T23:00:00Z'); // 23:00 → nocturno
  const dateBordeFin = new Date('2025-01-01T05:59:00Z');   // 05:59 → nocturno

  it('Tarifa base diurna (app): usa baseFareDay a las 12:00Z', () => {
    expect(isNightTime(dateDiurna)).toBe(false);
    const base = getBaseFare(false, dateDiurna, tariffs);
    expect(base).toBeCloseTo(tariffs.baseFareDay);
  });

  it('Tarifa base nocturna (app): usa baseFareNight a las 02:00Z y 23:00Z y 05:59Z', () => {
    expect(isNightTime(dateNocturna)).toBe(true);
    expect(isNightTime(dateBordeInicio)).toBe(true);
    expect(isNightTime(dateBordeFin)).toBe(true);
    const base = getBaseFare(false, dateNocturna, tariffs);
    expect(base).toBeCloseTo(tariffs.baseFareNight);
  });

  it('Distancia diurna: total = baseFareDay + km * perKm', () => {
    const km = 10;
    const total = calculateFare(km, false, dateDiurna, tariffs);
    const expected = tariffs.baseFareDay + km * tariffs.perKm;
    expect(total).toBeCloseTo(expected);
  });

  it('Distancia nocturna: total = baseFareNight + km * perKm', () => {
    const km = 10;
    const total = calculateFare(km, false, dateNocturna, tariffs);
    const expected = tariffs.baseFareNight + km * tariffs.perKm;
    expect(total).toBeCloseTo(expected);
  });
});
