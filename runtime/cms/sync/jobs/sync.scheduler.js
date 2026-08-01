import { SyncJob, JobStatus } from './sync.job.js'
import { SYNC_EVENTS, createSyncEvent } from '../events/sync.events.js'

export class SyncScheduler {
  #eventBus = null
  #schedules = new Map()
  #timers = new Map()
  #running = false

  constructor() {
    this.#schedules = new Map()
    this.#timers = new Map()
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  schedule(config) {
    const id = config.id || `schedule_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    this.#schedules.set(id, {
      id,
      entityType: config.entityType,
      direction: config.direction || 'pull',
      provider: config.provider,
      tenantId: config.tenantId || null,
      interval: config.interval || 300000,
      cronExpression: config.cronExpression || null,
      enabled: config.enabled ?? true,
      lastRun: null,
      nextRun: null,
      config: config.config || {},
      handler: config.handler || null,
      createdAt: Date.now(),
    })

    if (this.#running && this.#schedules.get(id).enabled) {
      this.#startTimer(id)
    }

    return id
  }

  unschedule(id) {
    this.#stopTimer(id)
    return this.#schedules.delete(id)
  }

  enable(id) {
    const schedule = this.#schedules.get(id)
    if (!schedule) return false
    schedule.enabled = true
    if (this.#running) this.#startTimer(id)
    return true
  }

  disable(id) {
    const schedule = this.#schedules.get(id)
    if (!schedule) return false
    schedule.enabled = false
    this.#stopTimer(id)
    return true
  }

  get(id) {
    return this.#schedules.get(id) || null
  }

  list() {
    return Array.from(this.#schedules.values())
  }

  start() {
    this.#running = true
    for (const [id, schedule] of this.#schedules) {
      if (schedule.enabled) {
        this.#startTimer(id)
      }
    }
  }

  stop() {
    this.#running = false
    for (const id of this.#timers.keys()) {
      this.#stopTimer(id)
    }
  }

  executeNow(id) {
    const schedule = this.#schedules.get(id)
    if (!schedule) return null

    return this.#executeSchedule(schedule)
  }

  getNextRun(id) {
    const schedule = this.#schedules.get(id)
    return schedule?.nextRun || null
  }

  getStatus() {
    return {
      running: this.#running,
      schedules: this.#schedules.size,
      activeTimers: this.#timers.size,
      nextRuns: Array.from(this.#schedules.values())
        .filter(s => s.enabled && s.nextRun)
        .sort((a, b) => a.nextRun - b.nextRun)
        .slice(0, 10)
        .map(s => ({ id: s.id, entityType: s.entityType, nextRun: s.nextRun })),
    }
  }

  #startTimer(id) {
    this.#stopTimer(id)
    const schedule = this.#schedules.get(id)
    if (!schedule) return

    const interval = schedule.interval
    const now = Date.now()
    schedule.nextRun = now + interval

    const timer = setTimeout(() => {
      this.#executeSchedule(schedule)
      if (this.#running && schedule.enabled) {
        this.#startTimer(id)
      }
    }, interval)

    this.#timers.set(id, timer)
  }

  #stopTimer(id) {
    const timer = this.#timers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.#timers.delete(id)
    }
  }

  async #executeSchedule(schedule) {
    schedule.lastRun = Date.now()
    schedule.nextRun = null

    if (typeof schedule.handler === 'function') {
      try {
        await schedule.handler(schedule)
      } catch (err) {
        // schedule error recorded in handler
      }
    }
  }
}

export default SyncScheduler
