/**
 * Scheduler Jobs — Job type definitions and handlers
 *
 * Business-agnostic: defines job structures, not business logic
 */
import { JOB_TYPE, JOB_STATUS } from './scheduler.schema.js'

export class JobBuilder {
  /**
   * Create a delayed job
   * @param {object} params - { id, handler, payload, delayMs }
   * @returns {object}
   */
  static delayed({ id, handler, payload = {}, delayMs }) {
    const now = new Date()
    const runAt = new Date(now.getTime() + delayMs)

    return {
      id,
      type: JOB_TYPE.DELAYED,
      status: JOB_STATUS.PENDING,
      handler,
      payload,
      delay: delayMs,
      runAt: runAt.toISOString(),
      retries: 0,
      maxRetries: 3,
      createdAt: now.toISOString(),
    }
  }

  /**
   * Create a recurring job
   * @param {object} params - { id, handler, payload, intervalMs, startTime }
   * @returns {object}
   */
  static recurring({ id, handler, payload = {}, intervalMs, startTime }) {
    const now = new Date()
    const start = startTime ? new Date(startTime) : now

    return {
      id,
      type: JOB_TYPE.RECURRING,
      status: JOB_STATUS.PENDING,
      handler,
      payload,
      schedule: { intervalMs },
      nextRun: start.toISOString(),
      retries: 0,
      maxRetries: 3,
      createdAt: now.toISOString(),
    }
  }

  /**
   * Create a one-time job
   * @param {object} params - { id, handler, payload, runAt }
   * @returns {object}
   */
  static oneTime({ id, handler, payload = {}, runAt }) {
    return {
      id,
      type: JOB_TYPE.ONE_TIME,
      status: JOB_STATUS.PENDING,
      handler,
      payload,
      runAt: runAt || new Date().toISOString(),
      retries: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
    }
  }

  /**
   * Mark job as running
   * @param {object} job
   * @returns {object}
   */
  static markRunning(job) {
    return { ...job, status: JOB_STATUS.RUNNING }
  }

  /**
   * Mark job as completed
   * @param {object} job
   * @returns {object}
   */
  static markCompleted(job) {
    return {
      ...job,
      status: JOB_STATUS.COMPLETED,
      lastRun: new Date().toISOString(),
    }
  }

  /**
   * Mark job as failed
   * @param {object} job
   * @returns {object}
   */
  static markFailed(job) {
    const retries = (job.retries || 0) + 1
    const shouldRetry = retries < (job.maxRetries || 3)

    return {
      ...job,
      status: shouldRetry ? JOB_STATUS.PENDING : JOB_STATUS.FAILED,
      retries,
    }
  }

  /**
   * Mark job as cancelled
   * @param {object} job
   * @returns {object}
   */
  static markCancelled(job) {
    return { ...job, status: JOB_STATUS.CANCELLED }
  }
}
