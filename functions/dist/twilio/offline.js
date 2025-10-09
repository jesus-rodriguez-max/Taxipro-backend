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
exports.sendOfflineRideRequest = sendOfflineRideRequest;
const admin = __importStar(require("firebase-admin"));
function parseOriginDestination(body) {
    // Expected format example: "Origen: Av. Himalaya 123, Destino: Plaza Tangamanga"
    const originMatch = /Origen\s*:\s*([^,]+?)(?=,\s*Destino:|$)/i.exec(body);
    const destMatch = /Destino\s*:\s*(.+)$/i.exec(body);
    const origin = originMatch?.[1]?.trim() || '';
    const destination = destMatch?.[1]?.trim() || '';
    return { origin, destination };
}
async function sendOfflineRideRequest(payload) {
    if (!payload?.From || !payload?.Body) {
        throw new Error('Invalid SMS payload. Missing From or Body.');
    }
    if (admin.apps.length === 0) {
        admin.initializeApp();
    }
    const db = admin.firestore();
    const { origin, destination } = parseOriginDestination(payload.Body);
    const trip = {
        passengerPhone: payload.From,
        origin,
        destination,
        status: 'offline',
        offline: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const addResult = await db.collection('trips').add(trip);
    const ref = db.collection('trips').doc(addResult.id);
    // Simulated driver details for offline flow response
    const driver = {
        name: 'Juan Pérez',
        taxiNumber: 'EcoTaxi 102',
        vehicle: 'Nissan Versa 2019',
        etaMinutes: 7,
        approxCost: 85,
    };
    const response = `Taxi asignado: ${driver.name} | ${driver.taxiNumber} | ${driver.vehicle}. ` +
        `Tiempo estimado de llegada: ${driver.etaMinutes} min. ` +
        `Costo aproximado: $${driver.approxCost} MXN. ` +
        `Pago solo en efectivo, sin seguridad activa.`;
    // Optional: store assignment preview (not required for the test)
    await ref.collection('meta').doc('assignment').set({ driver, createdAt: admin.firestore.FieldValue.serverTimestamp() }).catch(() => undefined);
    return response;
}
//# sourceMappingURL=offline.js.map