import { PullStrategy } from './pull.strategy.js'
import { PushStrategy } from './push.strategy.js'
import { ConflictEngine } from '../conflicts/conflict.engine.js'
import { SYNC_EVENTS, createSyncEvent } from '../events/sync.events.js'
import { SyncStrategyError } from '../errors/sync.errors.js'

export class BidirectionalStrategy {
  #pullStrategy = null
  #pushStrategy = null
  #conflictEngine = null
  #eventBus = null

  constructor() {
    this.#pullStrategy = new PullStrategy()
    this.#pushStrategy = new PushStrategy()
    this.#conflictEngine = new ConflictEngine()
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
    this.#pullStrategy.setEventBus(eventBus)
    this.#pushStrategy.setEventBus(eventBus)
    this.#conflictEngine.setEventBus(eventBus)
  }

  async execute(provider, entityType, localEntities, options = {}) {
    if (!provider) {
      throw new SyncStrategyError('Provider required for bidirectional sync', { entityType })
    }

    const pullResult = await this.#pullStrategy.executeWithConflictCheck(
      provider, entityType, localEntities, this.#conflictEngine, options
    )

    const pushItems = this.#determinePushCandidates(localEntities, pullResult.results, options)
    let pushResult = { synced: [], conflicts: [], failed: [] }

    if (pushItems.length > 0) {
      pushResult = await this.#pushStrategy.execute(provider, entityType, pushItems, options)
    }

    return {
      entityType,
      pull: {
        total: pullResult.total,
        created: pullResult.created,
        updated: pullResult.updated,
        conflicts: pullResult.conflicts,
      },
      push: {
        total: pushResult.total,
        synced: (pushResult.synced || []).length,
        conflicts: (pushResult.conflicts || []).length,
        failed: (pushResult.failed || []).length,
      },
      conflicts: [...(pullResult.results?.filter(r => r.action === 'conflict') || []), ...(pushResult.conflicts || [])],
      totalChanges: (pullResult.created || 0) + (pullResult.updated || 0) + (pushItem?.length || 0),
    }
  }

  #determinePushCandidates(localEntities, pullResults, options) {
    if (!localEntities || localEntities.length === 0) return []

    const pullIds = new Set(
      (pullResults || [])
        .filter(r => r.entity?.cmsId)
        .map(r => r.entity.cmsId)
    )

    const syncWindow = options.syncWindow || 3600000

    return localEntities.filter(local => {
      if (!local.cmsId || pullIds.has(local.cmsId)) return false
      const updatedAt = new Date(local.updatedAt || 0).getTime()
      return (Date.now() - updatedAt) < syncWindow
    })
  }

  supports(entityType) {
    return this.#pullStrategy.supports(entityType) && this.#pushStrategy.supports(entityType)
  }
}

export default BidirectionalStrategy
