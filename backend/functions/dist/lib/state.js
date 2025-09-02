import { TripStatus } from './types.js';
const validTransitions = {
    [TripStatus.PENDING]: [TripStatus.ASSIGNED],
    [TripStatus.ASSIGNED]: [TripStatus.ACTIVE],
    [TripStatus.ACTIVE]: [TripStatus.COMPLETED],
};
export function canTransition(from, to) {
    return validTransitions[from]?.includes(to) || false;
}
//# sourceMappingURL=state.js.map