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
   *
   * `permanent` is set when the handler declares the failure non-retryable — for
   * example a failure that happened after the work was already committed. The
   * generic retry counter must not re-run those: retrying them would repeat
   * committed work, not fix anything.
   * @param {object} job
   * @param {{ permanent?: boolean }} [options]
   * @returns {object}
   */
  static markFailed(job, { permanent = false } = {}) {
    const retries = (job.retries || 0) + 1
    const shouldRetry = !permanent && retries < (job.maxRetries || 3)

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

  /**
   * Return a job to pending after an early delivery that did no work and asked to
   * be requeued. Built from the job as it was BEFORE the run, so `runAt`/`nextRun`
   * and the retry counters are untouched: the scheduled execution stays pending at
   * its original deadline instead of being consumed.
   * @param {object} job
   * @returns {object}
   */
  static markRequeued(job) {
    return { ...job, status: JOB_STATUS.PENDING }
  }
}
