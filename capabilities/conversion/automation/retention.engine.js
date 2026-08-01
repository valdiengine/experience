/**
 * Retention Engine — Transform customers into repeat customers
 *
 * Business-agnostic: feedback requests, returning customer detection, future campaigns
 * No direct capability imports — uses context.capabilities.get()
 */
import { CONVERSION_EVENTS } from '../conversion.events.js'

export class RetentionEngine {
  #context = null
  #returningProfiles = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Handle completed reservation — start retention process
   * @param {object} reservation
   * @returns {object}
   */
  async onReservationCompleted(reservation) {
    const customerId = reservation.customer?.email || reservation.customer?.name
    if (!customerId) return { success: false, error: 'No customer identified' }

    this.#createReturningProfile(customerId, reservation)

    await this.#requestFeedback(reservation)
    await this.#detectFutureTravelPeriod(customerId, reservation)

    this.#context?.eventBus?.emit(CONVERSION_EVENTS.RETURNING_CUSTOMER_DETECTED, {
      customerId,
      reservationId: reservation.id,
    })

    return { success: true, customerId }
  }

  /**
   * Detect likely returning customers
   * @returns {object[]}
   */
  detectReturningCustomers() {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    if (!reservation) return []

    const all = reservation.getAll() || []
    const now = Date.now()
    const sixMonths = 180 * 86400000

    const customerMap = new Map()
    for (const r of all) {
      if (!r.customer?.name) continue
      const key = r.customer.email || r.customer.name
      const existing = customerMap.get(key) || { reservations: 0, completed: 0, lastDate: 0, customer: r.customer }
      existing.reservations++
      if (['confirmed', 'completed'].includes(r.status)) existing.completed++
      const created = new Date(r.createdAt).getTime()
      if (created > existing.lastDate) existing.lastDate = created
      customerMap.set(key, existing)
    }

    const returning = []
    for (const [key, data] of customerMap) {
      if (data.completed >= 2 && now - data.lastDate > sixMonths) {
        returning.push({
          customerId: key,
          customer: data.customer,
          completedReservations: data.completed,
          lastDate: new Date(data.lastDate).toISOString(),
          daysSinceLastVisit: Math.floor((now - data.lastDate) / 86400000),
        })
      }
    }

    return returning
  }

  /**
   * Send return campaign to likely returning customers
   * @returns {object[]}
   */
  async sendReturnCampaign() {
    const returning = this.detectReturningCustomers()
    const results = []

    for (const customer of returning) {
      const sent = await this.#sendReturnMessage(customer)
      results.push({ customerId: customer.customerId, sent })
    }

    return results
  }

  /**
   * Get returning customer profiles
   * @returns {object[]}
   */
  getReturningProfiles() {
    return Array.from(this.#returningProfiles.values())
  }

  /**
   * Get retention stats
   * @returns {object}
   */
  getStats() {
    const profiles = this.getReturningProfiles()
    return {
      totalProfiles: profiles.length,
      active: profiles.filter(p => p.status === 'active').length,
      engaged: profiles.filter(p => p.status === 'engaged').length,
      dormant: profiles.filter(p => p.status === 'dormant').length,
    }
  }

  // ── Internal Methods ──

  #createReturningProfile(customerId, reservation) {
    const existing = this.#returningProfiles.get(customerId) || {
      customerId,
      tenantId: this.#context?.tenant?.id,
      customer: reservation.customer,
      reservations: 0,
      completed: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
    }

    existing.reservations++
    if (['confirmed', 'completed'].includes(reservation.status)) existing.completed++
    existing.lastReservationAt = new Date().toISOString()
    existing.updatedAt = new Date().toISOString()

    if (existing.completed >= 2) {
      existing.status = 'engaged'
    }

    this.#returningProfiles.set(customerId, existing)
  }

  async #requestFeedback(reservation) {
    const communication = this.#context?.capabilities?.get?.('communication')
    if (!communication) return

    const customer = reservation.customer
    const recipient = customer?.email || customer?.phone
    if (!recipient) return

    await communication.send({
      channel: 'email',
      recipient,
      body: `Hello ${customer?.name || 'there'}, we hope you enjoyed your stay! Could you share your feedback? Your opinion helps us improve.`,
    })
  }

  async #detectFutureTravelPeriod(customerId, reservation) {
    const profile = this.#returningProfiles.get(customerId)
    if (!profile) return

    if (reservation.dates?.checkIn) {
      const checkIn = new Date(reservation.dates.checkIn)
      const month = checkIn.getMonth()
      profile.likelyTravelMonth = month
      profile.likelyTravelSeason = this.#getSeason(month)
    }
  }

  async #sendReturnMessage(customer) {
    const communication = this.#context?.capabilities?.get?.('communication')
    if (!communication) return false

    const recipient = customer.customer?.email || customer.customer?.phone
    if (!recipient) return false

    const season = customer.likelyTravelSeason ? ` for ${customer.likelyTravelSeason}` : ''
    const body = `Hello ${customer.customer?.name || 'there'}, we miss you! It's been a while since your last visit. We have new availability${season} — come check it out!`

    const result = await communication.send({
      channel: 'email',
      recipient,
      body,
    })

    return result.success
  }

  #getSeason(month) {
    if (month >= 2 && month <= 4) return 'spring'
    if (month >= 5 && month <= 7) return 'summer'
    if (month >= 8 && month <= 10) return 'autumn'
    return 'winter'
  }
}
