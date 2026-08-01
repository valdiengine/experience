/**
 * Conversion Manager — Orchestrates all conversion sub-modules
 *
 * Business-agnostic: coordinates scoring, recovery, follow-up, retention, analytics
 * No direct capability imports — uses context.capabilities.get()
 */
import { CustomerScore } from './scoring/customer.score.js'
import { LeadScore } from './scoring/lead.score.js'
import { OpportunityScore } from './scoring/opportunity.score.js'
import { RecoveryEngine } from './automation/recovery.engine.js'
import { FollowUpEngine } from './automation/followup.engine.js'
import { RetentionEngine } from './automation/retention.engine.js'
import { ConversionAnalytics } from './analytics/conversion.analytics.js'
import { CONVERSION_EVENTS } from './conversion.events.js'

export class ConversionManager {
  #context = null
  #customerScore = null
  #leadScore = null
  #opportunityScore = null
  #recovery = null
  #followup = null
  #retention = null
  #analytics = null

  constructor(context) {
    this.#context = context
    this.#customerScore = new CustomerScore(context)
    this.#leadScore = new LeadScore(context)
    this.#opportunityScore = new OpportunityScore(context)
    this.#recovery = new RecoveryEngine(context)
    this.#followup = new FollowUpEngine(context)
    this.#retention = new RetentionEngine(context)
    this.#analytics = new ConversionAnalytics(context)
  }

  // ── Getters ──

  get customerScore() { return this.#customerScore }
  get leadScore() { return this.#leadScore }
  get opportunityScore() { return this.#opportunityScore }
  get recovery() { return this.#recovery }
  get followup() { return this.#followup }
  get retention() { return this.#retention }
  get analytics() { return this.#analytics }

  // ── Lifecycle ──

  init() {
    this.#subscribeToEvents()
  }

  // ── Event Processing ──

  async onReservationCreated(reservation) {
    const customerId = reservation.customer?.email || reservation.customer?.name
    if (customerId) {
      const score = this.#customerScore.calculate(customerId)
      this.#context?.eventBus?.emit(CONVERSION_EVENTS.SCORE_UPDATED, { score })

      if (score.category === 'new') {
        await this.#followup.sendInquiryFollowUp({
          customerId,
          customerName: reservation.customer?.name,
          dates: reservation.dates,
          channel: reservation.customer?.channelPreference || 'email',
        })
      }
    }

    const leadScore = this.#leadScore.calculate({
      leadId: customerId,
      dates: reservation.dates,
      channel: reservation.customer?.channelPreference,
    })
    this.#context?.eventBus?.emit(CONVERSION_EVENTS.LEAD_CREATED, { lead: leadScore })
  }

  async onReservationExpired(reservation) {
    this.#analytics.recordAbandoned()
    await this.#recovery.recoverReservation(reservation)

    await this.#followup.sendExpirationFollowUp({
      customerId: reservation.customer?.email || reservation.customer?.name,
      customerName: reservation.customer?.name,
      reservationId: reservation.id,
      dates: reservation.dates,
      channel: reservation.customer?.channelPreference || 'email',
    })
  }

  async onReservationCompleted(reservation) {
    await this.#retention.onReservationCompleted(reservation)
    this.#analytics.recordRepeatCustomer()
  }

  async onReservationCancelled(reservation) {
    const customerId = reservation.customer?.email || reservation.customer?.name
    if (customerId) {
      await this.#followup.sendNoResponseFollowUp({
        customerId,
        customerName: reservation.customer?.name,
        channel: reservation.customer?.channelPreference || 'email',
      })
    }
  }

  // ── Detection ──

  async detectAllOpportunities() {
    const opportunities = this.#opportunityScore.detectAll()

    for (const opp of opportunities) {
      if (opp.type === 'abandoned_reservation' && opp.customerId) {
        await this.#recovery.recoverReservation({ id: opp.metadata?.reservationId, customer: { name: opp.customerId } })
      }
    }

    return opportunities
  }

  // ── Scoring ──

  scoreCustomer(customerId) {
    return this.#customerScore.calculate(customerId)
  }

  scoreLead(leadData) {
    return this.#leadScore.calculate(leadData)
  }

  getOpportunities() {
    return this.#opportunityScore.detectAll()
  }

  // ── Retention ──

  async sendReturnCampaign() {
    return this.#retention.sendReturnCampaign()
  }

  getReturningCustomers() {
    return this.#retention.detectReturningCustomers()
  }

  // ── Analytics ──

  getConversionMetrics() {
    return this.#analytics.getSummary()
  }

  // ── Event Subscription ──

  #subscribeToEvents() {
    const eventBus = this.#context?.eventBus
    if (!eventBus) return

    eventBus.on('reservation:created', (data) => {
      if (data.reservation) this.onReservationCreated(data.reservation)
    })

    eventBus.on('reservation:expired', (data) => {
      if (data.reservation) this.onReservationExpired(data.reservation)
    })

    eventBus.on('reservation:completed', (data) => {
      if (data.reservation) this.onReservationCompleted(data.reservation)
    })

    eventBus.on('reservation:cancelled', (data) => {
      if (data.reservation) this.onReservationCancelled(data.reservation)
    })
  }
}
