/**
 * Leaderboard Manager — Leaderboard calculation and ranking
 */
import { LEADERBOARD_TYPE, LEADERBOARD_PERIOD } from '../exploration.schema.js'
import { EXPLORATION_EVENTS } from '../exploration.events.js'

export class LeaderboardManager {
  #context = null
  #leaderboards = new Map()

  constructor(context) {
    this.#context = context
  }

  updateLeaderboard(type, entityId, visitorId, score, metadata = {}) {
    const key = this.#getKey(type, entityId)
    if (!this.#leaderboards.has(key)) {
      this.#leaderboards.set(key, { type, entityId, entries: [], lastUpdated: null })
    }
    const board = this.#leaderboards.get(key)
    const existing = board.entries.find(e => e.visitorId === visitorId)
    if (existing) {
      existing.score = Math.max(existing.score, score)
      existing.metadata = { ...existing.metadata, ...metadata }
    } else {
      board.entries.push({ visitorId, score, metadata, rank: 0 })
    }
    board.entries.sort((a, b) => b.score - a.score)
    board.entries.forEach((e, i) => { e.rank = i + 1 })
    board.lastUpdated = new Date().toISOString()
    this.#emitEvent(EXPLORATION_EVENTS.LEADERBOARD_UPDATED, { type, entityId })
    return { success: true, rank: board.entries.find(e => e.visitorId === visitorId)?.rank }
  }

  getLeaderboard(type, entityId, limit = 10) {
    const key = this.#getKey(type, entityId)
    const board = this.#leaderboards.get(key)
    if (!board) return []
    return board.entries.slice(0, limit)
  }

  getVisitorRank(type, entityId, visitorId) {
    const entries = this.getLeaderboard(type, entityId, 100)
    const entry = entries.find(e => e.visitorId === visitorId)
    return entry ? entry.rank : null
  }

  #getKey(type, entityId) {
    return type + ':' + (entityId || 'global')
  }

  #emitEvent(event, data) {
    const eventBus = this.#context?.eventBus
    if (eventBus) eventBus.emit(event, data)
  }
}
