/**
 * Customer Score — Calculate customer value and engagement level
 *
 * Business-agnostic: works with any reservation-based business
 * No direct capability imports — uses context.capabilities.get()
 */
import { CUSTOMER_CATEGORY, validateCustomerScore } from '../conversion.schema.js'

export class CustomerScore {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Calculate score for a customer
   * @param {string} customerId
   * @returns {object} - { customerId, score, category, signals[], metrics }
   */
  calculate(customerId) {
    const tenantId = this.#context?.tenant?.id
    const metrics = this.#gatherMetrics(customerId)
    const signals = this.#analyzeSignals(metrics)
    const score = this.#computeScore(metrics, signals)
    const category = this.#categorize(score, metrics)

    const result = {
      customerId,
      tenantId,
      score,
      category,
      signals,
      metrics,
      calculatedAt: new Date().toISOString(),
    }

    return result
  }

  /**
   * Calculate scores for all customers
   * @returns {object[]}
   */
  calculateAll() {
    const customers = this.#getCustomers()
    return customers.map(c => this.calculate(c.id || c.name))
  }

  /**
   * Get customers by category
   * @param {string} category
   * @returns {object[]}
   */
  getByCategory(category) {
    return this.calculateAll().filter(c => c.category === category)
  }

  // ── Metrics Gathering ──

  #gatherMetrics(customerId) {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    const all = reservation?.getAll?.() || []

    const customerReservations = all.filter(r =>
      r.customer?.email === customerId ||
      r.customer?.phone === customerId ||
      r.customer?.name === customerId
    )

    const now = Date.now()
    const completed = customerReservations.filter(r => r.status === 'confirmed' || r.status === 'completed')
    const cancelled = customerReservations.filter(r => r.status === 'cancelled')
    const expired = customerReservations.filter(r => r.status === 'expired')
    const lastReservation = customerReservations[customerReservations.length - 1]
    const lastInteraction = lastReservation ? new Date(lastReservation.createdAt).getTime() : 0
    const daysSinceLastInteraction = lastInteraction ? Math.floor((now - lastInteraction) / 86400000) : null

    const communication = this.#context?.capabilities?.get?.('communication')
    const messages = communication?.getMessages?.() || []
    const customerMessages = messages.filter(m => m.recipient === customerId)

    return {
      totalReservations: customerReservations.length,
      completedReservations: completed.length,
      cancelledReservations: cancelled.length,
      expiredReservations: expired.length,
      lastInteraction,
      daysSinceLastInteraction,
      messagesSent: customerMessages.length,
      responseRate: customerMessages.length > 0 ? 0.5 : 0,
      isRepeatCustomer: completed.length > 1,
    }
  }

  // ── Signal Analysis ──

  #analyzeSignals(metrics) {
    const signals = []

    if (metrics.totalReservations === 0) {
      signals.push({ type: 'new_customer', weight: 10 })
    }

    if (metrics.completedReservations >= 2) {
      signals.push({ type: 'repeat_customer', weight: 30 })
    }

    if (metrics.cancelledReservations > 0) {
      signals.push({ type: 'has_cancellations', weight: -10 })
    }

    if (metrics.expiredReservations > 0) {
      signals.push({ type: 'has_expired', weight: -15 })
    }

    if (metrics.daysSinceLastInteraction !== null) {
      if (metrics.daysSinceLastInteraction < 30) {
        signals.push({ type: 'recent_activity', weight: 20 })
      } else if (metrics.daysSinceLastInteraction < 90) {
        signals.push({ type: 'moderate_recency', weight: 10 })
      } else if (metrics.daysSinceLastInteraction > 180) {
        signals.push({ type: 'long_inactive', weight: -20 })
      }
    }

    if (metrics.messagesSent > 5) {
      signals.push({ type: 'high_engagement', weight: 15 })
    }

    if (metrics.isRepeatCustomer) {
      signals.push({ type: 'loyal_customer', weight: 25 })
    }

    return signals
  }

  // ── Score Computation ──

  #computeScore(metrics, signals) {
    let score = 50

    for (const signal of signals) {
      score += signal.weight
    }

    if (metrics.completedReservations >= 3) score += 10
    if (metrics.completedReservations >= 5) score += 10

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  // ── Categorization ──

  #categorize(score, metrics) {
    if (metrics.totalReservations === 0) return CUSTOMER_CATEGORY.NEW
    if (score >= 80) return CUSTOMER_CATEGORY.RETURNING
    if (score >= 60) return CUSTOMER_CATEGORY.HIGH_PROBABILITY
    if (score >= 30) return CUSTOMER_CATEGORY.INTERESTED
    return CUSTOMER_CATEGORY.INACTIVE
  }

  // ── Helpers ──

  #getCustomers() {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    const all = reservation?.getAll?.() || []
    const customerMap = new Map()
    for (const r of all) {
      if (r.customer?.name) {
        const key = r.customer.email || r.customer.phone || r.customer.name
        customerMap.set(key, {
          id: key,
          name: r.customer.name,
          email: r.customer.email,
          phone: r.customer.phone,
        })
      }
    }
    return Array.from(customerMap.values())
  }
}
