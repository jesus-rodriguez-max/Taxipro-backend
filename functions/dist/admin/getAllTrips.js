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
exports.getAllTripsCallable = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * Obtiene una lista paginada de todos los viajes.
 * @param {object} data - Datos de la llamada, puede contener `pageSize` y `startAfter`.
 * @param {functions.https.CallableContext} context - Contexto de la función.
 * @returns {Promise<any>} - Lista de viajes.
 */
const getAllTripsCallable = async (data, context) => {
    if (!context.auth || context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden ver todos los viajes.');
    }
    const { pageSize = 10, startAfter } = data;
    let query = admin.firestore().collection('trips').orderBy('createdAt', 'desc').limit(pageSize);
    if (startAfter) {
        const startAfterDoc = await admin.firestore().collection('trips').doc(startAfter).get();
        if (startAfterDoc.exists) {
            query = query.startAfter(startAfterDoc);
        }
    }
    try {
        const snapshot = await query.get();
        const trips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { trips };
    }
    catch (error) {
        console.error('Error al obtener los viajes:', error);
        throw new functions.https.HttpsError('internal', 'No se pudieron obtener los viajes.', error.message);
    }
};
exports.getAllTripsCallable = getAllTripsCallable;
//# sourceMappingURL=getAllTrips.js.map