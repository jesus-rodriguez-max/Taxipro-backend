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
exports.suspendDriverCallable = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
/**
 * Permite a un administrador suspender a un conductor.
 */
exports.suspendDriverCallable = (0, https_1.onCall)(async (request) => {
    if (!request.auth || request.auth.token.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Solo los administradores pueden suspender a un conductor.');
    }
    const { driverId } = request.data;
    if (!driverId) {
        throw new https_1.HttpsError('invalid-argument', 'Se requiere el `driverId`.');
    }
    try {
        const driverRef = admin.firestore().collection('drivers').doc(driverId);
        await driverRef.update({ status: 'suspended' });
        // Aquí se podría enviar una notificación al conductor.
        return { status: 'success' };
    }
    catch (error) {
        console.error('Error al suspender al conductor:', error);
        throw new https_1.HttpsError('internal', 'No se pudo suspender al conductor.', error.message);
    }
});
//# sourceMappingURL=suspendDriver.js.map