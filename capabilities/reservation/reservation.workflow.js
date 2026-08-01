/**
 * Reservation Workflow — State machine for reservation lifecycle
 *
 * Valid transitions only. Invalid transitions throw errors.
 *
 * Main flow:
 * REQUESTED → OWNER_PENDING → OWNER_CONFIRMED → PAYMENT_PENDING
 *   → CONFIRMED → CHECKED_IN → CHECKED_OUT → COMPLETED
 *
 * Alternative flows:
 * → REJECTED / EXPIRED / CANCELLED / NO_SHOW / NO_RESPONSE
 * → ARCHIVED (from any active status)
 */
import { RESERVATION_STATUS } from './reservation.status.js'

const EXPIRATION_TARGETS = {
  [RESERVATION_STATUS.REQUESTED]: RESERVATION_STATUS.EXPIRED,
  [RESERVATION_STATUS.OWNER_PENDING]: RESERVATION_STATUS.NO_RESPONSE,
  [RESERVATION_STATUS.PAYMENT_PENDING]: RESERVATION_STATUS.EXPIRED,
}

const VALID_TRANSITIONS = {
  [RESERVATION_STATUS.REQUESTED]: [
    RESERVATION_STATUS.OWNER_PENDING,
    RESERVATION_STATUS.REJECTED,
    RESERVATION_STATUS.CANCELLED,
    RESERVATION_STATUS.ARCHIVED,
  ],
  [RESERVATION_STATUS.OWNER_PENDING]: [
    RESERVATION_STATUS.OWNER_CONFIRMED,
    RESERVATION_STATUS.REJECTED,
    RESERVATION_STATUS.NO_RESPONSE,
    RESERVATION_STATUS.EXPIRED,
    RESERVATION_STATUS.CANCELLED,
    RESERVATION_STATUS.ARCHIVED,
  ],
  [RESERVATION_STATUS.OWNER_CONFIRMED]: [
    RESERVATION_STATUS.PAYMENT_PENDING,
    RESERVATION_STATUS.REJECTED,
    RESERVATION_STATUS.CANCELLED,
    RESERVATION_STATUS.ARCHIVED,
  ],
  [RESERVATION_STATUS.PAYMENT_PENDING]: [
    RESERVATION_STATUS.CONFIRMED,
    RESERVATION_STATUS.EXPIRED,
    RESERVATION_STATUS.CANCELLED,
    RESERVATION_STATUS.ARCHIVED,
  ],
  [RESERVATION_STATUS.CONFIRMED]: [
    RESERVATION_STATUS.CHECKED_IN,
    RESERVATION_STATUS.COMPLETED,
    RESERVATION_STATUS.CANCELLED,
    RESERVATION_STATUS.NO_SHOW,
    RESERVATION_STATUS.ARCHIVED,
  ],
  [RESERVATION_STATUS.CHECKED_IN]: [
    RESERVATION_STATUS.CHECKED_OUT,
    RESERVATION_STATUS.CANCELLED,
    RESERVATION_STATUS.ARCHIVED,
  ],
  [RESERVATION_STATUS.CHECKED_OUT]: [
    RESERVATION_STATUS.COMPLETED,
    RESERVATION_STATUS.ARCHIVED,
  ],
  [RESERVATION_STATUS.COMPLETED]: [
    RESERVATION_STATUS.ARCHIVED,
  ],
  [RESERVATION_STATUS.REJECTED]: [],
  [RESERVATION_STATUS.EXPIRED]: [],
  [RESERVATION_STATUS.CANCELLED]: [],
  [RESERVATION_STATUS.NO_SHOW]: [],
  [RESERVATION_STATUS.NO_RESPONSE]: [],
  [RESERVATION_STATUS.ARCHIVED]: [],
}

export class ReservationWorkflow {
  /**
   * Check if transition is valid
   * @param {string} from - Current status
   * @param {string} to - Target status
   * @returns {boolean}
   */
  static canTransition(from, to) {
    const allowed = VALID_TRANSITIONS[from]
    if (!allowed) return false
    return allowed.includes(to)
  }

  /**
   * Execute state transition
   * @param {object} reservation - Reservation object
   * @param {string} newStatus - Target status
   * @returns {object} - Updated reservation
   * @throws {Error} if transition is invalid
   */
  static transition(reservation, newStatus) {
    if (!this.canTransition(reservation.status, newStatus)) {
      throw new Error(
        `Invalid transition: ${reservation.status} → ${newStatus}`
      )
    }

    return {
      ...reservation,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Get all valid next statuses from current status
   * @param {string} currentStatus - Current status
   * @returns {string[]}
   */
  static getValidTransitions(currentStatus) {
    return VALID_TRANSITIONS[currentStatus] || []
  }

  /**
   * Get all possible statuses
   * @returns {string[]}
   */
  static getAllStatuses() {
    return Object.values(RESERVATION_STATUS)
  }

  /**
   * Check if status is terminal (no further transitions)
   * @param {string} status
   * @returns {boolean}
   */
  static isTerminal(status) {
    const transitions = VALID_TRANSITIONS[status]
    return !transitions || transitions.length === 0
  }

  /**
   * Check if status can expire
   * @param {string} status
   * @returns {boolean}
   */
  static canExpire(status) {
    return EXPIRATION_TARGETS[status] !== undefined
  }

  /**
   * Get expiration target status
   * @param {string} status
   * @returns {string|null}
   */
  static getExpirationTarget(status) {
    return EXPIRATION_TARGETS[status] || null
  }
}
