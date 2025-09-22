import { TripStatus } from '../constants/tripStatus';

const validTransitions: Record<TripStatus, TripStatus[]> = {
  [TripStatus.PENDING]: [TripStatus.ASSIGNED],
  [TripStatus.ASSIGNED]: [TripStatus.ACTIVE, TripStatus.CANCELLED],
  [TripStatus.ACTIVE]: [TripStatus.COMPLETED, TripStatus.CANCELLED],
  [TripStatus.COMPLETED]: [],
  [TripStatus.CANCELLED]: [],
  [TripStatus.DISCONNECTED]: [TripStatus.PENDING_REVIEW],
  [TripStatus.PENDING_REVIEW]: [],
};

export function canTransition(current: TripStatus, next: TripStatus): boolean {
  return validTransitions[current]?.includes(next) ?? false;
}

export function getNextStatuses(current: TripStatus): TripStatus[] {
  return validTransitions[current] || [];
}