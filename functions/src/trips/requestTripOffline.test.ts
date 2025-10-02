// import * as admin from 'firebase-admin';
// import * as functions from 'firebase-functions-test';
// import { requestTripOfflineCallable } from './requestTripOffline';

// const testEnv = functions();

// describe('requestTripOffline', () => {
//   let wrapped: any;

//   beforeAll(() => {
//     wrapped = testEnv.wrap(requestTripOfflineCallable);
//   });

//   afterAll(() => {
//     testEnv.cleanup();
//   });

//   it('should throw an error if required data is missing', async () => {
//     await expect(wrapped({})).rejects.toThrow(/Faltan datos para solicitar el viaje sin conexión/);
//   });
// });

