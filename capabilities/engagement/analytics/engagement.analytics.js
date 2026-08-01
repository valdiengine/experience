/**
 * Engagement Analytics — Metrics tracking for engagement system
 *
 * Business-agnostic: tracks messages, responses, conversion, campaigns
 * Uses ObservabilityCapability for metrics storage — no independent analytics storage
 */
import { ENGAGEMENT_EVENTS } from '../engagement.events.js'

export class EngagementAnalytics {
  #context = null
  #metrics = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Record an engagement metric
   * @param {object} metric - { category, name, value, metadata? }
   */
  record(metric) {
    const entry = {
      id: `eng_metric_${Date.now()}`,
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

    this.#context?.eventBus?.emit(ENGAGEMENT_EVENTS.METRIC_RECORDED, { metric: entry })
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
   * Get metrics summary for a tenant
   * @returns {object}
   */
  getSummary() {
    const tenantId = this.#context?.tenant?.id
    const summary = {
      messages: { sent: 0, opened: 0, responded: 0 },
      campaigns: { active: 0, completed: 0 },
      availability: { requested: 0, received: 0 },
      conversion: { reservations: 0, fromCampaign: 0 },
      journeys: { created: 0, completed: 0 },
    }

    for (const [key, value] of this.#metrics) {
      if (!key.startsWith(tenantId)) continue

      const parts = key.split(':')
      const category = parts[1]
      const name = parts[2]

      switch (category) {
        case 'message':
          if (name === 'sent') summary.messages.sent = value.total
          if (name === 'opened') summary.messages.opened = value.total
          if (name === 'responded') summary.messages.responded = value.total
          break
        case 'campaign':
          if (name === 'active') summary.campaigns.active = value.total
          if (name === 'completed') summary.campaigns.completed = value.total
          break
        case 'availability':
          if (name === 'requested') summary.availability.requested = value.total
          if (name === 'received') summary.availability.received = value.total
          break
        case 'conversion':
          if (name === 'reservation') summary.conversion.reservations = value.total
          if (name === 'from_campaign') summary.conversion.fromCampaign = value.total
          break
        case 'journey':
          if (name === 'created') summary.journeys.created = value.total
          if (name === 'completed') summary.journeys.completed = value.total
          break
      }
    }

    return summary
  }

  /**
   * Get metric by category and name
   * @param {string} category
   * @param {string} name
   * @returns {object}
   */
  getMetric(category, name) {
    const tenantId = this.#context?.tenant?.id
    const key = `${tenantId}:${category}:${name}`
    return this.#metrics.get(key) || { total: 0, count: 0 }
  }

  /**
   * Get all metrics for a tenant
   * @returns {object[]}
   */
  getAll() {
    const tenantId = this.#context?.tenant?.id
    const results = []
    for (const [key, value] of this.#metrics) {
      if (!key.startsWith(tenantId)) continue
      const parts = key.split(':')
      results.push({
        category: parts[1],
        name: parts[2],
        ...value,
      })
    }
    return results
  }

  /**
   * Record message sent
   * @param {string} channel
   */
  recordMessageSent(channel) {
    this.record({ category: 'message', name: 'sent', metadata: { channel } })
  }

  /**
   * Record message opened
   * @param {string} channel
   */
  recordMessageOpened(channel) {
    this.record({ category: 'message', name: 'opened', metadata: { channel } })
  }

  /**
   * Record message responded
   * @param {string} channel
   */
  recordMessageResponded(channel) {
    this.record({ category: 'message', name: 'responded', metadata: { channel } })
  }

  /**
   * Record availability request
   */
  recordAvailabilityRequested() {
    this.record({ category: 'availability', name: 'requested' })
  }

  /**
   * Record availability response
   */
  recordAvailabilityReceived() {
    this.record({ category: 'availability', name: 'received' })
  }

  /**
   * Record reservation from engagement
   * @param {string} source
   */
  recordConversion(source) {
    this.record({ category: 'conversion', name: 'reservation', metadata: { source } })
    if (source === 'campaign') {
      this.record({ category: 'conversion', name: 'from_campaign' })
    }
  }

  // ── Forward to Observability ──

  #forwardToObservability(metric) {
    const observability = this.#context?.capabilities?.get?.('observability')
    if (observability) {
      observability.recordMetric({
        tenantId: metric.tenantId,
        category: 'engagement',
        type: 'counter',
        name: `${metric.category}.${metric.name}`,
        value: metric.value,
        metadata: metric.metadata,
      })
    }
  }
}
