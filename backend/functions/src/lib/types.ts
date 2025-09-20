import { FieldValue } from 'firebase-admin/firestore';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export enum TripStatus {
  // Flujo estándar
  PENDING = 'pending', // Esperando chofer
  ASSIGNED = 'assigned', // Chofer aceptó, en camino
  ARRIVED = 'arrived', // Chofer ha llegado al punto de encuentro
  ACTIVE = 'active', // Viaje en curso
  COMPLETED = 'completed', // Viaje finalizado exitosamente

  // Flujo de cancelación
  CANCELLED_BY_PASSENGER = 'cancelled_by_passenger', // Pasajero canceló antes de la llegada del chofer (gratis)
  CANCELLED_BY_DRIVER = 'cancelled_by_driver', // Chofer canceló
  CANCELLED_WITH_PENALTY = 'cancelled_with_penalty', // Pasajero canceló tarde, se aplicó penalización
  NO_SHOW = 'no_show', // Pasajero no se presentó, se aplicó penalización
}

export interface Stop {
  location: GeoPoint;
  timestamp: FieldValue;
}

export interface Trip {
  id: string;
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
  stops?: Stop[]; // Para paradas adicionales
  distance?: {
    planned: number; // en metros
    travelled: number; // en metros
  };
  time?: {
    planned: number; // en segundos
    travelled: number; // en segundos
  };
  fare?: {
    base: number;
    perKm: number;
    perMin: number;
    stops: number; // Costo total de paradas extra
    penalty: number; // Costo de penalización por cancelación o no-show
    total: number;
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
  stripeSubscriptionId?: string; // ID de la suscripción semanal
  stripeSubscriptionStatus?: string; // Estado de la suscripción en Stripe
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

export interface OfflineTrip {
  id: string;
  from: string; // Número de teléfono del usuario
  userId: string; // ID del usuario verificado
  origin: string;
  destination: string;
  status: 'pending_sms' | 'assigned' | 'completed' | 'cancelled';
  createdAt: FieldValue;
  assignedDriverId?: string;
  assignedVehicleInfo?: string; // Ej. "Tsuru, Placas ABC-123"
  eta?: string; // Ej. "5 minutos"
  estimatedFare?: string; // Ej. "$50 - $70 MXN"
}
