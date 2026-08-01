/**
 * Lead Score — Analyze potential customers
 *
 * Business-agnostic: scores leads based on engagement signals
 * No direct capability imports — uses context.capabilities.get()
 */
import { validateLeadScore } from '../conversion.schema.js'
import { CONVERSION_EVENTS } from '../conversion.events.js'

export class LeadScore {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Calculate score for a lead
   * @param {object} leadData - { leadId, customerId?, dates?, channel?, messages? }
   * @returns {object} - { leadId, score, opportunityLevel, recommendedAction, signals }
   */
  calculate(leadData) {
    const tenantId = this.#context?.tenant?.id
    const signals = this.#analyzeSignals(leadData)
    const score = this.#computeScore(signals)
    const opportunityLevel = this.#determineLevel(score)
    const recommendedAction = this.#recommendAction(score, signals)

    const result = {
      leadId: leadData.leadId || `lead_${Date.now()}`,
      tenantId,
      score,
      opportunityLevel,
      recommendedAction,
      signals,
      calculatedAt: new Date().toISOString(),
    }

    this.#context?.eventBus?.emit(CONVERSION_EVENTS.LEAD_CREATED, { lead: result })

    return result
  }

  /**
   * Score multiple leads
   * @param {object[]} leads
   * @returns {object[]}
   */
  scoreBatch(leads) {
    return leads.map(lead => this.calculate(lead))
  }

  /**
   * Get high-priority leads
   * @param {object[]} leads
   * @returns {object[]}
   */
  getHighPriority(leads) {
    return this.scoreBatch(leads).filter(l => l.score >= 70)
  }

  // ── Signal Analysis ──

  #analyzeSignals(leadData) {
    const signals = []

    if (leadData.dates) {
      signals.push({ type: 'requested_dates', weight: 15, value: leadData.dates })
    }

    const availability = this.#context?.capabilities?.get?.('availability')
    if (availability && leadData.dates) {
      const startDate = leadData.dates.checkIn || leadData.dates.start
      const endDate = leadData.dates.checkOut || leadData.dates.end
      if (startDate && endDate) {
        const avail = availability.getAvailability(startDate, endDate)
        if (avail.length > 0) {
          signals.push({ type: 'availability_match', weight: 20, value: true })
        } else {
          signals.push({ type: 'availability_mismatch', weight: -10, value: true })
        }
      }
    }

    if (leadData.messages !== undefined) {
      if (leadData.messages > 3) {
        signals.push({ type: 'high_frequency', weight: 20 })
      } else if (leadData.messages > 0) {
        signals.push({ type: 'moderate_frequency', weight: 10 })
      }
    }

    if (leadData.unansweredMessages > 0) {
      signals.push({ type: 'unanswered_messages', weight: -15 })
    }

    if (leadData.abandoned) {
      signals.push({ type: 'reservation_abandoned', weight: -20 })
    }

    if (leadData.seasonalInterest) {
      signals.push({ type: 'seasonal_interest', weight: 10 })
    }

    if (leadData.isReturning) {
      signals.push({ type: 'returning_lead', weight: 25 })
    }

    return signals
  }

  // ── Score Computation ──

  #computeScore(signals) {
    let score = 50
    for (const signal of signals) {
      score += signal.weight
    }
    return Math.max(0, Math.min(100, Math.round(score)))
  }

  // ── Level Determination ──

  #determineLevel(score) {
    if (score >= 80) return 'hot'
    if (score >= 60) return 'warm'
    if (score >= 40) return 'lukewarm'
    return 'cold'
  }

  // ── Action Recommendation ──

  #recommendAction(score, signals) {
    const hasAvailabilityMatch = signals.some(s => s.type === 'availability_match')
    const hasAbandonment = signals.some(s => s.type === 'reservation_abandoned')
    const hasInactive = signals.some(s => s.type === 'unanswered_messages')

    if (hasAbandonment) return 'send_recovery_message'
    if (score >= 80 && hasAvailabilityMatch) return 'send_reservation_offer'
    if (score >= 60) return 'send_followup_message'
    if (hasInactive) return 're_engage_lead'
    if (score < 30) return 'nurture_lead'
    return 'continue_engagement'
  }
}
