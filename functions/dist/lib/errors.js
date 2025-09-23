"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeofenceError = exports.InvalidStateTransitionError = void 0;
class InvalidStateTransitionError extends Error {
    constructor(from, to) {
        super(`Invalid state transition from ${from} to ${to}.`);
        this.name = 'InvalidStateTransitionError';
    }
}
exports.InvalidStateTransitionError = InvalidStateTransitionError;
class GeofenceError extends Error {
    constructor(message) {
        super(message);
        this.name = 'GeofenceError';
    }
}
exports.GeofenceError = GeofenceError;
//# sourceMappingURL=errors.js.map