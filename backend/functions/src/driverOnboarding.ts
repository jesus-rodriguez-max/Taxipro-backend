import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

interface OnboardingData {
  clabe?: string;
  stripeAccountToken?: string; // Token generado por el frontend de Stripe
}

/**
 * Función invocable para que un chofer envíe sus datos de pago (CLABE o Stripe).
 * Un chofer no puede ser aprobado hasta que este paso se complete.
 */
export const updateDriverOnboardingCallable = async (data: OnboardingData, context: any) => {
  // 1. Validar autenticación
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'El usuario no está autenticado.');
  }

  const driverId = context.auth.uid;
  const { clabe, stripeAccountToken } = data;

  // 2. Validar que al menos uno de los dos campos esté presente
  if (!clabe && !stripeAccountToken) {
    throw new HttpsError('invalid-argument', 'Se debe proporcionar una CLABE o una cuenta de Stripe.');
  }

  const driverRef = admin.firestore().collection('drivers').doc(driverId);
  const updatePayload: { [key: string]: any } = {
    'payouts.isConfigured': true,
    'payouts.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
  };

  // 3. Procesar y guardar los datos
  if (clabe) {
    // Aquí se podría añadir una validación de formato de CLABE
    if (clabe.length !== 18 || !/^[0-9]+$/.test(clabe)) {
      throw new HttpsError('invalid-argument', 'La CLABE interbancaria no es válida.');
    }
    updatePayload['payouts.clabe'] = clabe;
    updatePayload['payouts.type'] = 'clabe';
  } else if (stripeAccountToken) {
    // En un escenario real, aquí se crearía o actualizaría la Connected Account en Stripe
    // y se guardaría el ID de la cuenta, no el token.
    // Por simplicidad, aquí solo simulamos el registro.
    updatePayload['payouts.stripeAccountId'] = `acct_mock_${driverId}`;
    updatePayload['payouts.type'] = 'stripe_connected_account';
  }

  try {
    await driverRef.update(updatePayload);
    return { success: true, message: 'Datos de pago actualizados correctamente.' };
  } catch (error) {
    console.error('Error al actualizar los datos de pago del chofer:', error);
    throw new HttpsError('internal', 'Ocurrió un error al guardar la información.');
  }
};
