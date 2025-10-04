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
exports.logSafetyEventV2Callable = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v1/https");
const safety_1 = require("../models/safety");
const config_1 = require("../config");
const crypto = __importStar(require("crypto"));
const logSafetyEventV2Callable = async (data, context) => {
    if (!context.auth) {
        throw new https_1.HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
    }
    const { tripId, eventType, actorId, coords, audioBase64 } = data;
    if (!Object.values(safety_1.SafetyEventType).includes(eventType)) {
        throw new https_1.HttpsError('invalid-argument', 'El tipo de evento no es válido.');
    }
    const userId = context.auth.uid;
    const db = admin.firestore();
    if (userId !== actorId) {
        throw new https_1.HttpsError('permission-denied', 'No puedes reportar un evento en nombre de otro usuario.');
    }
    // 1. Verificar consentimiento y estado del perfil de seguridad
    const safetyProfileRef = db.collection('safety_profiles').doc(userId);
    const safetyProfileSnap = await safetyProfileRef.get();
    if (!safetyProfileSnap.exists) {
        throw new https_1.HttpsError('failed-precondition', 'El perfil de seguridad no existe.');
    }
    const safetyProfile = safetyProfileSnap.data();
    if (!safetyProfile.escudoEnabled || !safetyProfile.escudoAcceptedAt) {
        throw new https_1.HttpsError('failed-precondition', 'El Escudo TaxiPro no está activado o aceptado.');
    }
    if (safetyProfile.safetySuspendedUntil && safetyProfile.safetySuspendedUntil.toMillis() > Date.now()) {
        throw new https_1.HttpsError('permission-denied', 'Tu cuenta de seguridad está suspendida temporalmente.');
    }
    // 2. Validar límites de uso (rate limiting)
    const rateLimitMinutes = config_1.SAFETY_RATE_LIMIT_MINUTES;
    const dailyLimit = config_1.SAFETY_DAILY_LIMIT;
    const now = admin.firestore.Timestamp.now();
    const tenMinutesAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - rateLimitMinutes * 60 * 1000);
    const twentyFourHoursAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 86400000);
    const recentLogsQuery = db.collectionGroup('safety_logs')
        .where('actorId', '==', userId)
        .where('timestamp', '>=', tenMinutesAgo);
    const dailyLogsQuery = db.collectionGroup('safety_logs')
        .where('actorId', '==', userId)
        .where('timestamp', '>=', twentyFourHoursAgo);
    const [recentLogsSnap, dailyLogsSnap] = await Promise.all([
        recentLogsQuery.get(),
        dailyLogsQuery.get(),
    ]);
    if (!recentLogsSnap.empty) {
        throw new https_1.HttpsError('resource-exhausted', `Solo puedes enviar una alerta cada ${rateLimitMinutes} minutos.`);
    }
    if (dailyLogsSnap.size >= dailyLimit) {
        throw new https_1.HttpsError('resource-exhausted', `Has alcanzado el límite de ${dailyLimit} alertas diarias.`);
    }
    // 3. Subir audio a Cloud Storage si existe
    let audioPath;
    if (audioBase64) {
        const bucket = admin.storage().bucket();
        const buffer = Buffer.from(audioBase64, 'base64');
        audioPath = `safety_audio/${tripId}/${Date.now()}.wav`;
        const file = bucket.file(audioPath);
        await file.save(buffer, { contentType: 'audio/wav' });
    }
    // 4. Crear y guardar el log de seguridad
    const logPayload = {
        eventType,
        actorId,
        timestamp: now,
        coords: new admin.firestore.GeoPoint(coords.latitude, coords.longitude),
        audioPath,
        templateId: eventType === safety_1.SafetyEventType.PANIC_PASSENGER ? 'TAXIPRO_ALERT_PAX_V1' : 'TAXIPRO_ALERT_DRV_V1',
        recipients: [], // Se llenará después de enviar las alertas
    };
    // Determinar destinatarios (mínimo seguro)
    const recipients = [];
    if (safetyProfile.trustedContactPhone) {
        recipients.push(safetyProfile.trustedContactPhone);
    }
    // Calcular hash y construir el SafetyLog final
    const baseForHash = { ...logPayload, recipients };
    const hashPayload = crypto.createHash('sha256').update(JSON.stringify(baseForHash)).digest('hex');
    const safetyLog = { ...baseForHash, hashPayload };
    const logRef = db.collection('trips').doc(tripId).collection('safety_logs').doc();
    await logRef.set(safetyLog);
    return { status: 'success', message: 'Evento de seguridad registrado.' };
};
exports.logSafetyEventV2Callable = logSafetyEventV2Callable;
//# sourceMappingURL=logSafetyEvent.js.map