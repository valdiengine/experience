/**
 * Payment Provider Manager — Provider-independent payment abstraction
 *
 * Business-agnostic: interface definition + registry, no real providers yet
 * Future providers: WebpayProvider, StripeProvider, MercadoPagoProvider
 */

import { BILLING_EVENTS } from './billing.events.js'

/**
 * Base Payment Provider Interface
 * All providers must implement these methods
 */
export class PaymentProvider {
  static id = null
  static name = null

  async initialize(config) { throw new Error('Not implemented') }
  async createPayment(data) { throw new Error('Not implemented') }
  async checkStatus(externalId) { throw new Error('Not implemented') }
  async cancelPayment(externalId) { throw new Error('Not implemented') }
  async refundPayment(externalId, amount) { throw new Error('Not implemented') }
}

/**
 * Mock Provider for testing
 */
export class MockProvider extends PaymentProvider {
  static id = 'mock'
  static name = 'Mock Provider'

  #initialized = false

  async initialize(config) {
    this.#initialized = true
    return { success: true }
  }

  async createPayment(data) {
    if (!this.#initialized) return { success: false, error: 'Provider not initialized' }
    return {
      success: true,
      externalId: `mock_${Date.now()}`,
      status: 'created',
    }
  }

  async checkStatus(externalId) {
    return { success: true, status: 'completed', externalId }
  }

  async cancelPayment(externalId) {
    return { success: true, status: 'cancelled', externalId }
  }

  async refundPayment(externalId, amount) {
    return { success: true, status: 'refunded', externalId, amount }
  }
}

/**
 * Provider Manager — Registry of payment providers
 */
export class ProviderManager {
  #providers = new Map()
  #activeProvider = null
  #eventBus = null

  constructor(eventBus) {
    this.#eventBus = eventBus
    this.register(MockProvider)
  }

  /**
   * Register a payment provider
   * @param {typeof PaymentProvider} ProviderClass
   * @returns {object}
   */
  register(ProviderClass) {
    if (!ProviderClass?.id) return { success: false, error: 'Provider must have an id' }

    this.#providers.set(ProviderClass.id, ProviderClass)
    return { success: true, providerId: ProviderClass.id }
  }

  /**
   * Set active provider
   * @param {string} providerId
   * @returns {object}
   */
  setActive(providerId) {
    const ProviderClass = this.#providers.get(providerId)
    if (!ProviderClass) return { success: false, error: `Provider ${providerId} not found` }

    this.#activeProvider = new ProviderClass()
    return { success: true, providerId }
  }

  /**
   * Get active provider instance
   * @returns {PaymentProvider|null}
   */
  getActive() {
    return this.#activeProvider
  }

  /**
   * Get active provider ID
   * @returns {string|null}
   */
  getActiveProviderId() {
    return this.#activeProvider?.constructor?.id || null
  }

  /**
   * Get all registered providers
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.#providers.entries()).map(([id, cls]) => ({
      id,
      name: cls.name,
    }))
  }

  /**
   * Check if a provider is registered
   * @param {string} providerId
   * @returns {boolean}
   */
  has(providerId) {
    return this.#providers.has(providerId)
  }

  /**
   * Create payment through active provider
   * @param {object} data
   * @returns {object}
   */
  async createPayment(data) {
    if (!this.#activeProvider) return { success: false, error: 'No active payment provider' }
    return this.#activeProvider.createPayment(data)
  }

  /**
   * Check payment status through active provider
   * @param {string} externalId
   * @returns {object}
   */
  async checkStatus(externalId) {
    if (!this.#activeProvider) return { success: false, error: 'No active payment provider' }
    return this.#activeProvider.checkStatus(externalId)
  }

  /**
   * Cancel payment through active provider
   * @param {string} externalId
   * @returns {object}
   */
  async cancelPayment(externalId) {
    if (!this.#activeProvider) return { success: false, error: 'No active payment provider' }
    return this.#activeProvider.cancelPayment(externalId)
  }

  /**
   * Refund payment through active provider
   * @param {string} externalId
   * @param {number} amount
   * @returns {object}
   */
  async refundPayment(externalId, amount) {
    if (!this.#activeProvider) return { success: false, error: 'No active payment provider' }
    return this.#activeProvider.refundPayment(externalId, amount)
  }
}
