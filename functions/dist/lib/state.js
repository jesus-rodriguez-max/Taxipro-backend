"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canTransition = canTransition;
exports.getNextStatuses = getNextStatuses;
const tripStatus_1 = require("../constants/tripStatus");
const validTransitions = {
    [tripStatus_1.TripStatus.PENDING]: [tripStatus_1.TripStatus.ASSIGNED, tripStatus_1.TripStatus.CANCELLED, tripStatus_1.TripStatus.CANCELLED_BY_PASSENGER],
    // A driver can mark arrival before starting the trip
    [tripStatus_1.TripStatus.ASSIGNED]: [
        tripStatus_1.TripStatus.ARRIVED,
        tripStatus_1.TripStatus.ACTIVE,
        tripStatus_1.TripStatus.CANCELLED,
        tripStatus_1.TripStatus.CANCELLED_BY_PASSENGER,
        tripStatus_1.TripStatus.CANCELLED_WITH_PENALTY,
        tripStatus_1.TripStatus.CANCELLED_BY_DRIVER,
    ],
    // After ARRIVED: can start (ACTIVE) or mark NO_SHOW or cancel flows
    [tripStatus_1.TripStatus.ARRIVED]: [
        tripStatus_1.TripStatus.ACTIVE,
        tripStatus_1.TripStatus.NO_SHOW,
        tripStatus_1.TripStatus.CANCELLED_BY_PASSENGER,
        tripStatus_1.TripStatus.CANCELLED_WITH_PENALTY,
        tripStatus_1.TripStatus.CANCELLED_BY_DRIVER,
    ],
    // ACTIVE trips can complete or be disconnected by watchdog
    [tripStatus_1.TripStatus.ACTIVE]: [tripStatus_1.TripStatus.COMPLETED, tripStatus_1.TripStatus.CANCELLED, tripStatus_1.TripStatus.DISCONNECTED],
    // COMPLETED trips may later be marked as payment_failed or refunded via webhooks
    [tripStatus_1.TripStatus.COMPLETED]: [tripStatus_1.TripStatus.PAYMENT_FAILED, tripStatus_1.TripStatus.REFUNDED],
    [tripStatus_1.TripStatus.CANCELLED]: [],
    [tripStatus_1.TripStatus.CANCELLED_BY_PASSENGER]: [],
    [tripStatus_1.TripStatus.CANCELLED_BY_DRIVER]: [],
    [tripStatus_1.TripStatus.CANCELLED_WITH_PENALTY]: [],
    [tripStatus_1.TripStatus.NO_SHOW]: [],
    [tripStatus_1.TripStatus.DISCONNECTED]: [tripStatus_1.TripStatus.PENDING_REVIEW],
    [tripStatus_1.TripStatus.PENDING_REVIEW]: [],
    [tripStatus_1.TripStatus.PAYMENT_FAILED]: [],
    [tripStatus_1.TripStatus.REFUNDED]: [],
};
function canTransition(current, next) {
    return validTransitions[current]?.includes(next) ?? false;
}
function getNextStatuses(current) {
    return validTransitions[current] || [];
}
//# sourceMappingURL=state.js.map