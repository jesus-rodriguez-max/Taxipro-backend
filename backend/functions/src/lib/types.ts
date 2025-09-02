import { FieldValue } from 'firebase-admin/firestore';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export enum TripStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

export interface Trip {
  id: string;
  passengerId: string;
  driverId?: string;
  status: TripStatus;
  origin: GeoPoint;
  destination: GeoPoint;
  createdAt: FieldValue;
  updatedAt: FieldValue;
  startedAt?: FieldValue;
  completedAt?: FieldValue;
  audit: {
    lastActor: 'system' | 'driver' | 'passenger' | 'admin';
    lastAction: string;
  };
}
