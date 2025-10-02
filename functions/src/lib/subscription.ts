import * as admin from 'firebase-admin';

/**
 * Check if the driver's subscription is currently active (paid or within free trial).
 *
 * Drivers have a subscriptionExpiration field in their Firestore document
 * under the "drivers" collection representing the timestamp when their paid subscription expires.
 * If subscriptionExpiration is missing or in the future, the subscription is considered active.
 *
 * @param driverId The uid of the driver
 * @returns true if the subscription is active, false otherwise
 */
export async function isDriverSubscriptionActive(driverId: string): Promise<boolean> {
  const doc = await admin.firestore().collection('drivers').doc(driverId).get();
  if (!doc.exists) {
    return false;
  }
  const data = doc.data() || {};
  const expiration = (data as any).subscriptionExpiration;
  // If no expiration, treat as active (trial)
  if (!expiration) {
    return true;
  }
  let expirationDate: Date;
  // expiration can be a Firestore Timestamp or Date
  if (typeof (expiration as any).toDate === 'function') {
    expirationDate = (expiration as any).toDate();
  } else {
    expirationDate = new Date(expiration);
  }
  return expirationDate.getTime() > Date.now();
}
