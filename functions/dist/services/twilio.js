"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeCall = exports.sendWhatsApp = void 0;
const twilio_1 = __importDefault(require("twilio"));
const config_1 = require("../config");
const client = (0, twilio_1.default)(config_1.TWILIO_ACCOUNT_SID, config_1.TWILIO_AUTH_TOKEN);
const sendWhatsApp = async (to, body) => {
    try {
        const message = await client.messages.create({
            from: `whatsapp:${config_1.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${to}`,
            body,
        });
        return message.sid;
    }
    catch (error) {
        console.error('Error sending WhatsApp message:', error);
        return null;
    }
};
exports.sendWhatsApp = sendWhatsApp;
const makeCall = async (to, twiml) => {
    try {
        const call = await client.calls.create({
            to,
            from: config_1.TWILIO_PHONE_NUMBER,
            twiml,
        });
        return call.sid;
    }
    catch (error) {
        console.error('Error making call:', error);
        return null;
    }
};
exports.makeCall = makeCall;
//# sourceMappingURL=twilio.js.map