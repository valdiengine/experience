/**
 * Reservation Recovery — Detects and repairs inconsistent reservations
 *
 * Idempotent: can run multiple times without side effects
 * Uses the reservation repository for data access (DataManager as fallback)
 * Automatic workflows for stuck/expired/failed reservations
 *
 * P13.5.3 correction (C2): repository-backed reads and writes
 */
import { RESERVATION_STATUS } from './reservation.status.js'
import { RESERVATION_EVENTS } from './reservation.events.js'
import { ReservationWorkflow } from './reservation.workflow.js'

export class ReservationRecovery {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Scan all reservations for issues
   * @returns {Promise<object[]>} - Array of detected issues
   */
  async scan() {
    const reservations = await this.#getReservations()
    const issues = []

    for (const reservation of reservations) {
      const reservationIssues = this.#detectIssues(reservation)
      issues.push(...reservationIssues)
    }

    return issues
  }

  /**
   * Detect issues with a single reservation
   * @param {object} reservation
   * @returns {object[]}
   */
  #detectIssues(reservation) {
    const issues = []

    if (reservation.status === RESERVATION_STATUS.OWNER_PENDING) {
      if (reservation.ownerResponse) {
        issues.push({
          type: 'owner_response_exists',
          reservationId: reservation.id,
          tenantId: reservation.tenantId,
          status: reservation.status,
          suggestedAction: 'transition_to_owner_confirmed',
          severity: 'medium',
        })
      }

      const age = Date.now() - new Date(reservation.updatedAt || reservation.createdAt).getTime()
      if (age > 48 * 60 * 60 * 1000) {
        issues.push({
          type: 'pending_owner_stuck',
          reservationId: reservation.id,
          tenantId: reservation.tenantId,
          status: reservation.status,
          suggestedAction: 'notify_owner_and_client',
          severity: 'high',
        })
      }
    }

    if (reservation.status === RESERVATION_STATUS.CONFIRMED) {
      const availability = this.#checkAvailabilityBlocked(reservation)
      if (!availability.blocked) {
        issues.push({
          type: 'availability_not_blocked',
          reservationId: reservation.id,
          tenantId: reservation.tenantId,
          status: reservation.status,
          suggestedAction: 'sync_availability',
          severity: 'high',
        })
      }
    }

    if (reservation.status === RESERVATION_STATUS.REQUESTED) {
      const age = Date.now() - new Date(reservation.createdAt).getTime()
      if (age > 48 * 60 * 60 * 1000) {
        issues.push({
          type: 'stale_request',
          reservationId: reservation.id,
          tenantId: reservation.tenantId,
          status: reservation.status,
          suggestedAction: 'expire',
          severity: 'low',
        })
      }
    }

    if (reservation.status === RESERVATION_STATUS.PAYMENT_PENDING) {
      const age = Date.now() - new Date(reservation.updatedAt || reservation.createdAt).getTime()
      if (age > 24 * 60 * 60 * 1000) {
        issues.push({
          type: 'payment_stuck',
          reservationId: reservation.id,
          tenantId: reservation.tenantId,
          status: reservation.status,
          suggestedAction: 'release_availability',
          severity: 'high',
        })
      }
    }

    if (reservation.status === RESERVATION_STATUS.CONFIRMED && reservation.notificationFailed) {
      issues.push({
        type: 'notification_failed',
        reservationId: reservation.id,
        tenantId: reservation.tenantId,
        status: reservation.status,
        suggestedAction: 'retry_notification',
        severity: 'medium',
      })
    }

    return issues
  }

  /**
   * Repair detected issues
   * @param {object[]} issues
   * @returns {Promise<object[]>} - Repair results
   */
  async repair(issues = []) {
    const results = []

    for (const issue of issues) {
      const result = await this.#repairIssue(issue)
      results.push({ issue, ...result })
    }

    return results
  }

  /**
   * Scan and repair all issues
   * @returns {object} - { issues, results }
   */
  async scanAndRepair() {
    const issues = await this.scan()
    const results = await this.repair(issues)
    return { issues, results }
  }

  /**
   * Recover reservations stuck in PENDING_OWNER_CONFIRMATION
   * Notifies owner and client about pending status
   * @returns {object} - { recovered, failed }
   */
  async recoverPendingReservations() {
    const reservations = await this.#getReservations()
    const results = { recovered: 0, failed: 0, actions: [] }

    for (const reservation of reservations) {
      if (reservation.status !== RESERVATION_STATUS.OWNER_PENDING) continue

      const age = Date.now() - new Date(reservation.updatedAt || reservation.createdAt).getTime()
      if (age <= 24 * 60 * 60 * 1000) continue

      try {
        const notification = this.#context?.capabilities?.get?.('communication')
        if (notification) {
          await notification.send({
            to: reservation.ownerEmail,
            type: 'reservation_reminder',
            payload: {
              reservationId: reservation.id,
              customerName: reservation.customer?.name,
              dates: reservation.dates,
            },
          })

          await notification.send({
            to: reservation.customer?.email,
            type: 'reservation_pending_update',
            payload: {
              reservationId: reservation.id,
              dates: reservation.dates,
            },
          })
        }

        results.recovered++
        results.actions.push({
          reservationId: reservation.id,
          action: 'notify_owner_and_client',
          timestamp: new Date().toISOString(),
        })

        this.#emit(RESERVATION_EVENTS.RECOVERED, {
          reservationId: reservation.id,
          issue: 'pending_owner_stuck',
          action: 'notify_owner_and_client',
        })
      } catch (error) {
        results.failed++
        results.actions.push({
          reservationId: reservation.id,
          action: 'notify_failed',
          error: error.message,
        })
      }
    }

    return results
  }

  /**
   * Recover expired reservations by releasing availability
   * @returns {object} - { recovered, failed }
   */
  async recoverExpiredReservations() {
    const reservations = await this.#getReservations()
    const results = { recovered: 0, failed: 0, actions: [] }

    for (const reservation of reservations) {
      if (reservation.status !== RESERVATION_STATUS.EXPIRED) continue
      if (reservation.availabilityReleased) continue

      try {
        const availability = this.#context?.capabilities?.get?.('availability')
        if (availability) {
          await availability.updateAvailability([{
            date: reservation.dates.checkIn,
            endDate: reservation.dates.checkOut,
            status: 'available',
            resourceId: reservation.resourceId,
          }])
        }

        await this.#updateReservation(reservation.id, { availabilityReleased: true })

        results.recovered++
        results.actions.push({
          reservationId: reservation.id,
          action: 'release_availability',
          timestamp: new Date().toISOString(),
        })

        this.#emit(RESERVATION_EVENTS.RECOVERED, {
          reservationId: reservation.id,
          issue: 'expired_availability',
          action: 'release_availability',
        })
      } catch (error) {
        results.failed++
        results.actions.push({
          reservationId: reservation.id,
          action: 'release_failed',
          error: error.message,
        })
      }
    }

    return results
  }

  /**
   * Recover failed notifications by retrying them
   * @returns {object} - { recovered, failed }
   */
  async recoverFailedNotifications() {
    const reservations = await this.#getReservations()
    const results = { recovered: 0, failed: 0, actions: [] }

    for (const reservation of reservations) {
      if (!reservation.notificationFailed) continue

      try {
        const communication = this.#context?.capabilities?.get?.('communication')
        if (communication) {
          await communication.send({
            to: reservation.customer?.email,
            type: 'reservation_update',
            payload: {
              reservationId: reservation.id,
              status: reservation.status,
              dates: reservation.dates,
            },
          })

          await this.#updateReservation(reservation.id, { notificationFailed: false })

          results.recovered++
          results.actions.push({
            reservationId: reservation.id,
            action: 'retry_notification',
            timestamp: new Date().toISOString(),
          })

          this.#emit(RESERVATION_EVENTS.RECOVERED, {
            reservationId: reservation.id,
            issue: 'notification_failed',
            action: 'retry_notification',
          })
        }
      } catch (error) {
        results.failed++
        results.actions.push({
          reservationId: reservation.id,
          action: 'retry_notification_failed',
          error: error.message,
        })
      }
    }

    return results
  }

  /**
   * Run all automatic recovery workflows
   * @returns {object}
   */
  async runAllRecoveries() {
    const pending = await this.recoverPendingReservations()
    const expired = await this.recoverExpiredReservations()
    const notifications = await this.recoverFailedNotifications()

    return {
      pending,
      expired,
      notifications,
      totalRecovered: pending.recovered + expired.recovered + notifications.recovered,
      totalFailed: pending.failed + expired.failed + notifications.failed,
    }
  }

  /**
   * Repair a single issue
   * @private
   */
  async #repairIssue(issue) {
    switch (issue.type) {
      case 'owner_response_exists':
        return this.#repairOwnerResponseExists(issue)
      case 'availability_not_blocked':
        return this.#repairAvailabilityNotBlocked(issue)
      case 'stale_request':
        return this.#repairStaleRequest(issue)
      case 'pending_owner_stuck':
        return this.#repairPendingOwnerStuck(issue)
      case 'payment_stuck':
        return this.#repairPaymentStuck(issue)
      case 'notification_failed':
        return this.#repairNotificationFailed(issue)
      default:
        return { success: false, error: 'Unknown issue type' }
    }
  }

  /**
   * Repair owner response exists
   * @private
   */
  async #repairOwnerResponseExists(issue) {
    const reservation = await this.#getReservation(issue.reservationId)
    if (!reservation) return { success: false, error: 'Reservation not found' }

    if (reservation.status !== RESERVATION_STATUS.OWNER_PENDING) {
      return { success: false, error: 'Status changed' }
    }

    try {
      const updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.OWNER_CONFIRMED)
      await this.#saveReservation(updated)
      this.#emit(RESERVATION_EVENTS.RECOVERED, {
        reservationId: issue.reservationId,
        issue: issue.type,
        action: 'transition_to_owner_confirmed',
      })
      return { success: true, action: 'transition_to_owner_confirmed' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Repair availability not blocked
   * @private
   */
  async #repairAvailabilityNotBlocked(issue) {
    const reservation = await this.#getReservation(issue.reservationId)
    if (!reservation) return { success: false, error: 'Reservation not found' }

    const availability = this.#context?.capabilities?.get?.('availability')
    if (availability) {
      availability.updateAvailability([{
        date: reservation.dates.checkIn,
        endDate: reservation.dates.checkOut,
        status: 'unavailable',
        resourceId: reservation.resourceId,
      }])

      this.#emit(RESERVATION_EVENTS.RECOVERED, {
        reservationId: issue.reservationId,
        issue: issue.type,
        action: 'sync_availability',
      })
      return { success: true, action: 'sync_availability' }
    }

    return { success: false, error: 'Availability capability not available' }
  }

  /**
   * Repair stale request
   * @private
   */
  async #repairStaleRequest(issue) {
    const reservation = await this.#getReservation(issue.reservationId)
    if (!reservation) return { success: false, error: 'Reservation not found' }

    if (reservation.status !== RESERVATION_STATUS.REQUESTED) {
      return { success: false, error: 'Status changed' }
    }

    try {
      const updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.EXPIRED)
      await this.#saveReservation(updated)
      this.#emit(RESERVATION_EVENTS.RECOVERED, {
        reservationId: issue.reservationId,
        issue: issue.type,
        action: 'expire_stale',
      })
      return { success: true, action: 'expire_stale' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Repair pending owner stuck
   * @private
   */
  async #repairPendingOwnerStuck(issue) {
    const reservation = await this.#getReservation(issue.reservationId)
    if (!reservation) return { success: false, error: 'Reservation not found' }

    const communication = this.#context?.capabilities?.get?.('communication')
    if (communication) {
      communication.send({
        to: reservation.ownerEmail,
        type: 'reservation_reminder',
        payload: {
          reservationId: reservation.id,
          customerName: reservation.customer?.name,
          dates: reservation.dates,
        },
      })

      this.#emit(RESERVATION_EVENTS.RECOVERED, {
        reservationId: issue.reservationId,
        issue: issue.type,
        action: 'notify_owner_reminder',
      })
      return { success: true, action: 'notify_owner_reminder' }
    }

    return { success: false, error: 'Communication capability not available' }
  }

  /**
   * Repair payment stuck — release availability
   * @private
   */
  async #repairPaymentStuck(issue) {
    const reservation = await this.#getReservation(issue.reservationId)
    if (!reservation) return { success: false, error: 'Reservation not found' }

    try {
      const updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.EXPIRED)
      await this.#saveReservation(updated)

      const availability = this.#context?.capabilities?.get?.('availability')
      if (availability) {
        availability.updateAvailability([{
          date: reservation.dates.checkIn,
          endDate: reservation.dates.checkOut,
          status: 'available',
          resourceId: reservation.resourceId,
        }])
      }

      this.#emit(RESERVATION_EVENTS.RECOVERED, {
        reservationId: issue.reservationId,
        issue: issue.type,
        action: 'expire_and_release',
      })
      return { success: true, action: 'expire_and_release' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Repair notification failed
   * @private
   */
  async #repairNotificationFailed(issue) {
    const reservation = await this.#getReservation(issue.reservationId)
    if (!reservation) return { success: false, error: 'Reservation not found' }

    const communication = this.#context?.capabilities?.get?.('communication')
    if (communication) {
      communication.send({
        to: reservation.customer?.email,
        type: 'reservation_update',
        payload: {
          reservationId: reservation.id,
          status: reservation.status,
          dates: reservation.dates,
        },
      })

      await this.#updateReservation(reservation.id, { notificationFailed: false })

      this.#emit(RESERVATION_EVENTS.RECOVERED, {
        reservationId: issue.reservationId,
        issue: issue.type,
        action: 'retry_notification',
      })
      return { success: true, action: 'retry_notification' }
    }

    return { success: false, error: 'Communication capability not available' }
  }

  /**
   * Check if availability is blocked
   * @private
   */
  #checkAvailabilityBlocked(reservation) {
    const availability = this.#context?.capabilities?.get?.('availability')
    if (availability) {
      const isAvailable = availability.isAvailable(reservation.dates.checkIn)
      return { blocked: !isAvailable }
    }
    return { blocked: true }
  }

  get #repo() {
    return this.#context?.repositories?.reservation || null
  }

  /**
   * Get all reservations
   * @private
   */
  async #getReservations() {
    if (this.#repo) {
      try {
        const fromRepo = await this.#repo.findMany({})
        if (Array.isArray(fromRepo) && fromRepo.length > 0) return fromRepo
      } catch { /* fall through to DataManager */ }
    }
    return this.#context?.dataManager?.get('reservations') || []
  }

  /**
   * Get reservation by ID
   * @private
   */
  async #getReservation(id) {
    if (this.#repo) {
      try {
        const fromRepo = await this.#repo.findById(id)
        if (fromRepo) return fromRepo
      } catch { /* fall through to DataManager */ }
    }
    const reservations = this.#context?.dataManager?.get('reservations') || []
    return reservations.find(r => r.id === id) || null
  }

  /**
   * Save reservation
   * @private
   */
  async #saveReservation(reservation) {
    if (this.#repo) {
      try {
        const updated = await this.#repo.update({ id: reservation.id }, reservation)
        if (!updated) {
          await this.#repo.create(reservation)
        }
      } catch { /* repository not resolvable — fall back to DataManager */ }
    }
    if (this.#context?.dataManager) {
      const reservations = this.#context.dataManager.get('reservations') || []
      const index = reservations.findIndex(r => r.id === reservation.id)
      if (index >= 0) {
        reservations[index] = reservation
      } else {
        reservations.push(reservation)
      }
      this.#context.dataManager.set('reservations', reservations)
    }
  }

  /**
   * Update specific fields on a reservation
   * @private
   */
  async #updateReservation(reservationId, fields) {
    const reservation = await this.#getReservation(reservationId)
    if (!reservation) return

    const updated = { ...reservation, ...fields, updatedAt: new Date().toISOString() }
    await this.#saveReservation(updated)
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
