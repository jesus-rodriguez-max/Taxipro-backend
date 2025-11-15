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
exports.updateDriverOnboardingCallable = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
/**
 * Función invocable para que un chofer envíe sus datos de pago (CLABE o Stripe).
 * Un chofer no puede ser aprobado hasta que este paso se complete.
 */
exports.updateDriverOnboardingCallable = (0, https_1.onCall)(async (request) => {
    // 1. Validar autenticación
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'El usuario no está autenticado.');
    }
    const driverId = request.auth.uid;
    const { clabe, stripeAccountToken } = request.data;
    // 2. Validar que al menos uno de los dos campos esté presente
    if (!clabe && !stripeAccountToken) {
        throw new https_1.HttpsError('invalid-argument', 'Se debe proporcionar una CLABE o una cuenta de Stripe.');
    }
    const driverRef = admin.firestore().collection('drivers').doc(driverId);
    const updatePayload = {
        'payouts.isConfigured': true,
        'payouts.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
    };
    // 3. Procesar y guardar los datos
    if (clabe) {
        // Aquí se podría añadir una validación de formato de CLABE
        if (clabe.length !== 18 || !/^[0-9]+$/.test(clabe)) {
            throw new https_1.HttpsError('invalid-argument', 'La CLABE interbancaria no es válida.');
        }
        updatePayload['payouts.clabe'] = clabe;
        updatePayload['payouts.type'] = 'clabe';
    }
    else if (stripeAccountToken) {
        // En un escenario real, aquí se crearía o actualizaría la Connected Account en Stripe
        // y se guardaría el ID de la cuenta, no el token.
        // Por simplicidad, aquí solo simulamos el registro.
        updatePayload['payouts.stripeAccountId'] = `acct_mock_${driverId}`;
        updatePayload['payouts.type'] = 'stripe_connected_account';
    }
    try {
        await driverRef.update(updatePayload);
        return { success: true, message: 'Datos de pago actualizados correctamente.' };
    }
    catch (error) {
        console.error('Error al actualizar los datos de pago del chofer:', error);
        throw new https_1.HttpsError('internal', 'Ocurrió un error al guardar la información.');
    }
});
//# sourceMappingURL=driverOnboarding.js.map