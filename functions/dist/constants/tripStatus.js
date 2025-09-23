"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripStatus = void 0;
var TripStatus;
(function (TripStatus) {
    TripStatus["PENDING"] = "pending";
    TripStatus["ASSIGNED"] = "assigned";
    TripStatus["ARRIVED"] = "arrived";
    TripStatus["ACTIVE"] = "active";
    TripStatus["COMPLETED"] = "completed";
    // Generic cancellation (used by state machine tests)
    TripStatus["CANCELLED"] = "cancelled";
    // Specific cancellation flows used by functions like cancelTrip/markAsNoShow
    TripStatus["CANCELLED_BY_PASSENGER"] = "cancelled_by_passenger";
    TripStatus["CANCELLED_BY_DRIVER"] = "cancelled_by_driver";
    TripStatus["CANCELLED_WITH_PENALTY"] = "cancelled_with_penalty";
    TripStatus["NO_SHOW"] = "no_show";
    TripStatus["DISCONNECTED"] = "disconnected";
    TripStatus["PENDING_REVIEW"] = "pending_review";
    // Payment-related statuses
    TripStatus["PAYMENT_FAILED"] = "payment_failed";
    TripStatus["REFUNDED"] = "refunded";
})(TripStatus || (exports.TripStatus = TripStatus = {}));
//# sourceMappingURL=tripStatus.js.map