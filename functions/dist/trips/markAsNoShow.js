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
exports.markAsNoShowCallable = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const types_1 = require("../lib/types");
const service_1 = require("../stripe/service");
const NO_SHOW_WAIT_MINUTES = 5;
const PENALTY_FARE = 5000; // Ejemplo: 50.00 MXN en centavos
/**
 * Función invocable para que un chofer marque que el pasajero no se presentó.
 */
const https_2 = require("firebase-functions/v2/https");
exports.markAsNoShowCallable = (0, https_2.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'El usuario no está autenticado.');
    }
    const driverId = request.auth.uid;
    const { tripId } = request.data;
    const tripRef = admin.firestore().collection('trips').doc(tripId);
    const tripDoc = await tripRef.get();
    if (!tripDoc.exists) {
        throw new https_1.HttpsError('not-found', `El viaje ${tripId} no existe.`);
    }
    const trip = tripDoc.data();
    if (trip.driverId !== driverId) {
        throw new https_1.HttpsError('permission-denied', 'No tienes permiso para modificar este viaje.');
    }
    if (trip.status !== types_1.TripStatus.ARRIVED) {
        throw new https_1.HttpsError('failed-precondition', `No puedes marcar 'no presentado' en un viaje que no está en estado 'ARRIVED'.`);
    }
    // Validar que han pasado los 5 minutos
    const now = new Date();
    const arrivedAt = trip.driverArrivedAt.toDate();
    const diffMinutes = (now.getTime() - arrivedAt.getTime()) / (1000 * 60);
    if (diffMinutes <= NO_SHOW_WAIT_MINUTES) {
        throw new https_1.HttpsError('failed-precondition', `Debes esperar al menos ${NO_SHOW_WAIT_MINUTES} minutos antes de marcar 'no presentado'.`);
    }
    // Lógica de cobro de penalización (idéntica a cancelTrip)
    const userRef = admin.firestore().collection('users').doc(trip.passengerId);
    const userDoc = await userRef.get();
    const user = userDoc.data();
    try {
        if (user.stripeCustomerId && user.defaultPaymentMethodId) {
            await (0, service_1.createPaymentIntent)(PENALTY_FARE, 'mxn', user.stripeCustomerId, user.defaultPaymentMethodId);
            await tripRef.update({
                status: types_1.TripStatus.NO_SHOW,
                'fare.penalty': PENALTY_FARE,
                'payment.method': 'stripe',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return { success: true, message: 'Pasajero marcado como no presentado. Se ha cobrado una penalización.' };
        }
        else {
            throw new Error('No payment method');
        }
    }
    catch (error) {
        await userRef.update({ pendingBalance: admin.firestore.FieldValue.increment(PENALTY_FARE) });
        await tripRef.update({
            status: types_1.TripStatus.NO_SHOW,
            'fare.penalty': PENALTY_FARE,
            'payment.method': 'pending_balance',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, message: 'Pasajero marcado como no presentado. Se añadió penalización a su saldo pendiente.' };
    }
});
//# sourceMappingURL=markAsNoShow.js.map