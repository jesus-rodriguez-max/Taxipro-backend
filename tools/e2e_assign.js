const PROJECT_ID = "taxipro-chofer";
const REGION = "us-central1";

// URLs de los emuladores (puertos actualizados)
const AUTH_URL = `http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1`;
const FUNCTIONS_URL = `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}`;

/**
 * Busca una propiedad en un objeto, descendiendo a través de claves 'result' anidadas.
 */
const findNestedProperty = (obj, key) => {
  if (!obj || typeof obj !== 'object') return undefined;
  if (key in obj) return obj[key];
  if ('result' in obj) return findNestedProperty(obj.result, key);
  return undefined;
};

/**
 * Registra un nuevo usuario y devuelve su token de autenticación.
 */
async function signUp(email) {
  const response = await fetch(`${AUTH_URL}/accounts:signUp?key=fake-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password123", returnSecureToken: true }),
  });
  const data = await response.json();
  if (!data.idToken) {
    throw new Error(`Authentication failed: ${JSON.stringify(data)}`);
  }
  return data.idToken;
}

/**
 * Llama a una Cloud Function de forma robusta.
 */
async function callFunction(name, token, payloadData) {
  const response = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ data: payloadData }),
  });

  const text = await response.text();
  console.log(`--- Raw response from ${name} ---`);
  console.log(text);
  console.log(`--- End raw response ---`);

  if (!response.ok) {
    throw new Error(`Function ${name} failed with status ${response.status}: ${text}`);
  }

  let responseData;
  try {
    responseData = JSON.parse(text);
  } catch (error) {
    console.error(`JSON.parse failed for ${name}:`, error.message);
    responseData = { raw: text };
  }

  console.log(`Final result from ${name}:`, JSON.stringify(responseData, null, 2));
  return responseData;
}

(async () => {
  try {
    // Autenticar un pasajero y un conductor
    const userToken = await signUp(`rider+${Date.now()}@example.com`);
    const driverToken = await signUp(`driver+${Date.now()}@example.com`);

    // 1. Crear un viaje
    const rideRequestPayload = {
      pickupLocation: { lat: 22.15, lng: -100.98, address: "A" },
      destination: { lat: 22.17, lng: -100.95, address: "B" },
      fare: 85,
    };
    const rideResponse = await callFunction("requestRide", userToken, rideRequestPayload);
    const rideId = findNestedProperty(rideResponse, 'rideId');
    if (!rideId) {
      throw new Error(`Could not find rideId in requestRide response: ${JSON.stringify(rideResponse)}`);
    }
    console.log(`Ride created successfully: ${rideId}`);

    // 2. Asignar el conductor al viaje
    await callFunction("assignDriverToRide", driverToken, { rideId });
    console.log(`Assign driver call completed for ride: ${rideId}`);

    // 3. Verificar el estado del viaje
    const verificationResponse = await callFunction("getRideLite", driverToken, { rideId });
    const driverId = findNestedProperty(verificationResponse, 'driverId');
    const status = findNestedProperty(verificationResponse, 'status');
    const isAssigned = driverId && status === 'assigned';

    console.log("RIDE_ID:", rideId);
    console.log("ASSIGNMENT_OK:", isAssigned);

    if (!isAssigned) {
        throw new Error(`Ride assignment verification failed. Status: ${status}, DriverID: ${driverId}`);
    }

    console.log("LOG: assignDriverToRide invoked and verified successfully");
    console.log(`LOG: /rides/${rideId} assigned`);
    process.exit(0);

  } catch (error) {
    console.error("E2E_ERROR:", error.stack || error.message);
    process.exit(1);
  }
})();
