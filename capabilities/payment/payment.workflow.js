import { PAYMENT_STATUS, canTransitionTo } from './payment.status.js'
import { PaymentStateError } from './payment.errors.js'

export class PaymentWorkflow {
  static canTransition(from, to) {
    return canTransitionTo(from, to)
  }

  static transition(payment, newStatus) {
    if (!this.canTransition(payment.status, newStatus)) {
      throw new PaymentStateError(
        `Invalid status transition: ${payment.status} -> ${newStatus}`,
        payment.status
      )
    }
    return {
      ...payment,
      status: newStatus,
      previousStatus: payment.status,
      updatedAt: new Date().toISOString(),
    }
  }

  static getValidTransitions(currentStatus) {
    const transitions = {
      [PAYMENT_STATUS.DRAFT]: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.CANCELLED, PAYMENT_STATUS.ARCHIVED],
      [PAYMENT_STATUS.PENDING]: [PAYMENT_STATUS.PROCESSING, PAYMENT_STATUS.CANCELLED, PAYMENT_STATUS.EXPIRED, PAYMENT_STATUS.ARCHIVED],
      [PAYMENT_STATUS.PROCESSING]: [PAYMENT_STATUS.AUTHORIZED, PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_PAID, PAYMENT_STATUS.FAILED, PAYMENT_STATUS.CANCELLED],
      [PAYMENT_STATUS.AUTHORIZED]: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_PAID, PAYMENT_STATUS.CANCELLED, PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.EXPIRED],
      [PAYMENT_STATUS.PARTIALLY_PAID]: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.PARTIALLY_REFUNDED, PAYMENT_STATUS.CHARGEBACK, PAYMENT_STATUS.DISPUTED],
      [PAYMENT_STATUS.PAID]: [PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.PARTIALLY_REFUNDED, PAYMENT_STATUS.CHARGEBACK, PAYMENT_STATUS.DISPUTED, PAYMENT_STATUS.ARCHIVED],
      [PAYMENT_STATUS.FAILED]: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.CANCELLED, PAYMENT_STATUS.ARCHIVED],
      [PAYMENT_STATUS.CANCELLED]: [PAYMENT_STATUS.ARCHIVED],
      [PAYMENT_STATUS.EXPIRED]: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.ARCHIVED],
      [PAYMENT_STATUS.PARTIALLY_REFUNDED]: [PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.PAID, PAYMENT_STATUS.CHARGEBACK, PAYMENT_STATUS.DISPUTED],
      [PAYMENT_STATUS.REFUNDED]: [PAYMENT_STATUS.ARCHIVED],
      [PAYMENT_STATUS.DISPUTED]: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.CHARGEBACK],
      [PAYMENT_STATUS.CHARGEBACK]: [PAYMENT_STATUS.ARCHIVED],
      [PAYMENT_STATUS.ARCHIVED]: [],
    }
    return transitions[currentStatus] || []
  }

  static getAllStatuses() {
    return Object.values(PAYMENT_STATUS)
  }

  static isTerminal(status) {
    const transitions = this.getValidTransitions(status)
    return transitions.length === 0
  }

  static isRefundable(payment) {
    return [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_PAID, PAYMENT_STATUS.AUTHORIZED].includes(payment.status)
  }

  static isCancellable(payment) {
    return [PAYMENT_STATUS.DRAFT, PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING, PAYMENT_STATUS.AUTHORIZED].includes(payment.status)
  }

  static getRefundableAmount(payment) {
    if (!this.isRefundable(payment)) return 0
    return payment.paidAmount - (payment.refundedAmount || 0)
  }
}
