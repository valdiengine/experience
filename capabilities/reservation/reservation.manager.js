/**
 * The customer-facing sentence for each expiration outcome.
 *
 * BOOKING-EXPIRATION-ATOMIC-1. A notification must describe what actually
 * happened, so the two outcomes cannot share one message. The EXPIRED wording is
 * the pre-existing sentence, kept byte-for-byte; NO_RESPONSE gets its own that
 * names the real cause (no owner reply) instead of asserting a generic expiry.
 * Copy is product-facing and is offered for review, not treated as approved legal
 * or commercial wording.
 */
const EXPIRATION_NOTIFICATION_BODIES = {
  [RESERVATION_STATUS.EXPIRED]: (reservation) =>
    `Su solicitud de reserva para ${reservation.dates.checkIn} al ${reservation.dates.checkOut} ha expirado.`,
  [RESERVATION_STATUS.NO_RESPONSE]: (reservation) =>
    `Su solicitud de reserva para ${reservation.dates.checkIn} al ${reservation.dates.checkOut} se cerró porque el propietario no respondió.`,
}

/**
 * The success event for each expiration outcome.
 *
 * BOOKING-EXPIRATION-ATOMIC-1. EXPIRED outcomes keep the existing EXPIRED event,
 * so every current subscriber of `reservation:expired` keeps working unchanged.
 * NO_RESPONSE gets the new specific event. This is a data lookup, not an event
 * framework: there is no delivery layer, queue or retry introduced here, and the
 * existing post-publication subscriber-error policy is untouched.
 */
const EXPIRATION_SUCCESS_EVENTS = {
  [RESERVATION_STATUS.EXPIRED]: RESERVATION_EVENTS.EXPIRED,
  [RESERVATION_STATUS.NO_RESPONSE]: RESERVATION_EVENTS.NO_RESPONSE,
}

/**
 * Reservation Manager — Central orchestration of reservation lifecycle
 *
 * Business-agnostic: works for any resource type
 * Consumes data through repositories and DataManager
 * Uses capabilities through context.capabilities.get()
 * No direct imports from booking, availability, communication, notifications
 *
 * P13.5.3 corrections:
 *  - C1: preserve aggregate identity (businessId, accommodationId, visitorId)
 *  - C2: repository-backed persistence (context.repositories.reservation) with
 *        in-memory + DataManager caches for backward-compatible synchronous reads
 *  - C3: authorization enforced on every lifecycle operation via context.runtime.auth
 */
import { RESERVATION_STATUS } from './reservation.status.js'
import { RESERVATION_EVENTS } from './reservation.events.js'
import { ReservationWorkflow } from './reservation.workflow.js'
import { RESERVATION_PERMISSIONS } from './reservation.permissions.js'
import { validateReservation } from './reservation.schema.js'
import { validateDateRange, validateStatusTransition, checkAvailability, checkReservationOverlap } from './reservation.validation.js'

/**
 * The synthetic tenant the commercial capability runtime boots under.
 *
 * BOOKING-EXPIRATION-STAGE-1. `application.start.js` and
 * `capability.bootstrap.js` both default the commercial tenant to
 * `{ id: 'commercial' }`. That identity exists to give the wiring a tenant-shaped
 * context; it is NOT a persisted tenant and owns no rows. Real Booking tenants
 * are the UUIDs reconstructed into the BookingRegistry.
 *
 * Sending it into a tenant-scoped persisted read is not a harmless no-op: the
 * reservations predicate is `tenant_id = $2` against a uuid column, so
 * PostgreSQL raises `invalid input syntax for type uuid: "commercial"` before any
 * scoping question is even reached.
 */
export const SYNTHETIC_COMMERCIAL_TENANT_ID = 'commercial'

/**
 * Whether a tenant id is a legitimate scope for a persisted, tenant-scoped read.
 *
 * This is deliberately a check for the ABSENCE of a persisted-tenant scope, not
 * for a specific shape (such as "looks like a UUID"). A persisted tenant is
 * whatever the database says it is; the one identity this layer knows cannot be
 * one is the synthetic commercial bootstrap tenant. Keeping the rule negative
 * means a new real tenant form is not silently refused.
 *
 * @param {string|null|undefined} tenantId
 * @returns {boolean}
 */
export function isPersistedTenantScope(tenantId) {
  if (typeof tenantId !== 'string') return false
  const normalized = tenantId.trim()
  if (normalized === '') return false
  return normalized !== SYNTHETIC_COMMERCIAL_TENANT_ID
}

export class ReservationManager {
  #context = null
  #reservations = new Map()
  #timer = null

constructor(context) {
    this.#context = context
  }

  get #repo() {
    return this.#context?.repositories?.reservation || null
  }

  /**
   * Attach the automatic-expiration timer.
   *
   * BOOKING-EXPIRATION-TIMERS-1. The wiring lives here, in the manager, rather
   * than in the capability wrappers, because production does not go through
   * those wrappers: the business manager and the service layer forward straight
   * to this manager (with an identity), while the owner/admin paths reach the
   * capability wrappers (without one). Centralising it here is what makes timer
   * arming identical for every real entry path.
   *
   * @param {object|null} timer - ReservationTimer
   * @returns {ReservationManager}
   */
  attachTimer(timer) {
    this.#timer = timer || null
    return this
  }

  get timer() {
    return this.#timer
  }

  /**
   * Bring the timers in line with a state the manager has just persisted.
   *
   * Never throws: a timer problem must not turn a completed state change into a
   * reported failure, nor fake one. The outcome is returned so callers can
   * report timer scheduling separately from the persistence result.
   *
   * @private
   */
  async #syncTimers(reservationId, current, options = {}) {
    const timer = this.#timer
    if (!timer || typeof timer.syncReservationState !== 'function') {
      return { status: 'not_configured' }
    }
    try {
      return await timer.syncReservationState(reservationId, current, options)
    } catch (error) {
      console.error(
        `[ReservationManager] Timer synchronization failed for ${reservationId}:`,
        error?.message || error
      )
      return { status: 'failed', reason: 'timer_threw', error: error?.message || String(error) }
    }
  }

  /**
   * Attach the timer outcome to a lifecycle result without implying that the
   * state change itself failed.
   * @private
   */
  #withTimer(result, timer) {
    return timer && result ? { ...result, timer } : result
  }

  /**
   * Validate the calling timer's live ownership immediately before a write.
   *
   * Returns `null` when the attempt may proceed (including when no ownership was
   * supplied, which is the case for every non-timer caller), and a refusal
   * otherwise. A refusal performs no write, no release, no event and no
   * notification.
   * @private
   */
  #validateTimerOwnership(ownership, reservationId, expectedStatus) {
    if (!ownership) return null

    if (
      ownership.reservationId !== reservationId ||
      ownership.expectedStatus !== expectedStatus ||
      typeof ownership.isCurrent !== 'function' ||
      !ownership.isCurrent()
    ) {
      return {
        success: false,
        reason: 'timer_invalidated',
        errors: [
          `Reservation ${reservationId} expiration attempt lost its timer before the write`,
        ],
      }
    }

    return null
  }

  get #auth() {
    return this.#context?.runtime?.auth || null
  }

  async #checkPermission(identity, permission, resource) {
    if (!this.#auth || !identity) return true
    try {
      await this.#auth.authorize(identity, permission, resource || 'reservation')
    } catch {
      throw new Error(`Missing permission: ${permission}`)
    }
  }

  /**
   * Public authorization gate used by the service layer for read operations
   * @param {object|null} identity
   * @param {string} permission
   * @param {string} [resource]
   * @returns {Promise<boolean>}
   */
  async authorize(identity, permission, resource) {
    await this.#checkPermission(identity, permission, resource)
    return true
  }

  /**
   * Load a reservation from the repository first, then caches
   * @private
   */
  async #loadReservation(reservationId) {
    const cached = this.#reservations.get(reservationId)
    if (cached) return cached

    if (this.#repo) {
      try {
        const found = await this.#repo.findById(reservationId)
        if (found) {
          this.#reservations.set(reservationId, found)
          return found
        }
      } catch { /* repository not resolvable — fall through to caches */ }
    }

    const fromDataManager = this.#context?.dataManager?.get('reservations')?.find(r => r.id === reservationId)
    if (fromDataManager) {
      this.#reservations.set(reservationId, fromDataManager)
      return fromDataManager
    }
    return null
  }

  /**
   * Load all reservations from the repository into the in-memory cache
   * @returns {Promise<number>} - Number of reservations hydrated
   */
  async hydrate() {
    if (!this.#repo) return 0
    try {
      const all = await this.#repo.findMany({})
      if (!Array.isArray(all)) return 0
      for (const r of all) this.#reservations.set(r.id, r)
      return all.length
    } catch {
      return 0
    }
  }

  /**
   * The tenant this context is bound to, in the shape `createRequest()` and the
   * repository both use.
   * @private
   */
  get #tenantId() {
    const tenant = this.#context?.tenant
    return (tenant && typeof tenant === 'object' ? tenant.id : tenant) || null
  }

  /**
   * Read persisted reservations in the given statuses, scoped to THIS context's
   * tenant.
   *
   * BOOKING-EXPIRATION-RECOVERY-1. Restart recovery needs to enumerate durable
   * state, and an enumeration that is not tenant-scoped is how a recovery pass
   * ends up arming or expiring another tenant's rows. Two independent guards
   * apply, and the second exists because the first is somebody else's code:
   *
   *   1. The read goes through `context.repositories.reservation`, whose
   *      `BaseRepository._buildQuery()` spreads the context tenant OVER the
   *      supplied query. A `tenantId` in the filter cannot widen the scope, and
   *      with no context tenant the query carries none at all — so this call
   *      cannot become a cross-tenant scan by accident.
   *   2. Every returned row is then checked against the context tenant and any
   *      row that disagrees is dropped and counted. A repository or adapter that
   *      ever returned more than the scope still cannot hand recovery another
   *      tenant's reservation.
   *
   * With no tenant context there is no legitimate scope to enumerate, so the
   * read is REFUSED rather than widened. That is reported, not silently empty.
   *
   * BOOKING-EXPIRATION-STAGE-1. The synthetic-tenant distinction deliberately
   * does NOT live here. This method is a provider-agnostic tenant-scoped read and
   * is also driven directly by the certified recovery/timer suites and by
   * `startTenantReservationRecovery()`. Refusing the synthetic tenant per call
   * would have to know that "commercial" is not persisted, which is a bootstrap
   * fact, not a persistence fact. The bootstrap-aware caller
   * (`ReservationCapability.activate()`) applies `isPersistedTenantScope()`
   * before reaching this method, which is where the Stage failure originated.
   *
   * @param {string[]} statuses - Reservation statuses to read
   * @returns {Promise<{ status: string, reason?: string, error?: string, tenantId: string|null, rows: object[], foreignRows: number }>}
   */
  async findReservationsByStatus(statuses) {
    const tenantId = this.#tenantId
    if (!tenantId) {
      return {
        status: 'failed',
        reason: 'no_tenant_scope',
        tenantId: null,
        rows: [],
        foreignRows: 0,
        error: 'Reservation state cannot be enumerated without a tenant-scoped context',
      }
    }
    if (!this.#repo) {
      return {
        status: 'failed',
        reason: 'repository_unavailable',
        tenantId,
        rows: [],
        foreignRows: 0,
        error: 'The reservation repository is not resolvable in this context',
      }
    }

    const wanted = Array.isArray(statuses) && statuses.length > 0 ? statuses : []
    const rows = []

    // One query per status rather than a single `in` filter: `in` support varies
    // by adapter, and a silently different filter would quietly change which
    // reservations are recovered.
    for (const status of wanted) {
      try {
        const found = await this.#repo.findMany({ status })
        if (Array.isArray(found)) rows.push(...found)
      } catch (error) {
        return {
          status: 'failed',
          reason: 'repository_read_failed',
          tenantId,
          rows: [],
          foreignRows: 0,
          error: `Reading persisted reservations for status ${status} failed: ${error?.message || error}`,
        }
      }
    }

    const owned = rows.filter((row) => row?.tenantId === tenantId)

    return {
      status: 'ok',
      tenantId,
      rows: owned,
      foreignRows: rows.length - owned.length,
    }
  }

  /**
   * Create a reservation request
   * @param {object} data - { businessId, accommodationId, visitorId, resourceId, customer, dates, guests, source }
   * @param {object|null} identity
   * @returns {{ success: boolean, reservationId?: string, status?: string, errors?: string[] }}
   */
  async createRequest(data, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.CREATE)

    const tenant = this.#context?.tenant
    const tenantId = (tenant && typeof tenant === 'object' ? tenant.id : tenant) || data.tenantId || null

    const reservation = {
      id: data.id || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      tenantId,
      businessId: data.businessId || null,
      accommodationId: data.accommodationId || null,
      visitorId: data.visitorId || null,
      resourceId: data.resourceId,
      status: RESERVATION_STATUS.REQUESTED,
      customer: data.customer,
      dates: data.dates,
      guests: data.guests || 1,
      currency: data.currency || null,
      source: data.source || 'direct',
      notes: data.notes || '',
      metadata: data.metadata || {},
      createdAt: new Date().toISOString(),
    }
    if (data.totalPrice != null) reservation.totalPrice = data.totalPrice
    if (data.currency != null) reservation.currency = data.currency

    const validation = validateReservation(reservation)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    if (reservation.accommodationId) {
      let unitPrice = null
      let lineTotal = null
      if (data.totalPrice != null && Number.isFinite(Number(data.totalPrice)) && Number(data.totalPrice) >= 0) {
        lineTotal = Number(data.totalPrice)
      }
      if (data.pricing && data.pricing.pricePerNight != null && Number.isFinite(Number(data.pricing.pricePerNight))) {
        unitPrice = Number(data.pricing.pricePerNight)
      }
      const lineData = {
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        lineOrder: 1,
        targetType: 'accommodation',
        targetId: reservation.accommodationId,
        temporal: {
          mode: 'DATE_RANGE',
          startDate: reservation.dates?.checkIn || null,
          endDate: reservation.dates?.checkOut || null,
        },
        quantity: 1,
        unitPrice,
        lineTotal,
        metadata: {},
      }

      const persisted = await this.#repo.createReservationWithLine(reservation, lineData)
      if (!persisted) {
        throw new Error(`Reservation ${reservation.id} was not persisted`)
      }
      this.#reservations.set(reservation.id, reservation)
    } else {
      await this.#persist(reservation, true)
    }

    // BOOKING-EXPIRATION-TIMERS-1 (review, group 3). Timers are reconciled directly
    // after the confirmed persistence/cache mutation and BEFORE the CREATED emit,
    // which can throw. A committed `requested` reservation must never be left with
    // no deadline because a subscriber failed. The `requested` deadline is
    // anchored to `createdAt`, the timestamp of that successful state entry. The
    // timer outcome is reported separately from `success`: a reservation that could
    // not be scheduled for expiration is still created, and says so.
    const timer = await this.#syncTimers(reservation.id, reservation, {
      onStateChange: true,
      anchor: reservation.createdAt,
    })
    this.#emit(RESERVATION_EVENTS.CREATED, { reservation })

    return this.#withTimer({
      success: true,
      reservationId: reservation.id,
      status: reservation.status,
    }, timer)
  }

  /**
   * Validate reservation (check availability, tenant rules, resource state)
   * @param {string} reservationId
   * @param {object|null} identity
   * @returns {{ valid: boolean, conflicts?: string[] }}
   */
  async validateReservation(reservationId, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.READ)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) {
      return { valid: false, conflicts: ['Reservation not found'] }
    }

    const availability = this.#context?.capabilities?.get?.('availability')
    if (availability) {
      const checkIn = reservation.dates.checkIn
      const checkOut = reservation.dates.checkOut

      if (typeof availability.isAvailable === 'function' && !(await availability.isAvailable(checkIn))) {
        return { valid: false, conflicts: [`Date ${checkIn} not available`] }
      }
    }

    this.#emit(RESERVATION_EVENTS.VALIDATED, { reservationId, valid: true })

    return { valid: true, conflicts: [] }
  }

  /**
   * Request owner confirmation via Communication capability
   * @param {string} reservationId
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async requestOwnerConfirmation(reservationId, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.UPDATE)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) {
      return { success: false, errors: ['Reservation not found'] }
    }

    const updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.OWNER_PENDING)
    await this.#persist(updated)

    // BOOKING-EXPIRATION-TIMERS-1 (review, group 3). The timers are reconciled
    // here, immediately after the confirmed write and BEFORE the communication
    // call and the event emit below, both of which can throw. Syncing after them
    // meant a committed `owner_pending` reservation could be left with no timer at
    // all whenever a subscriber or the notification transport failed — the write
    // stood, the deadline did not. The error still propagates unchanged.
    const timer = await this.#syncTimers(reservationId, updated, {
      onStateChange: true,
      anchor: updated.updatedAt,
    })

    const communication = this.#context?.capabilities?.get?.('communication')
    if (communication) {
      const channel = reservation.customer.channelPreference || 'whatsapp'
      await communication.send({
        channel,
        recipient: reservation.resourceId,
        body: `Nueva solicitud de reserva de ${reservation.customer.name} (${reservation.dates.checkIn} al ${reservation.dates.checkOut})`,
      })
    }

    this.#emit(RESERVATION_EVENTS.OWNER_REQUESTED, { reservationId, reservation: updated })

    return this.#withTimer({ success: true }, timer)
  }

  /**
   * Confirm reservation (owner confirmed)
   * @param {string} reservationId
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async confirmReservation(reservationId, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.CONFIRM)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) {
      return { success: false, errors: ['Reservation not found'] }
    }

    let updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.OWNER_CONFIRMED)
    await this.#persist(updated)

    // BOOKING-EXPIRATION-TIMERS-1 (review, group 3). Synced immediately after the
    // write, not after the availability update, the notification and the emit
    // below, every one of which can throw. `owner_confirmed` has no approved
    // automatic expiration, so the `owner_pending` timer is dropped here: a
    // reservation left in `owner_confirmed` by a failing side effect must not keep
    // an `owner_pending` deadline armed.
    await this.#syncTimers(reservationId, updated, {
      onStateChange: true,
      anchor: updated.updatedAt,
    })
    this.#emit(RESERVATION_EVENTS.OWNER_CONFIRMED, { reservationId, reservation: updated })

    const availability = this.#context?.capabilities?.get?.('availability')
    if (availability?.updateAvailability) {
      await availability.updateAvailability([{
        date: reservation.dates.checkIn,
        endDate: reservation.dates.checkOut,
        status: 'unavailable',
        resourceId: reservation.resourceId,
      }])
    }

    const notifications = this.#context?.capabilities?.get?.('notifications')
    if (notifications) {
      await notifications.send({
        channel: reservation.customer.channelPreference || 'email',
        recipient: reservation.customer.email || reservation.customer.phone,
        body: `Su reserva ha sido confirmada para ${reservation.dates.checkIn} al ${reservation.dates.checkOut}`,
      })
    }

    updated = ReservationWorkflow.transition(updated, RESERVATION_STATUS.PAYMENT_PENDING)
    await this.#persist(updated)

    // The 6h `payment_pending` deadline is anchored to this transition's
    // `updatedAt`, not to the moment the timer was armed, and it is armed here —
    // before the emit, which can throw — so a committed `payment_pending`
    // reservation is never left without its deadline.
    const timer = await this.#syncTimers(reservationId, updated, {
      onStateChange: true,
      anchor: updated.updatedAt,
    })
    this.#emit(RESERVATION_EVENTS.PAYMENT_PENDING, { reservationId, reservation: updated })

    return this.#withTimer({ success: true }, timer)
  }

  /**
   * Reject reservation
   * @param {string} reservationId
   * @param {string} reason
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async rejectReservation(reservationId, reason = '', identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.REJECT)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) {
      return { success: false, errors: ['Reservation not found'] }
    }

    const updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.REJECTED)
    updated.notes = reason ? `${updated.notes}\nRechazada: ${reason}` : updated.notes
    await this.#persist(updated)

    // Synced right after the confirmed write and before the fallible side effects
    // below, so a committed rejection cannot leave an armed deadline behind when a
    // subscriber or the notification transport throws.
    const timer = await this.#syncTimers(reservationId, updated, {
      onStateChange: true,
      anchor: updated.updatedAt,
    })

    const notifications = this.#context?.capabilities?.get?.('notifications')
    if (notifications) {
      await notifications.send({
        channel: reservation.customer.channelPreference || 'email',
        recipient: reservation.customer.email || reservation.customer.phone,
        body: `Su solicitud de reserva para ${reservation.dates.checkIn} al ${reservation.dates.checkOut} ha sido rechazada.`,
      })
    }

    this.#emit(RESERVATION_EVENTS.REJECTED, { reservationId, reservation: updated, reason })

    return this.#withTimer({ success: true }, timer)
  }

  /**
   * Cancel reservation
   * @param {string} reservationId
   * @param {string} reason
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async cancelReservation(reservationId, reason = '', identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.CANCEL)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) {
      return { success: false, errors: ['Reservation not found'] }
    }

    const updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.CANCELLED)
    updated.notes = reason ? `${updated.notes}\nCancelada: ${reason}` : updated.notes
    updated.cancelledAt = new Date().toISOString()

    // BOOKING-CANCEL-ROUTING-1. Routing is decided by the presence of the
    // repository, NOT by the config.persistenceProvider string. The repository
    // already selects its own adapter internally, so a config/adapter
    // disagreement previously picked the wrong branch: with a real repository
    // but a non-PostgreSQL config string, cancellation performed a status-only
    // update and released no capacity at all.
    if (this.#repo) {
      if (typeof this.#repo.cancelReservationWithRelease !== 'function') {
        // Never degrade to status-only persistence: capacity would stay held
        // while the caller was told the reservation was cancelled.
        throw new Error(
          `Reservation repository cannot release capacity for ${reservationId}: cancelReservationWithRelease is unavailable`
        )
      }

      // The return shape is adapter-specific: the mock branch resolves the stored
      // row (or null), while the PostgreSQL branch resolves a wrapper
      // `{ reservation, release }` from inside its transaction. Both are treated
      // purely as a success signal and the cached value stays the domain object
      // `updated`, exactly as before this change, so the cache read path is not
      // fed a wrapper object.
      const persisted = await this.#repo.cancelReservationWithRelease(updated, reservation.tenantId)
      if (!persisted) {
        // A falsy result means nothing was persisted or released. Do not cache it
        // as cancelled, do not notify, and do not emit success.
        throw new Error(
          `Reservation ${reservationId} cancellation did not persist: repository returned no row`
        )
      }

      this.#cacheReservation(updated)
    } else {
      // Repo-less cache-backed cancellation. The cache is the datastore of
      // record here: createRequest wrote no line for this shape, so no capacity
      // was ever consumed and mutating the cache is a consistent cancellation.
      // Deliberately NOT reported as failure merely for lacking a repository.
      await this.#persist(updated)
    }

    // Stopping without naming a state covers `requested` too, which the
    // capability wrapper used to omit. Synced right after the confirmed write and
    // before the notification and the emit below, so a cancelled reservation is
    // never left with a live deadline when a side effect throws.
    const timer = await this.#syncTimers(reservationId, updated, {
      onStateChange: true,
      anchor: updated.updatedAt,
    })

    const notifications = this.#context?.capabilities?.get?.('notifications')
    if (notifications) {
      await notifications.send({
        channel: reservation.customer.channelPreference || 'email',
        recipient: reservation.customer.email || reservation.customer.phone,
        body: `Su reserva para ${reservation.dates.checkIn} al ${reservation.dates.checkOut} ha sido cancelada.`,
      })
    }

    this.#emit(RESERVATION_EVENTS.CANCELLED, { reservationId, reservation: updated, reason })

    return this.#withTimer({ success: true }, timer)
  }

  /**
   * Expire reservation (timeout, abandonment)
   *
   * BOOKING-EXPIRATION-ATOMIC-1. Expiration now moves the reservation to a terminal
   * status AND releases its recorded occupied nights in ONE repository operation,
   * so the release gate in the repository (#resolveRecordedReleaseDates) applies to
   * expiration for the first time. Previously it wrote status only, via
   * #persist, and released nothing — which is why the gate, while intact, certified
   * nothing about expiration.
   *
   * Target selection follows the reservation's own current state, via
   * EXPIRATION_TARGETS, rather than being hardcoded:
   *
   *     REQUESTED      -> EXPIRED
   *     OWNER_PENDING  -> NO_RESPONSE
   *     PAYMENT_PENDING-> EXPIRED
   *     CONFIRMED      -> rejected (not expirable)
   *
   * Expiration is NOT cancellation: `cancelledAt` is never set, cleared or
   * repurposed, cancellation's reason-into-`special_requests` write is not
   * performed, and `cancelReservationWithRelease` is not called. Any pre-existing
   * `cancelledAt` on the stored row is left exactly as it is.
   *
   * Unsupported source states are rejected BEFORE the repository is reached, so
   * nothing is ever released for them, and the established thrown
   * `Invalid transition` behaviour is preserved: for every state with no
   * expiration target the call below raises that error, which is what repeated
   * manager expiry of an already-terminal reservation still does.
   *
   * A repository that cannot perform the atomic operation fails loudly. There is
   * no status-only degradation, because that is precisely the defect being fixed:
   * a missing method, a null result or a rejection produces no success, no terminal
   * cache entry, no success event and no notification.
   *
* @param {string} reservationId
  * @param {object|null} identity
  * @returns {{ success: boolean, status?: string, errors?: string[] }}
  */
  async expireReservation(reservationId, identity) {
    return this.#expireInternal(reservationId, { identity })
  }

  /**
   * Expire a reservation from a scheduled timer.
   *
   * BOOKING-EXPIRATION-TIMERS-1. A timer carries the state it was armed for, and
   * that expectation is checked HERE, against the reservation this call actually
   * loads — not by a pre-read in the timer followed by an unconstrained expire.
   * The validated state is then carried into the repository compare-and-set, so a
   * reservation that moved on after the timer fired cannot be expired by it.
   *
   * This is the same single atomic path as `expireReservation`: same target
   * selection, same status+release operation, same event and notification. There
   * is no second expiration writer.
   *
   * @param {string} reservationId
   * @param {string} expectedStatus - The state the timer was armed for
   * @returns {{ success: boolean, status?: string, reason?: string, errors?: string[] }}
   */
async expireReservationFromTimer(reservationId, expectedStatus, options = {}) {
    return this.#expireInternal(reservationId, {
      expectedStatus,
      ownership: options?.ownership || null,
    })
  }

  /**
   * @private
   */
  async #expireInternal(reservationId, { identity, expectedStatus, ownership = null } = {}) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.CANCEL)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) {
      return { success: false, reason: 'not_found', errors: ['Reservation not found'] }
    }

    if (expectedStatus !== undefined && reservation.status !== expectedStatus) {
      // The reservation is not in the state this timer was armed for. No target,
      // no write, no release and no event.
      return {
        success: false,
        reason: 'stale_state',
        errors: [
          `Reservation ${reservationId} is ${reservation.status}, not the expected ${expectedStatus}`,
        ],
      }
    }

    // The target is derived from the state the reservation is actually in, so
    // the three approved outcomes stay distinguishable and CONFIRMED stays
    // non-expirable.
    const targetStatus = ReservationWorkflow.getExpirationTarget(reservation.status)

    if (!targetStatus) {
      // Raises the established invalid-transition error for every unsupported
      // state: CONFIRMED, an already-terminal reservation such as EXPIRED or
      // NO_RESPONSE (repeated expiry), and anything else. Nothing has been
      // persisted at this point and no release has been attempted.
      ReservationWorkflow.transition(reservation, RESERVATION_STATUS.EXPIRED)
      return {
        success: false,
        reason: 'not_expirable',
        errors: [`Reservation ${reservationId} cannot be expired from status ${reservation.status}`],
      }
    }

    // BOOKING-EXPIRATION-TIMERS-1 (review, group 2). The ownership check that used
    // to live in the timer, as a pre-read before this call, has moved to here —
    // after this method's own asynchronous work and immediately before the atomic
    // write. A timer that was stopped, destroyed or replaced by a newer timer for
    // the SAME status while this call was loading cannot submit the write: without
    // this, `expectedStatus` alone cannot distinguish two attempts for one state.
    //
    // The boundary is deliberate and narrow: this prevents an obsolete attempt
    // from STARTING a write in this process. It cannot recall a write already
    // submitted or committed, it is not a distributed cancellation, not a durable
    // generation, and not a database-level generation check. Establishing that
    // would need a repository/schema contract change, which is out of this slice.
    const invalidation = this.#validateTimerOwnership(ownership, reservationId, expectedStatus)
    if (invalidation) return invalidation

    const updated = ReservationWorkflow.transition(reservation, targetStatus)

    // BOOKING-CANCEL-ROUTING-1 routing rule, applied to expiration: the branch is
    // chosen by the presence of the repository, never by the
    // config.persistenceProvider string, because the repository selects its own
    // adapter internally.
    if (this.#repo) {
      if (typeof this.#repo.expireReservationWithRelease !== 'function') {
        // Never degrade to status-only persistence: capacity would stay held
        // while the caller was told the reservation had expired.
        throw new Error(
          `Reservation repository cannot release capacity for ${reservationId}: expireReservationWithRelease is unavailable`
        )
      }

      // The result is only a success signal, and its shape is adapter-specific
      // (a bare stored row or null on the Map path, a { reservation, release }
      // wrapper from the PostgreSQL transaction) exactly as for cancellation. The
      // cached value stays the domain object `updated`, so the cache read path is
      // never fed a wrapper. The source status is passed as the repository's
      // precondition, so a reservation that moved on between this read and the
      // write cannot be expired by this call. For a scheduled expiration the
      // precondition is the state the timer was armed for, so the guarantee is
      // made about the timer's expectation as well as the local read.
      const persisted = await this.#repo.expireReservationWithRelease(updated, reservation.tenantId, {
        expectedStatus: expectedStatus ?? reservation.status,
      })
      if (!persisted) {
        throw new Error(
          `Reservation ${reservationId} expiration did not persist: repository returned no row`
        )
      }

      this.#cacheReservation(updated)
    } else {
      // Repo-less cache-backed expiration. Preserved deliberately: this shape has
      // no line to release — createRequest wrote none — so no capacity was ever
      // consumed and mutating the cache is consistent. It is not reported as a
      // failure merely for lacking a repository.
      await this.#persist(updated)
    }

    // BOOKING-EXPIRATION-TIMERS-1 (review, group 3 + post-commit classification).
    // Everything below this line is POST-COMMIT: the atomic transition AND the
    // capacity release have already succeeded, and the committed terminal state is
    // authoritative from here on.
    //
    // The timers are reconciled FIRST, still before the notification and the emit,
    // so a committed terminal reservation is never left with a live timer or a
    // queued job because a subscriber or a transport threw. Capacity release is
    // not repeated by retrying anything here, and a post-commit failure is
    // reported as exactly that — `post_commit`, non-retryable — instead of being
    // allowed to escape as an exception that the timer would have to classify as a
    // manager/release failure and retry.
    const timer = await this.#syncTimers(reservationId, updated, {
      onStateChange: true,
      anchor: updated.updatedAt,
    })

    const postCommit = await this.#afterCommit(reservationId, targetStatus, updated, reservation)

    return this.#withTimer(
      { success: true, status: targetStatus, postCommit },
      timer
    )
  }

  /**
   * The fallible work that happens after an expiration is already committed.
   *
   * Returns a descriptor rather than throwing. The transition and the release are
   * done and are not undone: the only honest thing to report is that the
   * COMMITTED state stands and that a post-commit step failed. The original error
   * is carried through unchanged and stays observable to the caller — nothing is
   * swallowed — but it can no longer be mistaken for a failed atomic transition or
   * for a release that still needs retrying.
   *
   * @returns {Promise<{ status: string, phase?: string, error?: Error }>}
   * @private
   */
  async #afterCommit(reservationId, targetStatus, updated, previous) {
    const successEvent = EXPIRATION_SUCCESS_EVENTS[targetStatus]

    try {
      const notifications = this.#context?.capabilities?.get?.('notifications')
      if (notifications) {
        const body = EXPIRATION_NOTIFICATION_BODIES[targetStatus]
        await notifications.send({
          channel: previous.customer.channelPreference || 'email',
          recipient: previous.customer.email || previous.customer.phone,
          body: typeof body === 'function' ? body(previous) : body,
        })
      }

      this.#emit(successEvent, {
        reservationId,
        reservation: updated,
        fromStatus: previous.status,
        toStatus: targetStatus,
      })

      return { status: 'completed' }
    } catch (error) {
      return {
        status: 'failed',
        phase: 'post_commit',
        // Non-retryable by construction: the transition and the release are
        // committed, so there is nothing here to retry.
        retryable: false,
        error,
      }
    }
  }

  /**
   * Complete reservation
   * @param {string} reservationId
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async completeReservation(reservationId, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.UPDATE)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) {
      return { success: false, errors: ['Reservation not found'] }
    }

    const updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.COMPLETED)
    updated.completedAt = new Date().toISOString()
    await this.#persist(updated)

    // BOOKING-EXPIRATION-TIMERS-1 (review, group 3). `completed` has no approved
    // automatic expiration, so any timer still armed for the previous state is
    // dropped here — immediately after the confirmed write and before the emit,
    // which can throw — rather than left to fire against a terminal reservation.
    const timer = await this.#syncTimers(reservationId, updated, {
      onStateChange: true,
      anchor: updated.updatedAt,
    })
    this.#emit(RESERVATION_EVENTS.COMPLETED, { reservationId, reservation: updated })

    return this.#withTimer({ success: true }, timer)
  }

  /**
   * Update reservation fields
   * @param {string} id
   * @param {object} data
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[], data?: object }}
   */
  async updateReservation(id, data, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.UPDATE)
    const reservation = await this.#loadReservation(id)
    if (!reservation) {
      return { success: false, errors: ['Reservation not found'] }
    }

    const patch = {}
    for (const [key, value] of Object.entries(data || {})) {
      if (value !== undefined) patch[key] = value
    }
    patch.id = reservation.id
    patch.tenantId = reservation.tenantId

    const updated = { ...reservation, ...patch, updatedAt: new Date().toISOString() }
    await this.#persist(updated)
    // Synced before the emit, which can throw: a raw patch that moves the
    // reservation between states must still reconcile its timers, or whatever was
    // armed for the previous state would stay armed and later try to expire a
    // reservation that has moved on. `patch.status` is carried through above, so
    // this arming is anchored to this patch's own `updatedAt`, exactly as an
    // approved transition's is. A patch that does not touch `status` leaves the
    // deadline untouched, because nothing about the state entry changed.
    let timer
    if (patch.status && patch.status !== reservation.status) {
      timer = await this.#syncTimers(id, updated, {
        onStateChange: true,
        anchor: updated.updatedAt,
      })
    }
    this.#emit(RESERVATION_EVENTS.UPDATED, { reservationId: id, reservation: updated, changes: data })

    return this.#withTimer({ success: true, data: updated }, timer)
  }

  /**
   * Check in a reservation
   * @param {string} reservationId
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async checkInReservation(reservationId, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.UPDATE)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) return { success: false, errors: ['Reservation not found'] }

    const updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.CHECKED_IN)
    updated.checkedInAt = new Date().toISOString()
    await this.#persist(updated)
    // Synced before the emit, which can throw: a committed `checked_in` reservation
    // must not keep the previous state's deadline armed. `checked_in` has no
    // approved automatic expiration, so the sync is what drops it.
    await this.#syncTimers(reservationId, updated, { onStateChange: true, anchor: updated.updatedAt })
    this.#emit(RESERVATION_EVENTS.CHECKED_IN, { reservationId, reservation: updated })
    return { success: true }
  }

  /**
   * Check out a reservation
   * @param {string} reservationId
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async checkOutReservation(reservationId, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.UPDATE)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) return { success: false, errors: ['Reservation not found'] }

    const updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.CHECKED_OUT)
    updated.checkedOutAt = new Date().toISOString()
    await this.#persist(updated)
    await this.#syncTimers(reservationId, updated, { onStateChange: true, anchor: updated.updatedAt })
    this.#emit(RESERVATION_EVENTS.CHECKED_OUT, { reservationId, reservation: updated })
    return { success: true }
  }

  /**
   * Mark reservation as no-show
   * @param {string} reservationId
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async noShowReservation(reservationId, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.UPDATE)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) return { success: false, errors: ['Reservation not found'] }

    const updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.NO_SHOW)
    await this.#persist(updated)
    await this.#syncTimers(reservationId, updated, { onStateChange: true, anchor: updated.updatedAt })
    this.#emit(RESERVATION_EVENTS.NO_SHOW, { reservationId, reservation: updated })
    return { success: true }
  }

  /**
   * Archive a reservation
   * @param {string} reservationId
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async archiveReservation(reservationId, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.ARCHIVE)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) return { success: false, errors: ['Reservation not found'] }

    const updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.ARCHIVED)
    updated.previousStatus = reservation.status
    updated.archivedAt = new Date().toISOString()
    await this.#persist(updated)
    // Synced before the emit, which can throw: an archived reservation must never
    // be left with a live deadline when a subscriber fails.
    await this.#syncTimers(reservationId, updated, { onStateChange: true, anchor: updated.updatedAt })
    this.#emit(RESERVATION_EVENTS.ARCHIVED, { reservationId, reservation: updated })
    return { success: true }
  }

  /**
   * Restore archived reservation
   * @param {string} reservationId
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async restoreReservation(reservationId, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.RESTORE)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) return { success: false, errors: ['Reservation not found'] }
    if (reservation.status !== RESERVATION_STATUS.ARCHIVED) {
      return { success: false, errors: ['Only archived reservations can be restored'] }
    }

    const restored = {
      ...reservation,
      status: reservation.previousStatus || RESERVATION_STATUS.CONFIRMED,
      previousStatus: null,
      archivedAt: null,
      updatedAt: new Date().toISOString(),
    }
    await this.#persist(restored)

    // BOOKING-EXPIRATION-TIMERS-1 (review, group 3). Synced immediately after the
    // confirmed write and before the emit, which can throw. The timer outcome is
    // returned rather than discarded, so a caller of `restoreReservation` can see
    // whether the restored state actually got a deadline instead of a bare
    // `{ success: true }`.
    const timer = await this.#syncTimers(reservationId, restored, {
      onStateChange: true,
      anchor: restored.updatedAt,
    })
    this.#emit(RESERVATION_EVENTS.RESTORED, { reservationId, reservation: restored })

    return this.#withTimer({ success: true, data: restored }, timer)
  }

  /**
   * Delete a reservation
   * @param {string} reservationId
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async deleteReservation(reservationId, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.DELETE)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) return { success: false, errors: ['Reservation not found'] }

    if (this.#repo) {
      const deleted = await this.#repo.delete({ id: reservationId })
      if (!deleted) {
        // A falsy result means the row was not removed. Throwing here is what
        // keeps the timer ownership honest below: nothing is dropped for a
        // reservation that is still there.
        throw new Error(
          `Reservation ${reservationId} deletion did not persist: repository returned no row`
        )
      }
    }
    this.#reservations.delete(reservationId)
    if (this.#context?.dataManager) {
      const reservations = this.#context.dataManager.get('reservations') || []
      const index = reservations.findIndex(r => r.id === reservationId)
      if (index >= 0) {
        reservations.splice(index, 1)
        this.#context.dataManager.set('reservations', reservations)
      }
    }

    // BOOKING-EXPIRATION-TIMERS-1 (review, group 3). The timers are dropped
    // directly after the confirmed deletion/cache mutation and BEFORE the emit,
    // which can throw: a deleted reservation must never keep an armed timer or a
    // queued job that could later try to expire an id that no longer exists. The
    // original subscriber error still propagates unchanged, and there is nothing
    // to roll back.
    await this.#syncTimers(reservationId, null)
    this.#emit(RESERVATION_EVENTS.UPDATED, { reservationId, action: 'deleted' })
    return { success: true }
  }

  /**
   * Get reservation by ID
   * @param {string} reservationId
   * @returns {object|null}
   */
  getById(reservationId) {
    return this.#reservations.get(reservationId) || null
  }

  /**
   * Get all reservations
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.#reservations.values())
  }

  /**
   * Find reservation by ID using repository (repository-first, not cache)
   * @param {string} reservationId
   * @returns {Promise<object|null>}
   */
  async findById(reservationId) {
    if (this.#repo) {
      const isPostgres = this.#context?.config?.persistenceProvider === 'postgres'
      try {
        const found = await this.#repo.findById(reservationId)
        if (found) return found
        if (isPostgres) return null
      } catch (error) {
        if (isPostgres) throw error
      }
    }
    return null
  }

  /**
   * Find all reservations using repository (repository-first, not cache)
   * @param {object} filter - Optional filter criteria
   * @returns {Promise<object[]>}
   */
  async findAll(filter = {}) {
    if (this.#repo) {
      const isPostgres = this.#context?.config?.persistenceProvider === 'postgres'
      try {
        return await this.#repo.findMany(filter)
      } catch (error) {
        if (isPostgres) throw error
      }
    }
    return []
  }

  /**
   * Get reservations by status
   * @param {string} status
   * @returns {object[]}
   */
  getByStatus(status) {
    return this.getAll().filter(r => r.status === status)
  }

  /**
   * Get reservations by resource
   * @param {string} resourceId
   * @returns {object[]}
   */
  getByResource(resourceId) {
    return this.getAll().filter(r => r.resourceId === resourceId)
  }

  /**
   * Get reservations by accommodation
   * @param {string} accommodationId
   * @returns {object[]}
   */
  getByAccommodation(accommodationId) {
    return this.getAll().filter(r => r.accommodationId === accommodationId)
  }

  /**
   * Get reservations by visitor
   * @param {string} visitorId
   * @returns {object[]}
   */
  getByVisitor(visitorId) {
    return this.getAll().filter(r => r.visitorId === visitorId)
  }

  /**
   * Get reservations by business
   * @param {string} businessId
   * @returns {object[]}
   */
  getByBusiness(businessId) {
    return this.getAll().filter(r => r.businessId === businessId)
  }

  /**
   * Get upcoming reservations (future confirmed/checked_in)
   * @returns {object[]}
   */
  getUpcoming() {
    const now = new Date().toISOString().split('T')[0]
    return this.getAll().filter(r =>
      (r.status === RESERVATION_STATUS.CONFIRMED || r.status === RESERVATION_STATUS.CHECKED_IN) &&
      r.dates?.checkIn >= now
    ).sort((a, b) => (a.dates?.checkIn || '').localeCompare(b.dates?.checkIn || ''))
  }

  /**
   * Get active (non-terminal) reservations
   * @returns {object[]}
   */
  getActive() {
    return this.getAll().filter(r =>
      r.status !== RESERVATION_STATUS.COMPLETED &&
      r.status !== RESERVATION_STATUS.CANCELLED &&
      r.status !== RESERVATION_STATUS.REJECTED &&
      r.status !== RESERVATION_STATUS.EXPIRED &&
      r.status !== RESERVATION_STATUS.NO_SHOW &&
      r.status !== RESERVATION_STATUS.NO_RESPONSE &&
      r.status !== RESERVATION_STATUS.ARCHIVED
    )
  }

  /**
   * Get completed reservations
   * @returns {object[]}
   */
  getCompleted() {
    return this.getByStatus(RESERVATION_STATUS.COMPLETED)
  }

  /**
   * Get cancelled reservations
   * @returns {object[]}
   */
  getCancelled() {
    return this.getByStatus(RESERVATION_STATUS.CANCELLED)
  }

  /**
   * Calculate nights between check-in and check-out
   * @param {string} checkIn
   * @param {string} checkOut
   * @returns {number}
   */
  calculateNights(checkIn, checkOut) {
    const inDate = new Date(checkIn)
    const outDate = new Date(checkOut)
    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) return 0
    return Math.max(0, Math.floor((outDate - inDate) / 86400000))
  }

  /**
   * Calculate guest count from data
   * @param {object} data
   * @returns {number}
   */
  calculateGuests(data) {
    if (data.guests) return data.guests
    if (data.adults) return data.adults + (data.children || 0)
    return 1
  }

  /**
   * Calculate reservation price (delegates to pricing if available)
   * @param {string} accommodationId
   * @param {string} checkIn
   * @param {string} checkOut
   * @param {number} guests
   * @param {object|null} identity - traveler identity forwarded to availability authorization
   * @returns {{ success: boolean, price?: number, currency?: string, nights?: number }}
   */
  async calculatePrice(accommodationId, checkIn, checkOut, guests = 1, identity = null) {
    const nights = this.calculateNights(checkIn, checkOut)
    if (nights <= 0) return { success: false, errors: ['Invalid date range'] }

    const pricing = this.#context?.capabilities?.get?.('pricing')
    if (pricing?.calculatePrice) {
      try {
        const result = await pricing.calculatePrice(accommodationId, checkIn, checkOut, guests)
        return result
      } catch {
        // fallback to simple calculation
      }
    }

    const availability = this.#context?.capabilities?.get?.('availability')
    let pricePerNight = 0
    let currency = 'USD'
    if (availability?.service) {
      try {
        const calendar = await availability.service.getCalendar(accommodationId, checkIn, checkOut, identity)
        if (Array.isArray(calendar) && calendar.length > 0) {
          const priced = calendar.filter(d => d.price != null)
          if (priced.length > 0) {
            pricePerNight = priced.reduce((sum, d) => sum + (d.price || 0), 0) / priced.length
            currency = priced.find(d => d.currency)?.currency || currency
          }
        }
      } catch {
        // use default
      }
    }

    const totalPrice = pricePerNight * nights
    this.#emit(RESERVATION_EVENTS.PRICE_CALCULATED, { accommodationId, checkIn, checkOut, guests, nights, totalPrice, currency })
    return { success: true, price: totalPrice, currency: currency || 'USD', nights, pricePerNight }
  }

  /**
   * Validate availability for a date range
   * @param {string} accommodationId
   * @param {string} checkIn
   * @param {string} checkOut
   * @returns {Promise<object>}
   */
  async validateCheckAvailability(accommodationId, checkIn, checkOut) {
    const dateValidation = validateDateRange(checkIn, checkOut)
    if (!dateValidation.valid) return { available: false, errors: dateValidation.errors }

    const overlap = await checkReservationOverlap(this.#context, accommodationId, checkIn, checkOut)
    if (overlap.hasOverlap) {
      return { available: false, errors: ['Date range overlaps with existing reservation'], overlapping: overlap.overlapping }
    }

    const availCheck = await checkAvailability(this.#context, accommodationId, checkIn, checkOut)
    if (!availCheck.available) {
      return { available: false, errors: ['Dates not available'], conflicts: availCheck.conflicts }
    }

    return { available: true }
  }

  /**
   * Estimate taxes for a given price
   * @param {number} totalPrice
   * @returns {{ success: boolean, taxRate: number, taxAmount: number, totalWithTax: number }}
   */
  estimateTaxes(totalPrice) {
    const taxRate = 0.10
    const taxAmount = Math.round((totalPrice || 0) * taxRate * 100) / 100
    return {
      success: true,
      taxRate,
      taxAmount,
      totalWithTax: (totalPrice || 0) + taxAmount,
    }
  }

  /**
   * Estimate commission for a given price
   * @param {number} totalPrice
   * @returns {{ success: boolean, commissionRate: number, commissionAmount: number, netAmount: number }}
   */
  estimateCommission(totalPrice) {
    const commissionRate = 0.15
    const commissionAmount = Math.round((totalPrice || 0) * commissionRate * 100) / 100
    return {
      success: true,
      commissionRate,
      commissionAmount,
      netAmount: (totalPrice || 0) - commissionAmount,
    }
  }

  /**
   * Load reservations from DataManager (legacy hydration path)
   */
  loadFromDataManager() {
    const reservations = this.#context?.dataManager?.get('reservations') || []
    reservations.forEach(r => this.#reservations.set(r.id, r))
  }

  /**
   * Persist reservation to repository and caches
   * @private
   */
  #cacheReservation(reservation) {
    this.#reservations.set(reservation.id, reservation)

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
  async #persist(reservation, isNew = false) {
    const isPostgres = this.#context?.config?.persistenceProvider === 'postgres'

    if (this.#repo) {
      if (isNew) {
        const created = await this.#repo.create(reservation)
        if (isPostgres && !created) {
          throw new Error(`Reservation ${reservation.id} was not persisted`)
        }
      } else {
        const updated = await this.#repo.update({ id: reservation.id }, reservation)
        if (isPostgres && !updated) {
          throw new Error(`Reservation ${reservation.id} update failed - not found or not authorized`)
        }
        if (!isPostgres && !updated) {
          const created = await this.#repo.create(reservation)
          if (isPostgres && !created) {
            throw new Error(`Reservation ${reservation.id} was not persisted`)
          }
        }
      }
    } else if (isPostgres) {
      throw new Error(`Reservation repository is unavailable for ${reservation.id}`)
    }

    this.#cacheReservation(reservation)
  }

  /**
   * Emit event via context eventBus
   * @private
   */
  #emit(eventName, data) {
    if (this.#context?.eventBus) {
      this.#context.eventBus.emit(eventName, data)
    }
  }
}

export default ReservationManager





