import { getFirestore, FieldValue } from 'firebase-admin/firestore';
export async function log(tripId, message, data) {
    const firestore = getFirestore();
    const logData = {
        message,
        data,
        createdAt: FieldValue.serverTimestamp(),
    };
    await firestore.collection('trips').doc(tripId).collection('logs').add(logData);
}
//# sourceMappingURL=logging.js.map