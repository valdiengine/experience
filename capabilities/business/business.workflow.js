import { BUSINESS_STATUS } from './business.status.js'
import { BusinessWorkflowError } from './business.errors.js'

const VALID_TRANSITIONS = {
  [BUSINESS_STATUS.DRAFT]: [
    BUSINESS_STATUS.PENDING_REVIEW,
    BUSINESS_STATUS.ARCHIVED,
    BUSINESS_STATUS.DELETED,
  ],
  [BUSINESS_STATUS.PENDING_REVIEW]: [
    BUSINESS_STATUS.DRAFT,
    BUSINESS_STATUS.PUBLISHED,
    BUSINESS_STATUS.SUSPENDED,
    BUSINESS_STATUS.ARCHIVED,
    BUSINESS_STATUS.DELETED,
  ],
  [BUSINESS_STATUS.PUBLISHED]: [
    BUSINESS_STATUS.SUSPENDED,
    BUSINESS_STATUS.ARCHIVED,
  ],
  [BUSINESS_STATUS.SUSPENDED]: [
    BUSINESS_STATUS.DRAFT,
    BUSINESS_STATUS.PUBLISHED,
    BUSINESS_STATUS.ARCHIVED,
    BUSINESS_STATUS.DELETED,
  ],
  [BUSINESS_STATUS.ARCHIVED]: [
    BUSINESS_STATUS.DRAFT,
    BUSINESS_STATUS.PUBLISHED,
    BUSINESS_STATUS.DELETED,
  ],
  [BUSINESS_STATUS.DELETED]: [],
}

export class BusinessWorkflow {
  static canTransition(from, to) {
    const allowed = VALID_TRANSITIONS[from]
    if (!allowed) return false
    return allowed.includes(to)
  }

  static transition(business, newStatus) {
    if (!this.canTransition(business.status, newStatus)) {
      throw new BusinessWorkflowError(
        `Invalid status transition: ${business.status} -> ${newStatus}`
      )
    }
    return {
      ...business,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    }
  }

  static getValidTransitions(currentStatus) {
    return VALID_TRANSITIONS[currentStatus] || []
  }

  static getAllStatuses() {
    return Object.values(BUSINESS_STATUS)
  }

  static isTerminal(status) {
    const transitions = VALID_TRANSITIONS[status]
    return !transitions || transitions.length === 0
  }
}
