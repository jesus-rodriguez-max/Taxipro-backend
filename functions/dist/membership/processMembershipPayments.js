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
exports.suspendOverdueMemberships = exports.processMembershipPayments = void 0;
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions");
const types_1 = require("../lib/types");
const service_1 = require("../stripe/service");
const MEMBERSHIP_FEE = 20000; // 200.00 MXN en centavos
/**
 * Función programada para procesar los pagos de membresía de los choferes.
 * Se ejecuta todos los días a las 5:00 AM.
 */
exports.processMembershipPayments = firebase_functions_1.pubsub
    .schedule('0 5 * * *') // Todos los días a las 5 AM
    .timeZone('America/Mexico_City')
    .onRun(async (context) => {
    const firestore = admin.firestore();
    const today = new Date().getDay(); // Domingo=0, Lunes=1, ..., Sábado=6
    // Solo se ejecuta los viernes, sábados y domingos
    if (![5, 6, 0].includes(today)) {
        console.log('Hoy no es día de cobro de membresía. Omitiendo ejecución.');
        return null;
    }
    const driversToChargeQuery = firestore
        .collection('drivers')
        .where('membership.status', 'in', [types_1.DriverMembershipStatus.ACTIVE, types_1.DriverMembershipStatus.GRACE_PERIOD]);
    const snapshot = await driversToChargeQuery.get();
    if (snapshot.empty) {
        console.log('No hay choferes para procesar el pago de membresía.');
        return null;
    }
    const chargePromises = snapshot.docs.map(async (doc) => {
        const driver = doc.data();
        const driverId = doc.id;
        const userRef = firestore.collection('users').doc(driverId); // Asumimos que el driver es un user
        try {
            const userDoc = await userRef.get();
            if (!userDoc.exists)
                throw new Error(`Usuario ${driverId} no encontrado.`);
            const user = userDoc.data();
            if (!user.stripeCustomerId || !user.defaultPaymentMethodId) {
                throw new Error(`El chofer ${driverId} no tiene un método de pago configurado.`);
            }
            // Intenta realizar el cobro
            await (0, service_1.createPaymentIntent)(MEMBERSHIP_FEE, 'mxn', user.stripeCustomerId, user.defaultPaymentMethodId);
            // Si el pago es exitoso, actualiza el estado a ACTIVO
            return doc.ref.update({
                'membership.status': types_1.DriverMembershipStatus.ACTIVE,
                'membership.lastPaymentAttempt': admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        catch (error) {
            console.error(`Fallo el cobro para el chofer ${driverId}:`, error);
            // Si falla, se mueve a PERIODO DE GRACIA
            return doc.ref.update({
                'membership.status': types_1.DriverMembershipStatus.GRACE_PERIOD,
                'membership.lastPaymentAttempt': admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    });
    await Promise.all(chargePromises);
    console.log(`Proceso de pago de membresías completado para ${snapshot.size} choferes.`);
    return null;
});
/**
 * Función programada para suspender a los miembros con pagos vencidos.
 * Se ejecuta todos los lunes a las 5:00 AM.
 */
exports.suspendOverdueMemberships = firebase_functions_1.pubsub
    .schedule('0 5 * * 1') // Todos los lunes a las 5 AM
    .timeZone('America/Mexico_City')
    .onRun(async (context) => {
    const firestore = admin.firestore();
    const driversToSuspendQuery = firestore
        .collection('drivers')
        .where('membership.status', '==', types_1.DriverMembershipStatus.GRACE_PERIOD);
    const snapshot = await driversToSuspendQuery.get();
    if (snapshot.empty) {
        console.log('No hay choferes para suspender.');
        return null;
    }
    const suspensionPromises = snapshot.docs.map((doc) => {
        return doc.ref.update({ 'membership.status': types_1.DriverMembershipStatus.SUSPENDED });
    });
    await Promise.all(suspensionPromises);
    console.log(`${snapshot.size} choferes han sido suspendidos por falta de pago.`);
    return null;
});
//# sourceMappingURL=processMembershipPayments.js.map