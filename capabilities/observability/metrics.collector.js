/**
 * Metrics Collector — Listens to EventBus and records metrics
 *
 * Business-agnostic: collects events from all capabilities via EventBus
 * Stores metrics using DataManager
 * No direct imports from business capabilities
 */
import { METRIC_CATEGORY, METRIC_TYPE, validateMetric } from './observability.schema.js'
import { OBSERVABILITY_EVENTS } from './observability.events.js'

export class MetricsCollector {
  #context = null
  #subscriptions = []
  #counters = new Map()
  #gauges = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Start collecting metrics by subscribing to events
   */
  start() {
    this.#subscribeToReservationEvents()
    this.#subscribeToSchedulerEvents()
    this.#subscribeToNotificationEvents()
    this.#subscribeToCommunicationEvents()
    this.#subscribeToAvailabilityEvents()
    this.#subscribeToSystemEvents()
  }

  /**
   * Stop collecting metrics
   */
  stop() {
    for (const unsub of this.#subscriptions) {
      unsub()
    }
    this.#subscriptions = []
  }

  /**
   * Record a metric
   * @param {object} metric - { tenantId, category, type, name, value, metadata }
   * @returns {object} - { success, id?, errors? }
   */
  record(metric) {
    const id = `metric_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const fullMetric = {
      ...metric,
      id,
      timestamp: new Date().toISOString(),
    }

    const validation = validateMetric(fullMetric)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    this.#persist(fullMetric)
    this.#emit(OBSERVABILITY_EVENTS.METRIC_CREATED, { metric: fullMetric })

    return { success: true, id }
  }

  /**
   * Increment a counter metric
   * @param {string} tenantId
   * @param {string} category
   * @param {string} name
   * @param {number} amount
   */
  increment(tenantId, category, name, amount = 1) {
    const key = `${tenantId}:${category}:${name}`
    const current = this.#counters.get(key) || 0
    this.#counters.set(key, current + amount)

    this.record({
      tenantId,
      category,
      type: METRIC_TYPE.COUNTER,
      name,
      value: current + amount,
    })
  }

  /**
   * Set a gauge metric
   * @param {string} tenantId
   * @param {string} category
   * @param {string} name
   * @param {number} value
   */
  gauge(tenantId, category, name, value) {
    this.#gauges.set(`${tenantId}:${category}:${name}`, value)

    this.record({
      tenantId,
      category,
      type: METRIC_TYPE.GAUGE,
      name,
      value,
    })
  }

  /**
   * Get counter value
   * @param {string} tenantId
   * @param {string} category
   * @param {string} name
   * @returns {number}
   */
  getCounter(tenantId, category, name) {
    return this.#counters.get(`${tenantId}:${category}:${name}`) || 0
  }

  /**
   * Get gauge value
   * @param {string} tenantId
   * @param {string} category
   * @param {string} name
   * @returns {number}
   */
  getGauge(tenantId, category, name) {
    return this.#gauges.get(`${tenantId}:${category}:${name}`) || 0
  }

  /**
   * Get metrics for a tenant
   * @param {string} tenantId
   * @param {object} options - { category, since, limit }
   * @returns {object[]}
   */
  getMetrics(tenantId, options = {}) {
    const all = this.#context?.dataManager?.get('observabilityMetrics') || []
    let filtered = all.filter(m => m.tenantId === tenantId)

    if (options.category) {
      filtered = filtered.filter(m => m.category === options.category)
    }

    if (options.since) {
      const since = new Date(options.since).getTime()
      filtered = filtered.filter(m => new Date(m.timestamp).getTime() >= since)
    }

    if (options.limit) {
      filtered = filtered.slice(-options.limit)
    }

    return filtered
  }

  /**
   * Get aggregated metrics summary for a tenant
   * @param {string} tenantId
   * @returns {object}
   */
  getSummary(tenantId) {
    return {
      reservation: {
        created: this.getCounter(tenantId, METRIC_CATEGORY.RESERVATION, 'created'),
        confirmed: this.getCounter(tenantId, METRIC_CATEGORY.RESERVATION, 'confirmed'),
        cancelled: this.getCounter(tenantId, METRIC_CATEGORY.RESERVATION, 'cancelled'),
        expired: this.getCounter(tenantId, METRIC_CATEGORY.RESERVATION, 'expired'),
      },
      scheduler: {
        executed: this.getCounter(tenantId, METRIC_CATEGORY.SCHEDULER, 'executed'),
        failed: this.getCounter(tenantId, METRIC_CATEGORY.SCHEDULER, 'failed'),
        retried: this.getCounter(tenantId, METRIC_CATEGORY.SCHEDULER, 'retried'),
      },
      notification: {
        sent: this.getCounter(tenantId, METRIC_CATEGORY.NOTIFICATION, 'sent'),
        failed: this.getCounter(tenantId, METRIC_CATEGORY.NOTIFICATION, 'failed'),
      },
      communication: {
        sent: this.getCounter(tenantId, METRIC_CATEGORY.COMMUNICATION, 'sent'),
        failed: this.getCounter(tenantId, METRIC_CATEGORY.COMMUNICATION, 'failed'),
      },
      availability: {
        requested: this.getCounter(tenantId, METRIC_CATEGORY.AVAILABILITY, 'requested'),
        received: this.getCounter(tenantId, METRIC_CATEGORY.AVAILABILITY, 'received'),
      },
    }
  }

  // ── Private: Event Subscriptions ──

  #subscribeToReservationEvents() {
    const events = [
      { event: 'reservation:created', name: 'created', category: METRIC_CATEGORY.RESERVATION },
      { event: 'reservation:confirmed', name: 'confirmed', category: METRIC_CATEGORY.RESERVATION },
      { event: 'reservation:cancelled', name: 'cancelled', category: METRIC_CATEGORY.RESERVATION },
      { event: 'reservation:expired', name: 'expired', category: METRIC_CATEGORY.RESERVATION },
    ]

    for (const { event, name, category } of events) {
      const unsub = this.#on(event, (data) => {
        const tenantId = data?.tenantId || data?.reservation?.tenantId || 'unknown'
        this.increment(tenantId, category, name)
      })
      this.#subscriptions.push(unsub)
    }
  }

  #subscribeToSchedulerEvents() {
    const events = [
      { event: 'scheduler:started', name: 'executed', category: METRIC_CATEGORY.SCHEDULER },
      { event: 'scheduler:failed', name: 'failed', category: METRIC_CATEGORY.SCHEDULER },
      { event: 'scheduler:retry', name: 'retried', category: METRIC_CATEGORY.SCHEDULER },
      { event: 'scheduler:duplicate', name: 'duplicate', category: METRIC_CATEGORY.SCHEDULER },
    ]

    for (const { event, name, category } of events) {
      const unsub = this.#on(event, (data) => {
        const tenantId = data?.tenantId || data?.job?.tenantId || 'unknown'
        this.increment(tenantId, category, name)
      })
      this.#subscriptions.push(unsub)
    }
  }

  #subscribeToNotificationEvents() {
    const events = [
      { event: 'notification:sent', name: 'sent', category: METRIC_CATEGORY.NOTIFICATION },
      { event: 'notification:failed', name: 'failed', category: METRIC_CATEGORY.NOTIFICATION },
    ]

    for (const { event, name, category } of events) {
      const unsub = this.#on(event, (data) => {
        const tenantId = data?.tenantId || 'unknown'
        this.increment(tenantId, category, name)
      })
      this.#subscriptions.push(unsub)
    }
  }

  #subscribeToCommunicationEvents() {
    const events = [
      { event: 'message:sent', name: 'sent', category: METRIC_CATEGORY.COMMUNICATION },
      { event: 'message:failed', name: 'failed', category: METRIC_CATEGORY.COMMUNICATION },
    ]

    for (const { event, name, category } of events) {
      const unsub = this.#on(event, (data) => {
        const tenantId = data?.tenantId || 'unknown'
        this.increment(tenantId, category, name)
      })
      this.#subscriptions.push(unsub)
    }
  }

  #subscribeToAvailabilityEvents() {
    const events = [
      { event: 'availability:requested', name: 'requested', category: METRIC_CATEGORY.AVAILABILITY },
      { event: 'availability:received', name: 'received', category: METRIC_CATEGORY.AVAILABILITY },
    ]

    for (const { event, name, category } of events) {
      const unsub = this.#on(event, (data) => {
        const tenantId = data?.tenantId || 'unknown'
        this.increment(tenantId, category, name)
      })
      this.#subscriptions.push(unsub)
    }
  }

  #subscribeToSystemEvents() {
    const unsub = this.#on('system:error', (data) => {
      const tenantId = data?.tenantId || 'unknown'
      this.increment(tenantId, METRIC_CATEGORY.SYSTEM, 'errors')
    })
    this.#subscriptions.push(unsub)
  }

  // ── Private: Helpers ──

  #persist(metric) {
    if (this.#context?.dataManager) {
      const metrics = this.#context.dataManager.get('observabilityMetrics') || []
      metrics.push(metric)
      this.#context.dataManager.set('observabilityMetrics', metrics)
    }
  }

  #on(event, handler) {
    return this.#context?.eventBus?.on(event, handler) || (() => {})
  }

  #emit(event, data) {
    this.#context?.eventBus?.emit(event, data)
  }
}
