import * as admin from 'firebase-admin';
import { https } from 'firebase-functions';

import { requestTripCallable } from './trips/requestTrip';
import { acceptTripCallable } from './trips/acceptTrip';
import { updateTripStatusCallable } from './trips/updateTripStatus';
import { webhook as stripeWebhook } from './stripe/webhook';

admin.initializeApp();

export const requestTrip = https.onCall(requestTripCallable);
export const acceptTrip = https.onCall(acceptTripCallable);
export const updateTripStatus = https.onCall(updateTripStatusCallable);
export const stripe = https.onRequest(stripeWebhook);