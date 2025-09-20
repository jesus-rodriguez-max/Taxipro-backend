// Herramienta para simular la recepción de un SMS de Twilio y probar el flujo de viaje offline.
// Uso:
// 1. Inicia los emuladores de Firebase: `firebase emulators:start`
// 2. Ejecuta este script: `node tools/sms_simulator.js`

const axios = require('axios');

// URL del webhook en el emulador local. Asegúrate de que el nombre de la función sea correcto.
const webhookUrl = 'http://localhost:5001/taxipro-backend/us-central1/receiveSmsRequest';

// --- Configuración de la Simulación ---
const userPhoneNumber = '+5214448889999'; // Un número que debe existir en tu DB de usuarios
const twilioPhoneNumber = '+15005550006'; // Tu número de Twilio (puede ser cualquiera para el test)

// Mensaje a enviar (puedes cambiar el origen y destino)
const messageBody = 'TAXIPRO Solicito taxi desde Palacio de Gobierno hacia Morales';

// --- Fin de la Configuración ---

const sendRequest = async () => {
  console.log(`Enviando SMS simulado desde: ${userPhoneNumber}`);
  console.log(`Mensaje: "${messageBody}"`);

  // Twilio envía los datos en formato x-www-form-urlencoded
  const data = new URLSearchParams({
    From: userPhoneNumber,
    To: twilioPhoneNumber,
    Body: messageBody,
    SmsSid: `SM${Math.random().toString(36).substring(2)}`,
  }).toString();

  try {
    const response = await axios.post(webhookUrl, data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    console.log('\nRespuesta del Webhook (Código 200 significa éxito):');
    console.log(`Estado: ${response.status}`);
    console.log(`Respuesta: ${response.data}`);
    console.log('\n✅ Simulación completada. Revisa los logs del emulador y tu Firestore para verificar el resultado.');
  } catch (error) {
    console.error('\n❌ Error en la simulación:');
    if (error.response) {
      console.error(`  Estado: ${error.response.status}`);
      console.error(`  Datos: ${error.response.data}`);
    } else {
      console.error(error.message);
    }
  }
};

sendRequest();
