/**
 * Scheduler Manager — Central job management
 *
 * Business-agnostic: generic job scheduling, no business logic
 * Uses DataManager for persistence
 * Emits events via EventBus
 */
import { JOB_STATUS, validateJob } from './scheduler.schema.js'
import { SCHEDULER_EVENTS } from './scheduler.events.js'
import { JobBuilder } from './scheduler.jobs.js'

export class SchedulerManager {
  #context = null
  #jobs = new Map()
  #handlers = new Map()
  #intervals = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Schedule a job
   * @param {object} jobDef - { type, handler, payload, delayMs, intervalMs, runAt }
   * @returns {{ success: boolean, jobId?: string, errors?: string[] }}
   */
  schedule(jobDef) {
    let job

    switch (jobDef.type) {
      case 'delayed':
        job = JobBuilder.delayed({
          id: jobDef.id || `job_${Date.now()}`,
          handler: jobDef.handler,
          payload: jobDef.payload,
          delayMs: jobDef.delayMs,
        })
        break
      case 'recurring':
        job = JobBuilder.recurring({
          id: jobDef.id || `job_${Date.now()}`,
          handler: jobDef.handler,
          payload: jobDef.payload,
          intervalMs: jobDef.intervalMs,
          startTime: jobDef.startTime,
        })
        break
      case 'one_time':
        job = JobBuilder.oneTime({
          id: jobDef.id || `job_${Date.now()}`,
          handler: jobDef.handler,
          payload: jobDef.payload,
          runAt: jobDef.runAt,
        })
        break
      default:
        job = JobBuilder.delayed({
          id: jobDef.id || `job_${Date.now()}`,
          handler: jobDef.handler,
          payload: jobDef.payload,
          delayMs: jobDef.delayMs || 0,
        })
    }

    if (jobDef.tenantId) {
      job.tenantId = jobDef.tenantId
    }

    const validation = validateJob(job)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    this.#jobs.set(job.id, job)
    this.#persist(job)
    this.#emit(SCHEDULER_EVENTS.JOB_CREATED, { job })

    if (job.type === 'recurring' && job.schedule?.intervalMs) {
      this.#startRecurring(job)
    }

    return { success: true, jobId: job.id }
  }

  /**
   * Cancel a job
   * @param {string} jobId
   * @returns {{ success: boolean }}
   */
  cancel(jobId) {
    const job = this.#jobs.get(jobId)
    if (!job) return { success: false }

    if (this.#intervals.has(jobId)) {
      clearInterval(this.#intervals.get(jobId))
      this.#intervals.delete(jobId)
    }

    const updated = JobBuilder.markCancelled(job)
    this.#jobs.set(jobId, updated)
    this.#persist(updated)
    this.#emit(SCHEDULER_EVENTS.JOB_CANCELLED, { jobId })

    return { success: true }
  }

  /**
   * Run a job immediately
   * @param {string} jobId
   * @returns {{ success: boolean, result?: any }}
   */
  async run(jobId) {
    const job = this.#jobs.get(jobId)
    if (!job) return { success: false }

    const running = JobBuilder.markRunning(job)
    this.#jobs.set(jobId, running)

    try {
      const handler = this.#handlers.get(job.handler)
      if (handler) {
        await handler(job.payload)
      }

      const completed = JobBuilder.markCompleted(job)
      this.#jobs.set(jobId, completed)
      this.#persist(completed)
      this.#emit(SCHEDULER_EVENTS.JOB_EXECUTED, { jobId, handler: job.handler })

      return { success: true }
    } catch (error) {
      const failed = JobBuilder.markFailed(job)
      this.#jobs.set(jobId, failed)
      this.#persist(failed)
      this.#emit(SCHEDULER_EVENTS.JOB_FAILED, { jobId, error: error.message })

      return { success: false, result: error.message }
    }
  }

  /**
   * Remove a job
   * @param {string} jobId
   * @returns {{ success: boolean }}
   */
  remove(jobId) {
    if (this.#intervals.has(jobId)) {
      clearInterval(this.#intervals.get(jobId))
      this.#intervals.delete(jobId)
    }

    this.#jobs.delete(jobId)
    this.#removeFromPersistence(jobId)
    return { success: true }
  }

  /**
   * Get all jobs
   * @returns {object[]}
   */
  getJobs() {
    return Array.from(this.#jobs.values())
  }

  /**
   * Get job by ID
   * @param {string} jobId
   * @returns {object|null}
   */
  getJob(jobId) {
    return this.#jobs.get(jobId) || null
  }

  /**
   * Register a handler function
   * @param {string} name - Handler name
   * @param {function} fn - Handler function
   */
  registerHandler(name, fn) {
    this.#handlers.set(name, fn)
  }

  /**
   * Check and execute due jobs
   */
  tick() {
    const now = new Date()
    const jobs = this.getJobs()

    for (const job of jobs) {
      if (job.status !== JOB_STATUS.PENDING) continue

      const runAt = new Date(job.runAt || job.nextRun)
      if (runAt <= now) {
        this.run(job.id)
      }
    }

    this.#emit(SCHEDULER_EVENTS.TICK, { timestamp: now.toISOString() })
  }

  /**
   * Load jobs from DataManager
   */
  loadFromDataManager() {
    const jobs = this.#context?.dataManager?.get('schedulerJobs') || []
    jobs.forEach(job => this.#jobs.set(job.id, job))
  }

  /**
   * Start recurring job interval
   * @private
   */
  #startRecurring(job) {
    if (this.#intervals.has(job.id)) return

    const interval = setInterval(() => {
      const current = this.#jobs.get(job.id)
      if (current && current.status === JOB_STATUS.PENDING) {
        const nextRun = new Date(current.nextRun || current.runAt)
        if (nextRun <= new Date()) {
          this.run(job.id).then(() => {
            const updated = this.#jobs.get(job.id)
            if (updated && updated.status === JOB_STATUS.COMPLETED) {
              const newNext = new Date(Date.now() + (current.schedule?.intervalMs || 60000))
              const reset = { ...updated, status: JOB_STATUS.PENDING, nextRun: newNext.toISOString() }
              this.#jobs.set(job.id, reset)
              this.#persist(reset)
            }
          })
        }
      }
    }, job.schedule?.intervalMs || 60000)

    this.#intervals.set(job.id, interval)
  }

  /**
   * Persist job to DataManager
   * @private
   */
  #persist(job) {
    if (this.#context?.dataManager) {
      const jobs = this.#context.dataManager.get('schedulerJobs') || []
      const index = jobs.findIndex(j => j.id === job.id)
      if (index >= 0) {
        jobs[index] = job
      } else {
        jobs.push(job)
      }
      this.#context.dataManager.set('schedulerJobs', jobs)
    }
  }

  /**
   * Remove job from persistence
   * @private
   */
  #removeFromPersistence(jobId) {
    if (this.#context?.dataManager) {
      const jobs = this.#context.dataManager.get('schedulerJobs') || []
      const filtered = jobs.filter(j => j.id !== jobId)
      this.#context.dataManager.set('schedulerJobs', filtered)
    }
  }

  /**
   * Emit event
   * @private
   */
  #emit(eventName, data) {
    if (this.#context?.eventBus) {
      this.#context.eventBus.emit(eventName, data)
    }
  }
}
