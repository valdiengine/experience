/**
 * Conversion Analytics — Metrics tracking for conversion system
 *
 * Business-agnostic: tracks conversion rates, recovery, retention, response times
 * Uses ObservabilityCapability for metrics storage — no independent analytics storage
 */
import { CONVERSION_EVENTS } from '../conversion.events.js'

export class ConversionAnalytics {
  #context = null
  #metrics = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Record a conversion metric
   * @param {object} metric - { category, name, value, metadata? }
   */
  record(metric) {
    const entry = {
      id: `conv_metric_${Date.now()}`,
      tenantId: this.#context?.tenant?.id,
      category: metric.category,
      name: metric.name,
      value: metric.value || 1,
      metadata: metric.metadata || {},
      timestamp: new Date().toISOString(),
    }

    const key = `${entry.tenantId}:${entry.category}:${entry.name}`
    const existing = this.#metrics.get(key) || { total: 0, count: 0 }
    existing.total += entry.value
    existing.count += 1
    existing.lastRecorded = entry.timestamp
    this.#metrics.set(key, existing)

    this.#forwardToObservability(entry)
    this.#context?.eventBus?.emit(CONVERSION_EVENTS.METRIC_RECORDED, { metric: entry })
  }

  /**
   * Increment a counter
   * @param {string} category
   * @param {string} name
   * @param {number} amount
   */
  increment(category, name, amount = 1) {
    this.record({ category, name, value: amount })
  }

  /**
   * Get conversion summary
   * @returns {object}
   */
  getSummary() {
    const tenantId = this.#context?.tenant?.id
    return {
      inquiryToReservationRate: this.#getMetric(tenantId, 'conversion', 'inquiry_to_reservation'),
      abandonedReservations: this.#getMetric(tenantId, 'recovery', 'abandoned'),
      recoveredReservations: this.#getMetric(tenantId, 'recovery', 'recovered'),
      repeatCustomerRate: this.#getMetric(tenantId, 'retention', 'repeat_rate'),
      campaignConversionRate: this.#getMetric(tenantId, 'campaign', 'conversion'),
      responseTime: this.#getMetric(tenantId, 'response', 'time'),
      ownerResponseRate: this.#getMetric(tenantId, 'response', 'owner_rate'),
    }
  }

  /**
   * Get all metrics
   * @returns {object[]}
   */
  getAll() {
    const tenantId = this.#context?.tenant?.id
    const results = []
    for (const [key, value] of this.#metrics) {
      if (!key.startsWith(tenantId)) continue
      const parts = key.split(':')
      results.push({ category: parts[1], name: parts[2], ...value })
    }
    return results
  }

  /**
   * Record inquiry to reservation conversion
   * @param {boolean} converted
   */
  recordInquiryConversion(converted) {
    this.record({ category: 'conversion', name: 'inquiry_to_reservation', value: converted ? 1 : 0 })
  }

  /**
   * Record abandoned reservation
   */
  recordAbandoned() {
    this.record({ category: 'recovery', name: 'abandoned' })
  }

  /**
   * Record recovered reservation
   */
  recordRecovered() {
    this.record({ category: 'recovery', name: 'recovered' })
  }

  /**
   * Record repeat customer
   */
  recordRepeatCustomer() {
    this.record({ category: 'retention', name: 'repeat_rate' })
  }

  /**
   * Record campaign conversion
   * @param {boolean} converted
   */
  recordCampaignConversion(converted) {
    this.record({ category: 'campaign', name: 'conversion', value: converted ? 1 : 0 })
  }

  /**
   * Record response time
   * @param {number} minutes
   */
  recordResponseTime(minutes) {
    this.record({ category: 'response', name: 'time', value: minutes })
  }

  /**
   * Record owner response
   */
  recordOwnerResponse() {
    this.record({ category: 'response', name: 'owner_rate' })
  }

  // ── Private Methods ──

  #getMetric(tenantId, category, name) {
    const key = `${tenantId}:${category}:${name}`
    const metric = this.#metrics.get(key)
    if (!metric) return { total: 0, count: 0 }
    return metric
  }

  #forwardToObservability(metric) {
    const observability = this.#context?.capabilities?.get?.('observability')
    if (observability) {
      observability.recordMetric({
        tenantId: metric.tenantId,
        category: 'conversion',
        type: 'counter',
        name: `${metric.category}.${metric.name}`,
        value: metric.value,
        metadata: metric.metadata,
      })
    }
  }
}
