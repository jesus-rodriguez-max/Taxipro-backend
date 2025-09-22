import { TripStatus } from '../constants/tripStatus';

const validTransitions: Record<TripStatus, TripStatus[]> = {
  [TripStatus.PENDING]: [TripStatus.ASSIGNED],
  [TripStatus.ASSIGNED]: [TripStatus.ACTIVE, TripStatus.CANCELLED],
  [TripStatus.ARRIVED]: [TripStatus.ACTIVE],
  [TripStatus.ACTIVE]: [TripStatus.COMPLETED, TripStatus.CANCELLED],
  [TripStatus.COMPLETED]: [],
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