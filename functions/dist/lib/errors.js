export class InvalidStateTransitionError extends Error {
    constructor(from, to) {
        super(`Invalid state transition from ${from} to ${to}.`);
        this.name = 'InvalidStateTransitionError';
    }
}
export class GeofenceError extends Error {
    constructor(message) {
        super(message);
        this.name = 'GeofenceError';
    }
}
//# sourceMappingURL=errors.js.map