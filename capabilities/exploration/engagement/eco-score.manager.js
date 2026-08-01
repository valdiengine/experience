/**
 * EcoScore Manager — Permanent reputation score and level progression
 */
import { ECO_LEVEL } from './engagement.schema.js'
import { ENGAGEMENT_EVENTS } from './engagement.events.js'

const SCORE_VALUES = {
  species_discovery: 10,
  species_validated: 25,
  ecological_report: 20,
  community_cleanup: 100,
  mission_completed: 50,
  memory_created: 10,
  review_written: 5,
  observation_confirmed: 10,
  sports_activity_completed: 30,
  conservation_action: 100,
  guide_completed: 20,
  business_visited: 5,
  community_help: 15,
  event_organized: 150,
  campaign_participation: 75,
}

export class EcoScoreManager {
  #context = null
  #profiles = new Map()

  constructor(context) {
    this.#context = context
  }

  getOrCreate(visitorId) {
    if (!this.#profiles.has(visitorId)) {
      this.#profiles.set(visitorId, {
        id: 'es_' + visitorId,
        visitorId,
        score: 0,
        level: 1,
        levelName: 'Seed',
        domainScores: {
          discovery: 0,
          ecology: 0,
          sports: 0,
          community: 0,
          education: 0,
        },
        lastAction: null,
        createdAt: new Date().toISOString(),
      })
    }
    return this.#profiles.get(visitorId)
  }

  addScore(visitorId, action, domain, metadata = {}) {
    const profile = this.getOrCreate(visitorId)
    const baseScore = SCORE_VALUES[action] || 0
    if (baseScore <= 0) return { success: false, error: 'Unknown action' }

    const multiplier = metadata.multiplier || 1
    const total = Math.floor(baseScore * multiplier)

    profile.score += total
    if (domain && profile.domainScores[domain] !== undefined) {
      profile.domainScores[domain] += total
    }
    profile.lastAction = new Date().toISOString()

    const levelResult = this.#checkLevelUp(profile)

    this.#emitEvent(ENGAGEMENT_EVENTS.ECOSCORE_UPDATED, {
      visitorId, action, score: total, domain, totalScore: profile.score,
    })

    return { success: true, score: total, totalScore: profile.score, levelResult }
  }

  getLevel(visitorId) {
    const profile = this.getOrCreate(visitorId)
    return this.#calculateLevel(profile.score)
  }

  getLevelProgress(visitorId) {
    const profile = this.getOrCreate(visitorId)
    const current = this.#calculateLevel(profile.score)
    const next = this.#getNextLevel(current.level)
    if (!next) return { current, next: null, progress: 100, pointsToNext: 0 }
    const range = next.minScore - current.minScore
    const earned = profile.score - current.minScore
    return {
      current,
      next,
      progress: Math.min(100, Math.floor((earned / range) * 100)),
      pointsToNext: next.minScore - profile.score,
    }
  }

  getProfile(visitorId) {
    return this.getOrCreate(visitorId)
  }

  #calculateLevel(score) {
    const levels = Object.values(ECO_LEVEL)
    let current = levels[0]
    for (const level of levels) {
      if (score >= level.minScore) current = level
    }
    return current
  }

  #getNextLevel(currentLevel) {
    const levels = Object.values(ECO_LEVEL)
    const idx = levels.findIndex(l => l.level === currentLevel)
    return idx < levels.length - 1 ? levels[idx + 1] : null
  }

  #checkLevelUp(profile) {
    const newLevel = this.#calculateLevel(profile.score)
    if (newLevel.level > profile.level) {
      const oldLevel = profile.level
      profile.level = newLevel.level
      profile.levelName = newLevel.name
      this.#emitEvent(ENGAGEMENT_EVENTS.ECOSCORE_LEVEL_UP, {
        visitorId: profile.visitorId, oldLevel, newLevel: newLevel.level, levelName: newLevel.name,
      })
      return { leveledUp: true, oldLevel, newLevel }
    }
    return { leveledUp: false }
  }

  #emitEvent(event, data) {
    const eventBus = this.#context?.eventBus
    if (eventBus) eventBus.emit(event, data)
  }
}
