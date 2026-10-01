/**
 * Reservation Timer — Automatic expiration timers for the reservation lifecycle
 *
 * Uses the Scheduler capability through context.capabilities.get(). No direct
 * imports from scheduler.
 *
 * BOOKING-EXPIRATION-TIMERS-1.
 *
 * What this file is for
 * --------------------
 * A timer here owns exactly two things: WHEN an automatic expiration is due for
 * a reservation in an approved state, and ROUTING that due work to the single
 * atomic expiration path in `ReservationManager`. It deliberately owns no
 * persistence and no state machine of its own.
 *
 * The previous implementation violated both halves of that:
 *
 *   - `#expireReservation` transitioned the reservation and wrote it with its own
 *     `repo.update` fallback, so scheduled expiration bypassed the manager's
 *     atomic status+release operation, permission checks and event/notification
 *     contract entirely — a second EXPIRED writer next to the manager;
 *   - `#scheduleExpiration` was called unawaited and ignored its result, so
 *     `{ success: true, timerId }` was returned even with no scheduler at all;
 *   - `checkExpiration()` fired the same private write unawaited and deleted the
 *     map entry before the write finished, losing the failure;
 *   - the handler name `reservationExpiration` was scheduled but never
 *     registered, so the job could never run.
 *
 * How scheduling is made trustworthy here
 * ---------------------------------------
 * 1. `activate()` registers the handler BEFORE any job can be scheduled, and
 *    returns the registration outcome so a caller can see a failed registration
 *    instead of inferring it from a job that will never run.
 * 2. The handler name is derived from a per-instance id, and the handler
 *    re-validates that id, the tenant and the generation against its own state.
 *    Two reservation instances sharing one scheduler therefore cannot overwrite
 *    or hijack each other's handler, and a job carrying another tenant's or
 *    another instance's payload is a no-op.
 * 3. Every arming produces an explicit job id (`reservationExpiration:<n>:<tenant>:
 *    <id>:<status>#<generation>`) instead of the scheduler's `Date.now()`
 *    default, so two reservations — and two armings of the same reservation —
 *    never collide.
 * 4. Scheduling is awaited and its result is checked. A missing scheduler, a
 *    rejection, a `{ success: false }` answer or a job id that was not actually
 *    stored all leave NO armed timer behind: the map entry is never created, so
 *    nothing reports a timer that nothing will ever run.
 * 5. The deadline is anchored to the timestamp of the successful state entry
 *    (`createdAt` for `requested`, the transition-generated `updatedAt` for
 *    `owner_pending`/`payment_pending`) rather than to the moment the timer was
 *    armed, and arming an already-armed, unchanged state keeps the existing
 *    deadline instead of restarting it.
 *
 * Deliberate limits (not hidden behaviour)
 * ----------------------------------------
 *   - Durability: timer state and scheduler jobs live in the process
 *     (`DataManager`/Maps). A restart loses both; nothing here reconstructs
 *     timers from stored reservations. That is the recovery slice, not this one.
 *   - Historical rows: only reservations whose state change this process
 *     performed are armed. Nothing is inferred from reservations that already
 *     existed.
 *   - The anchor is `updatedAt`, which any later write also touches, so it is
 *     "the last write at or before the transition", not a dedicated
 *     `statusChangedAt`. It is read from the state object the manager just
 *     persisted, passed together with that transition's own timestamp as
 *     `options.anchor`, so an entry path that does not hand the manager's
 *     transition over (a raw API patch) still falls back to the stored row.
 *   - A failed expiration keeps its timer record so it stays observable and can
 *     be retried explicitly with `retryTimer()` or by the scheduler's own retry.
 *     The exception is a post-commit failure: the transition and the capacity
 *     release already committed, so the record is settled, the failure is
 *     reported as non-retryable, and there is nothing left to retry.
 */
import { RESERVATION_STATUS } from './reservation.status.js'
import { ReservationConfig } from './reservation.config.js'

/** The stable base of the scheduled handler/job name. */
export const RESERVATION_EXPIRATION_HANDLER = 'reservationExpiration'

/**
 * Which timestamp anchors the deadline for each approved state.
 *
 * `requested` is written once at creation with `createdAt` and no `updatedAt`,
 * so `createdAt` is its anchor. The two states entered by a later transition
 * carry a transition-generated `updatedAt`.
 */
const STATE_ENTRY_ANCHORS = {
  [RESERVATION_STATUS.REQUESTED]: ['statusEnteredAt', 'createdAt', 'updatedAt'],
  [RESERVATION_STATUS.OWNER_PENDING]: ['statusEnteredAt', 'updatedAt', 'createdAt'],
  [RESERVATION_STATUS.PAYMENT_PENDING]: ['statusEnteredAt', 'updatedAt', 'createdAt'],
}

const STOP_REASONS = {
  STATE_CHANGED: 'state_changed',
  STATE_UNSUPPORTED: 'state_not_auto_expirable',
  DUPLICATE: 'duplicate_arming',
  DISABLED: 'auto_expiration_disabled',
  INVALID_SETTING: 'invalid_timeout_setting',
  STATE_UNAVAILABLE: 'state_unavailable',
  SCHEDULER_MISSING: 'scheduler_unavailable',
  SCHEDULE_REJECTED: 'schedule_rejected',
  SCHEDULE_NOT_STORED: 'schedule_not_stored',
  INACTIVE: 'timer_inactive',
  INVALIDATED: 'invalidated_before_publish',
  MANUAL: 'manual',
}

/**
 * Reasons that mean the work itself is no longer what this timer was armed for.
 * Nothing failed and nothing may be retried, so they resolve as skips on the
 * scheduled path instead of failing the job.
 *
 * `timer_invalidated` is the timer's own ownership token reporting that its
 * record was stopped, destroyed or replaced while the attempt was in the
 * manager's pre-write phase.
 */
const STALE_REASONS = new Set([
  'stale_state',
  'not_found',
  'not_expirable',
  'timer_invalidated',
])

let instanceCounter = 0

export class ReservationTimer {
  #context = null
  #config = null
  #manager = null

  /**
   * Timers that are armed and eligible to expire, keyed by `<tenant>:<id>:<status>`.
   * A settled timer is removed from this map and its key is remembered in
   * `#done`, which is what makes a repeated delivery of the same job a no-op
   * rather than a second expiration.
   */
  #timers = new Map()
  #done = new Set()
  #generations = new Map()
  #instanceId = ''
  #handlerName = ''
  #active = false
  #destroyed = false

  /**
   * BOOKING-EXPIRATION-TIMERS-1 (review, group 1). Arming claims ownership BEFORE
   * it awaits `scheduler.schedule()`, so a stop, a state change, a deactivation or
   * a newer arming can invalidate work that has no published record yet. Without
   * this, `startReservationTimer()` checked lifecycle and ownership, awaited the
   * scheduler, and then published its record unconditionally — so a timer stopped
   * while its scheduling was in flight came back armed.
   *
   * `#pendingArmings` holds one entry per in-flight arming, keyed by a unique
   * token; `#pendingByReservation` is the reverse index, so "invalidate every
   * pending arming for this reservation" is one lookup.
   */
  #pendingArmings = new Map()
  #pendingByReservation = new Map()
  #armingCounter = 0

  /**
   * Bumped by every lifecycle transition that makes pending work obsolete, so an
   * arming that resolves after `deactivate()`/`destroy()` cannot publish.
   */
  #lifecycleEpoch = 0

  constructor(context, { manager } = {}) {
    this.#context = context
    this.#config = new ReservationConfig(context)
    this.#manager = manager || null

    // BOOKING-EXPIRATION-TIMERS-1: the manager is the only expiration writer, and
    // several production entry paths call the manager directly (the business and
    // service layers forward to it with an identity, while the capability
    // wrappers do not). Attaching here is what makes timer wiring identical for
    // all of them instead of capability-wrapper-only.
    if (typeof this.#manager?.attachTimer === 'function') {
      this.#manager.attachTimer(this)
    }

    instanceCounter += 1
    this.#instanceId = `reservation-${instanceCounter}`
    this.#handlerName = `${RESERVATION_EXPIRATION_HANDLER}:${this.#instanceId}`
  }

  get instanceId() {
    return this.#instanceId
  }

  get handlerName() {
    return this.#handlerName
  }

  get isActive() {
    return this.#active
  }

  get #scheduler() {
    return this.#context?.capabilities?.get?.('scheduler') || null
  }

  get #tenantId() {
    const tenant = this.#context?.tenant
    return (tenant && typeof tenant === 'object' ? tenant.id : tenant) || null
  }

  // ── Lifecycle ──

  /**
   * Register the expiration handler. Must complete before any job is scheduled.
   * @returns {Promise<{ status: string, handler?: string, error?: string }>}
   */
  async activate() {
    if (this.#destroyed) {
      return { status: 'failed', error: 'Reservation timer has been destroyed' }
    }
    if (this.#active) {
      return { status: 'already_active', handler: this.#handlerName }
    }

    const scheduler = this.#scheduler
    if (!scheduler || typeof scheduler.registerHandler !== 'function') {
      // Explicit rather than silent: an armed timer would have no handler.
      return {
        status: 'failed',
        error: 'Reservation expiration handler is not registered: scheduler capability is unavailable',
      }
    }

    scheduler.registerHandler(this.#handlerName, (payload, job) => this.#expire(payload, job))
    this.#active = true

    return { status: 'registered', handler: this.#handlerName }
  }

  /**
   * Stop all of this instance's timers and make its handler inert. Jobs that were
   * already queued stay in the scheduler; they resolve to a no-op because this
   * instance no longer holds a matching record.
   * @returns {Promise<{ status: string, cancelled: string[] }>}
   */
  async deactivate() {
    this.#active = false
    this.#lifecycleEpoch += 1

    // A deactivation must also invalidate arming work that is still awaiting the
    // scheduler: it has no published record to find, so nothing else would.
    for (const reservationId of [...this.#pendingByReservation.keys()]) {
      this.#invalidatePendingArmings(reservationId)
    }

    const cancelled = []
    for (const record of this.#snapshot()) {
      const jobId = await this.#stop(record, STOP_REASONS.MANUAL)
      if (jobId) cancelled.push(jobId)
    }

    return { status: 'deactivated', cancelled }
  }

  /**
   * Deactivate and drop all local timer state.
   * @returns {Promise<{ status: string, cancelled: string[] }>}
   */
  async destroy() {
    const result = await this.deactivate()
    this.#destroyed = true
    this.#done.clear()
    this.#generations.clear()
    this.#pendingArmings.clear()
    this.#pendingByReservation.clear()

    // The handler name is unique to this instance, so removing it can never
    // unregister another instance's handler.
    const scheduler = this.#scheduler
    if (scheduler && typeof scheduler.unregisterHandler === 'function') {
      try {
        await scheduler.unregisterHandler(this.#handlerName)
      } catch { /* the handler is already inert */ }
    }

    return result
  }

  // ── State synchronisation ──

  /**
   * Bring this instance's timers in line with the reservation's current state.
   *
   * Called by `ReservationManager` after every successful state change, so the
   * timer set always mirrors the persisted state: any timer for a state the
   * reservation has left is stopped, and a timer is armed only for the current
   * state when that state has an approved automatic expiration.
   *
   * A reservation already in an approved state is re-armed only when
   * `onStateChange` is set (a new transition into that state); otherwise the
   * existing deadline is kept untouched.
   *
   * @param {string} reservationId
   * @param {object|null} current - The persisted reservation, when the caller has it
   * @param {{ onStateChange?: boolean, anchor?: string }} [options]
   * @returns {Promise<object>} - Timer outcome; never throws for a timer problem
   */
  async syncReservationState(reservationId, current = null, options = {}) {
    if (!reservationId) return { status: 'skipped', reason: 'missing_reservation_id' }
    if (this.#destroyed) return { status: 'skipped', reason: 'timer_destroyed' }

    let state = current
    if (!state || typeof state !== 'object') {
      state = await this.#loadReservationState(reservationId)
    }
    if (!state || typeof state !== 'object') {
      // The reservation no longer has readable state — deleted, or never
      // persisted under this id. Any timer for it is meaningless, so stop it
      // rather than leaving an armed job pointing at nothing.
      const stopped = []
      for (const record of this.#snapshot()) {
        if (record.reservationId !== reservationId) continue
        const jobId = await this.#stop(record, STOP_REASONS.STATE_UNAVAILABLE)
        if (jobId) stopped.push(jobId)
      }
      return { status: 'skipped', reason: STOP_REASONS.STATE_UNAVAILABLE, stopped }
    }

    const status = state.status

    if (!this.#config.isExpirableStatus(status)) {
      const stopped = []
      for (const record of this.#snapshot()) {
        if (record.reservationId === reservationId) {
          const jobId = await this.#stop(record, STOP_REASONS.STATE_UNSUPPORTED)
          if (jobId) stopped.push(jobId)
        }
      }
      this.#markDone(reservationId, status)
      return { status: 'not_expirable', reservationStatus: status, stopped }
    }

    const currentRecord = this.#find(reservationId, status)

    if (currentRecord && currentRecord.active && !options.onStateChange) {
      // Same state, no transition: re-arming must not restart the deadline.
      return this.#describe(currentRecord, 'kept')
    }

    // Every other timer this instance holds for the reservation is armed for a
    // state the reservation has left, and it is stopped here whether that state
    // is supported or not. Moving between two APPROVED states is the case that
    // needs this: `requested -> owner_pending` must drop the `requested` timer,
    // or a job queued for the old state stays in the scheduler for the rest of
    // its delay and can only ever report a stale state when it finally fires.
    // Arming work that has not published a record yet is invalidated for the same
    // reason: a delayed arm must not resurrect a state the reservation has left.
    this.#invalidatePendingArmings(reservationId)
    const stopped = []
    for (const record of this.#snapshot()) {
      if (record.reservationId !== reservationId) continue
      const jobId = await this.#stop(record, STOP_REASONS.STATE_CHANGED)
      if (jobId) stopped.push(jobId)
    }

    const armed = await this.startReservationTimer(reservationId, status, {
      reservation: state,
      anchor: options.anchor,
    })
    return { ...armed, stopped }
  }

  /**
   * Arm (or keep) the timer for a reservation in an approved state.
   *
   * Scheduling is awaited and verified here; on any scheduling failure no timer
   * record is created, so nothing reports a timer that was never queued.
   *
   * @param {string} reservationId
   * @param {string} status
   * @param {{ reservation?: object, anchor?: string }} [options]
   * @returns {Promise<object>}
   */
  async startReservationTimer(reservationId, status, options = {}) {
    if (this.#destroyed) return { status: 'skipped', reason: 'timer_destroyed' }
    if (!reservationId) return { status: 'skipped', reason: 'missing_reservation_id' }

    const resolution = this.#config.resolveTimeout(status)

    if (resolution.timerState === 'unsupported') {
      return { status: 'not_expirable', reservationStatus: status }
    }

    if (resolution.timerState === 'auto_disabled') {
      return { status: 'skipped', reason: STOP_REASONS.DISABLED, reservationStatus: status }
    }

    if (resolution.timerState === 'invalid_setting') {
      // An unusable override is reported, never replaced by a default.
      return {
        status: 'failed',
        reason: STOP_REASONS.INVALID_SETTING,
        reservationStatus: status,
        error: resolution.error,
      }
    }

    const existing = this.#find(reservationId, status)
    if (existing && existing.active) {
      return this.#describe(existing, STOP_REASONS.DUPLICATE)
    }

    if (!this.#active) {
      // Without a registered handler a queued job could never run.
      return {
        status: 'failed',
        reason: STOP_REASONS.INACTIVE,
        reservationStatus: status,
        error: 'Reservation expiration handler is not registered',
      }
    }

    const state = options.reservation || await this.#loadReservationState(reservationId)
    if (!state || typeof state !== 'object') {
      return {
        status: 'skipped',
        reason: STOP_REASONS.STATE_UNAVAILABLE,
        reservationStatus: status,
      }
    }

    const anchorMs = this.#resolveAnchor(state, status, options.anchor)
    if (anchorMs === null) {
      return {
        status: 'skipped',
        reason: 'no_anchor_timestamp',
        reservationStatus: status,
        error: `Reservation ${reservationId} has no usable ${status} entry timestamp`,
      }
    }

    const scheduler = this.#scheduler
    if (!scheduler) {
      return {
        status: 'failed',
        reason: STOP_REASONS.SCHEDULER_MISSING,
        reservationStatus: status,
        error: 'Reservation expiration cannot be scheduled: scheduler capability is unavailable',
      }
    }

    const generation = this.#nextGeneration(reservationId)
    const expiresAtMs = anchorMs + resolution.timeoutMs
    const tenantId = this.#tenantId

    // Explicit, collision-free job id. The scheduler's own default is
    // `job_${Date.now()}`, which repeats for anything armed in the same
    // millisecond.
    const jobId =
      `${this.#handlerName}:${tenantId || 'no-tenant'}:${reservationId}:${status}#${generation}`
    const payload = {
      jobId,
      handler: this.#handlerName,
      instanceId: this.#instanceId,
      tenantId,
      reservationId,
      expectedStatus: status,
      generation,
      expiresAt: new Date(expiresAtMs).toISOString(),
    }

    // Ownership is claimed BEFORE the await, so a stop, a state change, a
    // deactivation, a destroy or a newer arming of the same key all invalidate
    // this work while it is still in flight.
    const token = this.#claimArming(reservationId, status)

    let scheduled = null
    try {
      scheduled = await scheduler.schedule({
        type: 'delayed',
        id: jobId,
        handler: this.#handlerName,
        payload,
        tenantId,
        delayMs: Math.max(0, expiresAtMs - Date.now()),
      })
    } catch (error) {
      this.#releaseArming(token)
      return {
        status: 'failed',
        reason: STOP_REASONS.SCHEDULE_REJECTED,
        reservationStatus: status,
        jobId,
        error: `Reservation expiration scheduling threw: ${error?.message || error}`,
      }
    }

    if (!scheduled || scheduled.success !== true) {
      this.#releaseArming(token)
      return {
        status: 'failed',
        reason: STOP_REASONS.SCHEDULE_REJECTED,
        reservationStatus: status,
        jobId,
        error: describeSchedulerResult(scheduled),
      }
    }

    const storedJobId = scheduled.jobId || jobId

    // Revalidate ownership and lifecycle AFTER the await, before publishing. An
    // arming that lost while it was queued must not create a record, and the job
    // it queued must be withdrawn — but only that job: a newer arming for the
    // same reservation may already own this key.
    const pending = this.#pendingArmings.get(token)
    const ownsKey = this.#find(reservationId, status) === null
    const obsolete =
      pending === undefined ||
      pending.epoch !== this.#lifecycleEpoch ||
      !this.#active ||
      this.#destroyed ||
      !ownsKey
    this.#releaseArming(token)

    if (obsolete) {
      await this.#cancelJob(storedJobId)
      return {
        status: 'skipped',
        action: 'discarded',
        reason: STOP_REASONS.INVALIDATED,
        reservationId,
        reservationStatus: status,
        jobId: storedJobId,
        generation,
        error: `Reservation expiration for ${reservationId} (${status}) was invalidated while it was being scheduled`,
      }
    }

    if (!this.#isJobStored(storedJobId)) {
      // `success: true` with nothing stored would be a falsely armed timer.
      return {
        status: 'failed',
        reason: STOP_REASONS.SCHEDULE_NOT_STORED,
        reservationStatus: status,
        jobId: storedJobId,
        error: `Reservation expiration scheduling reported success without storing job ${storedJobId}`,
      }
    }

    const record = {
      reservationId,
      tenantId,
      status,
      expectedStatus: status,
      generation,
      instanceId: this.#instanceId,
      handlerName: this.#handlerName,
      jobId: storedJobId,
      timeoutMs: resolution.timeoutMs,
      anchorAt: new Date(anchorMs).toISOString(),
      startedAt: Date.now(),
      expiresAtMs,
      active: true,
      inFlight: false,
      attempts: 0,
      failedAttempts: 0,
      lastError: null,
      lastAttemptAt: null,
    }

    // A record published earlier for this same key is now obsolete: its deadline
    // is from a superseded arming. Only that older record is stopped — never a
    // newer one, which cannot exist yet on this path.
    const previous = this.#find(reservationId, status)
    if (previous && previous.generation < generation) {
      await this.#stop(previous, STOP_REASONS.STATE_CHANGED)
    }

    this.#timers.set(this.#key(reservationId, status), record)
    this.#done.delete(this.#key(reservationId, status))

    return this.#describe(record, 'armed')
  }

  /**
   * Stop the timer(s) for a reservation. Called without a status it stops every
   * timer this instance holds for the reservation, which is what makes
   * cancellation of a `requested` reservation work as well as a later one.
   * @param {string} reservationId
   * @param {string} [status]
   * @returns {Promise<{ status: string, cancelled: string[] }>}
   */
  async stopTimer(reservationId, status) {
    // A stop is also a claim about work that has not produced a record yet: an
    // arming paused inside `scheduler.schedule()` for this state is invalidated
    // here, so it cannot publish a timer for a reservation that was just stopped.
    if (status) this.#invalidatePendingArmings(reservationId, status)
    else this.#invalidatePendingArmings(reservationId)

    if (status) {
      const record = this.#find(reservationId, status)
      if (!record) {
        return { status: 'skipped', cancelled: [], reason: 'no_timer' }
      }
      const jobId = await this.#stop(record, STOP_REASONS.MANUAL)
      return { status: 'stopped', cancelled: jobId ? [jobId] : [] }
    }

    const cancelled = []
    for (const record of this.#snapshot()) {
      if (record.reservationId !== reservationId) continue
      const jobId = await this.#stop(record, STOP_REASONS.MANUAL)
      if (jobId) cancelled.push(jobId)
    }
    return { status: 'stopped', cancelled }
  }

  /**
   * Stop every timer this instance holds for a reservation.
   * @param {string} reservationId
   * @returns {Promise<string[]>} - cancelled job ids
   */
  async stopAllTimers(reservationId) {
    const result = await this.stopTimer(reservationId)
    return result.cancelled
  }

  /**
   * Retry a timer whose expiration failed.
   *
   * The record is kept when an expiration fails, which is what makes this an
   * explicit retry rather than a fresh arming with a new deadline.
   * @param {string} reservationId
   * @param {string} status
   * @returns {Promise<object>}
   */
  async retryTimer(reservationId, status) {
    const record = this.#find(reservationId, status)
    if (!record) return { status: 'skipped', reason: 'no_timer' }
    if (!record.active) {
      return { status: 'skipped', reason: STOP_REASONS.DUPLICATE, reservationStatus: status }
    }

    // The same admission guard the scheduled path and the sweep use. An explicit
    // retry that arrives while an attempt is already in flight is a no-op, not a
    // second expiration attempt.
    const admission = this.#admit(record, { source: 'retry' })
    if (!admission.ok) {
      return { status: 'skipped', action: 'refused', reason: admission.reason, reservationStatus: status }
    }

    return this.#attempt(record)
  }

  /**
   * Expire every timer whose deadline has passed.
   *
   * Awaits each expiration and reports them separately:
   *   - `expired` only for work that genuinely completed;
   *   - `failed` for work that was attempted and did not complete, with the
   *     reason, so a release failure is visible instead of silently dropped;
   *   - `skipped` for benign no-ops (early, superseded, already handled).
   *
   * A real failure is never counted as expired, and each `failed` entry keeps the
   * classification `#execute()` assigned it. A retryable pre-commit failure keeps
   * its timer record so the attempt stays observable and can be retried; a
   * `post_commit_failed` entry is the exception — `retryable: false`,
   * `committed: true`, and its timer already settled, because the transition and
   * the release committed and there is nothing left to retry.
   *
   * @returns {Promise<{ expired: object[], failed: object[], skipped: object[] }>}
   */
  async checkExpiration() {
    const now = Date.now()
    const expired = []
    const failed = []
    const skipped = []

    for (const record of this.#snapshot()) {
      if (!record.active) continue

      const admission = this.#admit(record, { source: 'sweep' })
      if (!admission.ok) {
        skipped.push(this.#describe(record, admission.reason))
        continue
      }

      if (now < record.expiresAtMs) {
        skipped.push(this.#describe(record, 'not_due'))
        continue
      }

      // The scheduled delivery path THROWS on an operational failure, because a
      // resolved handler is a completed job. A sweep is different: its job is to
      // walk every due timer, so `#attempt` reports the failure in-band and the
      // rest of the sweep continues. The failure is surfaced, not swallowed.
      const outcome = await this.#attempt(record)
      if (outcome?.status === 'expired') expired.push(outcome)
      else if (outcome?.status === 'failed') failed.push(outcome)
      else skipped.push(outcome)
    }

    return { expired, failed, skipped }
  }

  /**
   * Timers that are armed and eligible to expire.
   * @returns {object[]}
   */
  getActiveTimers() {
    return this.#snapshot().filter(t => t.active)
  }

  /**
   * Get the timer for a reservation, or the one for a specific state.
   * @param {string} reservationId
   * @param {string} [status]
   * @returns {object|null}
   */
  getTimer(reservationId, status) {
    if (status) return this.#find(reservationId, status)
    return this.#snapshot().find(t => t.reservationId === reservationId) || null
  }

  /**
   * Timers whose last expiration attempt failed, for observability and retry.
   * @returns {object[]}
   */
  getFailedTimers() {
    return this.#snapshot().filter(t => t.failedAttempts > 0)
  }

  // ── Handler ──

  /**
   * The scheduled expiration handler.
   *
   * The signature covers both real call paths: `SchedulerManager.run()` invokes
   * `handler(payload)` and `SchedulerExecutor.execute()` invokes
   * `handler(payload, job)`.
   *
   * Benign no-ops (foreign, superseded, already handled, early, stopped) resolve
   * so the scheduler records an ordinary completed job. A REAL failure is thrown:
   * `SchedulerManager.run()` marks a job completed even when the handler
   * resolves, so returning a failure object would report a release failure as a
   * success.
   *
   * @param {object} payload
   * @param {object} [job]
   * @returns {Promise<object>}
   */
  async #expire(payload, job) {
    const requestedJobId = payload?.jobId || job?.id

    // Scope is validated against THIS instance's own state, never taken from the
    // payload alone.
    if (!payload || typeof payload !== 'object') {
      return { status: 'skipped', reason: 'invalid_payload' }
    }
    if (payload.handler && payload.handler !== this.#handlerName) {
      return { status: 'skipped', reason: 'foreign_handler' }
    }
    if (payload.instanceId !== this.#instanceId) {
      return { status: 'skipped', reason: 'foreign_instance' }
    }
    if (payload.tenantId !== this.#tenantId) {
      // Checked directly, not just through the tenant-keyed record map: a payload
      // relabelled with another tenant would otherwise find this tenant's own
      // record and expire this tenant's reservation.
      return { status: 'skipped', reason: 'foreign_tenant' }
    }
    if (!this.#active || this.#destroyed) {
      return { status: 'skipped', reason: STOP_REASONS.INACTIVE }
    }

    const { reservationId, expectedStatus } = payload
    if (!reservationId || !expectedStatus) {
      return { status: 'skipped', reason: 'invalid_payload' }
    }

    const record = this.#find(reservationId, expectedStatus)
    if (!record) {
      // Never armed by this instance, or already stopped/settled: a job left
      // behind by a previous state must not expire anything.
      return {
        status: 'skipped',
        reason: this.#done.has(this.#key(reservationId, expectedStatus)) ? 'already_handled' : 'no_timer',
        reservationId,
        expectedStatus,
      }
    }

    const admission = this.#admit(record, {
      source: 'scheduled',
      expectedJobId: requestedJobId,
      expectedGeneration: payload.generation,
    })
    if (!admission.ok) {
      return {
        status: 'skipped',
        reason: admission.reason,
        reservationId,
        expectedStatus,
      }
    }

    return this.#execute(record)
  }

  /**
   * Run one expiration attempt for an owned, due record.
   *
   * Throws a real failure so the scheduled path records it; benign outcomes
   * (not due, state already moved on) resolve.
   * @private
   */
  async #execute(record) {
    // Re-checked centrally, immediately before the attempt claims the record:
    // every caller goes through `#admit` first, but only this is inside the same
    // synchronous step as setting `inFlight`, so no caller can slip a second
    // attempt in between.
    const admission = this.#admit(record, { source: 'execute' })
    if (!admission.ok) {
      return {
        status: 'skipped',
        reason: admission.reason,
        reservationId: record.reservationId,
        expectedStatus: record.expectedStatus,
      }
    }

    record.inFlight = true
    record.attempts += 1
    record.lastAttemptAt = Date.now()

    // A job that fires before its deadline must not expire anything, and must not
    // consume the one scheduled execution for that deadline either: the scheduler
    // keeps this job pending at its original runAt when the handler asks for a
    // requeue, so the deadline still gets its automatic delivery.
    if (record.lastAttemptAt < record.expiresAtMs) {
      record.inFlight = false
      return {
        status: 'skipped',
        reason: 'not_due',
        requeue: true,
        reservationId: record.reservationId,
        expectedStatus: record.expectedStatus,
        expiresAt: new Date(record.expiresAtMs).toISOString(),
      }
    }

    // Ownership token. The manager validates this after its own asynchronous
    // pre-write phase and immediately before the atomic repository call, so an
    // attempt whose timer was stopped, destroyed or replaced while the manager was
    // loading cannot submit the write.
    const ownership = this.#ownershipFor(record)

    let result
    try {
      result = await this.#expireViaManager(record, ownership)
    } finally {
      record.inFlight = false
    }

    if (result.success === true) {
      record.lastError = null
      record.completedAt = Date.now()
      // Conditional on record identity: a completion belonging to an older
      // generation must never delete the newer record that now owns this key.
      this.#settle(record)

      const outcome = {
        status: 'expired',
        reservationId: record.reservationId,
        tenantId: record.tenantId,
        expectedStatus: record.expectedStatus,
        fromStatus: record.expectedStatus,
        toStatus: result.status,
        expiredAt: new Date().toISOString(),
      }

      // The atomic transition and the capacity release are committed. A post-commit
      // step (notification, subscriber) failed afterwards: the timer has already
      // been settled, so there is no deadline and no queued job left, and the
      // release is NOT to be retried. The scheduled job still fails, so the failure
      // is not hidden, but it is reported as what it is instead of as a
      // manager/release failure that would invite a retry of committed work.
      if (result.postCommit?.status === 'failed') {
        const error = new Error(
          `Reservation ${record.reservationId} was expired and its capacity released, but a post-commit step failed: ${result.postCommit.error?.message || result.postCommit.error}`
        )
        error.reservationId = record.reservationId
        error.expectedStatus = record.expectedStatus
        error.reason = 'post_commit_failed'
        error.phase = 'post_commit'
        error.retryable = false
        error.committed = true
        error.postCommitError = result.postCommit.error || null
        throw error
      }

      return outcome
    }

    if (STALE_REASONS.has(result.reason)) {
      // The reservation moved on, or this attempt lost its timer mid-flight.
      // Nothing failed and nothing may be retried.
      record.lastOutcome = result.reason
      this.#settle(record)

      return {
        status: 'skipped',
        reservationId: record.reservationId,
        expectedStatus: record.expectedStatus,
        reason: result.reason,
        error: result.error || null,
        retryable: false,
      }
    }

    // Every remaining outcome is an operational failure. It is thrown, not
    // resolved: `SchedulerManager.run()` marks a job completed whenever its
    // handler resolves, so returning a failure object would report a release
    // failure as a successful job. The record stays armed and observable, and the
    // scheduler's own retry metadata is the only automatic retry.
    record.failedAttempts += 1
    record.lastError = result.error || result.reason
    record.lastOutcome = result.reason

    const error = new Error(
      `Reservation ${record.reservationId} expiration from ${record.expectedStatus} failed: ${record.lastError}`
    )
    error.reservationId = record.reservationId
    error.expectedStatus = record.expectedStatus
    error.reason = result.reason
    error.retryable = true
    error.errors = result.errors || null
    throw error
  }

  /**
   * One expiration attempt reported as a value instead of thrown.
   *
   * Used by the surfaces whose job is to return a report — `checkExpiration()` and
   * `retryTimer()`. The scheduled delivery path calls `#execute()` directly, so an
   * operational failure there throws and the scheduler records a failed job instead
   * of a completed one.
   *
   * The report must carry the thrown error's own classification, not a rewritten
   * one: a post-commit failure is non-retryable and already settled, while a
   * pre-commit manager/repository failure is retryable and keeps its timer. This
   * method re-arms nothing either way; `#execute()` has already settled a
   * committed record and left a retryable one in place.
   * @private
   */
  async #attempt(record) {
    try {
      return await this.#execute(record)
    } catch (error) {
      return {
        status: 'failed',
        reservationId: record.reservationId,
        expectedStatus: record.expectedStatus,
        reason: error.reason || 'attempt_failed',
        error: error.message,
        errors: error.errors || null,
        // The thrown error's own classification is authoritative. Hardcoding
        // `true` here reported a COMMITTED expiration as retryable, which is
        // false evidence: a post-commit failure has nothing to retry, and its
        // timer has already been settled.
        retryable: error.retryable !== false,
        phase: error.phase || null,
        committed: error.committed === true,
        postCommitError: error.postCommitError || null,
      }
    }
  }

  /**
   * Expire through the manager's single atomic expiration path.
   * @private
   */
  async #expireViaManager(record, ownership) {
    const manager = this.#manager
    if (!manager || typeof manager.expireReservationFromTimer !== 'function') {
      return {
        success: false,
        reason: 'manager_unavailable',
        error: 'Reservation expiration requires ReservationManager.expireReservationFromTimer',
      }
    }

    let result
    try {
      result = await manager.expireReservationFromTimer(
        record.reservationId,
        record.expectedStatus,
        { ownership }
      )
    } catch (error) {
      // A release/persistence rejection surfaces here and must stay observable.
      return { success: false, reason: 'manager_threw', error: `Reservation expiration failed: ${error?.message || error}` }
    }

    if (!result || result.success !== true) {
      return {
        success: false,
        reason: result?.reason || 'manager_declined',
        error: result?.error || (Array.isArray(result?.errors) ? result.errors.join('; ') : null),
        errors: result?.errors,
      }
    }

    // `postCommit` is carried through deliberately. The manager reports a failure
    // that happened AFTER the transition and the release were committed; dropping
    // it here would turn a post-commit side-effect failure back into an ordinary
    // successful expiration and hide it.
    return {
      success: true,
      status: result.status,
      postCommit: result.postCommit || null,
    }
  }

  /**
   * Resolve the deadline anchor for a state.
   *
   * The anchor is a timestamp of the successful state entry already present on
   * the persisted reservation — never `Date.now()` at arming time, which would
   * silently restart the clock on every arm.
   * @private
   */
  #resolveAnchor(state, status, explicitAnchor) {
    if (explicitAnchor) {
      const ms = toEpochMs(explicitAnchor)
      if (ms !== null) return ms
    }

    const fields = STATE_ENTRY_ANCHORS[status] || ['updatedAt', 'createdAt']
    for (const field of fields) {
      const ms = toEpochMs(state[field])
      if (ms !== null) return ms
    }
    return null
  }

  /**
   * Read the current persisted state, repository first then the manager cache.
   * @private
   */
  async #loadReservationState(reservationId) {
    const manager = this.#manager
    if (!manager) return null

    if (typeof manager.findById === 'function') {
      try {
        const found = await manager.findById(reservationId)
        if (found) return found
      } catch { /* fall through to the cache */ }
    }
    if (typeof manager.getById === 'function') {
      return manager.getById(reservationId) || null
    }
    return null
  }

  /**
   * The single admission guard, shared by scheduled delivery, `checkExpiration()`
   * and `retryTimer()`.
   *
   * Before this existed each caller checked a different subset of the same
   * conditions, so an explicit retry ignored `inFlight` entirely and `#execute`
   * validated neither the lifecycle nor whether the record it held was still the
   * one this instance owns. Every refusal here is a no-op, never a write.
   *
   * @param {object|null} record
   * @param {{ source: string, expectedJobId?: string|null, expectedGeneration?: number|null }} options
   * @returns {{ ok: boolean, reason?: string }}
   * @private
   */
  #admit(record, { source, expectedJobId = null, expectedGeneration = null } = {}) {
    if (!record) return { ok: false, reason: 'no_timer' }

    if (this.#destroyed || !this.#active) {
      return { ok: false, reason: STOP_REASONS.INACTIVE }
    }

    const key = this.#key(record.reservationId, record.expectedStatus)
    if (this.#timers.get(key) !== record) {
      // The record was stopped, settled, or superseded by a newer arming for the
      // same state while this caller was resolving.
      return { ok: false, reason: this.#done.has(key) ? 'already_handled' : 'superseded' }
    }

    if (!record.active) return { ok: false, reason: STOP_REASONS.INACTIVE }
    if (expectedJobId !== null && record.jobId !== expectedJobId) {
      return { ok: false, reason: 'job_id_mismatch' }
    }
    if (expectedGeneration !== null && record.generation !== expectedGeneration) {
      return { ok: false, reason: 'superseded' }
    }
    if (record.inFlight) {
      // Concurrent delivery, sweep overlap or an overlapping retry: the first
      // attempt owns this record.
      return { ok: false, reason: `already_in_flight:${source}` }
    }

    return { ok: true }
  }

  /**
   * A live ownership token for one attempt.
   *
   * `isCurrent()` answers a single question — is this exact record still the one
   * this instance owns for this reservation and state? — which the manager checks
   * after its own asynchronous pre-write phase and immediately before submitting
   * the atomic repository call.
   *
   * BOUNDARY: this is in-process only. It is not a distributed cancellation, not a
   * durable generation, and not a database-level same-state generation check: it
   * cannot recall a write another process has already submitted or committed, and
   * it says nothing about what a restart would find.
   * @private
   */
  #ownershipFor(record) {
    const key = this.#key(record.reservationId, record.expectedStatus)
    const generation = record.generation
    return {
      reservationId: record.reservationId,
      expectedStatus: record.expectedStatus,
      generation,
      isCurrent: () =>
        !this.#destroyed &&
        this.#active &&
        this.#timers.get(key) === record &&
        record.generation === generation,
    }
  }

  /**
   * Settle a record: remove it from the armed set and remember its key so a
   * repeated delivery is a no-op.
   *
   * Conditional on record identity. An older completion whose key has since been
   * claimed by a newer record must not delete it.
   * @private
   */
  #settle(record) {
    const key = this.#key(record.reservationId, record.expectedStatus)
    if (this.#timers.get(key) !== record) return false
    record.active = false
    this.#timers.delete(key)
    this.#done.add(key)
    return true
  }

  /**
   * Withdraw a queued job. Used when an arming loses its ownership after the
   * scheduler has already accepted the job: the job must not stay queued, and
   * only that job is touched.
   * @private
   */
  async #cancelJob(jobId) {
    const scheduler = this.#scheduler
    if (!scheduler || typeof scheduler.cancel !== 'function') return false
    try {
      const cancelled = await scheduler.cancel(jobId)
      return Boolean(cancelled && cancelled.success === true)
    } catch {
      return false
    }
  }

  /**
   * Claim ownership of an arming before it awaits the scheduler. A newer claim for
   * the same reservation and state invalidates the older one.
   * @private
   */
  #claimArming(reservationId, expectedStatus) {
    this.#invalidatePendingArmings(reservationId, expectedStatus)

    this.#armingCounter += 1
    const token = `${this.#instanceId}#${this.#armingCounter}`
    this.#pendingArmings.set(token, {
      reservationId,
      expectedStatus,
      epoch: this.#lifecycleEpoch,
    })

    let tokens = this.#pendingByReservation.get(reservationId)
    if (!tokens) {
      tokens = new Set()
      this.#pendingByReservation.set(reservationId, tokens)
    }
    tokens.add(token)

    return token
  }

  #releaseArming(token) {
    const pending = this.#pendingArmings.get(token)
    if (!pending) return
    this.#pendingArmings.delete(token)

    const tokens = this.#pendingByReservation.get(pending.reservationId)
    if (!tokens) return
    tokens.delete(token)
    if (tokens.size === 0) this.#pendingByReservation.delete(pending.reservationId)
  }

  /**
   * Invalidate arming work that has not published a record yet.
   * @private
   */
  #invalidatePendingArmings(reservationId, expectedStatus = null) {
    const tokens = this.#pendingByReservation.get(reservationId)
    if (!tokens) return []

    const invalidated = []
    for (const token of [...tokens]) {
      const pending = this.#pendingArmings.get(token)
      if (!pending) continue
      if (expectedStatus !== null && pending.expectedStatus !== expectedStatus) continue
      this.#releaseArming(token)
      invalidated.push(pending)
    }
    return invalidated
  }

  /**
   * Stop one timer: mark it inert, cancel its queued job and drop it.
   * @private
   */
  async #stop(record, reason) {
    const key = this.#key(record.reservationId, record.expectedStatus)
    record.active = false
    this.#timers.delete(key)
    this.#done.add(key)

    return (await this.#cancelJob(record.jobId)) ? record.jobId : null
  }

  /**
   * Confirm the scheduler actually holds the job.
   * @private
   */
  #isJobStored(jobId) {
    const scheduler = this.#scheduler
    if (!scheduler) return false
    if (typeof scheduler.getJob === 'function') {
      try {
        return Boolean(scheduler.getJob(jobId))
      } catch {
        return false
      }
    }
    if (typeof scheduler.getJobs === 'function') {
      try {
        return (scheduler.getJobs() || []).some(job => job?.id === jobId)
      } catch {
        return false
      }
    }
    return false
  }

  #describe(record, action) {
    const armed = action === 'armed' || action === 'kept'
    return {
      status: armed ? action : 'skipped',
      action,
      reservationId: record.reservationId,
      tenantId: record.tenantId,
      reservationStatus: record.expectedStatus,
      generation: record.generation,
      jobId: record.jobId,
      timeoutMs: record.timeoutMs,
      anchorAt: record.anchorAt,
      expiresAt: new Date(record.expiresAtMs).toISOString(),
      reason: armed ? null : action,
      attempts: record.attempts,
      failedAttempts: record.failedAttempts,
      lastError: record.lastError,
    }
  }

  #snapshot() {
    return Array.from(this.#timers.values())
  }

  #find(reservationId, status) {
    return this.#timers.get(this.#key(reservationId, status)) || null
  }

  #markDone(reservationId, status) {
    if (!reservationId || !status) return
    this.#done.add(this.#key(reservationId, status))
  }

  #key(reservationId, status) {
    return `${this.#tenantId || 'no-tenant'}:${reservationId}:${status}`
  }

  #nextGeneration(reservationId) {
    const next = (this.#generations.get(reservationId) || 0) + 1
    this.#generations.set(reservationId, next)
    return next
  }
}

function toEpochMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string' || value.length === 0) return null
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? null : ms
}

function describeSchedulerResult(result) {
  if (!result) return 'Reservation expiration scheduling returned no result'
  if (Array.isArray(result.errors) && result.errors.length > 0) {
    return `Reservation expiration scheduling rejected: ${result.errors.join('; ')}`
  }
  return `Reservation expiration scheduling rejected: ${result.error || 'no scheduler result'}`
}

export default ReservationTimer