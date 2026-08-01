/**
 * Subscription Billing — Connect billing events with SaaS subscriptions
 *
 * Business-agnostic: payment completed → subscription activated
 * Communicates with SaaS capability ONLY through context.capabilities.get('saas')
 */

import { BILLING_EVENTS } from './billing.events.js'
import { TRANSACTION_TYPES } from './billing.schema.js'

export class SubscriptionBilling {
  #context = null
  #invoiceManager = null
  #paymentManager = null
  #transactionManager = null
  #providerManager = null
  #eventBus = null

  constructor(context, managers) {
    this.#context = context
    this.#invoiceManager = managers.invoiceManager
    this.#paymentManager = managers.paymentManager
    this.#transactionManager = managers.transactionManager
    this.#providerManager = managers.providerManager
    this.#eventBus = context.eventBus
  }

  /**
   * Process initial subscription payment
   * @param {string} tenantId
   * @param {string} subscriptionId
   * @param {string} planId
   * @param {number} amount
   * @param {string} currency
   * @returns {object}
   */
  async processInitialPayment(tenantId, subscriptionId, planId, amount, currency = 'CLP') {
    const invoice = this.#invoiceManager.create({
      tenantId,
      subscriptionId,
      planId,
      amount,
      currency,
      items: [{ description: `Subscription: ${planId}`, amount }],
    })

    if (!invoice.success) return invoice

    const payment = this.#paymentManager.create(invoice.invoice, this.#providerManager.getActiveProviderId())
    if (!payment.success) return payment

    this.#transactionManager.create({
      tenantId,
      type: TRANSACTION_TYPES.SUBSCRIPTION,
      amount,
      currency,
      status: 'processing',
      invoiceId: invoice.invoice.id,
      paymentId: payment.payment.id,
      reference: `Initial subscription: ${planId}`,
    })

    return {
      success: true,
      invoice: invoice.invoice,
      payment: payment.payment,
    }
  }

  /**
   * Handle successful payment
   * @param {string} paymentId
   * @returns {object}
   */
  async handlePaymentSuccess(paymentId) {
    const payment = this.#paymentManager.get(paymentId)
    if (!payment) return { success: false, error: `Payment ${paymentId} not found` }

    this.#paymentManager.complete(paymentId)
    this.#invoiceManager.markAsPaid(payment.invoiceId, { paymentId })

    const saas = this.#context?.capabilities?.get?.('saas')
    if (saas?.reactivateSubscription) {
      saas.reactivateSubscription(payment.tenantId)
    }

    this.#transactionManager.create({
      tenantId: payment.tenantId,
      type: TRANSACTION_TYPES.SUBSCRIPTION,
      amount: payment.amount,
      currency: payment.currency,
      status: 'completed',
      invoiceId: payment.invoiceId,
      paymentId,
      reference: 'Payment completed',
    })

    this.#eventBus?.emit(BILLING_EVENTS.SUBSCRIPTION_BILLING_ACTIVATED, {
      tenantId: payment.tenantId,
      paymentId,
      invoiceId: payment.invoiceId,
    })

    return { success: true, tenantId: payment.tenantId }
  }

  /**
   * Handle failed payment
   * @param {string} paymentId
   * @param {string} reason
   * @returns {object}
   */
  async handlePaymentFailure(paymentId, reason = '') {
    const payment = this.#paymentManager.get(paymentId)
    if (!payment) return { success: false, error: `Payment ${paymentId} not found` }

    this.#paymentManager.fail(paymentId, reason)
    this.#invoiceManager.markAsFailed(payment.invoiceId, reason)

    const saas = this.#context?.capabilities?.get?.('saas')
    if (saas?.suspendSubscription) {
      saas.suspendSubscription(payment.tenantId)
    }

    this.#transactionManager.create({
      tenantId: payment.tenantId,
      type: TRANSACTION_TYPES.SUBSCRIPTION,
      amount: payment.amount,
      currency: payment.currency,
      status: 'failed',
      invoiceId: payment.invoiceId,
      paymentId,
      reference: `Payment failed: ${reason}`,
    })

    this.#eventBus?.emit(BILLING_EVENTS.SUBSCRIPTION_BILLING_SUSPENDED, {
      tenantId: payment.tenantId,
      paymentId,
      reason,
    })

    return { success: true, tenantId: payment.tenantId }
  }

  /**
   * Pause subscription billing
   * @param {string} tenantId
   * @returns {object}
   */
  pauseSubscription(tenantId) {
    const saas = this.#context?.capabilities?.get?.('saas')
    if (!saas?.suspendSubscription) return { success: false, error: 'SaaS capability not available' }

    const result = saas.suspendSubscription(tenantId)
    if (result.success) {
      this.#eventBus?.emit(BILLING_EVENTS.SUBSCRIPTION_BILLING_SUSPENDED, { tenantId })
    }
    return result
  }

  /**
   * Resume subscription billing
   * @param {string} tenantId
   * @returns {object}
   */
  resumeSubscription(tenantId) {
    const saas = this.#context?.capabilities?.get?.('saas')
    if (!saas?.reactivateSubscription) return { success: false, error: 'SaaS capability not available' }

    const result = saas.reactivateSubscription(tenantId)
    if (result.success) {
      this.#eventBus?.emit(BILLING_EVENTS.SUBSCRIPTION_BILLING_ACTIVATED, { tenantId })
    }
    return result
  }

  /**
   * Cancel subscription billing
   * @param {string} tenantId
   * @returns {object}
   */
  cancelSubscription(tenantId) {
    const saas = this.#context?.capabilities?.get?.('saas')
    if (!saas?.cancelSubscription) return { success: false, error: 'SaaS capability not available' }

    const result = saas.cancelSubscription(tenantId)
    if (result.success) {
      this.#eventBus?.emit(BILLING_EVENTS.SUBSCRIPTION_BILLING_CANCELLED, { tenantId })
    }
    return result
  }

  /**
   * Process renewal
   * @param {string} tenantId
   * @param {string} subscriptionId
   * @param {string} planId
   * @param {number} amount
   * @returns {object}
   */
  async processRenewal(tenantId, subscriptionId, planId, amount) {
    const invoice = this.#invoiceManager.create({
      tenantId,
      subscriptionId,
      planId,
      amount,
      items: [{ description: `Renewal: ${planId}`, amount }],
    })

    if (!invoice.success) return invoice

    const payment = this.#paymentManager.create(invoice.invoice, this.#providerManager.getActiveProviderId())
    if (!payment.success) return payment

    this.#transactionManager.create({
      tenantId,
      type: TRANSACTION_TYPES.RENEWAL,
      amount,
      status: 'processing',
      invoiceId: invoice.invoice.id,
      paymentId: payment.payment.id,
      reference: `Renewal: ${planId}`,
    })

    return {
      success: true,
      invoice: invoice.invoice,
      payment: payment.payment,
    }
  }

  /**
   * Get billing status for a tenant
   * @param {string} tenantId
   * @returns {object}
   */
  getBillingStatus(tenantId) {
    const saas = this.#context?.capabilities?.get?.('saas')
    const subscription = saas?.getSubscription?.(tenantId)
    const invoices = this.#invoiceManager.getByTenant(tenantId)
    const payments = this.#paymentManager.getByTenant(tenantId)

    return {
      tenantId,
      subscription: subscription || null,
      totalInvoices: invoices.length,
      pendingInvoices: invoices.filter(i => i.status === 'pending').length,
      paidInvoices: invoices.filter(i => i.status === 'paid').length,
      failedInvoices: invoices.filter(i => i.status === 'failed').length,
      totalPayments: payments.length,
      completedPayments: payments.filter(p => p.status === 'completed').length,
      lastPayment: payments[0] || null,
    }
  }
}
