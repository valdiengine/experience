import { SyncJob, JobStatus } from './sync.job.js'
import { RetryEngine } from '../retry/retry.engine.js'
import { SYNC_EVENTS, createSyncEvent } from '../events/sync.events.js'

export class SyncWorker {
  #queue = null
  #scheduler = null
  #retryEngine = null
  #eventBus = null
  #running = false
  #activeJobs = new Map()
  #maxConcurrent = 5

  constructor(queue, scheduler, options = {}) {
    this.#queue = queue
    this.#scheduler = scheduler
    this.#retryEngine = new RetryEngine(options)
    this.#maxConcurrent = options.maxConcurrent || 5
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
    this.#retryEngine.setEventBus(eventBus)
  }

  start() {
    if (this.#running) return
    this.#running = true
    this.#processLoop()
  }

  stop() {
    this.#running = false
  }

  async processJob(job, context = {}) {
    if (this.#activeJobs.size >= this.#maxConcurrent) {
      return { processed: false, reason: 'max_concurrent_reached' }
    }

    this.#activeJobs.set(job.id, job)
    job.start()

    try {
      const result = await this.#retryEngine.execute(async (attempt) => {
        this.#emit(SYNC_EVENTS.SYNC_JOB_PROGRESS, {
          jobId: job.id,
          entityType: job.entityType,
          direction: job.direction,
          attempt,
          progress: job.progress,
        })

        return await this.#execute(job, context)
      }, { key: job.id, entityType: job.entityType })

      job.complete()
      job.updateProgress(result?.processed || 0, result?.failed || 0, result?.conflicts || 0)

      this.#emit(SYNC_EVENTS.SYNC_JOB_COMPLETED, {
        jobId: job.id,
        entityType: job.entityType,
        direction: job.direction,
        processed: job.processedItems,
        failed: job.failedItems,
        conflicts: job.conflicts,
        duration: Date.now() - job.createdAt,
      })

      this.#activeJobs.delete(job.id)
      return { processed: true, result }
    } catch (err) {
      job.fail(err)

      this.#emit(SYNC_EVENTS.SYNC_JOB_FAILED, {
        jobId: job.id,
        entityType: job.entityType,
        direction: job.direction,
        error: err.message,
        duration: Date.now() - job.createdAt,
      })

      this.#activeJobs.delete(job.id)
      return { processed: false, error: err.message }
    }
  }

  getActiveJobs() {
    return Array.from(this.#activeJobs.values()).map(job => job.toJSON())
  }

  getActiveCount() {
    return this.#activeJobs.size
  }

  isRunning() {
    return this.#running
  }

  async #execute(job, context) {
    const strategy = context.strategies?.get(job.direction)
    if (!strategy) {
      throw new Error(`No strategy found for direction: ${job.direction}`)
    }

    const provider = context.providers?.get(job.provider)
    if (!provider) {
      throw new Error(`No provider found: ${job.provider}`)
    }

    return strategy.execute(provider, job.entityType, context.localEntities || [], {
      tenantId: job.tenantId,
      destinationId: job.destinationId,
      config: job.config,
      ...context.options,
    })
  }

  async #processLoop() {
    while (this.#running) {
      if (this.#activeJobs.size < this.#maxConcurrent) {
        const item = this.#queue.dequeue()
        if (item) {
          this.processJob(item.job, item.context || {}).catch(() => {})
        }
      }
      await this.#wait(100)
    }
  }

  #wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  #emit(event, payload) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createSyncEvent(event, payload))
    }
  }
}

export default SyncWorker
