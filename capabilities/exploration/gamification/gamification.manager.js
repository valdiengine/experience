/**
 * Gamification Manager — Level progression and rewards
 */
import { EXPLORER_LEVEL } from '../exploration.schema.js'
import { EXPLORATION_EVENTS } from '../exploration.events.js'

export class GamificationManager {
  #context = null

  constructor(context) {
    this.#context = context
  }

  calculateLevel(totalPoints) {
    const levels = Object.values(EXPLORER_LEVEL)
    let current = levels[0]
    for (const level of levels) {
      if (totalPoints >= level.minPoints) current = level
    }
    return current
  }

  getNextLevel(currentLevel) {
    const levels = Object.values(EXPLORER_LEVEL)
    const idx = levels.findIndex(l => l.level === currentLevel)
    return idx < levels.length - 1 ? levels[idx + 1] : null
  }

  checkLevelUp(profile) {
    const newLevel = this.calculateLevel(profile.explorationPoints)
    if (newLevel.level > profile.explorationLevel) {
      const oldLevel = profile.explorationLevel
      profile.explorationLevel = newLevel.level
      this.#emitEvent(EXPLORATION_EVENTS.EXPLORER_LEVELED_UP, {
        visitorId: profile.visitorId,
        oldLevel,
        newLevel: newLevel.level,
        levelName: newLevel.name,
      })
      return { leveledUp: true, oldLevel, newLevel: newLevel }
    }
    return { leveledUp: false }
  }

  addPoints(profile, amount, category) {
    profile.explorationPoints = (profile.explorationPoints || 0) + amount
    if (category === 'ecology') {
      profile.ecologicalPoints = (profile.ecologicalPoints || 0) + amount
    }
    this.#emitEvent(EXPLORATION_EVENTS.POINTS_EARNED, {
      visitorId: profile.visitorId,
      amount,
      category,
      total: profile.explorationPoints,
    })
    return this.checkLevelUp(profile)
  }

  getLevelProgress(profile) {
    const current = this.calculateLevel(profile.explorationPoints)
    const next = this.getNextLevel(current.level)
    if (!next) return { current, next: null, progress: 100 }
    const range = next.minPoints - current.minPoints
    const earned = profile.explorationPoints - current.minPoints
    return {
      current,
      next,
      progress: Math.min(100, Math.floor((earned / range) * 100)),
      pointsToNext: next.minPoints - profile.explorationPoints,
    }
  }

  #emitEvent(event, data) {
    const eventBus = this.#context?.eventBus
    if (eventBus) eventBus.emit(event, data)
  }
}
