/**
 * Mission Manager — Mission definitions and progress tracking
 */
import { MISSION_TYPE } from '../exploration.schema.js'
import { EXPLORATION_EVENTS } from '../exploration.events.js'

export class MissionManager {
  #context = null
  #missions = new Map()
  #progress = new Map()

  constructor(context) {
    this.#context = context
  }

  createMission(data) {
    const mission = {
      id: data.id || 'mission_' + Date.now(),
      title: data.title,
      description: data.description,
      type: data.type,
      destinationId: data.destinationId || null,
      requirements: data.requirements || [],
      rewards: data.rewards || { points: 0, badge: null },
      timeLimit: data.timeLimit || null,
      difficulty: data.difficulty || 'easy',
      isActive: true,
      participantCount: 0,
    }
    this.#missions.set(mission.id, mission)
    return { success: true, mission }
  }

  startMission(visitorId, missionId) {
    const mission = this.#missions.get(missionId)
    if (!mission || !mission.isActive) return { success: false, error: 'Mission not available' }
    const key = visitorId + ':' + missionId
    if (this.#progress.has(key)) return { success: false, error: 'Already started' }
    const progress = {
      missionId,
      visitorId,
      completedRequirements: [],
      progress: 0,
      completedAt: null,
      claimed: false,
    }
    this.#progress.set(key, progress)
    mission.participantCount++
    this.#emitEvent(EXPLORATION_EVENTS.MISSION_STARTED, { visitorId, missionId })
    return { success: true, progress }
  }

  completeRequirement(visitorId, missionId, requirementIndex) {
    const key = visitorId + ':' + missionId
    const progress = this.#progress.get(key)
    if (!progress) return { success: false, error: 'Mission not started' }
    if (progress.completedRequirements.includes(requirementIndex)) {
      return { success: false, error: 'Requirement already completed' }
    }
    progress.completedRequirements.push(requirementIndex)
    const mission = this.#missions.get(missionId)
    const total = mission.requirements.length
    progress.progress = Math.floor((progress.completedRequirements.length / total) * 100)
    this.#emitEvent(EXPLORATION_EVENTS.MISSION_PROGRESS, {
      visitorId, missionId, progress: progress.progress,
    })
    if (progress.progress >= 100) {
      progress.completedAt = new Date().toISOString()
      this.#emitEvent(EXPLORATION_EVENTS.MISSION_COMPLETED, { visitorId, missionId })
    }
    return { success: true, progress }
  }

  claimRewards(visitorId, missionId) {
    const key = visitorId + ':' + missionId
    const progress = this.#progress.get(key)
    if (!progress || !progress.completedAt) return { success: false, error: 'Mission not completed' }
    if (progress.claimed) return { success: false, error: 'Already claimed' }
    progress.claimed = true
    const mission = this.#missions.get(missionId)
    this.#emitEvent(EXPLORATION_EVENTS.MISSION_CLAIMED, {
      visitorId, missionId, rewards: mission.rewards,
    })
    return { success: true, rewards: mission.rewards }
  }

  getMissions(destinationId) {
    return Array.from(this.#missions.values())
      .filter(m => m.isActive && (!destinationId || m.destinationId === destinationId))
  }

  getVisitorProgress(visitorId) {
    const entries = []
    for (const [key, progress] of this.#progress) {
      if (key.startsWith(visitorId + ':')) entries.push(progress)
    }
    return entries
  }

  #emitEvent(event, data) {
    const eventBus = this.#context?.eventBus
    if (eventBus) eventBus.emit(event, data)
  }
}
