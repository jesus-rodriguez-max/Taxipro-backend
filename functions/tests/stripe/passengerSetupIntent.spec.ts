import * as admin from 'firebase-admin';
import { createPassengerCustomerCallable } from '../../src/payments/createPassengerCustomer';
import { createPassengerSetupIntentCallable } from '../../src/payments/createPassengerSetupIntent';
import { savePassengerPaymentMethodCallable } from '../../src/payments/savePassengerPaymentMethod';

// Mock Stripe SDK for this test file
const customersCreateMock = jest.fn(async (_args: any) => ({ id: 'cus_test_user_1' }));
const setupIntentsCreateMock = jest.fn(async (_args: any) => ({ id: 'seti_123', client_secret: 'seti_secret_123' }));
const setupIntentsRetrieveMock = jest.fn(async (id: string) => ({ id, payment_method: 'pm_abc', customer: 'cus_test_user_1' }));
const paymentMethodsAttachMock = jest.fn(async (_id: string, _args: any) => ({}));
const customersUpdateMock = jest.fn(async (_id: string, _args: any) => ({}));

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: customersCreateMock,
      update: customersUpdateMock,
    },
    setupIntents: {
      create: setupIntentsCreateMock,
      retrieve: setupIntentsRetrieveMock,
    },
    paymentMethods: {
      attach: paymentMethodsAttachMock,
    },
  }));
});

describe('Passenger card setup flow', () => {
  it('creates a customer if missing and returns client_secret for SetupIntent', async () => {
    const db = admin.firestore();
    const userId = 'user_setup_1';

    // Usuario sin stripeCustomerId
    await db.collection('users').doc(userId).set({ email: 'u1@example.com', name: 'User One' });

    // Paso 1: crear cliente si no existe
    const resCustomer = await createPassengerCustomerCallable({ userId }, { auth: { uid: userId } } as any);
    expect(resCustomer.stripeCustomerId).toBe('cus_test_user_1');

    // Paso 2: crear SetupIntent
    const resSetup = await createPassengerSetupIntentCallable({ userId }, { auth: { uid: userId } } as any);
    expect(resSetup.clientSecret).toBe('seti_secret_123');

    // El usuario debe tener guardado el customer
    const after = await db.collection('users').doc(userId).get();
    expect((after.data() as any).stripeCustomerId).toBe('cus_test_user_1');
  });

  it('saves default payment method from setupIntent', async () => {
    const db = admin.firestore();
    const userId = 'user_pm_1';

    // Simular usuario con cliente creado
    await db.collection('users').doc(userId).set({ stripeCustomerId: 'cus_test_user_1' });

    const res = await savePassengerPaymentMethodCallable(
      { userId, setupIntentId: 'seti_123' },
      { auth: { uid: userId } } as any
    );

    expect(res.saved).toBe(true);
    expect(res.paymentMethodId).toBe('pm_abc');

    // Debe actualizar el usuario en Firestore
    const after = await db.collection('users').doc(userId).get();
    const data = after.data() as any;
    expect(data.defaultPaymentMethodId).toBe('pm_abc');
    expect(data.stripeCustomerId).toBe('cus_test_user_1');

    // Verifica llamadas a Stripe
    expect(paymentMethodsAttachMock).toHaveBeenCalledWith('pm_abc', { customer: 'cus_test_user_1' });
    expect(customersUpdateMock).toHaveBeenCalled();
  });
});
