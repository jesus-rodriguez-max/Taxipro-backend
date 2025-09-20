
import { Twilio } from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

const client = new Twilio(accountSid, authToken);

/**
 * Envía un mensaje SMS a un usuario a través de Twilio.
 */
export const notifyUserBySMS = async (to: string, body: string) => {
  if (!accountSid || !authToken || !twilioNumber) {
    console.error('Twilio credentials are not configured.');
    return;
  }

  try {
    await client.messages.create({
      from: twilioNumber,
      to,
      body,
    });
  } catch (error) {
    console.error(`Failed to send SMS to ${to}:`, error);
    // No relanzar el error para no cortar el flujo principal
  }
};
