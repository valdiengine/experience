/**
 * Reservation Events — Event definitions
 *
 * All events use EventBus via context
 */
export const RESERVATION_EVENTS = {
  CREATED: 'reservation:created',
  UPDATED: 'reservation:updated',
  VALIDATED: 'reservation:validated',
  STARTED: 'reservation:started',
  SUBMITTED: 'reservation:submitted',
  OWNER_REQUESTED: 'reservation:owner_requested',
  OWNER_CONFIRMED: 'reservation:owner_confirmed',
  CONFIRMED: 'reservation:confirmed',
  CHECKED_IN: 'reservation:checked_in',
  CHECKED_OUT: 'reservation:checked_out',
  COMPLETED: 'reservation:completed',
  REJECTED: 'reservation:rejected',
  CANCELLED: 'reservation:cancelled',
  EXPIRED: 'reservation:expired',
  // BOOKING-EXPIRATION-ATOMIC-1. NO_RESPONSE is a distinct terminal status
  // (reservation.workflow.js VALID_TRANSITIONS and EXPIRATION_TARGETS) and the
  // timeout target for OWNER_PENDING, but until now it had no event of its own:
  // an owner who never answered produced no outcome event at all, and the timer
  // mislabelled the case by emitting EXPIRED. It is added here rather than
  // reusing EXPIRED so a subscriber can distinguish "the customer timed out"
  // from "the owner never responded", which is the distinction EXPIRATION_TARGETS
  // exists to make.
  NO_RESPONSE: 'reservation:no_response',
  NO_SHOW: 'reservation:no_show',
  ARCHIVED: 'reservation:archived',
  RESTORED: 'reservation:restored',
  PAYMENT_PENDING: 'reservation:payment_pending',
  PRICE_CALCULATED: 'reservation:price_calculated',
  STATE_CHANGED: 'reservation:state_changed',
  TIMEOUT_WARNING: 'reservation:timeout_warning',
  RECOVERED: 'reservation:recovered',
  SYNC_REQUIRED: 'reservation:sync_required',
}
