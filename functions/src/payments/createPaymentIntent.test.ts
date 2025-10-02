// import * as admin from 'firebase-admin';
// import * as functions from 'firebase-functions-test';
// import { createPaymentIntentCallable } from './createPaymentIntent';

// const testEnv = functions();

// describe('createPaymentIntent', () => {
//   let wrapped: any;

//   beforeAll(() => {
//     wrapped = testEnv.wrap(createPaymentIntentCallable);
//   });

//   afterAll(() => {
//     testEnv.cleanup();
//   });

//   it('should throw an error if the user is not authenticated', async () => {
//     await expect(wrapped({})).rejects.toThrow(/El usuario debe estar autenticado/);
//   });

//   it('should throw an error if tripId is not provided', async () => {
//     const context = { auth: { uid: 'test-uid' } };
//     await expect(wrapped({}, { auth: context.auth })).rejects.toThrow(/Se requiere el `tripId`/);
//   });
// });

