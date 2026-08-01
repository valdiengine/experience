/**
 * Reservation Capability — Production Reservation Layer
 *
 * Business-agnostic: orchestration of booking, availability, communication, notifications
 * Uses capabilities through context.capabilities.get()
 * No direct imports from other capabilities
 */
import { BaseCapability } from '../core/base.capability.js'
import { ReservationManager } from './reservation.manager.js'
import { ReservationService } from './reservation.service.js'
import { ReservationWorkflow } from './reservation.workflow.js'
import { ReservationTimer } from './reservation.timer.js'
import { ReservationRecovery } from './reservation.recovery.js'
import { ReservationFlow } from './reservation.flow.js'
import { RESERVATION_EVENTS } from './reservation.events.js'
import { RESERVATION_STATUS } from './reservation.status.js'
import { ReservationSearch } from './reservation.search.js'

export class ReservationCapability extends BaseCapability {
  static id = 'reservation'
  static name = 'Reservation'
  static version = '2.1.0'
  static dependencies = ['booking', 'availability', 'communication', 'notifications']

  #manager = null
  #service = null
  #timer = null
  #recovery = null

  async init(context, config = {}) {
    await super.init(context, config)
    this.#manager = new ReservationManager(context)
    this.#service = new ReservationService(this.#manager)
    this.#timer = new ReservationTimer(context)
    this.#recovery = new ReservationRecovery(context)
    if (typeof this.#manager.hydrate === 'function') {
      await this.#manager.hydrate()
    }
  }

  async activate() {
    this.on(RESERVATION_EVENTS.CREATED, this.#onReservationCreated.bind(this))
    this.on(RESERVATION_EVENTS.OWNER_CONFIRMED, this.#onOwnerConfirmed.bind(this))
    this.on(RESERVATION_EVENTS.CONFIRMED, this.#onReservationConfirmed.bind(this))
    this.on(RESERVATION_EVENTS.CANCELLED, this.#onReservationCancelled.bind(this))
    this.on(RESERVATION_EVENTS.EXPIRED, this.#onReservationExpired.bind(this))
    await super.activate()
  }

  async deactivate() {
    await super.deactivate()
  }

  async destroy() {
    this.#manager = null
    this.#timer = null
    this.#recovery = null
    await super.destroy()
  }

  // ── Getters ──

  get manager() { return this.#manager }
  get service() { return this.#service }
  get timer() { return this.#timer }
  get recovery() { return this.#recovery }

  // ── Flow ──

  /**
   * Create a new reservation flow
   * @param {object} config - { minStay, maxStay, resourceId, requiredFields }
   * @returns {ReservationFlow}
   */
  createFlow(config = {}) {
    return new ReservationFlow(this.context, config)
  }

  // ── Core Methods ──

  async createRequest(data) {
    const result = await this.#manager?.createRequest(data) || { success: false, errors: ['Manager not initialized'] }
    if (result.success && result.reservationId) {
      this.#timer?.startReservationTimer(result.reservationId, RESERVATION_STATUS.REQUESTED)
    }
    return result
  }

  async validateReservation(reservationId) {
    return this.#manager?.validateReservation(reservationId) || { valid: false, conflicts: ['Manager not initialized'] }
  }

  async requestOwnerConfirmation(reservationId) {
    const result = await this.#manager?.requestOwnerConfirmation(reservationId) || { success: false, errors: ['Manager not initialized'] }
    if (result.success) {
      this.#timer?.stopTimer(reservationId, RESERVATION_STATUS.REQUESTED)
      this.#timer?.startReservationTimer(reservationId, RESERVATION_STATUS.OWNER_PENDING)
    }
    return result
  }

  async confirmReservation(reservationId) {
    const result = await this.#manager?.confirmReservation(reservationId) || { success: false, errors: ['Manager not initialized'] }
    if (result.success) {
      this.#timer?.stopTimer(reservationId, RESERVATION_STATUS.OWNER_PENDING)
    }
    return result
  }

  async rejectReservation(reservationId, reason) {
    const result = await this.#manager?.rejectReservation(reservationId, reason) || { success: false, errors: ['Manager not initialized'] }
    if (result.success) {
      this.#timer?.stopTimer(reservationId, RESERVATION_STATUS.OWNER_PENDING)
    }
    return result
  }

  async cancelReservation(reservationId, reason) {
    const result = await this.#manager?.cancelReservation(reservationId, reason) || { success: false, errors: ['Manager not initialized'] }
    if (result.success) {
      this.#timer?.stopTimer(reservationId, RESERVATION_STATUS.OWNER_PENDING)
      this.#timer?.stopTimer(reservationId, RESERVATION_STATUS.PAYMENT_PENDING)
    }
    return result
  }

  async expireReservation(reservationId) {
    return this.#manager?.expireReservation(reservationId) || { success: false, errors: ['Manager not initialized'] }
  }

  // ── Recovery ──

  async runRecovery() {
    return this.#recovery?.scanAndRepair() || { issues: [], results: [] }
  }

  async runAllRecoveries() {
    return this.#recovery?.runAllRecoveries() || {
      pending: { recovered: 0, failed: 0 },
      expired: { recovered: 0, failed: 0 },
      notifications: { recovered: 0, failed: 0 },
      totalRecovered: 0,
      totalFailed: 0,
    }
  }

  async recoverPendingReservations() {
    return this.#recovery?.recoverPendingReservations() || { recovered: 0, failed: 0 }
  }

  async recoverExpiredReservations() {
    return this.#recovery?.recoverExpiredReservations() || { recovered: 0, failed: 0 }
  }

  async recoverFailedNotifications() {
    return this.#recovery?.recoverFailedNotifications() || { recovered: 0, failed: 0 }
  }

  // ── Queries ──

  getById(reservationId) {
    return this.#manager?.getById(reservationId) || null
  }

  getAll() {
    return this.#manager?.getAll() || []
  }

  getByStatus(status) {
    return this.#manager?.getByStatus(status) || []
  }

  // ── Event Handlers ──

  #onReservationCreated(event) {
    this.#triggerSearchIndex(event.reservation)
  }

  #onOwnerConfirmed(event) {
    this.#triggerSearchIndex(event.reservation)
  }

  #onReservationConfirmed(event) {
    this.#triggerSearchIndex(event.reservation)
  }

  #onReservationCancelled(event) {
    this.#triggerSearchIndex(event.reservation)
  }

  #onReservationExpired(event) {
    this.#triggerSearchRemove(event.reservation)
  }

  #triggerSearchIndex(reservation) {
    if (!reservation) return
    const search = this.context?.runtime?.search
    if (!search) return
    const payload = ReservationSearch.toPayload(reservation)
    search.index('reservation', payload).catch((err) => {
      console.error('[ReservationCapability] Search index failed:', err)
    })
  }

  #triggerSearchRemove(reservation) {
    if (!reservation) return
    const search = this.context?.runtime?.search
    if (!search) return
    search.delete('reservation', reservation.id).catch((err) => {
      console.error('[ReservationCapability] Search remove failed:', err)
    })
  }
}

export default ReservationCapability
