/**
 * Reservation Timer — Manages reservation lifecycle timers
 *
 * Uses Scheduler capability through context.capabilities.get()
 * No direct imports from scheduler
 * Integrates with SchedulerExecutor for reliable execution
 *
 * P13.5.3 correction (C2): repository-backed expiration writes
 */
import { RESERVATION_STATUS } from './reservation.status.js'
import { RESERVATION_EVENTS } from './reservation.events.js'
import { ReservationWorkflow } from './reservation.workflow.js'
import { ReservationConfig } from './reservation.config.js'

export class ReservationTimer {
  #context = null
  #config = null
  #timers = new Map()

  constructor(context) {
    this.#context = context
    this.#config = new ReservationConfig(context)
  }

  /**
   * Start timer for a reservation
   * @param {string} reservationId
   * @param {string} status - Current status
   * @returns {{ success: boolean, timerId?: string }}
   */
  startReservationTimer(reservationId, status) {
    if (!this.#config.getAutoExpiration()) {
      return { success: false, error: 'Auto expiration disabled' }
    }

    const timeout = this.#config.getTimeout(status)
    if (!timeout) return { success: false, error: 'No timeout for status' }

    const timerId = `timer_${reservationId}_${status}`
    this.#timers.set(timerId, {
      reservationId,
      status,
      startedAt: Date.now(),
      timeout,
      expiresAt: Date.now() + timeout,
    })

    this.#scheduleExpiration(reservationId, status, timeout)

    return { success: true, timerId }
  }

  /**
   * Stop timer for a reservation
   * @param {string} reservationId
   * @param {string} status
   */
  stopTimer(reservationId, status) {
    const timerId = `timer_${reservationId}_${status}`
    this.#timers.delete(timerId)

    const scheduler = this.#context?.capabilities?.get?.('scheduler')
    if (scheduler) {
      const jobs = scheduler.getJobs()
      const reservationJobs = jobs.filter(
        j => j.payload?.reservationId === reservationId &&
             j.handler === 'reservationExpiration' &&
             j.status === 'pending'
      )
      for (const job of reservationJobs) {
        scheduler.cancel(job.id)
      }
    }
  }

  /**
   * Check for expired reservations
   * @returns {string[]} - Array of expired reservation IDs
   */
  checkExpiration() {
    const now = Date.now()
    const expired = []

    for (const [timerId, timer] of this.#timers) {
      if (now >= timer.expiresAt) {
        expired.push(timer.reservationId)
        this.#expireReservation(timer.reservationId, timer.status)
        this.#timers.delete(timerId)
      }
    }

    return expired
  }

  /**
   * Get active timers
   * @returns {object[]}
   */
  getActiveTimers() {
    return Array.from(this.#timers.values())
  }

  /**
   * Get timer for reservation
   * @param {string} reservationId
   * @returns {object|null}
   */
  getTimer(reservationId) {
    for (const timer of this.#timers.values()) {
      if (timer.reservationId === reservationId) {
        return timer
      }
    }
    return null
  }

  /**
   * Schedule expiration via Scheduler capability
   * @private
   */
  #scheduleExpiration(reservationId, status, timeout) {
    const scheduler = this.#context?.capabilities?.get?.('scheduler')
    if (scheduler) {
      scheduler.schedule({
        type: 'delayed',
        handler: 'reservationExpiration',
        payload: { reservationId, status },
        tenantId: this.#context?.tenant?.id,
        delayMs: timeout,
      })
    }
  }

  /**
   * Expire a reservation
   * @private
   */
  async #expireReservation(reservationId, status) {
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) return

    if (ReservationWorkflow.canExpire(status)) {
      const targetStatus = ReservationWorkflow.getExpirationTarget(status)

      if (targetStatus) {
        try {
          const updated = ReservationWorkflow.transition(reservation, targetStatus)
          await this.#saveReservation(updated)

          this.#emit(RESERVATION_EVENTS.EXPIRED, {
            reservationId,
            fromStatus: status,
            toStatus: targetStatus,
          })
        } catch (error) {
          console.error(`[ReservationTimer] Failed to expire ${reservationId}:`, error.message)
        }
      }
    }
  }

  /**
   * Load a reservation from the repository first, then DataManager
   * @private
   */
  async #loadReservation(reservationId) {
    const repo = this.#context?.repositories?.reservation
    if (repo) {
      try {
        const found = await repo.findById(reservationId)
        if (found) return found
      } catch { /* fall through to DataManager */ }
    }
    return this.#context?.dataManager?.get(`reservations.${reservationId}`) || null
  }

  /**
   * Save a reservation to the repository first, then DataManager
   * @private
   */
  async #saveReservation(reservation) {
    const repo = this.#context?.repositories?.reservation
    if (repo) {
      try {
        const updated = await repo.update({ id: reservation.id }, reservation)
        if (!updated) {
          await repo.create(reservation)
        }
      } catch { /* repository not resolvable — fall back to DataManager */ }
    }
    this.#context?.dataManager?.set(`reservations.${reservation.id}`, reservation)
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
