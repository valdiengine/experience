/**
 * Billing Capability — v1.0.0
 *
 * Billing & Payment Infrastructure Layer
 * Manages: invoices, payments, transactions, providers, subscription billing
 *
 * Dependencies: saas
 */
import { BaseCapability } from '../core/base.capability.js'
import { InvoiceManager } from './invoice.manager.js'
import { PaymentManager } from './payment.manager.js'
import { TransactionManager } from './transaction.manager.js'
import { ProviderManager, MockProvider } from './provider.manager.js'
import { SubscriptionBilling } from './subscription.billing.js'
import { BILLING_CONFIG } from './billing.config.js'

export class BillingCapability extends BaseCapability {
  static id = 'billing'
  static name = 'Billing'
  static version = '1.0.0'
  static dependencies = ['saas']

  #invoiceManager = null
  #paymentManager = null
  #transactionManager = null
  #providerManager = null
  #subscriptionBilling = null

  async init(context, config = {}) {
    await super.init(context, config)

    this.#invoiceManager = new InvoiceManager(context.eventBus)
    this.#paymentManager = new PaymentManager(context.eventBus)
    this.#transactionManager = new TransactionManager(context.eventBus)
    this.#providerManager = new ProviderManager(context.eventBus)

    this.#subscriptionBilling = new SubscriptionBilling(context, {
      invoiceManager: this.#invoiceManager,
      paymentManager: this.#paymentManager,
      transactionManager: this.#transactionManager,
      providerManager: this.#providerManager,
    })

    const providerId = config?.paymentProvider || 'mock'
    this.#providerManager.setActive(providerId)
  }

  async activate() {
    await super.activate()
  }

  async deactivate() {
    await super.deactivate()
  }

  async destroy() {
    this.#invoiceManager = null
    this.#paymentManager = null
    this.#transactionManager = null
    this.#providerManager = null
    this.#subscriptionBilling = null
    await super.destroy()
  }

  // ── Invoices ──

  createInvoice(subscription) {
    return this.#invoiceManager.create(subscription)
  }

  getInvoice(invoiceId) {
    return this.#invoiceManager.get(invoiceId)
  }

  getInvoices(tenantId, filter) {
    return this.#invoiceManager.getByTenant(tenantId, filter)
  }

  getPendingInvoices(tenantId) {
    return this.#invoiceManager.getPending(tenantId)
  }

  markInvoiceAsPaid(invoiceId, options) {
    return this.#invoiceManager.markAsPaid(invoiceId, options)
  }

  markInvoiceAsFailed(invoiceId, reason) {
    return this.#invoiceManager.markAsFailed(invoiceId, reason)
  }

  cancelInvoice(invoiceId) {
    return this.#invoiceManager.cancel(invoiceId)
  }

  refundInvoice(invoiceId) {
    return this.#invoiceManager.refund(invoiceId)
  }

  // ── Payments ──

  createPayment(invoice, providerId) {
    return this.#paymentManager.create(invoice, providerId)
  }

  getPayment(paymentId) {
    return this.#paymentManager.get(paymentId)
  }

  getPayments(tenantId, filter) {
    return this.#paymentManager.getByTenant(tenantId, filter)
  }

  confirmPayment(paymentId, result) {
    return this.#paymentManager.complete(paymentId, result)
  }

  failPayment(paymentId, reason) {
    return this.#paymentManager.fail(paymentId, reason)
  }

  cancelPayment(paymentId) {
    return this.#paymentManager.cancel(paymentId)
  }

  getPaymentHistory(tenantId) {
    return this.#paymentManager.getHistory(tenantId)
  }

  // ── Transactions ──

  getTransactions(tenantId, filter) {
    return this.#transactionManager.getByTenant(tenantId, filter)
  }

  getTransactionReport(tenantId) {
    return this.#transactionManager.getReport(tenantId)
  }

  // ── Providers ──

  registerProvider(ProviderClass) {
    return this.#providerManager.register(ProviderClass)
  }

  setActiveProvider(providerId) {
    return this.#providerManager.setActive(providerId)
  }

  getActiveProvider() {
    return this.#providerManager.getActiveProviderId()
  }

  getProviders() {
    return this.#providerManager.getAll()
  }

  // ── Subscription Billing ──

  async processInitialPayment(tenantId, subscriptionId, planId, amount, currency) {
    return this.#subscriptionBilling.processInitialPayment(tenantId, subscriptionId, planId, amount, currency)
  }

  async handlePaymentSuccess(paymentId) {
    return this.#subscriptionBilling.handlePaymentSuccess(paymentId)
  }

  async handlePaymentFailure(paymentId, reason) {
    return this.#subscriptionBilling.handlePaymentFailure(paymentId, reason)
  }

  pauseSubscriptionBilling(tenantId) {
    return this.#subscriptionBilling.pauseSubscription(tenantId)
  }

  resumeSubscriptionBilling(tenantId) {
    return this.#subscriptionBilling.resumeSubscription(tenantId)
  }

  cancelSubscriptionBilling(tenantId) {
    return this.#subscriptionBilling.cancelSubscription(tenantId)
  }

  async processRenewal(tenantId, subscriptionId, planId, amount) {
    return this.#subscriptionBilling.processRenewal(tenantId, subscriptionId, planId, amount)
  }

  getBillingStatus(tenantId) {
    return this.#subscriptionBilling.getBillingStatus(tenantId)
  }

  // ── Manager Access ──

  getInvoiceManager() { return this.#invoiceManager }
  getPaymentManager() { return this.#paymentManager }
  getTransactionManager() { return this.#transactionManager }
  getProviderManager() { return this.#providerManager }
  getSubscriptionBilling() { return this.#subscriptionBilling }
}
