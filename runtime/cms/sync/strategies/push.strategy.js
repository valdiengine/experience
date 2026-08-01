import { EntityMatcher } from '../mapping/entity.matcher.js'
import { FieldMapper } from '../mapping/field.mapper.js'
import { SYNC_EVENTS, createSyncEvent } from '../events/sync.events.js'
import { SyncStrategyError } from '../errors/sync.errors.js'

export class PushStrategy {
  #matcher = null
  #fieldMapper = null
  #eventBus = null

  constructor() {
    this.#matcher = new EntityMatcher()
    this.#fieldMapper = new FieldMapper()
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  async execute(provider, entityType, items, options = {}) {
    if (!provider || typeof provider.syncPush !== 'function') {
      throw new SyncStrategyError('Provider does not support syncPush', { entityType })
    }

    const mapped = (items || []).map(item => this.#fieldMapper.mapToProvider(item, { entityType }))
    const result = await provider.syncPush(entityType, mapped)

    return {
      entityType,
      synced: result.synced || [],
      conflicts: result.conflicts || [],
      failed: result.failed || [],
      total: (result.synced || []).length + (result.conflicts || []).length + (result.failed || []).length,
    }
  }

  async executeWithConflictCheck(provider, entityType, items, localEntities, conflictEngine, options = {}) {
    const results = []

    for (const item of items || []) {
      const local = this.#matcher.findByExternalId(item.cmsId, localEntities)

      if (!local) {
        results.push({ action: 'create', entity: item })
        continue
      }

      const conflictCheck = conflictEngine.checkAndResolve(item, local, {
        entityType,
        entityId: item.cmsId,
        lastSync: options.lastSync,
      })

      if (conflictCheck.hadConflict) {
        results.push({
          action: 'conflict',
          entity: item,
          local,
          resolution: conflictCheck.resolution,
          winner: conflictCheck.winner,
        })
      } else {
        results.push({ action: 'update', entity: item, local })
      }
    }

    const pushResult = await provider.syncPush(entityType, results.filter(r => r.action !== 'conflict').map(r => r.entity))

    return {
      entityType,
      results,
      synced: pushResult.synced || [],
      conflicts: [...(pushResult.conflicts || []), ...results.filter(r => r.action === 'conflict')],
      failed: pushResult.failed || [],
    }
  }

  supports(entityType) {
    const supported = ['post', 'page', 'category']
    return supported.includes(entityType)
  }
}

export default PushStrategy
