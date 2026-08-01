export const JobStatus = Object.freeze({
  PENDING: 'pending',
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PAUSED: 'paused',
})

export class SyncJob {
  #id = null
  #entityType = null
  #direction = null
  #provider = null
  #tenantId = null
  #destinationId = null
  #status = JobStatus.PENDING
  #progress = 0
  #totalItems = 0
  #processedItems = 0
  #failedItems = 0
  #conflicts = 0
  #triggeredBy = 'manual'
  #createdAt = null
  #startedAt = null
  #completedAt = null
  #error = null
  #metadata = {}
  #config = {}

  constructor(options = {}) {
    this.#id = options.id || this.#generateId()
    this.#entityType = options.entityType
    this.#direction = options.direction
    this.#provider = options.provider
    this.#tenantId = options.tenantId || null
    this.#destinationId = options.destinationId || null
    this.#triggeredBy = options.triggeredBy || 'manual'
    this.#totalItems = options.totalItems || 0
    this.#metadata = options.metadata || {}
    this.#config = options.config || {}
    this.#createdAt = Date.now()
  }

  get id() { return this.#id }
  get entityType() { return this.#entityType }
  get direction() { return this.#direction }
  get provider() { return this.#provider }
  get tenantId() { return this.#tenantId }
  get destinationId() { return this.#destinationId }
  get status() { return this.#status }
  get progress() { return this.#progress }
  get totalItems() { return this.#totalItems }
  get processedItems() { return this.#processedItems }
  get failedItems() { return this.#failedItems }
  get conflicts() { return this.#conflicts }
  get triggeredBy() { return this.#triggeredBy }
  get createdAt() { return this.#createdAt }
  get startedAt() { return this.#startedAt }
  get completedAt() { return this.#completedAt }
  get error() { return this.#error }
  get metadata() { return { ...this.#metadata } }
  get config() { return { ...this.#config } }

  start() {
    if (this.#status === JobStatus.CANCELLED) {
      throw new Error('Cannot start a cancelled job')
    }
    this.#status = JobStatus.RUNNING
    this.#startedAt = Date.now()
    return this
  }

  complete() {
    this.#status = JobStatus.COMPLETED
    this.#completedAt = Date.now()
    this.#progress = 100
    return this
  }

  fail(error) {
    this.#status = JobStatus.FAILED
    this.#completedAt = Date.now()
    this.#error = error?.message || String(error)
    return this
  }

  cancel() {
    this.#status = JobStatus.CANCELLED
    this.#completedAt = Date.now()
    return this
  }

  pause() {
    if (this.#status === JobStatus.RUNNING) {
      this.#status = JobStatus.PAUSED
    }
    return this
  }

  resume() {
    if (this.#status === JobStatus.PAUSED) {
      this.#status = JobStatus.RUNNING
    }
    return this
  }

  updateProgress(processed, failed, conflicts) {
    this.#processedItems = processed
    this.#failedItems = failed
    this.#conflicts = conflicts
    this.#totalItems = Math.max(this.#totalItems, processed + failed)
    this.#progress = this.#totalItems > 0 ? Math.round((processed / this.#totalItems) * 100) : 0
    return this
  }

  toJSON() {
    return {
      id: this.#id,
      entityType: this.#entityType,
      direction: this.#direction,
      provider: this.#provider,
      tenantId: this.#tenantId,
      destinationId: this.#destinationId,
      status: this.#status,
      progress: this.#progress,
      totalItems: this.#totalItems,
      processedItems: this.#processedItems,
      failedItems: this.#failedItems,
      conflicts: this.#conflicts,
      triggeredBy: this.#triggeredBy,
      createdAt: this.#createdAt,
      startedAt: this.#startedAt,
      completedAt: this.#completedAt,
      error: this.#error,
      metadata: this.#metadata,
    }
  }

  #generateId() {
    return `sync_job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }
}

export default SyncJob
