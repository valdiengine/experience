import { NOTIFICATION_STATUS, canTransitionTo } from './notification.status.js'
import { NotificationStateError } from './notification.errors.js'

export class NotificationWorkflow {
  static canTransition(from, to) {
    return canTransitionTo(from, to)
  }

  static transition(notification, newStatus) {
    if (!this.canTransition(notification.status, newStatus)) {
      throw new NotificationStateError(
        `Invalid status transition: ${notification.status} -> ${newStatus}`,
        notification.status
      )
    }
    return {
      ...notification,
      status: newStatus,
      previousStatus: notification.status,
      updatedAt: new Date().toISOString(),
    }
  }

  static getValidTransitions(currentStatus) {
    const transitions = {
      [NOTIFICATION_STATUS.DRAFT]: [NOTIFICATION_STATUS.PENDING, NOTIFICATION_STATUS.CANCELLED, NOTIFICATION_STATUS.DELETED],
      [NOTIFICATION_STATUS.PENDING]: [NOTIFICATION_STATUS.SCHEDULED, NOTIFICATION_STATUS.PROCESSING, NOTIFICATION_STATUS.CANCELLED, NOTIFICATION_STATUS.FAILED],
      [NOTIFICATION_STATUS.SCHEDULED]: [NOTIFICATION_STATUS.PROCESSING, NOTIFICATION_STATUS.CANCELLED, NOTIFICATION_STATUS.FAILED],
      [NOTIFICATION_STATUS.PROCESSING]: [NOTIFICATION_STATUS.SENT, NOTIFICATION_STATUS.DELIVERED, NOTIFICATION_STATUS.FAILED, NOTIFICATION_STATUS.CANCELLED],
      [NOTIFICATION_STATUS.SENT]: [NOTIFICATION_STATUS.DELIVERED, NOTIFICATION_STATUS.FAILED, NOTIFICATION_STATUS.ARCHIVED],
      [NOTIFICATION_STATUS.DELIVERED]: [NOTIFICATION_STATUS.ARCHIVED],
      [NOTIFICATION_STATUS.FAILED]: [NOTIFICATION_STATUS.PENDING, NOTIFICATION_STATUS.CANCELLED, NOTIFICATION_STATUS.ARCHIVED],
      [NOTIFICATION_STATUS.CANCELLED]: [NOTIFICATION_STATUS.ARCHIVED],
      [NOTIFICATION_STATUS.ARCHIVED]: [NOTIFICATION_STATUS.RESTORED],
      [NOTIFICATION_STATUS.DELETED]: [],
    }
    return transitions[currentStatus] || []
  }

  static getAllStatuses() {
    return Object.values(NOTIFICATION_STATUS)
  }

  static isTerminal(status) {
    return [
      NOTIFICATION_STATUS.DELIVERED,
      NOTIFICATION_STATUS.CANCELLED,
      NOTIFICATION_STATUS.ARCHIVED,
      NOTIFICATION_STATUS.DELETED,
    ].includes(status)
  }

  static isPending(status) {
    return [
      NOTIFICATION_STATUS.PENDING,
      NOTIFICATION_STATUS.SCHEDULED,
      NOTIFICATION_STATUS.PROCESSING,
    ].includes(status)
  }

  static isRetryable(status) {
    return status === NOTIFICATION_STATUS.FAILED
  }

  static shouldRetry(status, retryCount) {
    return this.isRetryable(status) && retryCount < 3
  }
}
