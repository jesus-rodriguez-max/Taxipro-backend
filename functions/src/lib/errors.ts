export class InvalidStateTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid state transition from ${from} to ${to}.`);
    this.name = 'InvalidStateTransitionError';
  }
}

export class GeofenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeofenceError';
  }
}
