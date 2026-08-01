import { EntityMatcher } from '../mapping/entity.matcher.js'
import { FieldMapper } from '../mapping/field.mapper.js'
import { SYNC_EVENTS, createSyncEvent } from '../events/sync.events.js'
import { SyncStrategyError } from '../errors/sync.errors.js'

export class PullStrategy {
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

  async execute(provider, entityType, options = {}) {
    const since = options.since || null
    const pagination = options.pagination || {}

    if (!provider || typeof provider.syncPull !== 'function') {
      throw new SyncStrategyError('Provider does not support syncPull', { entityType })
    }

    const items = await provider.syncPull(entityType, { since, pagination })
    const mapped = this.#fieldMapper.mapToEngine(items, { entityType })

    return {
      entityType,
      items: mapped || [],
      checkpoint: since || Date.now(),
      count: (mapped || []).length,
    }
  }

  async executeWithConflictCheck(provider, entityType, localEntities, conflictEngine, options = {}) {
    const pullResult = await this.execute(provider, entityType, options)
    const results = []

    for (const incoming of pullResult.items) {
      const local = this.#matcher.findByExternalId(incoming.cmsId, localEntities)
      if (!local) {
        results.push({ action: 'create', entity: incoming })
        continue
      }

      const conflictCheck = conflictEngine.checkAndResolve(incoming, local, {
        entityType,
        entityId: incoming.cmsId,
        lastSync: options.lastSync,
      })

      if (conflictCheck.hadConflict) {
        results.push({
          action: 'conflict',
          entity: incoming,
          local,
          resolution: conflictCheck.resolution,
          winner: conflictCheck.winner,
        })
      } else {
        results.push({
          action: 'update',
          entity: incoming,
          local,
          winner: conflictCheck.winner,
        })
      }
    }

    return {
      entityType,
      results,
      total: pullResult.count,
      created: results.filter(r => r.action === 'create').length,
      updated: results.filter(r => r.action === 'update').length,
      conflicts: results.filter(r => r.action === 'conflict').length,
    }
  }

  supports(entityType) {
    const supported = ['post', 'page', 'media', 'category', 'tag', 'author']
    return supported.includes(entityType)
  }
}

export default PullStrategy
