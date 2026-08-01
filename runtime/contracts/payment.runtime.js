import { BaseRuntimeContract } from './base.runtime.js'

export class PaymentRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'payment'
  }

  async charge(amount, currency, source, options) {
    return null
  }

  async refund(transactionId, amount) {
    return null
  }

  async createCheckout(items, options) {
    return null
  }

  async createSubscription(plan, customer, options) {
    return null
  }

  async cancelSubscription(subscriptionId) {}

  async getTransaction(transactionId) {
    return null
  }

  async listTransactions(options) {
    return []
  }

  async createCustomer(info) {
    return null
  }

  async getCustomer(customerId) {
    return null
  }

  async handleWebhook(payload, headers) {
    return null
  }

  supports(feature) {
    const features = ['refund', 'subscription', 'checkout', 'webhook', 'customer', 'plan', 'coupon', 'invoice', 'payout']
    return features.includes(feature)
  }
}

export default PaymentRuntime
