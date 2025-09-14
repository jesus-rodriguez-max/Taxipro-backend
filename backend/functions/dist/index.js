import * as admin from 'firebase-admin';
import { https } from 'firebase-functions';
import { requestTripCallable } from './trips/requestTrip.js';
import { acceptTripCallable } from './trips/acceptTrip.js';
import { updateTripStatusCallable } from './trips/updateTripStatus.js';
import { webhook as stripeWebhook } from './stripe/webhook.js';
admin.initializeApp();
export const requestTrip = https.onCall(requestTripCallable);
export const acceptTrip = https.onCall(acceptTripCallable);
export const updateTripStatus = https.onCall(updateTripStatusCallable);
export const stripe = https.onRequest(stripeWebhook);
export const requestRide = https.onRequest((req, res) => {
    console.log("Request body:", req.body);
    const rideId = `ride_${Date.now()}`;
    res.json({
        result: {
            rideId,
            hasCreated: true,
            message: "Ride request received successfully."
        }
    });
});
//# sourceMappingURL=index.js.map