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
exports.logSafetyEventCallable = exports.stopRecordingCallable = exports.startRecordingCallable = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
/**
 * Registra un evento de seguridad relacionado con un viaje.
 * Esta es una función genérica para centralizar el logging de eventos de seguridad.
 */
const logEvent = async (tripId, type, passengerId, metadata = {}) => {
    if (admin.apps.length === 0) {
        admin.initializeApp();
    }
    const logRef = admin.firestore().collection('trips').doc(tripId).collection('safety_logs').doc();
    await logRef.set({
        type,
        passengerId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ...metadata,
    });
};
/**
 * Notifica al backend que la grabación de audio ha comenzado.
 */
exports.startRecordingCallable = (0, https_1.onCall)(async (request) => {
    const { auth, data } = request;
    if (!auth)
        throw new https_1.HttpsError('unauthenticated', 'Autenticación requerida.');
    const { tripId } = data;
    await logEvent(tripId, 'audio_recording_started', auth.uid);
    return { success: true };
});
/**
 * Notifica al backend que la grabación de audio ha finalizado.
 */
exports.stopRecordingCallable = (0, https_1.onCall)(async (request) => {
    const { auth, data } = request;
    if (!auth)
        throw new https_1.HttpsError('unauthenticated', 'Autenticación requerida.');
    const { tripId } = data;
    await logEvent(tripId, 'audio_recording_stopped', auth.uid);
    return { success: true };
});
/**
 * Registra un evento de seguridad genérico, como la activación de un botón de pánico.
 */
exports.logSafetyEventCallable = (0, https_1.onCall)(async (request) => {
    const { auth, data } = request;
    if (!auth)
        throw new https_1.HttpsError('unauthenticated', 'Autenticación requerida.');
    const { tripId, type, metadata } = data;
    if (!tripId || !type) {
        throw new https_1.HttpsError('invalid-argument', 'Se requiere tripId y type.');
    }
    await logEvent(tripId, type, auth.uid, metadata);
    return { success: true, message: `Evento '${type}' registrado.` };
});
//# sourceMappingURL=safety.js.map