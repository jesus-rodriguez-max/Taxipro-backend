import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export async function log(tripId: string, message: string, data: object): Promise<void> {
  const firestore = getFirestore();
  const logData = {
    message,
    data,
    createdAt: FieldValue.serverTimestamp(),
  };
  await firestore.collection('trips').doc(tripId).collection('logs').add(logData);
}
