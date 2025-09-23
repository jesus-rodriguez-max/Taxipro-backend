import * as admin from 'firebase-admin';
import { checkDriverSubscriptionCallable } from '../../src/stripe/checkDriverSubscription';

describe('checkDriverSubscriptionCallable', () => {
  it('returns active true when expiration is in the future', async () => {
    const driverId = 'driver_sub_active';
    const driverRef = admin.firestore().collection('drivers').doc(driverId);
    await driverRef.set({ subscriptionExpiration: new Date(Date.now() + 24 * 60 * 60 * 1000) });

    const res = await checkDriverSubscriptionCallable({}, { auth: { uid: driverId } } as any);
    expect(res.active).toBe(true);
  });

  it('returns active false when expiration is in the past', async () => {
    const driverId = 'driver_sub_inactive';
    const driverRef = admin.firestore().collection('drivers').doc(driverId);
    await driverRef.set({ subscriptionExpiration: new Date(Date.now() - 24 * 60 * 60 * 1000) });

    const res = await checkDriverSubscriptionCallable({}, { auth: { uid: driverId } } as any);
    expect(res.active).toBe(false);
  });

  it('treats missing expiration as active (trial)', async () => {
    const driverId = 'driver_sub_trial';
    const driverRef = admin.firestore().collection('drivers').doc(driverId);
    await driverRef.set({});

    const res = await checkDriverSubscriptionCallable({}, { auth: { uid: driverId } } as any);
    expect(res.active).toBe(true);
  });
});
