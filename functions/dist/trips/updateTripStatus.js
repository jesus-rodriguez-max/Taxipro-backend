"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTripStatusCallable = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const types_1 = require("../lib/types");
const geo_1 = require("../lib/geo");
const state_1 = require("../lib/state");
// --- Constantes de Configuración ---
const BASE_FARE = 5000; // 50.00 MXN en centavos
const COST_PER_KM_CENTS = 1500; // 15.00 MXN
const COST_PER_MIN_CENTS = 200; // 2.00 MXN
/**
 * Gestiona todas las actualizaciones de un viaje: cambio de estado, taxímetro, etc.
 */
const https_2 = require("firebase-functions/v2/https");
exports.updateTripStatusCallable = (0, https_2.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'El usuario no está autenticado.');
    }
    const { tripId, newStatus, currentLocation, newDestination, newStop } = request.data;
    const tripRef = admin.firestore().collection('trips').doc(tripId);
    const tripDoc = await tripRef.get();
    if (!tripDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Viaje no encontrado.');
    }
    const trip = tripDoc.data();
    const batch = admin.firestore().batch();
    let response = { success: true, message: 'Viaje actualizado.' };
    // 1. Cambio de Destino
    if (newDestination) {
        handleDestinationChange(trip, newDestination, batch, tripRef);
    }
    // 2. Añadir Parada Extra
    if (newStop) {
        handleAddStop(trip, newStop, batch, tripRef);
    }
    // 3. Actualización de Ubicación (Taxímetro en tiempo real)
    if (currentLocation && trip.status === types_1.TripStatus.ACTIVE) {
        handleLocationUpdate(trip, currentLocation, batch, tripRef);
    }
    // 4. Cambio de Estado
    if (newStatus) {
        // Validar transición de estado antes de aplicar cambios
        if (!(0, state_1.canTransition)(trip.status, newStatus)) {
            throw new https_1.HttpsError('failed-precondition', 'Invalid status transition');
        }
        await handleStatusChange(tripDoc.id, trip, newStatus, batch, tripRef);
        if (newStatus === types_1.TripStatus.COMPLETED) {
            response.message = 'Viaje completado. Calculando tarifa final.';
        }
    }
    await batch.commit();
    return response;
});
// --- Lógica Modularizada ---
function handleDestinationChange(trip, dest, batch, ref) {
    const progress = (trip.distance?.travelled || 0) / (trip.distance?.planned || 1);
    const update = { 'destination': dest };
    if (progress > 0.6) {
        update['fare.surcharges'] = admin.firestore.FieldValue.increment(BASE_FARE);
    }
    batch.update(ref, update);
}
function handleAddStop(trip, stop, batch, ref) {
    batch.update(ref, {
        stops: admin.firestore.FieldValue.arrayUnion(stop),
        'fare.stops': admin.firestore.FieldValue.increment(BASE_FARE),
    });
}
function handleLocationUpdate(trip, loc, batch, ref) {
    const lastKnownLocation = trip.lastKnownLocation || trip.origin.point; // Asume un campo `lastKnownLocation`
    const distanceIncrement = (0, geo_1.getDistanceInMeters)(lastKnownLocation, loc);
    batch.update(ref, {
        'distance.travelled': admin.firestore.FieldValue.increment(distanceIncrement),
        lastKnownLocation: loc,
    });
}
async function handleStatusChange(tripId, trip, newStatus, batch, ref) {
    // Aquí iría la validación de transición de estados (canTransition)
    const update = { status: newStatus, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (newStatus === types_1.TripStatus.ACTIVE && trip.status !== types_1.TripStatus.ACTIVE) {
        update.startedAt = admin.firestore.FieldValue.serverTimestamp();
    }
    else if (newStatus === types_1.TripStatus.COMPLETED || newStatus === types_1.TripStatus.CANCELLED) {
        update.completedAt = admin.firestore.FieldValue.serverTimestamp(); // Use completedAt for both for simplicity, or add cancelledAt
        // Update shared trip to inactive
        const sharedTripsQuery = await admin.firestore().collection('shared_trips').where('tripId', '==', tripId).get();
        sharedTripsQuery.forEach(doc => {
            batch.update(doc.ref, { active: false });
        });
        if (newStatus === types_1.TripStatus.COMPLETED) {
            // Cálculo de tarifa final
            const finalTripState = { ...trip, ...update }; // Simula el estado final para el cálculo
            const getMillis = (v) => {
                if (!v)
                    return Date.now();
                if (typeof v.toMillis === 'function')
                    return v.toMillis();
                if (v instanceof Date)
                    return v.getTime();
                if (typeof v.toDate === 'function')
                    return v.toDate().getTime();
                return Date.now();
            };
            const travelledSeconds = (getMillis(finalTripState.completedAt) - getMillis(finalTripState.startedAt)) / 1000;
            const distanceKm = (finalTripState.distance?.travelled || 0) / 1000;
            const timeFare = travelledSeconds * (COST_PER_MIN_CENTS / 60);
            const distanceFare = distanceKm * COST_PER_KM_CENTS;
            const stopsFare = finalTripState.fare?.stops || 0;
            const surcharges = finalTripState.fare?.surcharges || 0;
            const total = BASE_FARE + timeFare + distanceFare + stopsFare + surcharges;
            update['fare.total'] = Math.round(total);
            update['time.travelled'] = travelledSeconds;
            // Aquí se añadiría la lógica de cobro (Stripe o efectivo)
            // y la gestión del saldo pendiente.
        }
        batch.update(ref, update);
    }
}
//# sourceMappingURL=updateTripStatus.js.map