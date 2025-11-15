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
exports.updateSafetyConsentsCallable = exports.updateTrustedContactsCallable = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
/**
 * Actualiza la lista de contactos de confianza de un usuario.
 */
exports.updateTrustedContactsCallable = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'El usuario no está autenticado.');
    }
    const uid = request.auth.uid;
    const { contacts } = request.data;
    // Validación básica de datos
    if (!Array.isArray(contacts) || contacts.length > 5) {
        throw new https_1.HttpsError('invalid-argument', 'Debes proporcionar un array de hasta 5 contactos.');
    }
    for (const contact of contacts) {
        if (!contact.name || !contact.phone) {
            throw new https_1.HttpsError('invalid-argument', 'Cada contacto debe tener un nombre y un teléfono.');
        }
    }
    const userProfileRef = admin.firestore().collection('safety_profiles').doc(uid);
    await userProfileRef.set({
        trustedContacts: contacts,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { success: true, message: 'Contactos de confianza actualizados.' };
});
/**
 * Actualiza los consentimientos de seguridad de un usuario.
 */
exports.updateSafetyConsentsCallable = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'El usuario no está autenticado.');
    }
    const uid = request.auth.uid;
    const { hasConsentedToAudioRecording } = request.data;
    if (typeof hasConsentedToAudioRecording !== 'boolean') {
        throw new https_1.HttpsError('invalid-argument', 'El consentimiento debe ser un valor booleano.');
    }
    const userProfileRef = admin.firestore().collection('safety_profiles').doc(uid);
    await userProfileRef.set({
        consents: { audioRecording: hasConsentedToAudioRecording },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { success: true, message: 'Consentimientos de seguridad actualizados.' };
});
//# sourceMappingURL=safetyProfile.js.map