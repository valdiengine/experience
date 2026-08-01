/**
 * EcoTrust Manager — Quality reputation and anti-gaming protection
 */
import { ENGAGEMENT_EVENTS } from './engagement.events.js'

const TRUST_DECAY = {
  false_report: -20,
  duplicate_content: -10,
  gaming_detected: -30,
  low_quality: -5,
}

const TRUST_BOOST = {
  validated_observation: 2,
  expert_validated: 5,
  community_confirmed: 3,
  helpful_report: 3,
  accurate_identification: 4,
}

export class EcoTrustManager {
  #context = null
  #profiles = new Map()

  constructor(context) {
    this.#context = context
  }

  getOrCreate(visitorId) {
    if (!this.#profiles.has(visitorId)) {
      this.#profiles.set(visitorId, {
        id: 'etrust_' + visitorId,
        visitorId,
        accuracy: 100,
        quality: 100,
        communityHelp: 100,
        scientific: 100,
        positiveImpact: 100,
        overallTrust: 100,
        violations: [],
        restrictions: [],
      })
    }
    return this.#profiles.get(visitorId)
  }

  addPositive(visitorId, metric, amount) {
    const profile = this.getOrCreate(visitorId)
    const boost = amount || TRUST_BOOST[metric] || 1
    switch (metric) {
      case 'validated_observation':
      case 'accurate_identification':
        profile.accuracy = Math.min(100, profile.accuracy + boost)
        break
      case 'expert_validated':
        profile.scientific = Math.min(100, profile.scientific + boost)
        break
      case 'community_confirmed':
      case 'helpful_report':
        profile.communityHelp = Math.min(100, profile.communityHelp + boost)
        break
    }
    profile.overallTrust = this.#calculateOverall(profile)
    this.#emitEvent(ENGAGEMENT_EVENTS.TRUST_UPDATED, {
      visitorId, metric, overallTrust: profile.overallTrust,
    })
    return { success: true, overallTrust: profile.overallTrust }
  }

  addViolation(visitorId, reason, severity = 'minor') {
    const profile = this.getOrCreate(visitorId)
    const decay = severity === 'major' ? 30 : severity === 'minor' ? 10 : 5
    profile.accuracy = Math.max(0, profile.accuracy - decay)
    profile.overallTrust = this.#calculateOverall(profile)
    profile.violations.push({
      reason,
      severity,
      timestamp: new Date().toISOString(),
    })
    if (profile.overallTrust < 50) {
      profile.restrictions.push({
        type: 'reduced_rewards',
        reason: 'Low trust score',
        timestamp: new Date().toISOString(),
      })
    }
    this.#emitEvent(ENGAGEMENT_EVENTS.TRUST_VIOLATION, {
      visitorId, reason, severity, overallTrust: profile.overallTrust,
    })
    return { success: true, overallTrust: profile.overallTrust }
  }

  getTrust(visitorId) {
    return this.getOrCreate(visitorId)
  }

  getOverallTrust(visitorId) {
    return this.getOrCreate(visitorId).overallTrust
  }

  hasRestriction(visitorId, type) {
    const profile = this.getOrCreate(visitorId)
    return profile.restrictions.some(r => r.type === type)
  }

  #calculateOverall(profile) {
    return Math.floor(
      (profile.accuracy + profile.quality + profile.communityHelp +
        profile.scientific + profile.positiveImpact) / 5
    )
  }

  #emitEvent(event, data) {
    const eventBus = this.#context?.eventBus
    if (eventBus) eventBus.emit(event, data)
  }
}
