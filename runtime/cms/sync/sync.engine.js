import { SyncRegistry } from './sync.registry.js'
import { SyncFactory } from './sync.factory.js'
import { SyncContext } from './sync.context.js'
import { SyncJob, JobStatus } from './jobs/sync.job.js'
import { SyncQueue } from './jobs/sync.queue.js'
import { SyncScheduler } from './jobs/sync.scheduler.js'
import { SyncWorker } from './jobs/sync.worker.js'
import { SyncState } from './state/sync.state.js'
import { SyncCheckpoint } from './state/sync.checkpoint.js'
import { SyncHistory } from './state/sync.history.js'
import { ConflictEngine } from './conflicts/conflict.engine.js'
import { SYNC_EVENTS, createSyncEvent } from './events/sync.events.js'
import { SyncEngineError } from './errors/sync.errors.js'

import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class SyncEngine extends BaseRuntimeContract {
  #registry = null
  #factory = null
  #queue = null
  #scheduler = null
  #worker = null
  #state = null
  #checkpoint = null
  #history = null
  #conflictEngine = null
  #context = null
  #eventBus = null
  #initialized = false
  #config = {}
  #pausedEntityTypes = new Set()

  constructor(config = {}) {
    super(config)
    this.name = 'cms-sync-engine'
    this.#config = config
    this.#factory = new SyncFactory()
    this.#registry = this.#factory.createRegistry()
    this.#queue = new SyncQueue(config)
    this.#scheduler = new SyncScheduler()
    this.#worker = new SyncWorker(this.#queue, this.#scheduler, config)
    this.#state = new SyncState()
    this.#checkpoint = new SyncCheckpoint()
    this.#history = new SyncHistory(config)
    this.#conflictEngine = new ConflictEngine()
    this.#context = new SyncContext(this, config)
  }

  get registry() { return this.#registry }
  get factory() { return this.#factory }
  get queue() { return this.#queue }
  get scheduler() { return this.#scheduler }
  get worker() { return this.#worker }
  get state() { return this.#state }
  get checkpoint() { return this.#checkpoint }
  get history() { return this.#history }
  get conflictEngine() { return this.#conflictEngine }
  get context() { return this.#context }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
    this.#worker.setEventBus(eventBus)
    this.#scheduler.setEventBus(eventBus)
    this.#queue.setEventBus(eventBus)
    this.#conflictEngine.setEventBus(eventBus)
  }

  async initialize() {
    if (this.#initialized) return

    this.#worker.setEventBus(this.#eventBus)
    this.#scheduler.setEventBus(this.#eventBus)
    this.#queue.setEventBus(this.#eventBus)
    this.#conflictEngine.setEventBus(this.#eventBus)

    this.#worker.start()
    this.#scheduler.start()

    this.#initialized = true
    this._available = true

    this.#emit(SYNC_EVENTS.SYNC_STARTED, {
      entityTypes: this.#registry.listEntityTypes(),
      providers: this.#registry.listProviders(),
      strategies: this.#registry.listStrategies(),
    })
  }

  async shutdown() {
    if (!this.#initialized) return

    this.#worker.stop()
    this.#scheduler.stop()
    this.#queue.drain()

    this.#initialized = false
    this._available = false
  }

  async dispose() {
    await this.shutdown()
    this.#state.clear()
    this.#checkpoint.clear()
    this.#history.clear()
    this.#pausedEntityTypes.clear()
  }

  async health() {
    return {
      status: this.#initialized ? 'healthy' : 'unavailable',
      initialized: this.#initialized,
      available: this._available,
      activeJobs: this.#worker.getActiveCount(),
      pendingQueue: this.#queue.totalSize(),
      scheduled: this.#scheduler.getStatus().schedules,
      syncState: this.#state.count(),
      checkpoints: this.#checkpoint.count(),
      historyEntries: this.#history.count(),
      conflicts: this.#conflictEngine.getEscalated().length,
      paused: Array.from(this.#pausedEntityTypes),
      registry: this.#registry.health(),
    }
  }

  available() {
    return this.#initialized
  }

  supports(feature) {
    const features = ['trigger', 'schedule', 'pull', 'push', 'bidirectional', 'conflict', 'retry', 'checkpoint', 'history', 'pause', 'resume']
    return features.includes(feature)
  }

  registerProvider(name, provider) {
    this.#registry.registerProvider(name, provider)
  }

  async trigger(entityType, direction, options = {}) {
    if (this.#pausedEntityTypes.has(entityType)) {
      throw new SyncEngineError(`Sync is paused for entity type: ${entityType}`, { entityType })
    }

    const providerName = options.provider || this.#registry.listProviders()[0]
    const provider = this.#registry.getProvider(providerName)

    if (!provider) {
      throw new SyncEngineError(`No provider registered: ${providerName}`, { providerName })
    }

    const strategy = this.#registry.getStrategy(direction)
    if (!strategy) {
      throw new SyncEngineError(`No strategy registered for direction: ${direction}`, { direction })
    }

    const job = new SyncJob({
      entityType,
      direction,
      provider: providerName,
      tenantId: options.tenantId,
      destinationId: options.destinationId,
      triggeredBy: options.triggeredBy || 'manual',
      config: options.jobConfig || {},
      metadata: options.metadata || {},
    })

    this.#state.set(entityType, job.id, {
      externalId: null,
      provider: providerName,
      status: JobStatus.QUEUED,
    })

    const context = {
      providers: this.#registry,
      strategies: this.#registry,
      localEntities: options.localEntities || [],
      options: { ...options },
    }

    this.#queue.enqueue(job, { priority: options.priority || 0 })

    this.#emit(SYNC_EVENTS.SYNC_JOB_CREATED, {
      jobId: job.id,
      entityType,
      direction,
      provider: providerName,
      tenantId: options.tenantId,
    })

    this.#worker.processJob(job, context)

    return job.toJSON()
  }

  async status(jobId) {
    const activeJobs = this.#worker.getActiveJobs()
    const active = activeJobs.find(j => j.id === jobId)
    if (active) return active

    return { jobId, status: 'not_found' }
  }

  async history(filters = {}) {
    const entries = this.#history.query(filters)
    return { jobs: entries, total: this.#history.count() }
  }

  async cancel(jobId) {
    return this.#queue.cancel(jobId)
  }

  async retry(jobId) {
    const historyEntry = this.#history.query({ jobId })[0]
    if (!historyEntry) return false

    return this.trigger(historyEntry.entityType, historyEntry.direction, {
      provider: historyEntry.provider,
      tenantId: historyEntry.tenantId,
      triggeredBy: 'retry',
    })
  }

  async pause(entityType) {
    this.#pausedEntityTypes.add(entityType)
    return true
  }

  async resume(entityType) {
    this.#pausedEntityTypes.delete(entityType)
    return true
  }

  getConflicts(options = {}) {
    const escalated = this.#conflictEngine.getEscalated()
    if (options.entityType) {
      return escalated.filter(c => c.entityType === options.entityType)
    }
    return escalated
  }

  async resolveConflict(conflictId, resolution) {
    return this.#conflictEngine.reResolve(conflictId, resolution)
  }

  getState(entityType, entityId) {
    return this.#state.get(entityType, entityId)
  }

  getStatus() {
    return {
      running: this.#initialized,
      activeJobs: this.#worker.getActiveCount(),
      pendingQueue: this.#queue.totalSize(),
      scheduled: this.#scheduler.getStatus().schedules,
      paused: Array.from(this.#pausedEntityTypes),
      conflicts: this.#conflictEngine.getEscalated().length,
      entitiesByStatus: {
        pending: this.#state.countByStatus(JobStatus.PENDING),
        synced: this.#state.countByStatus(JobStatus.SYNCED),
        failed: this.#state.countByStatus(JobStatus.FAILED),
        conflict: this.#state.countByStatus(JobStatus.CONFLICT),
      },
    }
  }

  registerEntityType(entityType, config = {}) {
    this.#registry.registerEntityType(entityType, config)
  }

  registerStrategy(direction, strategy) {
    this.#registry.registerStrategy(direction, strategy)
  }

  scheduleSync(config) {
    return this.#scheduler.schedule({
      ...config,
      handler: async (schedule) => {
        await this.trigger(schedule.entityType, schedule.direction, {
          provider: schedule.provider,
          tenantId: schedule.tenantId,
          triggeredBy: 'schedule',
          jobConfig: schedule.config,
        })
      },
    })
  }

  unschedule(id) {
    return this.#scheduler.unschedule(id)
  }

  recordHistory(entry) {
    return this.#history.record(entry)
  }

  saveCheckpoint(entityType, provider, checkpoint) {
    this.#checkpoint.save(entityType, provider, checkpoint)
    this.#emit(SYNC_EVENTS.SYNC_CHECKPOINT_CREATED, {
      entityType,
      provider,
      checkpoint,
    })
  }

  restoreCheckpoint(entityType, provider) {
    const cp = this.#checkpoint.restore(entityType, provider)
    if (cp) {
      this.#emit(SYNC_EVENTS.SYNC_CHECKPOINT_RESTORED, {
        entityType,
        provider,
        checkpoint: cp,
      })
    }
    return cp
  }

  markSynced(entityType, entityId, externalId, checksum) {
    this.#state.markSynced(entityType, entityId, externalId, checksum)
  }

  #emit(event, payload) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createSyncEvent(event, payload))
    }
  }
}

export default SyncEngine
