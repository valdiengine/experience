import { VISITOR_STATUS } from './visitor.status.js'
import { VisitorStateError } from './visitor.errors.js'

const VALID_TRANSITIONS = {
  [VISITOR_STATUS.ANONYMOUS]: [VISITOR_STATUS.REGISTERED, VISITOR_STATUS.ARCHIVED],
  [VISITOR_STATUS.REGISTERED]: [VISITOR_STATUS.VERIFIED, VISITOR_STATUS.INACTIVE, VISITOR_STATUS.ARCHIVED, VISITOR_STATUS.DELETED],
  [VISITOR_STATUS.VERIFIED]: [VISITOR_STATUS.ACTIVE, VISITOR_STATUS.INACTIVE, VISITOR_STATUS.ARCHIVED, VISITOR_STATUS.DELETED],
  [VISITOR_STATUS.ACTIVE]: [VISITOR_STATUS.VIP, VISITOR_STATUS.INACTIVE, VISITOR_STATUS.ARCHIVED, VISITOR_STATUS.DELETED],
  [VISITOR_STATUS.VIP]: [VISITOR_STATUS.ACTIVE, VISITOR_STATUS.INACTIVE, VISITOR_STATUS.ARCHIVED, VISITOR_STATUS.DELETED],
  [VISITOR_STATUS.INACTIVE]: [VISITOR_STATUS.REGISTERED, VISITOR_STATUS.VERIFIED, VISITOR_STATUS.ACTIVE, VISITOR_STATUS.ARCHIVED, VISITOR_STATUS.DELETED],
  [VISITOR_STATUS.ARCHIVED]: [VISITOR_STATUS.INACTIVE, VISITOR_STATUS.DELETED],
  [VISITOR_STATUS.DELETED]: [],
}

export class VisitorWorkflow {
  static getValidTransitions(fromStatus) {
    return VALID_TRANSITIONS[fromStatus] || []
  }

  static canTransition(fromStatus, toStatus) {
    const valid = VALID_TRANSITIONS[fromStatus]
    return valid ? valid.includes(toStatus) : false
  }

  static transition(visitor, toStatus) {
    if (!this.canTransition(visitor.status, toStatus)) {
      throw new VisitorStateError(
        `Cannot transition visitor from '${visitor.status}' to '${toStatus}'`
      )
    }
    visitor.status = toStatus
    return visitor
  }

  static getAllStatuses() {
    return Object.values(VISITOR_STATUS)
  }
}
