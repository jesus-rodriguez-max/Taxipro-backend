"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDriverSubscriptionCallable = void 0;
const https_1 = require("firebase-functions/v2/https");
const subscription_1 = require("../lib/subscription");
exports.checkDriverSubscriptionCallable = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Debe iniciar sesión.');
    }
    const driverId = request.auth.uid;
    const active = await (0, subscription_1.isDriverSubscriptionActive)(driverId);
    return { active };
});
//# sourceMappingURL=checkDriverSubscription.js.map