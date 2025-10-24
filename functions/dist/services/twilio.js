"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeCall = exports.sendWhatsApp = void 0;
const config_1 = require("../config");
// Lazy ESM-safe client loader to avoid top-level import of 'twilio'
let twilioClient = null;
async function getTwilioClient() {
    if (twilioClient)
        return twilioClient;
    const mod = await Promise.resolve().then(() => __importStar(require('twilio')));
    const twilioFactory = mod?.default ?? mod;
    const accountSid = config_1.TWILIO_ACCOUNT_SID;
    const authToken = config_1.TWILIO_AUTH_TOKEN;
    twilioClient = twilioFactory(accountSid, authToken);
    return twilioClient;
}
const sendWhatsApp = async (to, body) => {
    try {
        const client = await getTwilioClient();
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
        const client = await getTwilioClient();
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