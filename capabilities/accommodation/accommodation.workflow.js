import { ACCOMMODATION_STATUS } from './accommodation.status.js'
import { AccommodationStateError } from './accommodation.errors.js'

const VALID_TRANSITIONS = {
  [ACCOMMODATION_STATUS.DRAFT]: [
    ACCOMMODATION_STATUS.PENDING_REVIEW,
    ACCOMMODATION_STATUS.ARCHIVED,
    ACCOMMODATION_STATUS.DELETED,
  ],
  [ACCOMMODATION_STATUS.PENDING_REVIEW]: [
    ACCOMMODATION_STATUS.DRAFT,
    ACCOMMODATION_STATUS.PUBLISHED,
    ACCOMMODATION_STATUS.ARCHIVED,
    ACCOMMODATION_STATUS.DELETED,
  ],
  [ACCOMMODATION_STATUS.PUBLISHED]: [
    ACCOMMODATION_STATUS.HIDDEN,
    ACCOMMODATION_STATUS.ARCHIVED,
  ],
  [ACCOMMODATION_STATUS.HIDDEN]: [
    ACCOMMODATION_STATUS.PUBLISHED,
    ACCOMMODATION_STATUS.DRAFT,
    ACCOMMODATION_STATUS.ARCHIVED,
    ACCOMMODATION_STATUS.DELETED,
  ],
  [ACCOMMODATION_STATUS.ARCHIVED]: [
    ACCOMMODATION_STATUS.DRAFT,
    ACCOMMODATION_STATUS.PUBLISHED,
    ACCOMMODATION_STATUS.DELETED,
  ],
  [ACCOMMODATION_STATUS.DELETED]: [],
}

export class AccommodationWorkflow {
  static canTransition(from, to) {
    const allowed = VALID_TRANSITIONS[from]
    if (!allowed) return false
    return allowed.includes(to)
  }

  static transition(accommodation, newStatus) {
    if (!this.canTransition(accommodation.status, newStatus)) {
      throw new AccommodationStateError(
        `Invalid status transition: ${accommodation.status} -> ${newStatus}`
      )
    }
    return {
      ...accommodation,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    }
  }

  static getValidTransitions(currentStatus) {
    return VALID_TRANSITIONS[currentStatus] || []
  }

  static getAllStatuses() {
    return Object.values(ACCOMMODATION_STATUS)
  }

  static isTerminal(status) {
    const transitions = VALID_TRANSITIONS[status]
    return !transitions || transitions.length === 0
  }
}
