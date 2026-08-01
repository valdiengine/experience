/**
 * Sports Explorer Manager — Sports participation and territorial exploration
 */
import { SPORTS_ACTIVITY } from './engagement.schema.js'
import { ENGAGEMENT_EVENTS } from './engagement.events.js'

const ACTIVITY_REWARDS = {
  [SPORTS_ACTIVITY.HIKING]: { score: 30, tokens: 25, domain: 'sports' },
  [SPORTS_ACTIVITY.CYCLING]: { score: 30, tokens: 25, domain: 'sports' },
  [SPORTS_ACTIVITY.TRAIL_RUNNING]: { score: 35, tokens: 30, domain: 'sports' },
  [SPORTS_ACTIVITY.KAYAKING]: { score: 40, tokens: 35, domain: 'sports' },
  [SPORTS_ACTIVITY.SURF]: { score: 35, tokens: 30, domain: 'sports' },
  [SPORTS_ACTIVITY.DIVING]: { score: 45, tokens: 40, domain: 'sports' },
  [SPORTS_ACTIVITY.SUP]: { score: 30, tokens: 25, domain: 'sports' },
  [SPORTS_ACTIVITY.CLIMBING]: { score: 40, tokens: 35, domain: 'sports' },
  [SPORTS_ACTIVITY.WILDLIFE_PHOTOGRAPHY]: { score: 50, tokens: 45, domain: 'ecology' },
}

export class SportsExplorerManager {
  #context = null
  #activities = new Map()
  #stats = new Map()

  constructor(context) {
    this.#context = context
  }

  startActivity(visitorId, activityType, destinationId, metadata = {}) {
    const id = 'sport_' + visitorId + '_' + Date.now()
    const activity = {
      id,
      visitorId,
      activityType,
      destinationId,
      route: metadata.route || null,
      distance: metadata.distance || 0,
      duration: 0,
      discoveries: [],
      observations: [],
      memories: [],
      startedAt: new Date().toISOString(),
      completedAt: null,
    }
    this.#activities.set(id, activity)
    this.#emitEvent(ENGAGEMENT_EVENTS.SPORTS_ACTIVITY_STARTED, {
      visitorId, activityType, activityId: id,
    })
    return { success: true, activity }
  }

  completeActivity(activityId, data = {}) {
    const activity = this.#activities.get(activityId)
    if (!activity) return { success: false, error: 'Activity not found' }
    activity.completedAt = new Date().toISOString()
    activity.duration = data.duration || 0
    if (data.discoveries) activity.discoveries = data.discoveries
    if (data.observations) activity.observations = data.observations
    this.#updateStats(activity.visitorId, activity.activityType)
    const reward = ACTIVITY_REWARDS[activity.activityType] || { score: 10, tokens: 10, domain: 'sports' }
    this.#emitEvent(ENGAGEMENT_EVENTS.SPORTS_ACTIVITY_COMPLETED, {
      visitorId: activity.visitorId,
      activityType: activity.activityType,
      activityId,
      reward,
    })
    return { success: true, activity, reward }
  }

  addDiscovery(activityId, entityType, entityId) {
    const activity = this.#activities.get(activityId)
    if (!activity) return { success: false, error: 'Activity not found' }
    activity.discoveries.push({ entityType, entityId, timestamp: new Date().toISOString() })
    this.#emitEvent(ENGAGEMENT_EVENTS.SPORTS_DISCOVERY, {
      activityId, visitorId: activity.visitorId, entityType, entityId,
    })
    return { success: true }
  }

  addObservation(activityId, speciesId, data = {}) {
    const activity = this.#activities.get(activityId)
    if (!activity) return { success: false, error: 'Activity not found' }
    activity.observations.push({ speciesId, ...data, timestamp: new Date().toISOString() })
    this.#emitEvent(ENGAGEMENT_EVENTS.SPORTS_OBSERVATION, {
      activityId, visitorId: activity.visitorId, speciesId,
    })
    return { success: true }
  }

  getVisitorStats(visitorId) {
    return this.#stats.get(visitorId) || {
      totalActivities: 0,
      byType: {},
      totalDistance: 0,
      totalDuration: 0,
    }
  }

  getActivities(visitorId, activityType) {
    const activities = []
    for (const activity of this.#activities.values()) {
      if (activity.visitorId === visitorId) {
        if (!activityType || activity.activityType === activityType) {
          activities.push(activity)
        }
      }
    }
    return activities
  }

  #updateStats(visitorId, activityType) {
    if (!this.#stats.has(visitorId)) {
      this.#stats.set(visitorId, { totalActivities: 0, byType: {}, totalDistance: 0, totalDuration: 0 })
    }
    const stats = this.#stats.get(visitorId)
    stats.totalActivities++
    stats.byType[activityType] = (stats.byType[activityType] || 0) + 1
  }

  #emitEvent(event, data) {
    const eventBus = this.#context?.eventBus
    if (eventBus) eventBus.emit(event, data)
  }
}
