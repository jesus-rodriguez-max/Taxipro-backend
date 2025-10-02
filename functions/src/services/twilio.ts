import * as functions from 'firebase-functions';
import twilio from 'twilio';

const { account_sid, auth_token, whatsapp_number, phone_number } = functions.config().twilio;
const client = twilio(account_sid, auth_token);

export const sendWhatsApp = async (to: string, body: string) => {
  try {
    const message = await client.messages.create({
      from: `whatsapp:${whatsapp_number}`,
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
      from: phone_number,
      twiml,
    });
    return call.sid;
  } catch (error) {
    console.error('Error making call:', error);
    return null;
  }
};
