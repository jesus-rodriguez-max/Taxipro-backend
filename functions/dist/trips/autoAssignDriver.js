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
exports.autoAssignDriver = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const geofire = __importStar(require("geofire-common"));
/**
 * Se activa al crear un nuevo viaje y asigna automáticamente el conductor más cercano.
 * @param {functions.firestore.QueryDocumentSnapshot} snap - Snapshot del documento del viaje.
 * @param {functions.EventContext} context - Contexto del evento.
 */
exports.autoAssignDriver = functions.firestore
    .document('trips/{tripId}')
    .onCreate(async (snap, context) => {
    const tripData = snap.data();
    if (tripData.status !== 'pending' || tripData.offline) {
        return null; // No procesar viajes que no estén pendientes o sean offline
    }
    const { origin } = tripData;
    const center = [origin.latitude, origin.longitude];
    const radiusInM = 50 * 1000; // 50 km
    const bounds = geofire.geohashQueryBounds(center, radiusInM);
    const promises = [];
    for (const b of bounds) {
        const q = admin.firestore().collection('drivers')
            .where('status', '==', 'available')
            .orderBy('geohash')
            .startAt(b[0])
            .endAt(b[1]);
        promises.push(q.get());
    }
    const snapshots = await Promise.all(promises);
    const matchingDocs = [];
    for (const s of snapshots) {
        for (const doc of s.docs) {
            const lat = doc.data().latitude;
            const lng = doc.data().longitude;
            const point = [lat, lng];
            const distanceInKm = geofire.distanceBetween(point, center);
            const distanceInM = distanceInKm * 1000;
            if (distanceInM <= radiusInM) {
                matchingDocs.push({ ...doc.data(), id: doc.id, distance: distanceInM });
            }
        }
    }
    if (matchingDocs.length > 0) {
        matchingDocs.sort((a, b) => a.distance - b.distance);
        const closestDriver = matchingDocs[0];
        await snap.ref.update({
            driverId: closestDriver.id,
            status: 'assigned',
        });
        await admin.firestore().collection('drivers').doc(closestDriver.id).update({
            status: 'busy',
        });
        console.log(`Conductor ${closestDriver.id} asignado al viaje ${snap.id}`);
        // Aquí se podría enviar una notificación FCM al conductor y al pasajero.
    }
    else {
        console.log(`No se encontraron conductores disponibles para el viaje ${snap.id}`);
        await snap.ref.update({ status: 'unassigned' });
    }
    return null;
});
//# sourceMappingURL=autoAssignDriver.js.map