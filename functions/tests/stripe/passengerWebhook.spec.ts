import * as admin from 'firebase-admin';
import { handleStripeWebhook } from '../../src/stripe/service';

function makeCheckoutCompletedForTrip(tripId: string, sessionId = 'cs_trip_1') {
  return {
    id: 'evt_cs_completed_trip',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: sessionId,
        metadata: { tripId, userId: 'user_trip' },
      },
    },
  } as any;
}

describe('Passenger Checkout webhook', () => {
  it('marks trip as paid on checkout.session.completed with metadata.tripId', async () => {
    const db = admin.firestore();
    const tripId = 'trip_webhook_paid_1';

    await db.collection('trips').doc(tripId).set({
      passengerId: 'user_trip',
      status: 'pending',
      payment: { method: 'cash', isSettledToDriver: false },
      createdAt: new Date(),
      updatedAt: new Date(),
      audit: { lastActor: 'passenger', lastAction: 'requestTrip' },
    });

    const event = makeCheckoutCompletedForTrip(tripId, 'cs_test_paid');
    await handleStripeWebhook(event);

    const after = await db.collection('trips').doc(tripId).get();
    const data = after.data() as any;
    expect(data.paymentStatus).toBe('paid');
    expect(data.paymentMethod).toBe('card');
    expect(data.stripeSessionId).toBe('cs_test_paid');
    expect(data.paidAt).toBeDefined();
  });
});
