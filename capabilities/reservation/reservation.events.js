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
