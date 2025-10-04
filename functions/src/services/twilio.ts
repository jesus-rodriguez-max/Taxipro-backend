import twilio from 'twilio';
import { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, TWILIO_PHONE_NUMBER } from '../config';

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export const sendWhatsApp = async (to: string, body: string) => {
  try {
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
