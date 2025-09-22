export interface Tariffs {
  baseFareDay: number;
  baseFareNight: number;
  phoneBaseFareDay: number;
  phoneBaseFareNight: number;
  perKm: number;
  currency?: string;
}

/**
 * Determina si la fecha dada corresponde a horario nocturno.
 * La ventana nocturna es 23:00–05:59 inclusive.
 * Nota: Usamos horas UTC para evitar inconsistencias por zona horaria del entorno de CI/OS.
 */
export function isNightTime(date: Date): boolean {
  const hour = date.getUTCHours();
  return hour >= 23 || hour <= 5;
}

/**
 * Obtiene la tarifa base según si es solicitud telefónica y si es horario nocturno.
 */
export function getBaseFare(isPhoneRequest: boolean, when: Date, tariffs: Tariffs): number {
  const night = isNightTime(when);
  if (isPhoneRequest) {
    return night ? tariffs.phoneBaseFareNight : tariffs.phoneBaseFareDay;
  }
  return night ? tariffs.baseFareNight : tariffs.baseFareDay;
}

/**
 * Calcula el costo por distancia en km.
 */
export function computeDistanceCost(km: number, tariffs: Tariffs): number {
  return km * tariffs.perKm;
}

/**
 * Calcula la tarifa total sencilla: base + (km * perKm)
 */
export function calculateFare(
  estimatedDistanceKm: number,
  isPhoneRequest: boolean,
  when: Date,
  tariffs: Tariffs,
): number {
  const base = getBaseFare(isPhoneRequest, when, tariffs);
  const distance = computeDistanceCost(estimatedDistanceKm, tariffs);
  return base + distance;
}
