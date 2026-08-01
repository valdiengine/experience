import { PaymentCalculation } from './payment.calculation.js'
import { PaymentRefundError, PaymentValidationError } from './payment.errors.js'
import { isRefundableStatus, PAYMENT_STATUS } from './payment.status.js'

export class PaymentRefund {
  constructor(context) {
    this.#context = context
  }

  get #eventBus() {
    return this.#context?.eventBus || null
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }

  isEligibleForRefund(payment) {
    if (!isRefundableStatus(payment.status)) {
      return {
        eligible: false,
        reason: `Payment status ${payment.status} does not allow refunds`,
        maxRefundable: 0,
      }
    }

    const paidAmount = payment.paidAmount || 0
    const refundedAmount = payment.refundedAmount || 0
    const maxRefundable = Math.max(0, paidAmount - refundedAmount)

    if (maxRefundable <= 0) {
      return {
        eligible: false,
        reason: 'No refundable amount remaining',
        maxRefundable: 0,
      }
    }

    return {
      eligible: true,
      reason: null,
      maxRefundable,
      paidAmount,
      refundedAmount,
    }
  }

  calculateRefundAmount(payment, requestedAmount = null) {
    const eligibility = this.isEligibleForRefund(payment)
    if (!eligibility.eligible) {
      throw new PaymentRefundError(eligibility.reason, requestedAmount, eligibility.maxRefundable)
    }

    if (requestedAmount === null) {
      return eligibility.maxRefundable
    }

    PaymentCalculation.validateAmount(requestedAmount, 'refundAmount')

    if (requestedAmount > eligibility.maxRefundable) {
      throw new PaymentRefundError(
        `Requested refund ${requestedAmount} exceeds maximum ${eligibility.maxRefundable}`,
        requestedAmount,
        eligibility.maxRefundable
      )
    }

    if (requestedAmount <= 0) {
      throw new PaymentRefundError('Refund amount must be positive', requestedAmount, eligibility.maxRefundable)
    }

    return requestedAmount
  }

  calculateRefundBreakdown(payment, refundAmount) {
    const eligibility = this.isEligibleForRefund(payment)
    if (!eligibility.eligible) {
      throw new PaymentRefundError(eligibility.reason, refundAmount, 0)
    }

    const subtotal = payment.subtotal || 0
    const taxes = payment.taxes || 0
    const fees = payment.fees || 0
    const total = payment.total || 0

    const refundRatio = refundAmount / eligibility.maxRefundable
    const refundSubtotal = Math.round(subtotal * refundRatio * 100) / 100
    const refundTaxes = Math.round(taxes * refundRatio * 100) / 100
    const refundFees = Math.round(fees * refundRatio * 100) / 100

    return {
      refundAmount,
      refundSubtotal,
      refundTaxes,
      refundFees,
      originalTotal: total,
      newPaidAmount: eligibility.paidAmount - refundAmount,
      newRefundedAmount: (payment.refundedAmount || 0) + refundAmount,
    }
  }

  async processRefund(payment, refundAmount, identity, reason = '') {
    const calculatedAmount = this.calculateRefundAmount(payment, refundAmount)
    const breakdown = this.calculateRefundBreakdown(payment, calculatedAmount)

    return {
      success: true,
      refundId: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      paymentId: payment.id,
      refundAmount: calculatedAmount,
      breakdown,
      reason,
      processedAt: new Date().toISOString(),
      processedBy: identity?.id || null,
    }
  }

  getRefundableAmount(payment) {
    const eligibility = this.isEligibleForRefund(payment)
    return eligibility.maxRefundable
  }

  getRefundHistory(payment) {
    return payment.refundHistory || []
  }

  canSupportPartialRefunds(payment) {
    return isRefundableStatus(payment.status) && payment.paidAmount > 0
  }

  getMaxRefunds(payment) {
    if (!this.canSupportPartialRefunds(payment)) {
      return { maxRefunds: 0, minAmount: 0 }
    }

    const minRefundAmount = 1
    const maxRefundable = this.getRefundableAmount(payment)
    const maxRefunds = Math.floor(maxRefundable / minRefundAmount)

    return {
      maxRefunds,
      minAmount: minRefundAmount,
      maxAmount: maxRefundable,
    }
  }

  validateRefundReason(reason) {
    const validReasons = [
      'customer_request',
      'duplicate_charge',
      'service_not_provided',
      'quality_issue',
      'cancellation',
      'other',
    ]

    if (!reason) {
      return { valid: true, normalized: 'other' }
    }

    const normalized = reason.toLowerCase().replace(/\s+/g, '_')
    if (!validReasons.includes(normalized)) {
      return {
        valid: false,
        error: `Invalid refund reason: ${reason}`,
        validReasons,
      }
    }

    return { valid: true, normalized }
  }
}
