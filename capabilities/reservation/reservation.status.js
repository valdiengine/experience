/**
 * Reservation Status — Business-agnostic status constants
 *
 * No knowledge of tourism, rentals, services, etc.
 */
export const RESERVATION_STATUS = {
  REQUESTED: 'requested',
  OWNER_PENDING: 'owner_pending',
  OWNER_CONFIRMED: 'owner_confirmed',
  PAYMENT_PENDING: 'payment_pending',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  NO_RESPONSE: 'no_response',
  ARCHIVED: 'archived',
}

export const RESERVATION_STATUS_LIST = Object.values(RESERVATION_STATUS)

export const isTerminalStatus = (status) => {
  return [
    RESERVATION_STATUS.COMPLETED,
    RESERVATION_STATUS.REJECTED,
    RESERVATION_STATUS.EXPIRED,
    RESERVATION_STATUS.CANCELLED,
    RESERVATION_STATUS.NO_SHOW,
    RESERVATION_STATUS.NO_RESPONSE,
    RESERVATION_STATUS.ARCHIVED,
  ].includes(status)
}

export const isActiveStatus = (status) => {
  return !isTerminalStatus(status)
}

export const isPreArrivalStatus = (status) => {
  return [
    RESERVATION_STATUS.REQUESTED,
    RESERVATION_STATUS.OWNER_PENDING,
    RESERVATION_STATUS.OWNER_CONFIRMED,
    RESERVATION_STATUS.PAYMENT_PENDING,
    RESERVATION_STATUS.CONFIRMED,
  ].includes(status)
}

export const isInHouseStatus = (status) => {
  return [
    RESERVATION_STATUS.CHECKED_IN,
  ].includes(status)
}

export const isPostDepartureStatus = (status) => {
  return [
    RESERVATION_STATUS.CHECKED_OUT,
    RESERVATION_STATUS.COMPLETED,
  ].includes(status)
}

export const isCancellableStatus = (status) => {
  return [
    RESERVATION_STATUS.REQUESTED,
    RESERVATION_STATUS.OWNER_PENDING,
    RESERVATION_STATUS.OWNER_CONFIRMED,
    RESERVATION_STATUS.PAYMENT_PENDING,
    RESERVATION_STATUS.CONFIRMED,
  ].includes(status)
}

export const isArchivableStatus = (status) => {
  return !isTerminalStatus(status) || status === RESERVATION_STATUS.COMPLETED
}
