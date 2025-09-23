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
exports.updateShareLocation = void 0;
const firebase_functions_1 = require("firebase-functions");
const admin = __importStar(require("firebase-admin"));
/**
 * Actualiza la ubicación y estado en los documentos de viajes compartidos.
 * Se ejecuta cada minuto para mantener la información fresca para el enlace público.
 */
exports.updateShareLocation = firebase_functions_1.pubsub
    .schedule('every 1 minutes')
    .onRun(async (context) => {
    const db = admin.firestore();
    const activeSharesQuery = db.collection('shared_trips').where('isActive', '==', true);
    const activeSharesSnap = await activeSharesQuery.get();
    if (activeSharesSnap.empty) {
        return null;
    }
    const updates = [];
    for (const doc of activeSharesSnap.docs) {
        const shareData = doc.data();
        const tripId = shareData.tripId;
        if (!tripId)
            continue;
        const tripRef = db.collection('trips').doc(tripId);
        const tripSnap = await tripRef.get();
        const trip = tripSnap.data();
        if (!trip) {
            // Si el viaje ya no existe, desactiva la compartición
            updates.push(doc.ref.update({ isActive: false }));
            continue;
        }
        // Actualiza el documento de compartición con los datos más recientes del viaje
        updates.push(doc.ref.update({
            lastKnownLocation: trip.lastKnownLocation || null,
            tripStatus: trip.status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }));
    }
    await Promise.all(updates);
    return null;
});
//# sourceMappingURL=updateShareLocation.js.map