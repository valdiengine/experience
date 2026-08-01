/**
 * Opportunity Score — Detect conversion opportunities
 *
 * Business-agnostic: identifies opportunities from availability, demand, customer behavior
 * No direct capability imports — uses context.capabilities.get()
 */
import { OPPORTUNITY_TYPE, OPPORTUNITY_PRIORITY, validateOpportunity } from '../conversion.schema.js'
import { CONVERSION_EVENTS } from '../conversion.events.js'

export class OpportunityScore {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Detect all opportunities
   * @returns {object[]}
   */
  detectAll() {
    const opportunities = []

    opportunities.push(...this.#detectDateMismatches())
    opportunities.push(...this.#detectInactiveCustomers())
    opportunities.push(...this.#detectEmptyDates())
    opportunities.push(...this.#detectLikelyReturns())
    opportunities.push(...this.#detectHighDemandApproaching())
    opportunities.push(...this.#detectAbandonedReservations())

    for (const opp of opportunities) {
      this.#context?.eventBus?.emit(CONVERSION_EVENTS.OPPORTUNITY_DETECTED, { opportunity: opp })
    }

    return opportunities
  }

  /**
   * Get opportunities by priority
   * @param {string} priority
   * @returns {object[]}
   */
  getByPriority(priority) {
    return this.detectAll().filter(o => o.priority === priority)
  }

  /**
   * Get opportunities by type
   * @param {string} type
   * @returns {object[]}
   */
  getByType(type) {
    return this.detectAll().filter(o => o.type === type)
  }

  // ── Detection Methods ──

  #detectDateMismatches() {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    if (!reservation) return []

    const all = reservation.getAll() || []
    const expired = all.filter(r => r.status === 'expired')

    return expired.map(r => this.#createOpportunity({
      type: OPPORTUNITY_TYPE.DATE_MISMATCH,
      priority: OPPORTUNITY_PRIORITY.MEDIUM,
      customerId: r.customer?.email || r.customer?.name,
      suggestedAction: 'Contact customer to find alternative dates',
      metadata: { reservationId: r.id, originalDates: r.dates },
    }))
  }

  #detectInactiveCustomers() {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    if (!reservation) return []

    const all = reservation.getAll() || []
    const now = Date.now()
    const ninetyDays = 90 * 86400000

    const customerMap = new Map()
    for (const r of all) {
      if (!r.customer?.name) continue
      const key = r.customer.email || r.customer.name
      const existing = customerMap.get(key)
      if (!existing || new Date(r.createdAt).getTime() > existing.lastDate) {
        customerMap.set(key, {
          name: r.customer.name,
          email: r.customer.email,
          lastDate: new Date(r.createdAt).getTime(),
          reservations: (existing?.reservations || 0) + 1,
        })
      }
    }

    const inactive = []
    for (const [key, data] of customerMap) {
      if (now - data.lastDate > ninetyDays && data.reservations >= 1) {
        inactive.push(this.#createOpportunity({
          type: OPPORTUNITY_TYPE.CUSTOMER_INACTIVE,
          priority: OPPORTUNITY_PRIORITY.LOW,
          customerId: key,
          suggestedAction: 'Send re-engagement campaign',
          metadata: { lastDate: new Date(data.lastDate).toISOString(), totalReservations: data.reservations },
        }))
      }
    }

    return inactive
  }

  #detectEmptyDates() {
    const intelligence = this.#context?.capabilities?.get?.('intelligence')
    if (!intelligence) return []

    const today = new Date()
    const end = new Date(today)
    end.setMonth(end.getMonth() + 1)
    const startDate = today.toISOString().split('T')[0]
    const endDate = end.toISOString().split('T')[0]

    const opportunities = intelligence.opportunityEngine?.findAll(startDate, endDate) || []

    return opportunities
      .filter(o => o.type === 'empty_period' && o.days >= 7)
      .map(o => this.#createOpportunity({
        type: OPPORTUNITY_TYPE.EMPTY_DATES,
        priority: OPPORTUNITY_PRIORITY.HIGH,
        suggestedAction: 'Request availability update or create promotion',
        metadata: { days: o.days, startDate: o.startDate, endDate: o.endDate },
      }))
  }

  #detectLikelyReturns() {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    if (!reservation) return []

    const all = reservation.getAll() || []
    const now = Date.now()
    const sixMonths = 180 * 86400000

    const customerMap = new Map()
    for (const r of all) {
      if (!r.customer?.name) continue
      const key = r.customer.email || r.customer.name
      const existing = customerMap.get(key) || { count: 0, completed: 0, lastDate: 0 }
      existing.count++
      if (r.status === 'confirmed' || r.status === 'completed') existing.completed++
      const created = new Date(r.createdAt).getTime()
      if (created > existing.lastDate) existing.lastDate = created
      customerMap.set(key, existing)
    }

    const likely = []
    for (const [key, data] of customerMap) {
      if (data.completed >= 2 && now - data.lastDate > sixMonths) {
        likely.push(this.#createOpportunity({
          type: OPPORTUNITY_TYPE.LIKELY_RETURN,
          priority: OPPORTUNITY_PRIORITY.MEDIUM,
          customerId: key,
          suggestedAction: 'Send personalized return offer',
          metadata: { completedReservations: data.completed, lastDate: new Date(data.lastDate).toISOString() },
        }))
      }
    }

    return likely
  }

  #detectHighDemandApproaching() {
    const intelligence = this.#context?.capabilities?.get?.('intelligence')
    if (!intelligence) return []

    const today = new Date()
    const end = new Date(today)
    end.setMonth(end.getMonth() + 2)
    const startDate = today.toISOString().split('T')[0]
    const endDate = end.toISOString().split('T')[0]

    const insights = intelligence.getInsights?.() || []
    const highDemand = insights.filter(i =>
      i.demandSignals?.some(s => s.level === 'high' || s.level === 'very_high')
    )

    return highDemand.map(i => this.#createOpportunity({
      type: OPPORTUNITY_TYPE.HIGH_DEMAND_APPROACHING,
      priority: OPPORTUNITY_PRIORITY.HIGH,
      suggestedAction: 'Prioritize reservations and adjust pricing',
      metadata: { resourceId: i.resourceId, insightId: i.id },
    }))
  }

  #detectAbandonedReservations() {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    if (!reservation) return []

    const all = reservation.getAll() || []
    const abandoned = all.filter(r => r.status === 'requested' || r.status === 'owner_pending')

    return abandoned.map(r => this.#createOpportunity({
      type: OPPORTUNITY_TYPE.ABANDONED_RESERVATION,
      priority: OPPORTUNITY_PRIORITY.HIGH,
      customerId: r.customer?.email || r.customer?.name,
      suggestedAction: 'Send follow-up to complete reservation',
      metadata: { reservationId: r.id, status: r.status, createdAt: r.createdAt },
    }))
  }

  // ── Helper ──

  #createOpportunity(data) {
    const opp = {
      id: `opp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId: this.#context?.tenant?.id,
      type: data.type,
      priority: data.priority,
      customerId: data.customerId || null,
      suggestedAction: data.suggestedAction,
      metadata: data.metadata || {},
      detectedAt: new Date().toISOString(),
    }

    validateOpportunity(opp)
    return opp
  }
}
