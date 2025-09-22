import { FieldValue } from 'firebase-admin/firestore';
import { TripStatus } from '../constants/tripStatus';

export interface GeoPoint {
  lat: number;
  lng: number;
}

// Re-export for backwards compatibility where TripStatus was imported from lib/types
export { TripStatus };

export interface Stop {
  location: GeoPoint;
  timestamp: FieldValue;
}

export interface Trip {
  id?: string;
  passengerId: string;
  driverId?: string;
  status: TripStatus;
  origin: {
    point: GeoPoint;
    address: string;
  };
  destination: {
    point: GeoPoint;
    address: string;
  };
  estimatedDistanceKm?: number;
  isPhoneRequest?: boolean;
  stops?: Stop[]; // Para paradas adicionales
  distance?: {
    planned?: number; // en metros
    travelled?: number; // en metros
  };
  time?: {
    planned?: number; // en segundos
    travelled?: number; // en segundos
  };
  fare?: {
    base?: number;
    perKm?: number;
    perMin?: number;
    stops?: number; // Costo total de paradas extra
    penalty?: number; // Costo de penalización por cancelación o no-show
    surcharges?: number; // Sobrecargos
    distanceCost?: number; // Costo por distancia estimada
    total?: number;
    currency?: string;
  };
  payment: {
    method: 'stripe' | 'cash' | 'pending_balance';
    transactionId?: string; // ID de PaymentIntent de Stripe
    isSettledToDriver: boolean; // Para liquidación de saldos pendientes
  };
  createdAt: FieldValue;
  updatedAt: FieldValue;
  assignedAt?: FieldValue;
  driverArrivedAt?: FieldValue; // Timestamp cuando el chofer marca "He llegado"
  startedAt?: FieldValue;
  completedAt?: FieldValue;
  lastKnownLocation?: GeoPoint; // Para el cálculo del taxímetro
  audit: {
    lastActor: 'system' | 'driver' | 'passenger' | 'admin';
    lastAction: string;
  };
}

export enum DriverMembershipStatus {
  ACTIVE = 'active',
  GRACE_PERIOD = 'grace_period', // Falló el pago, pero aún puede operar
  SUSPENDED = 'suspended', // Acceso bloqueado por falta de pago
  UNPAID = 'unpaid', // Aún no ha pagado la primera vez
}

export interface Driver {
  id: string;
  isApproved: boolean; // Aprobado por admin
  stripeAccountId?: string; // Para Stripe Connected Account
  clabe?: string; // Para transferencias directas
  membership: {
    automaticChargeAuthorized: boolean;
    status: DriverMembershipStatus;
    lastPaymentAttempt?: FieldValue;
    nextPaymentAttempt?: FieldValue;
    nextPaymentDay?: 'saturday' | 'sunday' | 'suspend'; // Para controlar reintentos
  };
}

export interface User {
  id: string;
  stripeCustomerId: string;
  defaultPaymentMethodId?: string; // ID del método de pago por defecto en Stripe
  pendingBalance: number; // Saldo pendiente por penalizaciones no cobradas
}
