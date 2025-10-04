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
exports.updateTariffsCallable = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * Permite a un administrador actualizar las tarifas de la aplicación.
 * @param {object} data - Nuevos datos de las tarifas.
 * @param {functions.https.CallableContext} context - Contexto de la función.
 * @returns {Promise<{status: string}>} - Estado de la operación.
 */
const updateTariffsCallable = async (data, context) => {
    if (!context.auth || context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden actualizar las tarifas.');
    }
    try {
        const tariffsRef = admin.firestore().collection('fares').doc('tariffs');
        await tariffsRef.set(data, { merge: true });
        return { status: 'success' };
    }
    catch (error) {
        console.error('Error al actualizar las tarifas:', error);
        throw new functions.https.HttpsError('internal', 'No se pudieron actualizar las tarifas.', error.message);
    }
};
exports.updateTariffsCallable = updateTariffsCallable;
//# sourceMappingURL=updateTariffs.js.map