import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions-test';
import { cancelTripWithPenaltyCallable } from './cancelTripWithPenalty';

const testEnv = functions();

describe('cancelTripWithPenalty', () => {
  let wrapped: any;

  beforeAll(() => {
    wrapped = testEnv.wrap(cancelTripWithPenaltyCallable);
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  it('should throw an error if the user is not a driver', async () => {
    const context = { auth: { uid: 'test-uid' } };
    await expect(wrapped({}, { auth: context.auth })).rejects.toThrow(/El usuario debe ser un conductor autenticado/);
  });

  // TODO: Añadir más pruebas
});
