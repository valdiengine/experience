/**
 * Payment Manager — Create payments, track status, process results
 *
 * Business-agnostic: payment flow only, no provider logic
 */

import { PAYMENT_STATUSES, PAYMENT_SCHEMA } from './billing.schema.js'
import { BILLING_EVENTS } from './billing.events.js'
import { BILLING_CONFIG } from './billing.config.js'

export class PaymentManager {
  #payments = new Map()
  #counter = 0
  #eventBus = null

  constructor(eventBus) {
    this.#eventBus = eventBus
  }

  /**
   * Create a payment for an invoice
   * @param {object} invoice - { id, tenantId, amount, currency }
   * @param {string} providerId
   * @returns {object}
   */
  create(invoice, providerId) {
    if (!invoice?.id) return { success: false, error: 'Invoice ID is required' }
    if (!invoice?.tenantId) return { success: false, error: 'Tenant ID is required' }

    this.#counter++
    const id = `pay_${Date.now()}_${this.#counter}`

    const payment = {
      ...PAYMENT_SCHEMA,
      id,
      tenantId: invoice.tenantId,
      invoiceId: invoice.id,
      provider: providerId || 'pending',
      amount: invoice.amount,
      currency: invoice.currency || BILLING_CONFIG.defaultCurrency,
      status: PAYMENT_STATUSES.CREATED,
      externalId: null,
      metadata: {},
      createdAt: new Date().toISOString(),
      completedAt: null,
    }

    this.#payments.set(id, payment)
    this.#emit(BILLING_EVENTS.PAYMENT_CREATED, { payment })
    return { success: true, payment }
  }

  /**
   * Get payment by ID
   * @param {string} paymentId
   * @returns {object|null}
   */
  get(paymentId) {
    return this.#payments.get(paymentId) || null
  }

  /**
   * Get all payments for a tenant
   * @param {string} tenantId
   * @param {object} filter - { status }
   * @returns {object[]}
   */
  getByTenant(tenantId, filter = {}) {
    let payments = Array.from(this.#payments.values()).filter(p => p.tenantId === tenantId)
    if (filter.status) payments = payments.filter(p => p.status === filter.status)
    return payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  /**
   * Get payment for an invoice
   * @param {string} invoiceId
   * @returns {object|null}
   */
  getByInvoice(invoiceId) {
    return Array.from(this.#payments.values()).find(p => p.invoiceId === invoiceId) || null
  }

  /**
   * Mark payment as processing
   * @param {string} paymentId
   * @param {string} externalId
   * @returns {object}
   */
  markAsProcessing(paymentId, externalId) {
    const payment = this.#payments.get(paymentId)
    if (!payment) return { success: false, error: `Payment ${paymentId} not found` }

    payment.status = PAYMENT_STATUSES.PROCESSING
    if (externalId) payment.externalId = externalId

    this.#payments.set(paymentId, payment)
    this.#emit(BILLING_EVENTS.PAYMENT_PROCESSING, { payment })
    return { success: true, payment }
  }

  /**
   * Mark payment as completed
   * @param {string} paymentId
   * @param {object} result - { externalId, metadata }
   * @returns {object}
   */
  complete(paymentId, result = {}) {
    const payment = this.#payments.get(paymentId)
    if (!payment) return { success: false, error: `Payment ${paymentId} not found` }

    payment.status = PAYMENT_STATUSES.COMPLETED
    payment.completedAt = new Date().toISOString()
    if (result.externalId) payment.externalId = result.externalId
    if (result.metadata) payment.metadata = { ...payment.metadata, ...result.metadata }

    this.#payments.set(paymentId, payment)
    this.#emit(BILLING_EVENTS.PAYMENT_COMPLETED, { payment })
    return { success: true, payment }
  }

  /**
   * Mark payment as failed
   * @param {string} paymentId
   * @param {string} reason
   * @returns {object}
   */
  fail(paymentId, reason = '') {
    const payment = this.#payments.get(paymentId)
    if (!payment) return { success: false, error: `Payment ${paymentId} not found` }

    payment.status = PAYMENT_STATUSES.FAILED
    payment.metadata.failureReason = reason

    this.#payments.set(paymentId, payment)
    this.#emit(BILLING_EVENTS.PAYMENT_FAILED, { payment, reason })
    return { success: true, payment }
  }

  /**
   * Cancel payment
   * @param {string} paymentId
   * @returns {object}
   */
  cancel(paymentId) {
    const payment = this.#payments.get(paymentId)
    if (!payment) return { success: false, error: `Payment ${paymentId} not found` }

    payment.status = PAYMENT_STATUSES.CANCELLED

    this.#payments.set(paymentId, payment)
    this.#emit(BILLING_EVENTS.PAYMENT_CANCELLED, { payment })
    return { success: true, payment }
  }

  /**
   * Get payment history for a tenant
   * @param {string} tenantId
   * @returns {object[]}
   */
  getHistory(tenantId) {
    return this.getByTenant(tenantId)
  }

  /**
   * Get all payments
   * @param {object} filter
   * @returns {object[]}
   */
  getAll(filter = {}) {
    let payments = Array.from(this.#payments.values())
    if (filter.status) payments = payments.filter(p => p.status === filter.status)
    if (filter.tenantId) payments = payments.filter(p => p.tenantId === filter.tenantId)
    return payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }
}
