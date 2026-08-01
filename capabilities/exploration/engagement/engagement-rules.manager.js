/**
 * Engagement Rules Manager — Orchestrates the engagement rules layer
 *
 * Business-agnostic: coordinates eco-tokens, eco-score, eco-trust, badges, sports, territory progress.
 * No direct capability imports — uses context.capabilities.get().
 */
import { EcoTokenManager } from './eco-token.manager.js'
import { EcoScoreManager } from './eco-score.manager.js'
import { EcoTrustManager } from './eco-trust.manager.js'
import { BadgeEngine } from './badge-engine.js'
import { SportsExplorerManager } from './sports-explorer.manager.js'
import { ENGAGEMENT_EVENTS } from './engagement.events.js'

export class EngagementRulesManager {
  #context = null
  #ecoTokens = null
  #ecoScore = null
  #ecoTrust = null
  #badgeEngine = null
  #sportsExplorer = null

  constructor(context) {
    this.#context = context
    this.#ecoTokens = new EcoTokenManager(context)
    this.#ecoScore = new EcoScoreManager(context)
    this.#ecoTrust = new EcoTrustManager(context)
    this.#badgeEngine = new BadgeEngine(context)
    this.#sportsExplorer = new SportsExplorerManager(context)
  }

  get ecoTokens() { return this.#ecoTokens }
  get ecoScore() { return this.#ecoScore }
  get ecoTrust() { return this.#ecoTrust }
  get badges() { return this.#badgeEngine }
  get sports() { return this.#sportsExplorer }

  recordAction(visitorId, action, domain, metadata = {}) {
    const trust = this.#ecoTrust.getOverallTrust(visitorId)
    const trustMultiplier = trust >= 80 ? 1.2 : trust >= 50 ? 1.0 : trust >= 30 ? 0.7 : 0.5

    const tokenResult = this.#ecoTokens.earn(visitorId, action, {
      ...metadata,
      multiplier: trustMultiplier,
    })

    const scoreResult = this.#ecoScore.addScore(visitorId, action, domain, {
      ...metadata,
      multiplier: trustMultiplier,
    })

    const stats = this.#getVisitorStats(visitorId)
    const awardedBadges = this.#badgeEngine.checkAndAward(visitorId, stats)

    this.#emitEvent(ENGAGEMENT_EVENTS.DOMAIN_ACTION, {
      visitorId, action, domain, trust, trustMultiplier,
      tokensEarned: tokenResult.amount || 0,
      scoreEarned: scoreResult.score || 0,
      badgesAwarded: awardedBadges.length,
    })

    return {
      success: true,
      tokens: tokenResult,
      score: scoreResult,
      badges: awardedBadges,
      trust,
    }
  }

  recordViolation(visitorId, reason, severity) {
    return this.#ecoTrust.addViolation(visitorId, reason, severity)
  }

  getPublicProfile(visitorId) {
    const scoreProfile = this.#ecoScore.getProfile(visitorId)
    const tokens = this.#ecoTokens.getBalance(visitorId)
    const trust = this.#ecoTrust.getTrust(visitorId)
    const badges = this.#badgeEngine.getAwarded(visitorId)

    return {
      visitorId,
      level: scoreProfile.levelName,
      levelNumber: scoreProfile.level,
      ecoScore: scoreProfile.score,
      ecoTokens: tokens,
      ecoTrust: trust.overallTrust,
      domainScores: scoreProfile.domainScores,
      badgeCount: badges.length,
      badges: badges.slice(0, 5),
    }
  }

  getTerritoryProgress(visitorId, destinationId, totals) {
    const stats = this.#getVisitorStats(visitorId)
    const placesDiscovered = stats.placesVisited || 0
    const speciesDiscovered = stats.speciesDiscovered || 0
    const experiencesCompleted = stats.experiencesCompleted || 0
    const businessesVisited = stats.businessesVisited || 0

    const total = (totals.places || 1) + (totals.species || 1) + (totals.experiences || 1) + (totals.businesses || 1)
    const discovered = placesDiscovered + speciesDiscovered + experiencesCompleted + businessesVisited

    return {
      visitorId,
      destinationId,
      placesDiscovered,
      placesTotal: totals.places || 0,
      speciesDiscovered,
      speciesTotal: totals.species || 0,
      experiencesCompleted,
      experiencesTotal: totals.experiences || 0,
      businessesVisited,
      businessesTotal: totals.businesses || 0,
      completionPercent: Math.floor((discovered / total) * 100),
    }
  }

  #getVisitorStats(visitorId) {
    return {
      speciesDiscovered: 0,
      placesVisited: 0,
      experiencesCompleted: 0,
      businessesVisited: 0,
      marineObservations: 0,
      floraDiscovered: 0,
      validatedObservations: 0,
      helpedVisitors: 0,
      mentoredVisitors: 0,
      birdSpecies: 0,
      marineSpecies: 0,
    }
  }

  #emitEvent(event, data) {
    const eventBus = this.#context?.eventBus
    if (eventBus) eventBus.emit(event, data)
  }
}
