import { TripStatus } from '../src/constants/tripStatus';
import { canTransition, getNextStatuses } from '../src/lib/state';

describe('State Library', () => {
  it('should allow PENDING -> ASSIGNED', () => {
    expect(canTransition(TripStatus.PENDING, TripStatus.ASSIGNED)).toBe(true);
  });

  it('should not allow PENDING -> COMPLETED', () => {
    expect(canTransition(TripStatus.PENDING, TripStatus.COMPLETED)).toBe(false);
  });

  it('should allow ASSIGNED -> ACTIVE', () => {
    expect(canTransition(TripStatus.ASSIGNED, TripStatus.ACTIVE)).toBe(true);
  });

  it('should allow ACTIVE -> COMPLETED', () => {
    expect(canTransition(TripStatus.ACTIVE, TripStatus.COMPLETED)).toBe(true);
  });

  it('should not allow COMPLETED -> ACTIVE', () => {
    expect(canTransition(TripStatus.COMPLETED, TripStatus.ACTIVE)).toBe(false);
  });

  it('should return next statuses for ACTIVE', () => {
    const next = getNextStatuses(TripStatus.ACTIVE);
    expect(next).toContain(TripStatus.COMPLETED);
    expect(next).toContain(TripStatus.CANCELLED);
  });
});
