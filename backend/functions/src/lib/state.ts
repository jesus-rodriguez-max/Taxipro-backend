import { TripStatus } from './types';

const validTransitions: { [key in TripStatus]?: TripStatus[] } = {
  [TripStatus.PENDING]: [TripStatus.ASSIGNED],
  [TripStatus.ASSIGNED]: [TripStatus.ACTIVE],
  [TripStatus.ACTIVE]: [TripStatus.COMPLETED],
};

export function canTransition(from: TripStatus, to: TripStatus): boolean {
  return validTransitions[from]?.includes(to) || false;
}
