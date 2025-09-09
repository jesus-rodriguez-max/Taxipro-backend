const PROJECT_ID = "taxipro-chofer";
const REGION = "us-central1";

// URLs de los emuladores
const AUTH_URL = `http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1`;
const FUNCTIONS_URL = `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}`;

(async () => {
  try {
    // 1. Autenticar un usuario de prueba para obtener un idToken
    const email = `rider+${Date.now()}@example.com`;
    const authResponse = await fetch(`${AUTH_URL}/accounts:signUp?key=fake-api-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "password123", returnSecureToken: true }),
    });
    const authData = await authResponse.json();
    if (!authData.idToken) {
      throw new Error(`Authentication failed: ${JSON.stringify(authData)}`);
    }
    const idToken = authData.idToken;

    // 2. Definir el payload para la función
    const payload = {
      data: {
        pickupLocation: { lat: 22.15, lng: -100.98, address: "Soriana San Luis" },
        destination: { lat: 22.17, lng: -100.95, address: "Centro Histórico" },
        fare: 85,
      },
    };

    // 3. Llamar a la función 'requestRide' con la URL correcta
    const functionResponse = await fetch(`${FUNCTIONS_URL}/requestRide`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });

    // 4. Manejar la respuesta
    const text = await functionResponse.text();
    console.log("Raw response body:", text);

    if (!functionResponse.ok) {
      throw new Error(`Function call failed with status ${functionResponse.status}: ${text}`);
    }

    let responseData;
    try {
      responseData = JSON.parse(text);
    } catch (error) {
      console.error("JSON.parse failed:", error.message);
      responseData = { raw: text };
    }

    console.log("Final result:", JSON.stringify(responseData, null, 2));

    // 5. Validar la respuesta y salir
    /**
     * Busca una propiedad en un objeto, descendiendo a través de claves 'result' anidadas.
     * @param {object} obj - El objeto en el que buscar.
     * @param {string} key - La clave a encontrar.
     * @returns {any|undefined} El valor de la propiedad o undefined si no se encuentra.
     */
    const findNestedProperty = (obj, key) => {
      if (!obj || typeof obj !== 'object') return undefined;
      if (key in obj) return obj[key];
      if ('result' in obj) return findNestedProperty(obj.result, key);
      return undefined;
    };

    const rideId = findNestedProperty(responseData, 'rideId');
    const hasCreated = findNestedProperty(responseData, 'hasCreated');

    if (!rideId) {
      throw new Error(`No rideId in response: ${JSON.stringify(responseData)}`);
    }

    console.log("RIDE_ID:", rideId);
    console.log("FIRESTORE_DOC_OK:", !!hasCreated);
    console.log("LOG: requestRide invoked successfully");
    process.exit(0);

  } catch (error) {
    console.error("E2E_ERROR:", error.stack || error.message);
    process.exit(1);
  }
})();
