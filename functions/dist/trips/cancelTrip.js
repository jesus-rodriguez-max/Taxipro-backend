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
exports.cancelTripCallable = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const types_1 = require("../lib/types");
const service_1 = require("../stripe/service");
const CANCELLATION_GRACE_PERIOD_MINUTES = 5;
const PENALTY_FARE = 5000; // Ejemplo: 50.00 MXN en centavos
/**
 * Función invocable para que un pasajero cancele un viaje.
 * Aplica una penalización si es necesario.
 */
const https_2 = require("firebase-functions/v2/https");
exports.cancelTripCallable = (0, https_2.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'El usuario no está autenticado.');
    }
    const passengerId = request.auth.uid;
    const { tripId } = request.data;
    const tripRef = admin.firestore().collection('trips').doc(tripId);
    const userRef = admin.firestore().collection('users').doc(passengerId);
    const tripDoc = await tripRef.get();
    if (!tripDoc.exists) {
        throw new https_1.HttpsError('not-found', `El viaje ${tripId} no existe.`);
    }
    const trip = tripDoc.data();
    if (trip.passengerId !== passengerId) {
        throw new https_1.HttpsError('permission-denied', 'No puedes cancelar este viaje.');
    }
    const isCancellable = [types_1.TripStatus.PENDING, types_1.TripStatus.ASSIGNED, types_1.TripStatus.ARRIVED].includes(trip.status);
    if (!isCancellable) {
        throw new https_1.HttpsError('failed-precondition', `No se puede cancelar un viaje en estado '${trip.status}'.`);
    }
    // Lógica de penalización
    let applyPenalty = false;
    if (trip.status === types_1.TripStatus.ARRIVED && trip.driverArrivedAt) {
        const now = new Date();
        const arrivedAt = trip.driverArrivedAt.toDate();
        const diffMinutes = (now.getTime() - arrivedAt.getTime()) / (1000 * 60);
        if (diffMinutes > CANCELLATION_GRACE_PERIOD_MINUTES) {
            applyPenalty = true;
        }
    }
    if (applyPenalty) {
        // Aplicar penalización
        const userDoc = await userRef.get();
        const user = userDoc.data();
        try {
            // Intento de cobro con Stripe
            if (user.stripeCustomerId && user.defaultPaymentMethodId) { // Asumiendo que tenemos defaultPaymentMethodId
                await (0, service_1.createPaymentIntent)(PENALTY_FARE, 'mxn', user.stripeCustomerId, user.defaultPaymentMethodId);
                await tripRef.update({
                    status: types_1.TripStatus.CANCELLED_WITH_PENALTY,
                    'fare.penalty': PENALTY_FARE,
                    'payment.method': 'stripe',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                return { success: true, message: 'Viaje cancelado. Se ha cobrado una penalización.' };
            }
            else {
                throw new Error('No payment method'); // Forzar fallback a saldo pendiente
            }
        }
        catch (error) {
            // Si falla el cobro o no hay tarjeta, se usa el saldo pendiente
            await userRef.update({ pendingBalance: admin.firestore.FieldValue.increment(PENALTY_FARE) });
            await tripRef.update({
                status: types_1.TripStatus.CANCELLED_WITH_PENALTY,
                'fare.penalty': PENALTY_FARE,
                'payment.method': 'pending_balance',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return { success: true, message: 'Viaje cancelado. Se añadió una penalización a tu saldo pendiente.' };
        }
    }
    else {
        // Cancelación gratuita
        await tripRef.update({
            status: types_1.TripStatus.CANCELLED_BY_PASSENGER,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, message: 'Viaje cancelado gratuitamente.' };
    }
});
//# sourceMappingURL=cancelTrip.js.map