import { canTransition } from '../functions/src/lib/state.ts';
import { TripStatus } from '../functions/src/lib/types.ts';

describe('State Machine', () => {
  it('should allow valid transitions', () => {
    expect(canTransition(TripStatus.PENDING, TripStatus.ASSIGNED)).toBe(true);
    expect(canTransition(TripStatus.ASSIGNED, TripStatus.ACTIVE)).toBe(true);
    expect(canTransition(TripStatus.ACTIVE, TripStatus.COMPLETED)).toBe(true);
  });

  it('should reject invalid transitions', () => {
    expect(canTransition(TripStatus.PENDING, TripStatus.ACTIVE)).toBe(false);
    expect(canTransition(TripStatus.PENDING, TripStatus.COMPLETED)).toBe(false);
    expect(canTransition(TripStatus.ASSIGNED, TripStatus.PENDING)).toBe(false);
    expect(canTransition(TripStatus.ASSIGNED, TripStatus.COMPLETED)).toBe(false);
    expect(canTransition(TripStatus.ACTIVE, TripStatus.PENDING)).toBe(false);
    expect(canTransition(TripStatus.ACTIVE, TripStatus.ASSIGNED)).toBe(false);
    expect(canTransition(TripStatus.COMPLETED, TripStatus.PENDING)).toBe(false);
    expect(canTransition(TripStatus.COMPLETED, TripStatus.ASSIGNED)).toBe(false);
    expect(canTransition(TripStatus.COMPLETED, TripStatus.ACTIVE)).toBe(false);
  });
});