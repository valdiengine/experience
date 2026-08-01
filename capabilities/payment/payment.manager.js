import { PAYMENT_STATUS } from './payment.status.js'
import { PAYMENT_EVENTS } from './payment.events.js'
import { PaymentWorkflow } from './payment.workflow.js'
import { PaymentCalculation } from './payment.calculation.js'
import { PaymentFees } from './payment.fees.js'
import { PaymentRefund } from './payment.refund.js'
import { PaymentSearch } from './payment.search.js'
import { validateCreateData, validateUpdateData, validateAmount, validateRefundAmount, validateCancellation, validateBusinessOwnership } from './payment.validation.js'
import { PAYMENT_PERMISSIONS } from './payment.permissions.js'
import {
  PaymentNotFoundError,
  PaymentPermissionError,
  PaymentValidationError,
  PaymentAlreadyPaidError,
  PaymentAlreadyRefundedError,
  PaymentStateError,
} from './payment.errors.js'

export class PaymentManager {
  #context = null
  #payments = new Map()

  constructor(context) {
    this.#context = context
  }

  get #repo() {
    return this.#context?.repositories?.payment || null
  }

  get #auth() {
    return this.#context?.runtime?.auth || null
  }

  get #eventBus() {
    return this.#context?.eventBus || null
  }

  get #search() {
    return this.#context?.runtime?.search || null
  }

  get #refundEngine() {
    return new PaymentRefund(this.#context)
  }

  async #checkPermission(identity, permission, resource) {
    if (!this.#auth || !identity) return true
    try {
      await this.#auth.authorize(identity, permission, resource || 'payment')
    } catch {
      throw new PaymentPermissionError(`Missing permission: ${permission}`)
    }
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }

  async #loadPayment(paymentId) {
    const cached = this.#payments.get(paymentId)
    if (cached) return cached

    if (this.#repo) {
      try {
        const found = await this.#repo.findById(paymentId)
        if (found) {
          this.#payments.set(paymentId, found)
          return found
        }
      } catch { /* repository not resolvable */ }
    }

    const fromDataManager = this.#context?.dataManager?.get('payments')?.find(p => p.id === paymentId)
    if (fromDataManager) {
      this.#payments.set(paymentId, fromDataManager)
      return fromDataManager
    }
    return null
  }

  async #persist(payment, isNew = false) {
    if (this.#repo) {
      try {
        if (isNew) {
          await this.#repo.create(payment)
        } else {
          const updated = await this.#repo.update({ id: payment.id }, payment)
          if (!updated) {
            await this.#repo.create(payment)
          }
        }
      } catch (err) {
        console.error(`[PaymentManager] Failed to persist payment ${payment.id}:`, err.message)
      }
    }
    this.#payments.set(payment.id, payment)
    if (this.#context?.dataManager) {
      const payments = this.#context.dataManager.get('payments') || []
      const index = payments.findIndex(p => p.id === payment.id)
      if (index >= 0) {
        payments[index] = payment
      } else {
        payments.push(payment)
      }
      this.#context.dataManager.set('payments', payments)
    }
  }

  async createPayment(data, identity) {
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.CREATE)

    validateCreateData(data)
    await validateBusinessOwnership(data, this.#context)

    const tenant = this.#context?.tenant
    const tenantId = data.tenantId
      || (tenant && typeof tenant === 'object' ? tenant.id : tenant)
      || null

    const total = PaymentCalculation.calculateTotal({
      subtotal: data.subtotal,
      discount: data.discount || 0,
      couponDiscount: 0,
      cleaningFee: 0,
      serviceFee: data.fees || 0,
      platformCommission: data.commission || 0,
      taxes: data.taxes || 0,
      adjustments: 0,
    })

    if (data.paidAmount > total) {
      throw new PaymentAmountError('Paid amount cannot exceed total', { paidAmount: data.paidAmount, total })
    }
    if ((data.refundedAmount || 0) > (data.paidAmount || 0)) {
      throw new PaymentAmountError('Refunded amount cannot exceed paid amount', { refundedAmount: data.refundedAmount, paidAmount: data.paidAmount })
    }

    const now = new Date().toISOString()
    const payment = {
      id: data.id || `pay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      tenantId,
      destinationId: data.destinationId || null,
      businessId: data.businessId,
      reservationId: data.reservationId || null,
      visitorId: data.visitorId || null,
      currency: data.currency || 'USD',
      subtotal: data.subtotal,
      discount: data.discount || 0,
      taxes: data.taxes || 0,
      fees: data.fees || 0,
      commission: data.commission || 0,
      total,
      paidAmount: 0,
      remainingAmount: total,
      refundedAmount: 0,
      status: PAYMENT_STATUS.DRAFT,
      method: data.method || null,
      provider: data.provider || null,
      reference: data.reference || null,
      transactionId: null,
      metadata: data.metadata || {},
      createdBy: identity?.id || null,
      updatedBy: identity?.id || null,
      createdAt: now,
      updatedAt: now,
      paidAt: null,
      expiredAt: null,
      previousStatus: null,
      refundHistory: [],
    }

    await this.#persist(payment, true)
    this.#emit(PAYMENT_EVENTS.CREATED, { payment })

    return { success: true, payment }
  }

  async getById(id, identity) {
    const payment = await this.#loadPayment(id)
    if (!payment) {
      throw new PaymentNotFoundError(id)
    }
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.READ, payment)
    return payment
  }

  async getMany(filter, identity) {
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.READ)
    return this.#repo?.findMany(filter) || []
  }

  async updatePayment(id, data, identity) {
    const existing = await this.#loadPayment(id)
    if (!existing) {
      throw new PaymentNotFoundError(id)
    }
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.UPDATE, existing)

    const updates = validateUpdateData(data, existing.status)

    updates.updatedAt = new Date().toISOString()
    updates.updatedBy = identity?.id || null

    const updated = { ...existing, ...updates }
    await this.#persist(updated)
    this.#emit(PAYMENT_EVENTS.UPDATED, { payment: updated, changes: updates })

    return { success: true, payment: updated }
  }

  async authorizePayment(id, identity) {
    const payment = await this.#loadPayment(id)
    if (!payment) {
      throw new PaymentNotFoundError(id)
    }
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.UPDATE, payment)

    const updated = PaymentWorkflow.transition(payment, PAYMENT_STATUS.AUTHORIZED)
    updated.transactionId = payment.transactionId || `auth_${Date.now()}`
    await this.#persist(updated)
    this.#emit(PAYMENT_EVENTS.AUTHORIZED, { payment: updated })

    return { success: true, payment: updated }
  }

  async capturePayment(id, identity) {
    const payment = await this.#loadPayment(id)
    if (!payment) {
      throw new PaymentNotFoundError(id)
    }
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.UPDATE, payment)

    const updated = PaymentWorkflow.transition(payment, PAYMENT_STATUS.PAID)
    updated.paidAmount = updated.total
    updated.remainingAmount = 0
    updated.paidAt = new Date().toISOString()
    await this.#persist(updated)
    this.#emit(PAYMENT_EVENTS.CAPTURED, { payment: updated })

    return { success: true, payment: updated }
  }

  async markPaid(id, paidAmount, identity) {
    const payment = await this.#loadPayment(id)
    if (!payment) {
      throw new PaymentNotFoundError(id)
    }
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.UPDATE, payment)

    validateAmount(paidAmount, 'paidAmount')

    const balance = PaymentCalculation.calculateBalance(payment.total, paidAmount, payment.refundedAmount)
    const newStatus = balance.isFullyPaid ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PARTIALLY_PAID

    const updated = PaymentWorkflow.transition(payment, newStatus)
    updated.paidAmount = paidAmount
    updated.remainingAmount = balance.remainingAmount
    if (balance.isFullyPaid) {
      updated.paidAt = new Date().toISOString()
    }
    await this.#persist(updated)
    this.#emit(PAYMENT_EVENTS.PAID, { payment: updated })

    return { success: true, payment: updated }
  }

  async cancelPayment(id, identity) {
    const payment = await this.#loadPayment(id)
    if (!payment) {
      throw new PaymentNotFoundError(id)
    }
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.CANCEL, payment)
    validateCancellation(payment)

    const updated = PaymentWorkflow.transition(payment, PAYMENT_STATUS.CANCELLED)
    await this.#persist(updated)
    this.#emit(PAYMENT_EVENTS.CANCELLED, { payment: updated })

    return { success: true, payment: updated }
  }

  async expirePayment(id, identity) {
    const payment = await this.#loadPayment(id)
    if (!payment) {
      throw new PaymentNotFoundError(id)
    }
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.UPDATE, payment)

    const updated = PaymentWorkflow.transition(payment, PAYMENT_STATUS.EXPIRED)
    updated.expiredAt = new Date().toISOString()
    await this.#persist(updated)
    this.#emit(PAYMENT_EVENTS.EXPIRED, { payment: updated })

    return { success: true, payment: updated }
  }

  async refundPayment(id, refundAmount, identity, reason = '') {
    const payment = await this.#loadPayment(id)
    if (!payment) {
      throw new PaymentNotFoundError(id)
    }
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.REFUND, payment)

    const calculatedAmount = this.#refundEngine.calculateRefundAmount(payment, refundAmount)
    const breakdown = this.#refundEngine.calculateRefundBreakdown(payment, calculatedAmount)

    const newStatus = breakdown.newRefundedAmount >= payment.paidAmount
      ? PAYMENT_STATUS.REFUNDED
      : PAYMENT_STATUS.PARTIALLY_REFUNDED

    const updated = PaymentWorkflow.transition(payment, newStatus)
    updated.refundedAmount = breakdown.newRefundedAmount
    updated.paidAmount = breakdown.newPaidAmount

    const refundRecord = {
      refundId: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      amount: calculatedAmount,
      reason,
      processedBy: identity?.id || null,
      processedAt: new Date().toISOString(),
    }
    updated.refundHistory = [...(updated.refundHistory || []), refundRecord]

    await this.#persist(updated)

    const event = newStatus === PAYMENT_STATUS.REFUNDED
      ? PAYMENT_EVENTS.REFUNDED
      : PAYMENT_EVENTS.PARTIALLY_REFUNDED
    this.#emit(event, { payment: updated, refund: refundRecord })

    return { success: true, payment: updated, refund: refundRecord }
  }

  async partialRefund(id, refundAmount, identity, reason = '') {
    const payment = await this.#loadPayment(id)
    if (!payment) {
      throw new PaymentNotFoundError(id)
    }
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.REFUND, payment)

    if (!this.#refundEngine.canSupportPartialRefunds(payment)) {
      throw new PaymentStateError('Payment does not support partial refunds', payment.status)
    }

    return this.refundPayment(id, refundAmount, identity, reason)
  }

  async archivePayment(id, identity) {
    const payment = await this.#loadPayment(id)
    if (!payment) {
      throw new PaymentNotFoundError(id)
    }
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.ARCHIVE, payment)

    const updated = PaymentWorkflow.transition(payment, PAYMENT_STATUS.ARCHIVED)
    await this.#persist(updated)
    this.#emit(PAYMENT_EVENTS.ARCHIVED, { payment: updated })

    return { success: true, payment: updated }
  }

  async restorePayment(id, identity) {
    const payment = await this.#loadPayment(id)
    if (!payment) {
      throw new PaymentNotFoundError(id)
    }
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.RESTORE, payment)

    if (payment.status !== PAYMENT_STATUS.ARCHIVED) {
      throw new PaymentStateError('Only archived payments can be restored', payment.status)
    }

    const restored = {
      ...payment,
      status: payment.previousStatus || PAYMENT_STATUS.DRAFT,
      previousStatus: null,
      updatedAt: new Date().toISOString(),
    }
    await this.#persist(restored)
    this.#emit(PAYMENT_EVENTS.RESTORED, { payment: restored })

    return { success: true, payment: restored }
  }

  async deletePayment(id, identity) {
    const payment = await this.#loadPayment(id)
    if (!payment) {
      throw new PaymentNotFoundError(id)
    }
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.DELETE, payment)

    this.#payments.delete(id)
    if (this.#repo) {
      await this.#repo.delete({ id })
    }
    if (this.#context?.dataManager) {
      const payments = this.#context.dataManager.get('payments') || []
      const index = payments.findIndex(p => p.id === id)
      if (index >= 0) {
        payments.splice(index, 1)
        this.#context.dataManager.set('payments', payments)
      }
    }
    this.#emit(PAYMENT_EVENTS.DELETED, { paymentId: id })
    return { success: true }
  }

  async findByReservation(reservationId, identity) {
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.READ)
    return this.#repo?.findByReservation?.(reservationId) || []
  }

  async findByBusiness(businessId, identity) {
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.READ)
    return this.#repo?.findByBusiness?.(businessId) || []
  }

  async findByVisitor(visitorId, identity) {
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.READ)
    return this.#repo?.findByVisitor?.(visitorId) || []
  }

  async findPending(identity) {
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.READ)
    return this.#repo?.findMany?.({ status: PAYMENT_STATUS.PENDING }) || []
  }

  async findPaid(identity) {
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.READ)
    return this.#repo?.findMany?.({ status: PAYMENT_STATUS.PAID }) || []
  }

  async findFailed(identity) {
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.READ)
    return this.#repo?.findMany?.({ status: PAYMENT_STATUS.FAILED }) || []
  }

  async findRefunded(identity) {
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.READ)
    return this.#repo?.findMany?.({ status: { in: [PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.PARTIALLY_REFUNDED] } }) || []
  }

  async calculateFees(subtotal, options = {}) {
    return PaymentFees.calculateAllFees(subtotal, options)
  }

  async getRefundEligibility(paymentId, identity) {
    const payment = await this.#loadPayment(paymentId)
    if (!payment) {
      throw new PaymentNotFoundError(paymentId)
    }
    await this.#checkPermission(identity, PAYMENT_PERMISSIONS.READ, payment)
    return this.#refundEngine.isEligibleForRefund(payment)
  }

  getById(id) {
    return this.#payments.get(id) || null
  }

  getAll() {
    return Array.from(this.#payments.values())
  }

  loadFromDataManager() {
    const payments = this.#context?.dataManager?.get('payments') || []
    payments.forEach(p => this.#payments.set(p.id, p))
  }
}
