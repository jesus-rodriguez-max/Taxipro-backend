import { TripStatus } from '../constants/tripStatus';

const validTransitions: Record<TripStatus, TripStatus[]> = {
  [TripStatus.PENDING]: [TripStatus.ASSIGNED],
  // A driver can mark arrival before starting the trip
  [TripStatus.ASSIGNED]: [
    TripStatus.ARRIVED,
    TripStatus.ACTIVE,
    TripStatus.CANCELLED,
    TripStatus.CANCELLED_BY_PASSENGER,
    TripStatus.CANCELLED_WITH_PENALTY,
    TripStatus.CANCELLED_BY_DRIVER,
  ],
  // After ARRIVED: can start (ACTIVE) or mark NO_SHOW or cancel flows
  [TripStatus.ARRIVED]: [
    TripStatus.ACTIVE,
    TripStatus.NO_SHOW,
    TripStatus.CANCELLED_BY_PASSENGER,
    TripStatus.CANCELLED_WITH_PENALTY,
    TripStatus.CANCELLED_BY_DRIVER,
  ],
  // ACTIVE trips can complete or be disconnected by watchdog
  [TripStatus.ACTIVE]: [TripStatus.COMPLETED, TripStatus.CANCELLED, TripStatus.DISCONNECTED],
  // COMPLETED trips may later be marked as payment_failed or refunded via webhooks
  [TripStatus.COMPLETED]: [TripStatus.PAYMENT_FAILED, TripStatus.REFUNDED],
  [TripStatus.CANCELLED]: [],
  [TripStatus.CANCELLED_BY_PASSENGER]: [],
  [TripStatus.CANCELLED_BY_DRIVER]: [],
  [TripStatus.CANCELLED_WITH_PENALTY]: [],
  [TripStatus.NO_SHOW]: [],
  [TripStatus.DISCONNECTED]: [TripStatus.PENDING_REVIEW],
  [TripStatus.PENDING_REVIEW]: [],
  [TripStatus.PAYMENT_FAILED]: [],
  [TripStatus.REFUNDED]: [],
};

export function canTransition(current: TripStatus, next: TripStatus): boolean {
  return validTransitions[current]?.includes(next) ?? false;
}

export function getNextStatuses(current: TripStatus): TripStatus[] {
  return validTransitions[current] || [];
}