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
exports.requestTripOfflineCallable = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
/**
 * Permite a un pasajero solicitar un viaje sin conexión a internet.
 * El viaje se guarda como 'offline' y se notificará al backend.
 */
exports.requestTripOfflineCallable = (0, https_1.onCall)(async (request) => {
    const { passengerName, passengerPhone, origin, destination } = request.data;
    if (!passengerName || !passengerPhone || !origin || !destination) {
        throw new https_1.HttpsError('invalid-argument', 'Faltan datos para solicitar el viaje sin conexión.');
    }
    const tripData = {
        passengerName,
        passengerPhone,
        origin,
        destination,
        status: 'offline',
        offline: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    try {
        const tripRef = await admin.firestore().collection('trips').add(tripData);
        // Aquí se podría integrar un servicio de mensajería (ej. Twilio) para notificar al backend.
        console.log(`Viaje offline solicitado: ${tripRef.id}`);
        return { tripId: tripRef.id };
    }
    catch (error) {
        console.error('Error al solicitar viaje offline:', error);
        throw new https_1.HttpsError('internal', 'No se pudo procesar la solicitud de viaje sin conexión.', error.message);
    }
});
//# sourceMappingURL=requestTripOffline.js.map