import { ConflictDetector } from './conflict.detector.js'
import { ConflictResolver } from './conflict.resolver.js'
import { ConflictPolicy } from './conflict.policy.js'
import { SYNC_EVENTS, createSyncEvent } from '../events/sync.events.js'

export class ConflictEngine {
  #detector = null
  #resolver = null
  #policy = null
  #eventBus = null

  constructor() {
    this.#policy = new ConflictPolicy()
    this.#detector = new ConflictDetector()
    this.#resolver = new ConflictResolver(this.#policy)
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
    this.#resolver.setEventBus(eventBus)
  }

  check(sourceEntity, targetEntity, options = {}) {
    return this.#detector.detect(sourceEntity, targetEntity, options)
  }

  resolve(conflict, context = {}) {
    const result = this.#resolver.resolve(conflict, context)

    this.#emit(SYNC_EVENTS.SYNC_CONFLICT_DETECTED, {
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      reason: conflict.reason,
      resolution: result.action,
    })

    return result
  }

  checkAndResolve(sourceEntity, targetEntity, options = {}) {
    const detection = this.#detector.detect(sourceEntity, targetEntity, options)

    if (!detection.hasConflict) {
      return { hadConflict: false, resolution: null, winner: detection.winner || 'source' }
    }

    const conflict = {
      entityType: options.entityType || 'unknown',
      entityId: options.entityId || sourceEntity?.cmsId || targetEntity?.cmsId,
      ...detection,
      sourceEntity,
      targetEntity,
    }

    const resolution = this.resolve(conflict, options)

    return {
      hadConflict: true,
      resolution,
      winner: resolution.winner,
    }
  }

  resolveBatch(conflicts, context = {}) {
    return this.#resolver.resolveBatch(conflicts, context)
  }

  setPolicy(entityType, policy) {
    this.#policy.set(entityType, policy)
  }

  reResolve(conflictId, resolution) {
    return this.#resolver.reResolve(conflictId, resolution)
  }

  getEscalated() {
    return this.#resolver.getEscalatedConflicts()
  }

  get detector() {
    return this.#detector
  }

  get resolver() {
    return this.#resolver
  }

  get policy() {
    return this.#policy
  }

  #emit(event, payload) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createSyncEvent(event, payload))
    }
  }
}

export default ConflictEngine
