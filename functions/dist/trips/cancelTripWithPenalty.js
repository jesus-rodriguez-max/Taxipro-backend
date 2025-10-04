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
exports.cancelTripWithPenaltyCallable = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v1/https");
const types_1 = require("../lib/types");
const service_1 = require("../stripe/service");
const config_1 = require("../config");
const cancelTripWithPenaltyCallable = async (data, context) => {
    if (!context.auth || !context.auth.token.role) {
        throw new https_1.HttpsError('unauthenticated', 'El usuario debe ser un conductor autenticado.');
    }
    const { tripId } = data;
    const driverId = context.auth.uid;
    const penaltyAmount = config_1.TRIPS_PENALTY_AMOUNT; // centavos
    const db = admin.firestore();
    const tripRef = db.collection('trips').doc(tripId);
    const tripSnap = await tripRef.get();
    if (!tripSnap.exists) {
        throw new https_1.HttpsError('not-found', 'El viaje no fue encontrado.');
    }
    const trip = tripSnap.data();
    if (trip.penaltyCharged) {
        throw new https_1.HttpsError('already-exists', 'Ya se ha cobrado una penalización por este viaje.');
    }
    if (trip.driverId !== driverId) {
        throw new https_1.HttpsError('permission-denied', 'No puedes cancelar un viaje que no te fue asignado.');
    }
    // Lógica de validación de condiciones
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const driverArrived = trip.status === types_1.TripStatus.ARRIVED;
    // Verificar si el conductor envió un mensaje después de llegar
    const messagesSnap = await tripRef.collection('messages')
        .where('authorId', '==', driverId)
        .where('timestamp', '>=', trip.arrivedAt)
        .limit(1)
        .get();
    const messageSent = !messagesSnap.empty;
    const waitedEnough = trip.arrivedAt ? trip.arrivedAt.toMillis() < fiveMinutesAgo : false;
    const notStarted = trip.status === types_1.TripStatus.ASSIGNED || trip.status === types_1.TripStatus.ARRIVED;
    if (driverArrived && messageSent && waitedEnough && notStarted) {
        // Aplicar cargo de penalización
        const passengerSnap = await db.collection('users').doc(trip.passengerId).get();
        const passengerData = passengerSnap.data();
        if (passengerData?.stripeCustomerId) {
            try {
                await (0, service_1.getStripe)().charges.create({
                    amount: penaltyAmount, // 23.00 MXN en centavos
                    currency: 'mxn',
                    customer: passengerData.stripeCustomerId,
                    description: `Penalización por no-show en viaje ${tripId}`,
                    metadata: { tripId },
                });
                // TODO: Enviar notificación al pasajero sobre el cobro de la penalización
            }
            catch (error) {
                console.error('Error al cobrar la penalización:', error);
                await tripRef.update({
                    status: types_1.TripStatus.CANCELLED,
                    penaltyChargeFailed: true,
                    penaltyAmount: penaltyAmount / 100,
                    penaltyReason: 'no_show',
                    cancelledBy: 'driver',
                });
                throw new https_1.HttpsError('internal', 'No se pudo procesar el cargo de penalización.');
            }
        }
        else {
            // Marcar como cargo pendiente si no hay cliente de Stripe
            await db.collection('users').doc(trip.passengerId).collection('pending_charges').add({
                amount: penaltyAmount / 100,
                currency: 'mxn',
                description: `Penalización por no-show en viaje ${tripId}`,
                tripId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        await tripRef.update({
            status: types_1.TripStatus.CANCELLED,
            penaltyCharged: true,
            penaltyAmount: penaltyAmount / 100, // Monto fijo
            penaltyReason: 'no_show',
            cancelledBy: 'driver',
        });
        return { status: 'success', message: 'Viaje cancelado con penalización.' };
    }
    else {
        // Cancelación normal sin penalización
        await tripRef.update({
            status: types_1.TripStatus.CANCELLED,
            cancelledBy: 'driver',
        });
        return { status: 'success', message: 'Viaje cancelado sin penalización.' };
    }
};
exports.cancelTripWithPenaltyCallable = cancelTripWithPenaltyCallable;
//# sourceMappingURL=cancelTripWithPenalty.js.map