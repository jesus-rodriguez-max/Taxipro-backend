"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
const firestore_1 = require("firebase-admin/firestore");
async function log(tripId, message, data) {
    const firestore = (0, firestore_1.getFirestore)();
    const logData = {
        message,
        data,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    };
    await firestore.collection('trips').doc(tripId).collection('logs').add(logData);
}
//# sourceMappingURL=logging.js.map