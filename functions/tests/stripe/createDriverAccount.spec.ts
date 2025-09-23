import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createDriverAccountCallable } from '../../src/stripe/createDriverAccount';

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    accounts: {
      create: jest.fn(async () => ({ id: 'acct_123' })),
    },
    accountLinks: {
      create: jest.fn(async () => ({ url: 'https://connect.stripe.com/setup/s/acct_123' })),
    },
  }));
});

describe('createDriverAccountCallable', () => {
  it('creates an Express account and returns onboarding link', async () => {
    const driverId = 'driver_1';
    const driverRef = admin.firestore().collection('drivers').doc(driverId);
    await driverRef.set({ id: driverId });

    const res = await createDriverAccountCallable(
      { refreshUrl: 'https://example.com/refresh', returnUrl: 'https://example.com/return' },
      { auth: { uid: driverId } } as any
    );

    expect(res.accountId).toBe('acct_123');
    expect(res.url).toContain('https://connect.stripe.com');
  });

  it('rejects unauthenticated calls', async () => {
    await expect(createDriverAccountCallable({}, {} as any)).rejects.toThrow();
  });
});
