import * as admin from 'firebase-admin';
admin.initializeApp();
// Import and re-export functions
export * from './trips/requestTrip.js';
export * from './trips/acceptTrip.js';
export * from './trips/updateTripStatus.js';
export * from './stripe/webhook.js';
//# sourceMappingURL=index.js.map