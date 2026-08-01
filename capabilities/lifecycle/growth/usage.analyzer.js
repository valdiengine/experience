/**
 * Usage Analyzer — Analyze customer usage patterns
 *
 * Business-agnostic: tracks and analyzes resource consumption
 */

import { LIFECYCLE_EVENTS } from '../lifecycle.events.js'

export class UsageAnalyzer {
  #usageData = new Map()
  #context = null
  #eventBus = null

  constructor(context) {
    this.#context = context
    this.#eventBus = context.eventBus
  }

  /**
   * Record usage event
   * @param {string} tenantId
   * @param {string} resource - 'reservation', 'message', 'visit', 'availability_request', 'page_view'
   * @param {number} amount
   * @returns {object}
   */
  record(tenantId, resource, amount = 1) {
    if (!this.#usageData.has(tenantId)) {
      this.#usageData.set(tenantId, { resources: {}, totalEvents: 0, firstEvent: new Date().toISOString() })
    }

    const data = this.#usageData.get(tenantId)
    if (!data.resources[resource]) data.resources[resource] = { count: 0, events: [] }

    data.resources[resource].count += amount
    data.resources[resource].events.push({ amount, timestamp: new Date().toISOString() })
    data.totalEvents += amount

    if (data.resources[resource].events.length > 1000) {
      data.resources[resource].events = data.resources[resource].events.slice(-500)
    }

    this.#usageData.set(tenantId, data)
    return { success: true }
  }

  /**
   * Get usage summary for a tenant
   * @param {string} tenantId
   * @returns {object}
   */
  getSummary(tenantId) {
    const data = this.#usageData.get(tenantId)
    if (!data) return { totalEvents: 0, resources: {} }

    const summary = {}
    for (const [resource, info] of Object.entries(data.resources)) {
      summary[resource] = info.count
    }

    return {
      tenantId,
      totalEvents: data.totalEvents,
      resources: summary,
      firstEvent: data.firstEvent,
      lastEvent: this.#getLastEvent(data),
    }
  }

  /**
   * Get usage trend
   * @param {string} tenantId
   * @param {string} resource
   * @param {number} days
   * @returns {object[]}
   */
  getTrend(tenantId, resource, days = 30) {
    const data = this.#usageData.get(tenantId)
    if (!data?.resources?.[resource]) return []

    const cutoff = new Date(Date.now() - days * 86400000)
    const events = data.resources[resource].events.filter(e => new Date(e.timestamp) >= cutoff)

    const daily = {}
    for (const event of events) {
      const day = event.timestamp.split('T')[0]
      daily[day] = (daily[day] || 0) + event.amount
    }

    return Object.entries(daily).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * Analyze upgrade readiness
   * @param {string} tenantId
   * @returns {object}
   */
  analyzeUpgradeReadiness(tenantId) {
    const saas = this.#context?.capabilities?.get?.('saas')
    const summary = this.getSummary(tenantId)

    const signals = []
    let readinessScore = 0

    // Check reservation usage
    if (summary.resources.reservation > 20) {
      signals.push({ type: 'high_reservations', message: 'High reservation volume', impact: 'high' })
      readinessScore += 30
    }

    // Check message usage
    if (summary.resources.message > 50) {
      signals.push({ type: 'high_messages', message: 'Active communication', impact: 'medium' })
      readinessScore += 20
    }

    // Check visit traffic
    if (summary.resources.visit > 100) {
      signals.push({ type: 'high_visits', message: 'Good website traffic', impact: 'medium' })
      readinessScore += 15
    }

    // Check availability requests
    if (summary.resources.availability_request > 10) {
      signals.push({ type: 'high_availability_requests', message: 'High demand for availability', impact: 'high' })
      readinessScore += 25
    }

    // Check plan limits
    if (saas?.checkLimit) {
      const limits = ['pages', 'reservations', 'notifications']
      for (const limit of limits) {
        const check = saas.checkLimit(tenantId, limit)
        if (check.max > 0 && check.percentage >= 70) {
          signals.push({ type: 'limit_near', message: `${limit} at ${check.percentage}%`, impact: 'high' })
          readinessScore += 20
        }
      }
    }

    return {
      tenantId,
      readinessScore: Math.min(100, readinessScore),
      signals,
      summary,
      recommendation: readinessScore >= 50 ? 'upgrade_candidate' : 'not_ready',
    }
  }

  /**
   * Get all usage data
   * @returns {object}
   */
  getAll() {
    const result = {}
    for (const [tenantId, data] of this.#usageData) {
      result[tenantId] = this.getSummary(tenantId)
    }
    return result
  }

  #getLastEvent(data) {
    let last = null
    for (const info of Object.values(data.resources)) {
      const lastEvent = info.events[info.events.length - 1]
      if (lastEvent && (!last || new Date(lastEvent.timestamp) > new Date(last))) {
        last = lastEvent.timestamp
      }
    }
    return last
  }
}
