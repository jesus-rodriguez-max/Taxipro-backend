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
exports.getShareStatus = exports.disableShareCallable = exports.enableShareCallable = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const crypto = __importStar(require("crypto"));
// Función para generar un token seguro
const generateShareToken = () => crypto.randomBytes(20).toString('hex');
/**
 * Habilita la compartición de un viaje, generando un token de acceso.
 */
exports.enableShareCallable = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'El usuario no está autenticado.');
    }
    const { tripId } = data;
    const tripRef = admin.firestore().collection('trips').doc(tripId);
    const tripDoc = await tripRef.get();
    if (!tripDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'El viaje no existe.');
    }
    const trip = tripDoc.data();
    if (trip.passengerId !== context.auth.uid && trip.driverId !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'No puedes compartir este viaje.');
    }
    const shareToken = generateShareToken();
    const shareRef = admin.firestore().collection('shared_trips').doc(shareToken);
    await shareRef.set({
        tripId: tripId,
        passengerId: trip.passengerId,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000), // Expira en 24h
    });
    return { success: true, shareToken };
});
/**
 * Deshabilita la compartición de un viaje.
 */
exports.disableShareCallable = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'El usuario no está autenticado.');
    }
    const { shareToken } = data;
    const shareRef = admin.firestore().collection('shared_trips').doc(shareToken);
    const shareDoc = await shareRef.get();
    if (!shareDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'El token de compartición no es válido.');
    }
    if (shareDoc.data()?.passengerId !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'No tienes permiso para detener esta compartición.');
    }
    await shareRef.update({ isActive: false });
    return { success: true, message: 'Se ha detenido la compartición del viaje.' };
});
/**
 * Función HTTP para obtener el estado de un viaje compartido usando un token.
 * Es pública pero solo expone datos mínimos y seguros.
 */
exports.getShareStatus = functions.https.onRequest(async (req, res) => {
    const { token } = req.query;
    if (typeof token !== 'string') {
        res.status(400).send('Token no proporcionado.');
        return;
    }
    const shareRef = admin.firestore().collection('shared_trips').doc(token);
    const shareDoc = await shareRef.get();
    if (!shareDoc.exists || !shareDoc.data()?.isActive) {
        res.status(404).send('El viaje compartido no está activo o no existe.');
        return;
    }
    const tripId = shareDoc.data()?.tripId;
    const tripRef = admin.firestore().collection('trips').doc(tripId);
    const tripDoc = await tripRef.get();
    if (!tripDoc.exists) {
        res.status(404).send('El viaje asociado no fue encontrado.');
        return;
    }
    const trip = tripDoc.data();
    // Exponer solo datos seguros y mínimos
    const safeData = {
        status: trip.status,
        lastKnownLocation: trip.lastKnownLocation || null,
        driverArrivedAt: trip.driverArrivedAt || null,
        startedAt: trip.startedAt || null,
        completedAt: trip.completedAt || null,
    };
    res.status(200).json(safeData);
});
//# sourceMappingURL=safetyShare.js.map