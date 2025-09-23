"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNightTime = isNightTime;
exports.getBaseFare = getBaseFare;
exports.computeDistanceCost = computeDistanceCost;
exports.calculateFare = calculateFare;
/**
 * Determina si la fecha dada corresponde a horario nocturno.
 * La ventana nocturna es 23:00–05:59 inclusive.
 * Nota: Usamos horas UTC para evitar inconsistencias por zona horaria del entorno de CI/OS.
 */
function isNightTime(date) {
    const hour = date.getUTCHours();
    return hour >= 23 || hour <= 5;
}
/**
 * Obtiene la tarifa base según si es solicitud telefónica y si es horario nocturno.
 */
function getBaseFare(isPhoneRequest, when, tariffs) {
    const night = isNightTime(when);
    if (isPhoneRequest) {
        return night ? tariffs.phoneBaseFareNight : tariffs.phoneBaseFareDay;
    }
    return night ? tariffs.baseFareNight : tariffs.baseFareDay;
}
/**
 * Calcula el costo por distancia en km.
 */
function computeDistanceCost(km, tariffs) {
    return km * tariffs.perKm;
}
/**
 * Calcula la tarifa total sencilla: base + (km * perKm)
 */
function calculateFare(estimatedDistanceKm, isPhoneRequest, when, tariffs) {
    const base = getBaseFare(isPhoneRequest, when, tariffs);
    const distance = computeDistanceCost(estimatedDistanceKm, tariffs);
    return base + distance;
}
//# sourceMappingURL=fares.js.map