/**
 * Invoice Manager — Create, track, update invoices
 *
 * Business-agnostic: billing records only, no capability activation
 */

import { INVOICE_STATUSES, INVOICE_SCHEMA } from './billing.schema.js'
import { BILLING_EVENTS } from './billing.events.js'
import { BILLING_CONFIG } from './billing.config.js'

export class InvoiceManager {
  #invoices = new Map()
  #counter = 0
  #eventBus = null

  constructor(eventBus) {
    this.#eventBus = eventBus
  }

  /**
   * Create an invoice for a subscription
   * @param {object} subscription - { tenantId, subscriptionId, planId, amount, currency }
   * @returns {object}
   */
  create(subscription) {
    if (!subscription?.tenantId) return { success: false, error: 'Tenant ID is required' }
    if (!subscription?.subscriptionId) return { success: false, error: 'Subscription ID is required' }
    if (!subscription?.planId) return { success: false, error: 'Plan ID is required' }

    this.#counter++
    const id = `inv_${Date.now()}_${this.#counter}`
    const now = new Date().toISOString()
    const dueDate = new Date(Date.now() + BILLING_CONFIG.invoiceDefaults.pendingTTL).toISOString()

    const invoice = {
      ...INVOICE_SCHEMA,
      id,
      tenantId: subscription.tenantId,
      subscriptionId: subscription.subscriptionId,
      planId: subscription.planId,
      amount: subscription.amount || 0,
      currency: subscription.currency || BILLING_CONFIG.defaultCurrency,
      status: INVOICE_STATUSES.PENDING,
      items: subscription.items || [],
      metadata: subscription.metadata || {},
      createdAt: now,
      dueDate,
      paidAt: null,
    }

    this.#invoices.set(id, invoice)
    this.#emit(BILLING_EVENTS.INVOICE_CREATED, { invoice })
    return { success: true, invoice }
  }

  /**
   * Get invoice by ID
   * @param {string} invoiceId
   * @returns {object|null}
   */
  get(invoiceId) {
    return this.#invoices.get(invoiceId) || null
  }

  /**
   * Get all invoices for a tenant
   * @param {string} tenantId
   * @param {object} filter - { status }
   * @returns {object[]}
   */
  getByTenant(tenantId, filter = {}) {
    let invoices = Array.from(this.#invoices.values()).filter(i => i.tenantId === tenantId)
    if (filter.status) invoices = invoices.filter(i => i.status === filter.status)
    return invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  /**
   * Get pending invoices for a tenant
   * @param {string} tenantId
   * @returns {object[]}
   */
  getPending(tenantId) {
    return this.getByTenant(tenantId, { status: INVOICE_STATUSES.PENDING })
  }

  /**
   * Get invoices for a subscription
   * @param {string} subscriptionId
   * @returns {object[]}
   */
  getBySubscription(subscriptionId) {
    return Array.from(this.#invoices.values())
      .filter(i => i.subscriptionId === subscriptionId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  /**
   * Mark invoice as paid
   * @param {string} invoiceId
   * @param {object} options - { paidAt, paymentId }
   * @returns {object}
   */
  markAsPaid(invoiceId, options = {}) {
    const invoice = this.#invoices.get(invoiceId)
    if (!invoice) return { success: false, error: `Invoice ${invoiceId} not found` }
    if (invoice.status === INVOICE_STATUSES.PAID) return { success: false, error: 'Invoice already paid' }

    invoice.status = INVOICE_STATUSES.PAID
    invoice.paidAt = options.paidAt || new Date().toISOString()
    if (options.paymentId) invoice.metadata.paymentId = options.paymentId

    this.#invoices.set(invoiceId, invoice)
    this.#emit(BILLING_EVENTS.INVOICE_PAID, { invoice })
    return { success: true, invoice }
  }

  /**
   * Mark invoice as failed
   * @param {string} invoiceId
   * @param {string} reason
   * @returns {object}
   */
  markAsFailed(invoiceId, reason = '') {
    const invoice = this.#invoices.get(invoiceId)
    if (!invoice) return { success: false, error: `Invoice ${invoiceId} not found` }

    invoice.status = INVOICE_STATUSES.FAILED
    invoice.metadata.failureReason = reason

    this.#invoices.set(invoiceId, invoice)
    this.#emit(BILLING_EVENTS.INVOICE_FAILED, { invoice, reason })
    return { success: true, invoice }
  }

  /**
   * Cancel invoice
   * @param {string} invoiceId
   * @returns {object}
   */
  cancel(invoiceId) {
    const invoice = this.#invoices.get(invoiceId)
    if (!invoice) return { success: false, error: `Invoice ${invoiceId} not found` }

    invoice.status = INVOICE_STATUSES.CANCELLED

    this.#invoices.set(invoiceId, invoice)
    this.#emit(BILLING_EVENTS.INVOICE_CANCELLED, { invoice })
    return { success: true, invoice }
  }

  /**
   * Refund invoice
   * @param {string} invoiceId
   * @returns {object}
   */
  refund(invoiceId) {
    const invoice = this.#invoices.get(invoiceId)
    if (!invoice) return { success: false, error: `Invoice ${invoiceId} not found` }
    if (invoice.status !== INVOICE_STATUSES.PAID) return { success: false, error: 'Can only refund paid invoices' }

    invoice.status = INVOICE_STATUSES.REFUNDED
    invoice.metadata.refundedAt = new Date().toISOString()

    this.#invoices.set(invoiceId, invoice)
    this.#emit(BILLING_EVENTS.REFUND_CREATED, { invoice })
    return { success: true, invoice }
  }

  /**
   * Get all invoices
   * @param {object} filter - { status, tenantId }
   * @returns {object[]}
   */
  getAll(filter = {}) {
    let invoices = Array.from(this.#invoices.values())
    if (filter.status) invoices = invoices.filter(i => i.status === filter.status)
    if (filter.tenantId) invoices = invoices.filter(i => i.tenantId === filter.tenantId)
    return invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  /**
   * Get invoice count
   * @param {string} status
   * @returns {number}
   */
  count(status) {
    if (status) return this.getAll({ status }).length
    return this.#invoices.size
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }
}
