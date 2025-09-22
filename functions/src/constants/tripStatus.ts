export enum TripStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  ARRIVED = 'arrived',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  // Generic cancellation (used by state machine tests)
  CANCELLED = 'cancelled',
  // Specific cancellation flows used by functions like cancelTrip/markAsNoShow
  CANCELLED_BY_PASSENGER = 'cancelled_by_passenger',
  CANCELLED_BY_DRIVER = 'cancelled_by_driver',
  CANCELLED_WITH_PENALTY = 'cancelled_with_penalty',
  NO_SHOW = 'no_show',
  DISCONNECTED = 'disconnected',
  PENDING_REVIEW = 'pending_review',
  // Payment-related statuses
  PAYMENT_FAILED = 'payment_failed',
  REFUNDED = 'refunded',
}