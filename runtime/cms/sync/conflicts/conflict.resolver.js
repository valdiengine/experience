import { ConflictPolicy, ConflictResolutionStrategy } from './conflict.policy.js'
import { SYNC_EVENTS, createSyncEvent } from '../events/sync.events.js'

export class ConflictResolver {
  #policy = null
  #eventBus = null
  #escalatedConflicts = new Map()

  constructor(policy) {
    this.#policy = policy || new ConflictPolicy()
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  resolve(conflict, context = {}) {
    const policy = this.#policy.get(conflict.entityType)
    const result = this.#policy.resolve(conflict.entityType, conflict, context)

    if (result.action === 'escalate') {
      this.#escalate(conflict, result)
    }

    if (result.action === 'auto_resolve') {
      this.#emit(SYNC_EVENTS.SYNC_CONFLICT_RESOLVED, {
        entityType: conflict.entityType,
        entityId: conflict.entityId,
        strategy: result.strategy,
        winner: result.winner,
        reason: result.reason,
      })
    }

    return {
      ...result,
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      resolvedAt: Date.now(),
    }
  }

  resolveBatch(conflicts, context = {}) {
    return (conflicts || []).map(conflict => this.resolve(conflict, context))
  }

  getPolicy() {
    return this.#policy
  }

  setCustomPolicy(entityType, policy) {
    this.#policy.set(entityType, policy)
  }

  reResolve(conflictId, resolution) {
    const conflict = this.#escalatedConflicts.get(conflictId)
    if (!conflict) return null

    const result = {
      action: 'manual_resolve',
      winner: resolution.winner,
      strategy: 'manual',
      reason: resolution.reason || 'Manually resolved',
      merged: resolution.data || null,
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      resolvedAt: Date.now(),
    }

    this.#escalatedConflicts.delete(conflictId)

    this.#emit(SYNC_EVENTS.SYNC_CONFLICT_RESOLVED, {
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      strategy: 'manual',
      winner: resolution.winner,
      reason: result.reason,
    })

    return result
  }

  getEscalatedConflicts() {
    return Array.from(this.#escalatedConflicts.values())
  }

  getEscalatedCount() {
    return this.#escalatedConflicts.size
  }

  #escalate(conflict, result) {
    const id = `conflict_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    this.#escalatedConflicts.set(id, {
      id,
      ...conflict,
      policyResult: result,
      escalatedAt: Date.now(),
    })

    this.#emit(SYNC_EVENTS.SYNC_CONFLICT_ESCALATED, {
      conflictId: id,
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      reason: result.reason,
    })
  }

  #emit(event, payload) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createSyncEvent(event, payload))
    }
  }
}

export default ConflictResolver
