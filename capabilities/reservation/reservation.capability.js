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
import { ReservationSearch } from './reservation.search.js'

export class ReservationCapability extends BaseCapability {
  static id = 'reservation'
  static name = 'Reservation'
  static version = '2.1.0'
  static dependencies = ['booking', 'availability', 'communication', 'notifications']

  #manager = null
  #service = null
  #timer = null
  #timerActivation = null
  #recovery = null

  async init(context, config = {}) {
    await super.init(context, config)
    this.#manager = new ReservationManager(context)
    this.#service = new ReservationService(this.#manager)
    // BOOKING-EXPIRATION-TIMERS-1. The timer is handed the manager so it can (a)
    // route expiration through the single atomic manager path and (b) attach
    // itself to the manager, which is where lifecycle timer wiring lives. Wiring
    // it in the wrappers below instead would have missed every production caller
    // that goes straight to the manager or the service (the business manager and
    // the HTTP routes do).
    this.#timer = new ReservationTimer(context, { manager: this.#manager })
    this.#recovery = new ReservationRecovery(context)
    if (typeof this.#manager.hydrate === 'function') {
      const tenantId = context?.tenant?.id
      if (tenantId && tenantId !== 'commercial') {
        await this.#manager.hydrate()
      }
    }
  }

  async activate() {
    this.on(RESERVATION_EVENTS.CREATED, this.#onReservationCreated.bind(this))
    this.on(RESERVATION_EVENTS.OWNER_CONFIRMED, this.#onOwnerConfirmed.bind(this))
    this.on(RESERVATION_EVENTS.CONFIRMED, this.#onReservationConfirmed.bind(this))
    this.on(RESERVATION_EVENTS.CANCELLED, this.#onReservationCancelled.bind(this))
    this.on(RESERVATION_EVENTS.EXPIRED, this.#onReservationExpired.bind(this))
    // BOOKING-EXPIRATION-ATOMIC-1. NO_RESPONSE is the expiration outcome for an
    // unanswered OWNER_PENDING reservation and is terminal, exactly like
    // EXPIRED. Without this subscription it would produce no search-index
    // handling at all, so the reservation would stay listed in search while its
    // capacity had been released — the same divergence EXPIRED already handled.
    // This is the directly affected consumer being wired; no event-delivery
    // framework is introduced and the existing EXPIRED path is unchanged.
    this.on(RESERVATION_EVENTS.NO_RESPONSE, this.#onReservationNoResponse.bind(this))
    // BOOKING-EXPIRATION-TIMERS-1. The `reservationExpiration` handler is
    // registered BEFORE anything can schedule it; previously the name was only
    // ever enqueued, so a due job could not run.
    //
    // The outcome is kept and exposed on `timerActivation` instead of being
    // discarded: an activation without a scheduler used to report success while no
    // expiration handler existed, leaving every armed deadline unrunnable and the
    // failure invisible.
    //
    // It is REPORTED, not thrown. Without a scheduler, automatic expiration is
    // off and says so; every other reservation duty still works, and failing the
    // whole capability over one absent dependency would take the search-index,
    // event and manager behaviour down with it. `already_active` is a legitimate
    // outcome and is not a failure.
    this.#timerActivation = (await this.#timer?.activate()) ?? null
    await super.activate()
  }

  /**
   * The timer registration outcome from the last `activate()`: `{ status, handler, error }`.
   * A `failed` status means automatic expiration is not running in this process.
   * @returns {{ status: string, handler?: string, error?: string }|null}
   */
  get timerActivation() {
    return this.#timerActivation
  }

  async deactivate() {
    // Stops this instance's timers and cancels their queued jobs before the
    // capability goes away. Does not touch another instance's jobs.
    await this.#timer?.deactivate()
    await super.deactivate()
  }

  async destroy() {
    await this.#timer?.destroy()
    this.#manager?.attachTimer?.(null)
    this.#manager = null
    this.#service = null
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
    // BOOKING-EXPIRATION-TIMERS-1. The `requested` timer is armed by the manager
    // after the reservation is persisted; the wrapper only forwards the result,
    // which now carries the separate `timer` outcome.
    return this.#manager?.createRequest(data) || { success: false, errors: ['Manager not initialized'] }
  }

  async validateReservation(reservationId) {
    return this.#manager?.validateReservation(reservationId) || { valid: false, conflicts: ['Manager not initialized'] }
  }

  async requestOwnerConfirmation(reservationId) {
    // The manager stops the `requested` timer and arms the 24h `owner_pending`
    // one, anchored to that transition.
    return this.#manager?.requestOwnerConfirmation(reservationId) || { success: false, errors: ['Manager not initialized'] }
  }

  async confirmReservation(reservationId) {
    // The manager drops the `owner_pending` timer and arms the 6h
    // `payment_pending` one.
    return this.#manager?.confirmReservation(reservationId) || { success: false, errors: ['Manager not initialized'] }
  }

  async rejectReservation(reservationId, reason) {
    // The manager stops every timer for the reservation, including `requested`.
    return this.#manager?.rejectReservation(reservationId, reason) || { success: false, errors: ['Manager not initialized'] }
  }

  async cancelReservation(reservationId, reason) {
    // The manager stops every timer for the reservation, including `requested` —
    // the case these wrappers used to omit.
    return this.#manager?.cancelReservation(reservationId, reason) || { success: false, errors: ['Manager not initialized'] }
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

  /**
   * The NO_RESPONSE expiration outcome is terminal, so it removes the
   * reservation from the search index exactly as EXPIRED does.
   * BOOKING-EXPIRATION-ATOMIC-1.
   */
  #onReservationNoResponse(event) {
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
