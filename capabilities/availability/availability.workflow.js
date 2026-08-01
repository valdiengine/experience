import { AVAILABILITY_STATUS } from './availability.status.js'
import { AvailabilityError } from './availability.errors.js'

const VALID_TRANSITIONS = {
  [AVAILABILITY_STATUS.AVAILABLE]: [
    AVAILABILITY_STATUS.BLOCKED,
    AVAILABILITY_STATUS.RESERVED,
    AVAILABILITY_STATUS.MAINTENANCE,
    AVAILABILITY_STATUS.HIDDEN,
    AVAILABILITY_STATUS.ARCHIVED,
    AVAILABILITY_STATUS.DELETED,
  ],
  [AVAILABILITY_STATUS.BLOCKED]: [
    AVAILABILITY_STATUS.AVAILABLE,
    AVAILABILITY_STATUS.MAINTENANCE,
    AVAILABILITY_STATUS.ARCHIVED,
    AVAILABILITY_STATUS.DELETED,
  ],
  [AVAILABILITY_STATUS.RESERVED]: [
    AVAILABILITY_STATUS.AVAILABLE,
    AVAILABILITY_STATUS.BLOCKED,
    AVAILABILITY_STATUS.ARCHIVED,
  ],
  [AVAILABILITY_STATUS.PENDING]: [
    AVAILABILITY_STATUS.AVAILABLE,
    AVAILABILITY_STATUS.BLOCKED,
    AVAILABILITY_STATUS.RESERVED,
    AVAILABILITY_STATUS.ARCHIVED,
    AVAILABILITY_STATUS.DELETED,
  ],
  [AVAILABILITY_STATUS.MAINTENANCE]: [
    AVAILABILITY_STATUS.AVAILABLE,
    AVAILABILITY_STATUS.BLOCKED,
    AVAILABILITY_STATUS.ARCHIVED,
    AVAILABILITY_STATUS.DELETED,
  ],
  [AVAILABILITY_STATUS.HIDDEN]: [
    AVAILABILITY_STATUS.AVAILABLE,
    AVAILABILITY_STATUS.BLOCKED,
    AVAILABILITY_STATUS.ARCHIVED,
    AVAILABILITY_STATUS.DELETED,
  ],
  [AVAILABILITY_STATUS.ARCHIVED]: [
    AVAILABILITY_STATUS.DRAFT,
    AVAILABILITY_STATUS.AVAILABLE,
    AVAILABILITY_STATUS.DELETED,
  ],
  [AVAILABILITY_STATUS.DELETED]: [],
}

export class AvailabilityWorkflow {
  static canTransition(from, to) {
    const allowed = VALID_TRANSITIONS[from]
    if (!allowed) return false
    return allowed.includes(to)
  }

  static transition(record, newStatus) {
    if (!this.canTransition(record.status, newStatus)) {
      throw new AvailabilityError(
        `Invalid status transition: ${record.status} -> ${newStatus}`
      )
    }
    return {
      ...record,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    }
  }

  static getValidTransitions(currentStatus) {
    return VALID_TRANSITIONS[currentStatus] || []
  }

  static getAllStatuses() {
    return Object.values(AVAILABILITY_STATUS)
  }

  static isTerminal(status) {
    const transitions = VALID_TRANSITIONS[status]
    return !transitions || transitions.length === 0
  }
}
