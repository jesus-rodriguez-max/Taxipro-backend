import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions-test';
import { logSafetyEventV2Callable } from './logSafetyEvent';
import { SafetyProfile, SafetyEventType } from '../models/safety';

const testEnv = functions();

describe('logSafetyEventV2', () => {
  let wrapped: any;

  beforeAll(() => {
    wrapped = testEnv.wrap(logSafetyEventV2Callable);
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  it('should throw an error if the user is not authenticated', async () => {
    await expect(wrapped({})).rejects.toThrow(/El usuario debe estar autenticado/);
  });

  // TODO: Añadir más pruebas
});
