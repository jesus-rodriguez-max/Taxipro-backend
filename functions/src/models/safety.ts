import { firestore } from 'firebase-admin';

export interface SafetyProfile {
  escudoEnabled: boolean;
  escudoAcceptedAt?: firestore.Timestamp;
  escudoTermsVersion: string;
  trustedContactPhone?: string; // E.164 format
  trustedGroupWhatsAppUrl?: string;
  safetySuspendedUntil?: firestore.Timestamp;
  misuseScore: number;
}

export enum SafetyEventType {
  PANIC_PASSENGER = 'PANIC_PASSENGER',
  PANIC_DRIVER = 'PANIC_DRIVER',
  ABNORMAL_STOP = 'ABNORMAL_STOP', // Futuro: Detección automática
}

export interface SafetyLog {
  eventType: SafetyEventType;
  actorId: string;
  timestamp: firestore.Timestamp;
  coords: firestore.GeoPoint;
  audioPath?: string; // Path en Cloud Storage
  templateId: 'TAXIPRO_ALERT_PAX_V1' | 'TAXIPRO_ALERT_DRV_V1';
  recipients: string[]; // Números o IDs de los receptores
  hashPayload: string; // SHA-256 del payload del log
  twilioMessageSid?: string;
  twilioCallSid?: string;
}
