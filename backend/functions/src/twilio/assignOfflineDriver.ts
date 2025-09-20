
import * as admin from 'firebase-admin';

/**
 * Busca un chofer disponible y lo asigna a un viaje offline.
 * En una app real, esto usaría geo-búsquedas. Aquí se simplifica.
 */
export const assignOfflineDriver = async (tripId: string) => {
  const db = admin.firestore();
  
  // 1. Encontrar un chofer disponible (lógica simplificada)
  const driverQuery = await db.collection('drivers').where('isAvailable', '==', true).limit(1).get();

  if (driverQuery.empty) {
    return { success: false };
  }

  const driver = driverQuery.docs[0];
  const driverId = driver.id;
  const vehicleInfo = driver.data().vehicleInfo || 'Placas Desconocidas'; // Asume que el chofer tiene este campo

  // 2. Asignar el chofer al viaje
  const tripRef = db.collection('offline_trips').doc(tripId);
  await tripRef.update({
    assignedDriverId: driverId,
    assignedVehicleInfo: vehicleInfo,
    status: 'assigned',
    // Valores de ejemplo para ETA y tarifa
    eta: '5-7 minutos',
    estimatedFare: '$60 - $80 MXN',
  });

  // 3. (Opcional) Poner al chofer como no disponible
  await driver.ref.update({ isAvailable: false });

  // 4. (Opcional) Enviar notificación push al chofer. Lógica de FCM iría aquí.

  return {
    success: true,
    driverId,
    vehicleInfo,
    eta: '5-7 minutos',
    estimatedFare: '$60 - $80 MXN',
  };
};
