/**
 * Reputation Manager — Handles visitor reputation scoring and levels
 *
 * Business-agnostic: reputation is earned through community contributions.
 * No direct capability imports — uses context.capabilities.get()
 */
import { REPUTATION_SCHEMA, REPUTATION_RULES, REPUTATION_LEVELS } from '../community.schema.js'
import { COMMUNITY_EVENTS } from '../community.events.js'

export class ReputationManager {
  #context = null
  #scores = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Get or create reputation for a visitor
   * @param {string} visitorId
   * @returns {object}
   */
  getOrCreate(visitorId) {
    let score = this.#scores.get(visitorId)
    if (!score) {
      score = {
        visitorId,
        score: 0,
        level: 1,
        contributions: 0,
        lastUpdated: new Date().toISOString(),
      }
      this.#scores.set(visitorId, score)
    }
    return score
  }

  /**
   * Add points for an action
   * @param {string} visitorId
   * @param {string} actionKey - Key from REPUTATION_RULES
   * @returns {object} Updated reputation
   */
  addPoints(visitorId, actionKey) {
    const rule = REPUTATION_RULES[actionKey]
    if (!rule) return this.getOrCreate(visitorId)

    const reputation = this.getOrCreate(visitorId)
    reputation.score += rule.points
    reputation.contributions += 1
    reputation.level = this.#calculateLevel(reputation.score)
    reputation.lastUpdated = new Date().toISOString()

    this.#context?.eventBus?.emit(COMMUNITY_EVENTS.REPUTATION_UPDATED, {
      visitorId,
      score: reputation.score,
      level: reputation.level,
      action: actionKey,
      points: rule.points,
    })

    return reputation
  }

  /**
   * Get reputation for a visitor
   * @param {string} visitorId
   * @returns {object|null}
   */
  get(visitorId) {
    return this.#scores.get(visitorId) || null
  }

  /**
   * Get level name for a level number
   * @param {number} level
   * @returns {string}
   */
  getLevelName(level) {
    const found = REPUTATION_LEVELS.find(l => l.level === level)
    return found ? found.name : 'Explorador'
  }

  /**
   * Get next level info
   * @param {number} currentLevel
   * @returns {object|null}
   */
  getNextLevel(currentLevel) {
    return REPUTATION_LEVELS.find(l => l.level === currentLevel + 1) || null
  }

  /**
   * Get top visitors by score
   * @param {number} limit
   * @returns {object[]}
   */
  getTopVisitors(limit = 10) {
    return Array.from(this.#scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  #calculateLevel(score) {
    let level = 1
    for (const l of REPUTATION_LEVELS) {
      if (score >= l.minScore) level = l.level
    }
    return level
  }
}
