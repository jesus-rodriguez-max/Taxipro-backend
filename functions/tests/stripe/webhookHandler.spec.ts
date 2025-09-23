import * as admin from 'firebase-admin';
import { handleStripeWebhook } from '../../src/stripe/service';

function makeEvent(type: string, object: any): any {
  return { id: 'evt_1', type, data: { object } } as any;
}

describe('handleStripeWebhook', () => {
  it('activates subscription on checkout.session.completed', async () => {
    const driverId = 'driver_checkout';
    const driverRef = admin.firestore().collection('drivers').doc(driverId);
    await driverRef.set({ id: driverId });

    const event = makeEvent('checkout.session.completed', {
      client_reference_id: driverId,
      customer: 'cus_111',
      subscription: 'sub_111',
    });

    await handleStripeWebhook(event);

    const after = await driverRef.get();
    const data = after.data() as any;
    expect(data.subscriptionActive).toBe(true);
    expect(data.subscriptionId).toBe('sub_111');
    expect(data.stripeCustomerId).toBe('cus_111');
    expect(new Date(data.subscriptionExpiration).getTime()).toBeGreaterThan(Date.now());
  });

  it('suspends driver on invoice.payment_failed', async () => {
    const driverId = 'driver_invoice_failed';
    const driverRef = admin.firestore().collection('drivers').doc(driverId);
    await driverRef.set({ stripeCustomerId: 'cus_fail' });

    const event = makeEvent('invoice.payment_failed', {
      customer: 'cus_fail',
    });

    await handleStripeWebhook(event);

    const after = await driverRef.get();
    const data = after.data() as any;
    expect(data.subscriptionActive).toBe(false);
    expect(data.membership?.status).toBe('suspended');
  });

  it('updates KYC status on account.updated', async () => {
    const driverId = 'driver_account_updated';
    const driverRef = admin.firestore().collection('drivers').doc(driverId);
    await driverRef.set({ stripeAccountId: 'acct_777', isApproved: false, kyc: { verified: false } });

    const event = makeEvent('account.updated', {
      id: 'acct_777',
      charges_enabled: true,
      details_submitted: true,
    });

    await handleStripeWebhook(event);

    const after = await driverRef.get();
    const data = after.data() as any;
    expect(data.isApproved).toBe(true);
    expect(data.kyc?.verified).toBe(true);
  });

  it('marks driver UNPAID on customer.subscription.deleted', async () => {
    const driverId = 'driver_sub_deleted';
    const driverRef = admin.firestore().collection('drivers').doc(driverId);
    await driverRef.set({ stripeCustomerId: 'cus_del', subscriptionActive: true });

    const event = makeEvent('customer.subscription.deleted', {
      customer: 'cus_del',
      id: 'sub_del_1',
    });

    await handleStripeWebhook(event);

    const after = await driverRef.get();
    const data = after.data() as any;
    expect(data.subscriptionActive).toBe(false);
    expect(data.membership?.status).toBe('unpaid');
  });
});
