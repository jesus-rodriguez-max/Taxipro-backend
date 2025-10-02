import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

interface TrustedContact {
  name: string;
  phone: string;
}

interface UpdateTrustedContactsData {
  contacts: TrustedContact[];
}

interface UpdateSafetyConsentsData {
  hasConsentedToAudioRecording: boolean;
}

/**
 * Actualiza la lista de contactos de confianza de un usuario.
 */
export const updateTrustedContactsCallable = async (data: UpdateTrustedContactsData, context: any) => {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'El usuario no está autenticado.');
  }

  const uid = context.auth.uid;
  const { contacts } = data;

  // Validación básica de datos
  if (!Array.isArray(contacts) || contacts.length > 5) {
    throw new HttpsError('invalid-argument', 'Debes proporcionar un array de hasta 5 contactos.');
  }
  for (const contact of contacts) {
    if (!contact.name || !contact.phone) {
      throw new HttpsError('invalid-argument', 'Cada contacto debe tener un nombre y un teléfono.');
    }
  }

  const userProfileRef = admin.firestore().collection('safety_profiles').doc(uid);

  await userProfileRef.set({ 
    trustedContacts: contacts,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return { success: true, message: 'Contactos de confianza actualizados.' };
};

/**
 * Actualiza los consentimientos de seguridad de un usuario.
 */
export const updateSafetyConsentsCallable = async (data: UpdateSafetyConsentsData, context: any) => {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'El usuario no está autenticado.');
  }

  const uid = context.auth.uid;
  const { hasConsentedToAudioRecording } = data;

  if (typeof hasConsentedToAudioRecording !== 'boolean') {
    throw new HttpsError('invalid-argument', 'El consentimiento debe ser un valor booleano.');
  }

  const userProfileRef = admin.firestore().collection('safety_profiles').doc(uid);

  await userProfileRef.set({ 
    consents: { audioRecording: hasConsentedToAudioRecording },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return { success: true, message: 'Consentimientos de seguridad actualizados.' };
};