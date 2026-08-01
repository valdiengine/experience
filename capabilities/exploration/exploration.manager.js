/**
 * Discovery Manager — Handles discovery registration, rewards, and recommendations
 *
 * Business-agnostic: works with any entity type in the ecosystem.
 * No direct capability imports — uses context.capabilities.get().
 */
import { DISCOVERY_TYPE, DIFFICULTY } from './exploration.schema.js'
import { EXPLORATION_EVENTS } from './exploration.events.js'

export class DiscoveryManager {
  #context = null
  #discoveryPoints = new Map()

  constructor(context) {
    this.#context = context
  }

  registerDiscoveryPoint(entityType, entityId, location, options = {}) {
    const id = entityType + ':' + entityId
    if (this.#discoveryPoints.has(id)) {
      return { success: false, error: 'Discovery point already exists' }
    }

    const point = {
      id,
      entityType,
      entityId,
      location,
      difficulty: options.difficulty || DIFFICULTY.EASY,
      discoveryReward: this.#calculateBaseReward(options.difficulty),
      requiredLevel: options.requiredLevel || 1,
      status: 'hidden',
    }

    this.#discoveryPoints.set(id, point)
    return { success: true, point }
  }

  discover(visitorId, entityType, entityId, explorerProfile) {
    const id = entityType + ':' + entityId
    const point = this.#discoveryPoints.get(id)

    if (!point) {
      return { success: false, error: 'Discovery point not found' }
    }

    const alreadyDiscovered = this.#isAlreadyDiscovered(explorerProfile, entityType, entityId)
    if (alreadyDiscovered) {
      return { success: false, error: 'Already discovered', alreadyKnown: true }
    }

    if (explorerProfile.explorationLevel < point.requiredLevel) {
      return { success: false, error: 'Level too low', requiredLevel: point.requiredLevel }
    }

    const reward = this.#calculateReward(point, explorerProfile)
    point.status = 'discovered'

    this.#addDiscoveryToProfile(explorerProfile, entityType, entityId)

    this.#emitEvent(EXPLORATION_EVENTS.DISCOVERY_REGISTERED, {
      visitorId,
      entityType,
      entityId,
      reward,
    })

    return {
      success: true,
      point,
      reward,
      isFirstDiscovery: this.#isFirstDiscovery(entityType),
    }
  }

  getDiscoveryPoints(destinationId) {
    const points = []
    for (const point of this.#discoveryPoints.values()) {
      if (point.entityId === destinationId || point.location?.destinationId === destinationId) {
        points.push(point)
      }
    }
    return points
  }

  getUndiscovered(visitorId, destinationId) {
    const points = []
    for (const point of this.#discoveryPoints.values()) {
      if (point.status === 'hidden' && point.location?.destinationId === destinationId) {
        points.push(point)
      }
    }
    return points
  }

  getStats(destinationId) {
    const points = this.getDiscoveryPoints(destinationId)
    return {
      total: points.length,
      discovered: points.filter(p => p.status === 'discovered').length,
      hidden: points.filter(p => p.status === 'hidden').length,
    }
  }

  #calculateBaseReward(difficulty) {
    const rewards = {
      [DIFFICULTY.EASY]: 10,
      [DIFFICULTY.MODERATE]: 20,
      [DIFFICULTY.CHALLENGING]: 35,
      [DIFFICULTY.EXPERT]: 50,
    }
    return rewards[difficulty] || 10
  }

  #calculateReward(point, explorerProfile) {
    let base = point.discoveryReward
    if (explorerProfile.explorationLevel >= 4) base = Math.floor(base * 1.5)
    if (explorerProfile.explorationLevel >= 5) base = Math.floor(base * 2)
    return base
  }

  #isAlreadyDiscovered(profile, entityType, entityId) {
    switch (entityType) {
      case DISCOVERY_TYPE.PLACE:
      case DISCOVERY_TYPE.VIEWPOINT:
      case DISCOVERY_TYPE.BEACH:
      case DISCOVERY_TYPE.TRAIL:
      case DISCOVERY_TYPE.HISTORICAL_SITE:
        return profile.visitedPlaces?.includes(entityId)
      case DISCOVERY_TYPE.SPECIES:
        return profile.discoveredSpecies?.includes(entityId)
      case DISCOVERY_TYPE.EXPERIENCE:
        return profile.completedExperiences?.includes(entityId)
      default:
        return false
    }
  }

  #addDiscoveryToProfile(profile, entityType, entityId) {
    switch (entityType) {
      case DISCOVERY_TYPE.PLACE:
      case DISCOVERY_TYPE.VIEWPOINT:
      case DISCOVERY_TYPE.BEACH:
      case DISCOVERY_TYPE.TRAIL:
      case DISCOVERY_TYPE.HISTORICAL_SITE:
        if (!profile.visitedPlaces) profile.visitedPlaces = []
        profile.visitedPlaces.push(entityId)
        break
      case DISCOVERY_TYPE.SPECIES:
        if (!profile.discoveredSpecies) profile.discoveredSpecies = []
        profile.discoveredSpecies.push(entityId)
        break
      case DISCOVERY_TYPE.EXPERIENCE:
        if (!profile.completedExperiences) profile.completedExperiences = []
        profile.completedExperiences.push(entityId)
        break
    }
  }

  #isFirstDiscovery(entityType) {
    let count = 0
    for (const point of this.#discoveryPoints.values()) {
      if (point.entityType === entityType && point.status === 'discovered') count++
    }
    return count === 0
  }

  #emitEvent(event, data) {
    const eventBus = this.#context?.eventBus
    if (eventBus) {
      eventBus.emit(event, data)
    }
  }
}