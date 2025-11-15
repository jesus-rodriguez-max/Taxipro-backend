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
exports.driverArrivedCallable = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const types_1 = require("../lib/types");
const geo_1 = require("../lib/geo");
const ARRIVAL_RADIUS_METERS = 150;
/**
 * Función invocable que un chofer llama para marcar que ha llegado
 * al punto de recogida del pasajero.
 */
const https_2 = require("firebase-functions/v2/https");
exports.driverArrivedCallable = (0, https_2.onCall)(async (request) => {
    // 1. Validar autenticación
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'El usuario no está autenticado.');
    }
    const driverId = request.auth.uid;
    const { tripId, location } = request.data;
    if (!tripId || !location) {
        throw new https_1.HttpsError('invalid-argument', 'Faltan parámetros (tripId, location).');
    }
    const tripRef = admin.firestore().collection('trips').doc(tripId);
    try {
        const tripDoc = await tripRef.get();
        if (!tripDoc.exists) {
            throw new https_1.HttpsError('not-found', `El viaje con ID ${tripId} no existe.`);
        }
        const trip = tripDoc.data();
        // 2. Validaciones de negocio
        if (trip.driverId !== driverId) {
            throw new https_1.HttpsError('permission-denied', 'No tienes permiso para modificar este viaje.');
        }
        if (trip.status !== types_1.TripStatus.ASSIGNED) {
            throw new https_1.HttpsError('failed-precondition', `El viaje no está en estado 'ASSIGNED', sino '${trip.status}'.`);
        }
        // 3. Validar geolocalización
        if (!(0, geo_1.isWithinGeofence)(location, trip.origin.point, ARRIVAL_RADIUS_METERS)) {
            throw new https_1.HttpsError('failed-precondition', `Debes estar a menos de ${ARRIVAL_RADIUS_METERS} metros del punto de recogida.`);
        }
        // 4. Actualizar el estado del viaje
        await tripRef.update({
            status: types_1.TripStatus.ARRIVED,
            driverArrivedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            'audit.lastActor': 'driver',
            'audit.lastAction': 'driverArrived',
        });
        return { success: true, message: 'Estado del viaje actualizado a ARRIVED.' };
    }
    catch (error) {
        console.error('Error en driverArrived:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Ocurrió un error al procesar la llegada.');
    }
});
//# sourceMappingURL=driverArrived.js.map