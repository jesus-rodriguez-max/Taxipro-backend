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
exports.downloadTripAudioCallable = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * Genera una URL firmada para descargar el audio de un viaje.
 * @param {object} data - Datos de la llamada, debe contener `filePath`.
 * @param {functions.https.CallableContext} context - Contexto de la función.
 * @returns {Promise<{downloadUrl: string}>} - URL de descarga.
 */
const downloadTripAudioCallable = async (data, context) => {
    if (!context.auth || context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden descargar audios.');
    }
    const { filePath } = data;
    if (!filePath) {
        throw new functions.https.HttpsError('invalid-argument', 'Se requiere la ruta del archivo.');
    }
    try {
        const bucket = admin.storage().bucket();
        const file = bucket.file(filePath);
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutos
        });
        return { downloadUrl: url };
    }
    catch (error) {
        console.error('Error al generar la URL de descarga:', error);
        throw new functions.https.HttpsError('internal', 'No se pudo generar la URL de descarga.', error.message);
    }
};
exports.downloadTripAudioCallable = downloadTripAudioCallable;
//# sourceMappingURL=downloadTripAudio.js.map