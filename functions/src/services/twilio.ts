import { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, TWILIO_PHONE_NUMBER } from '../config';

// Lazy ESM-safe client loader to avoid top-level import of 'twilio'
let twilioClient: any | null = null;
async function getTwilioClient() {
  if (twilioClient) return twilioClient;
  const mod: any = await import('twilio');
  const twilioFactory = mod?.default ?? mod;
  const accountSid = TWILIO_ACCOUNT_SID;
  const authToken = TWILIO_AUTH_TOKEN;
  twilioClient = twilioFactory(accountSid, authToken);
  return twilioClient;
}

export const sendWhatsApp = async (to: string, body: string) => {
  try {
    const client = await getTwilioClient();
    const message = await client.messages.create({
      from: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
      body,
    });
    return message.sid;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return null;
  }
};

export const makeCall = async (to: string, twiml: string) => {
  try {
    const client = await getTwilioClient();
    const call = await client.calls.create({
      to,
      from: TWILIO_PHONE_NUMBER,
      twiml,
    });
    return call.sid;
  } catch (error) {
    console.error('Error making call:', error);
    return null;
  }
};
