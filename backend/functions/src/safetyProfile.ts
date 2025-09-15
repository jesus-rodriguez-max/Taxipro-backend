import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Update the trusted contacts for a user.
 * data: { contacts: [{ name: string, phone: string }] }
 */
export const updateTrustedContactsCallable = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debe iniciar sesión');
  }
  const userId = context.auth.uid;
  const contacts = data?.contacts;
  if (!Array.isArray(contacts)) {
    throw new functions.https.HttpsError('invalid-argument', 'contacts debe ser un arreglo');
  }
  // basic validation: each contact must have name and phone
  for (const c of contacts) {
    if (!c?.name || !c?.phone) {
      throw new functions.https.HttpsError('invalid-argument', 'Cada contacto debe tener nombre y teléfono');
    }
  }
  const now = admin.firestore.Timestamp.now();
  await admin.firestore().collection('safety_profiles').doc(userId).set(
    {
      trustedContacts: contacts,
      updatedAt: now,
    },
    { merge: true }
  );
  return { success: true };
});

/**
 * Update safety consent flags for a user.
 * data: { audio: boolean, share: boolean }
 */
export const updateSafetyConsentsCallable = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debe iniciar sesión');
  }
  const userId = context.auth.uid;
  const audio = data?.audio;
  const share = data?.share;
  if (typeof audio !== 'boolean' || typeof share !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', 'audio y share deben ser booleanos');
  }
  const now = admin.firestore.Timestamp.now();
  await admin.firestore().collection('safety_profiles').doc(userId).set(
    {
      legalConsents: {
        audio: { accepted: audio, ts: now },
        share: { accepted: share, ts: now },
      },
    },
    { merge: true }
  );
  return { success: true };
});
