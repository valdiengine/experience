/**
 * Tenant Reservation Recovery Bootstrap — per-tenant expiration recovery ownership
 *
 * BOOKING-EXPIRATION-RECOVERY-1 (remediation: real tenant activation).
 *
 * ## Why this module exists
 *
 * The commercial runtime boots with a single synthetic tenant (`commercial`). Every
 * `ReservationCapability` therefore activates its timer and recovers persisted rows
 * under that synthetic scope, which owns no real reservations.
 *
 * Real reservations live under the tenants recorded in the process-local
 * `BookingRegistry`, reconstructed at startup from PostgreSQL. The public Booking
 * path reaches them through `buildTravelerContext(baseContext, target)`, which builds
 * a request-scoped, tenant-scoped `ReservationManager` — and that manager's lifetime
 * is one HTTP request. Its timers die with the request, so after a Passenger restart
 * an Ensueño reservation could stay `requested` forever even though recovery
 * "succeeded" for `commercial`.
 *
 * This module closes that gap with the minimum ownership the durable state actually
 * needs: ONE `ReservationManager` + `ReservationTimer` per unique registered Booking
 * tenant, held for the process lifetime, recovering persisted expirable reservations
 * and keeping the reconstructed deadlines armed.
 *
 * ## What it deliberately does NOT do
 *
 * - No cross-tenant scan. Enumeration is `BookingRegistry.list()` deduplicated by
 *   `tenantId`; a tenant absent from the registry is never touched.
 * - No second expiration writer. Expiration still runs only through
 *   `ReservationManager.expireReservationFromTimer()` → `expireReservationWithRelease()`,
 *   so the atomic transition and the exactly-once capacity release are unchanged.
 * - No second `SchedulerCapability`. Every tenant timer resolves the scheduler through
 *   the shared `CapabilityRegistry` (`capabilities.get('scheduler')`), and each timer
 *   registers its own per-instance handler name (`reservationExpiration:reservation-N`).
 *   No scheduler-per-tenant instance is created.
 * - No durable scheduler state, no filesystem state, no distributed locking.
 * - No traveler authorization. `buildTravelerContext()` is NOT reused wholesale: it
 *   installs a traveler auth facade and a request-scoped availability manager, which
 *   are request semantics. This module reuses only the repository-scoping contract —
 *   `createRepositoriesFacade(repositoryRuntime, scopedContext)` over a context whose
 *   `tenant.id` is the real tenant — which is the part the tenant isolation guarantee
 *   actually rests on.
 *
 * ## Failure semantics — CHOICE B: degraded, not fail-fast
 *
 * A per-tenant activation or recovery failure marks the aggregate result
 * `degraded` and is reported per tenant with its reason and error. Startup is NOT
 * failed. Rationale: reservation expiration is one duty among many; the existing
 * `ReservationCapability` already chose to REPORT a failed timer registration rather
 * than throw (see its `activate()` comment), and `application.start()` has no
 * fail-fast contract for capability activation outcomes — `registerCapabilities()`
 * catches and rethrows only bootstrap-level errors. Killing the whole platform
 * (Booking API, search index, repository runtime) because one tenant's recovery could
 * not arm would be a strictly larger outage than the problem. A tenant whose recovery
 * failed is reported, and the next restart retries it.
 */
import { createRepositoriesFacade } from './capability.bootstrap.js'
import { ReservationManager } from '../../capabilities/reservation/reservation.manager.js'
import { ReservationTimer } from '../../capabilities/reservation/reservation.timer.js'

export const TENANT_RECOVERY_SOURCE = 'startup_tenant_reservation_recovery'

/**
 * BOOKING-EXPIRATION-LIVE-ARM-1. The process-lifetime orchestrator established by
 * `startTenantReservationRecovery()`, exposed so the public traveler booking path
 * can arm a freshly-persisted reservation on the ONE authoritative tenant timer
 * instead of building a per-request timer. A single-writer module singleton, in
 * the same style as the shared BookingRegistry in `booking.routes.js`: set on every
 * successful `startTenantReservationRecovery()` call (production startup and test
 * harnesses alike), and safe to read at any time - when no orchestrator has been
 * established, or its tenant runtimes were destroyed, callers receive `null` and
 * report the reservation as not armed rather than inventing a timer authority.
 */
let sharedTenantReservationRecovery = null

/**
 * The live tenant reservation recovery orchestrator for this process, or null.
 * @returns {TenantReservationRecoveryOrchestrator|null}
 */
export function getTenantReservationRecovery() {
  return sharedTenantReservationRecovery
}

/**
 * One tenant's reservation expiration runtime: its scoped context, its manager and
 * its timer. Kept alive for the lifetime of the process so reconstructed future
 * deadlines remain armed and their handler remains resolvable.
 */
class TenantReservationRuntime {
  constructor({ tenant, context, manager, timer, companies, timerActivation, recovery }) {
    this.tenantId = tenant.id
    this.tenant = tenant
    this.companies = companies
    this.context = context
    this.manager = manager
    this.timer = timer
    this.timerActivation = timerActivation
    this.recovery = recovery
    this.destroyed = false
  }

  /**
   * Release this tenant's ownership: the timer stops its timers, cancels its queued
   * jobs and unregisters its own handler. The shared scheduler is NOT destroyed here.
   */
  async destroy() {
    if (this.destroyed) return
    this.destroyed = true
    try { await this.timer?.destroy() } catch { /* best-effort: teardown is reported by the caller */ }
    try { this.manager?.attachTimer?.(null) } catch { /* best-effort */ }
    this.manager = null
    this.timer = null
  }

  /** Whether this runtime can still own the tenant's timers. */
  get usable() {
    return this.destroyed === false && this.timer !== null
  }
}

/**
 * Enumerate the UNIQUE tenants behind the registered Booking targets.
 *
 * Two companies may legitimately share one tenant, so deduplication is by
 * `tenantId` — never by company slug, never per target. Targets without a usable
 * `tenantId` are reported as unusable rather than guessed at.
 *
 * @param {object} bookingRegistry - The process-local BookingRegistry
 * @returns {{ tenants: object[], targets: object[], unusable: object[] }}
 */
export function enumerateBookingTenants(bookingRegistry) {
  const targets = bookingRegistry && typeof bookingRegistry.list === 'function'
    ? bookingRegistry.list()
    : []

  const byTenant = new Map()
  const unusable = []

  for (const target of targets) {
    const tenantId = typeof target?.tenantId === 'string' ? target.tenantId.trim() : ''
    if (!tenantId) {
      // Never invented: a target without a real tenant cannot be scoped, so it is
      // skipped and reported instead of being folded into the synthetic scope.
      unusable.push({ companySlug: target?.companySlug ?? null, reason: 'missing_tenant_id' })
      continue
    }

    const existing = byTenant.get(tenantId)
    if (existing) {
      existing.companies.push(target.companySlug ?? null)
      continue
    }

    byTenant.set(tenantId, {
      tenant: {
        id: tenantId,
        name: target.tenantName || tenantId,
        slug: target.tenantSlug || tenantId,
      },
      companies: [target.companySlug ?? null],
    })
  }

  return { tenants: Array.from(byTenant.values()), targets, unusable }
}

/**
 * Owns the per-tenant reservation expiration runtimes for the process lifetime.
 */
export class TenantReservationRecoveryOrchestrator {
  #baseContext = null
  #repositoryRuntime = null
  #capabilityRegistry = null
  #configuration = null
  #runtimes = new Map()
  #destroyed = false

  constructor({ baseContext, repositoryRuntime, capabilityRegistry, configuration } = {}) {
    this.#baseContext = baseContext
    this.#repositoryRuntime = repositoryRuntime
    this.#capabilityRegistry = capabilityRegistry
    this.#configuration = configuration || {}
  }

  /**
   * Build a tenant-scoped context.
   *
   * Reuses ONLY the repository-scoping contract. `capabilities` stays the shared
   * `CapabilityRegistry`, so `get('scheduler')` is the one already-active shared
   * scheduler — this is what keeps it to a single scheduler for every tenant.
   * `runtime`, `eventBus`, `config` and `dataManager` are carried over from the
   * commercial context unchanged, so a tenant recovery context never forces a
   * different configuration setting than the capability path would resolve.
   *
   * The global commercial context is NOT mutated: this is a derived object.
   */
  #tenantContext(tenant) {
    const base = this.#baseContext || {}
    const scoped = Object.assign(Object.create(Object.getPrototypeOf(base)), base, { tenant })
    scoped.repositories = createRepositoriesFacade(this.#repositoryRuntime, scoped)
    return scoped
  }

  /**
   * Recover one tenant: activate its handler, then reconstruct its timers.
   *
   * A tenant is owned by ONE runtime for the process lifetime. A repeated recovery pass
   * reuses that runtime and re-reads persisted state through the SAME timer: the timer
   * keeps the deadlines it already armed, so no second handler is registered and no
   * duplicate job is queued for the same reservation. A runtime that is no longer usable
   * (already destroyed) is released before a replacement is built, so its handler and
   * queued jobs cannot outlive it.
   *
   * Ownership invariant for a NEWLY-created attempt: from the moment the timer is built
   * until the runtime is stored in `#runtimes`, this method owns every resource the
   * attempt created. Each attempt therefore ends in exactly one of two states — adopted
   * into `#runtimes` and owned for the process lifetime, or fully destroyed before the
   * failure is returned or rethrown. There is no third state: without it, a throw between
   * a successful `activate()` and adoption would orphan an activated timer whose handler
   * stays registered on the shared scheduler, and the outer `tenant_recovery_threw`
   * reporting would no longer hold a reference able to clean it up.
   *
   * @returns {Promise<object>} the structured per-tenant entry
   */
  async #recoverTenant({ tenant, companies }) {
    const existing = this.#runtimes.get(tenant.id)

    if (existing?.usable) {
      const recovery = await existing.timer.recoverFromPersistedState()
      const failed = recovery?.status === 'failed' || recovery?.status === 'partial'
      existing.companies = companies
      existing.recovery = recovery

      return {
        tenantId: tenant.id,
        companies,
        status: failed ? 'degraded' : 'ok',
        reason: failed ? (recovery?.reason || 'recovery_incomplete') : null,
        timerActivation: existing.timerActivation,
        recovery,
        runtime: existing,
      }
    }

    if (existing) await existing.destroy()

    const context = this.#tenantContext(tenant)
    const manager = new ReservationManager(context)
    const timer = new ReservationTimer(context, { manager })

    // Best-effort release of everything THIS attempt created. Used only while the runtime
    // is not yet adopted; once `#runtimes` owns it, the normal orchestrator lifecycle does.
    const discardAttempt = async () => {
      try { await timer.destroy() } catch { /* best-effort: never mask the real failure */ }
      try { if (typeof manager.attachTimer === 'function') manager.attachTimer(null) } catch { /* best-effort */ }
    }

    let timerActivation = null
    try {
      timerActivation = (await timer.activate()) ?? { status: 'unknown' }
    } catch (error) {
      // Activation itself may have failed after partially registering resources.
      await discardAttempt()
      throw error
    }

    if (timerActivation.status !== 'registered' && timerActivation.status !== 'already_active') {
      // No handler means nothing could ever run a reconstructed deadline, so recovery
      // is not attempted. Reported, not thrown — but whatever the failed activation
      // left behind is released first, so no temporary timer outlives this attempt.
      await discardAttempt()
      const reason = 'timer_not_registered'
      return {
        tenantId: tenant.id,
        companies,
        status: 'failed',
        reason,
        timerActivation,
        recovery: {
          source: TENANT_RECOVERY_SOURCE,
          status: 'skipped',
          reason: 'timer_not_registered',
          error: timerActivation.error || 'Reservation expiration handler is not registered',
          reservations: [],
        },
        runtime: null,
      }
    }

    let recovery = null
    try {
      recovery = await timer.recoverFromPersistedState()
    } catch (error) {
      // Unexpected throw AFTER a successful activation: the handler is registered on the
      // shared scheduler and deadlines may already be armed. Release them here, while
      // this method still holds the only reference, then rethrow so the outer
      // `tenant_recovery_threw` reporting stays authoritative.
      await discardAttempt()
      throw error
    }

    const failed = recovery?.status === 'failed' || recovery?.status === 'partial'

    const runtime = new TenantReservationRuntime({
      tenant,
      context,
      manager,
      timer,
      companies,
      timerActivation,
      recovery,
    })
    // Adopted: from here the orchestrator owns cleanup. A `partial`/`failed` structured
    // result is NOT grounds for destroying it — the runtime may own correctly
    // reconstructed timers — so degraded semantics are preserved as they were.
    // Held for the process lifetime: reconstructed future deadlines stay armed and
    // their handler stays registered until cleanup.
    this.#runtimes.set(tenant.id, runtime)

    return {
      tenantId: tenant.id,
      companies,
      status: failed ? 'degraded' : 'ok',
      reason: failed ? (recovery?.reason || 'recovery_incomplete') : null,
      timerActivation,
      recovery,
      runtime,
    }
  }

  /**
   * Enumerate registered Booking targets, deduplicate by tenant, and establish one
   * tenant-scoped reservation expiration runtime per unique tenant.
   *
   * @param {object} bookingRegistry - The shared process-local BookingRegistry
   * @returns {Promise<object>} the aggregate structured startup result
   */
  async recover(bookingRegistry) {
    const startedAt = Date.now()
    const { tenants, targets, unusable } = enumerateBookingTenants(bookingRegistry)

    const entries = []
    for (const entry of tenants) {
      try {
        entries.push(await this.#recoverTenant(entry))
      } catch (error) {
        // One tenant's failure must not abort the others, and must not abort startup.
        entries.push({
          tenantId: entry.tenant.id,
          companies: entry.companies,
          status: 'failed',
          reason: 'tenant_recovery_threw',
          error: error?.message || String(error),
          timerActivation: null,
          recovery: null,
          runtime: null,
        })
      }
    }

    const degraded = entries.filter((entry) => entry.status !== 'ok')
    const sharedScheduler = this.#capabilityRegistry?.get?.('scheduler') || null

    return {
      source: TENANT_RECOVERY_SOURCE,
      at: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      status: degraded.length > 0 ? 'degraded' : 'ok',
      reason: degraded.length > 0 ? 'some_tenants_failed' : null,
      bookingTargets: targets.length,
      uniqueTenants: entries.length,
      unusableTargets: unusable,
      // Proof, not assertion: every tenant timer resolved THIS instance.
      sharedScheduler: sharedScheduler
        ? { capabilityId: 'scheduler', instanceId: sharedScheduler.instanceId ?? null, reused: true }
        : { capabilityId: 'scheduler', instanceId: null, reused: false },
      totals: {
        ok: entries.length - degraded.length,
        degraded: degraded.filter((entry) => entry.status === 'degraded').length,
        failed: degraded.filter((entry) => entry.status === 'failed').length,
        armedTimers: entries.reduce((sum, entry) => sum + (entry.runtime?.timer?.getActiveTimers().length || 0), 0),
        expired: entries.reduce((sum, entry) => sum + (entry.recovery?.totals?.expired || 0), 0),
      },
      tenants: entries,
    }
  }

  /**
   * Arm the automatic-expiration timer for a just-persisted reservation under the
   * process-lifetime runtime that owns its tenant.
   *
   * BOOKING-EXPIRATION-LIVE-ARM-1. The public traveler path creates reservations
   * through a request-scoped `ReservationManager` that owns no timer; this method
   * hands the persisted reservation to the ONE authoritative per-tenant
   * `ReservationTimer` this orchestrator already holds - the same instance startup
   * recovery arms - so a live traveler reservation gets its deadline immediately,
   * with no second timer authority and no per-request timer. Idempotent by
   * construction: the timer's own duplicate guard keeps an already-armed record's
   * original deadline untouched.
   *
   * @param {string} tenantId
   * @param {object} reservation - The persisted reservation (id, status, createdAt)
   * @returns {Promise<{ armed: boolean, status: string, reason: string|null, tenantId: string|null }>}
   */
  async armReservationTimer(tenantId, reservation) {
    const key = typeof tenantId === 'string' ? tenantId.trim() : ''
    const runtime = key ? this.#runtimes.get(key) : undefined
    if (!runtime || !runtime.usable) {
      // Tenant isolation holds by construction: only the runtime registered for
      // this exact tenant id can arm its reservations. A missing or destroyed
      // runtime is reported, never borrowed from another tenant.
      return { armed: false, status: 'unavailable', reason: 'tenant_runtime_unavailable', tenantId: key || null }
    }

    // The reservation must actually belong to this tenant's runtime: a mismatched
    // caller can never plant a timer for a foreign row under the wrong tenant's
    // authority, so no expiration attempt can ever be aimed across tenants.
    const reservationTenantId = typeof reservation?.tenantId === 'string' ? reservation.tenantId : null
    if (reservationTenantId && reservationTenantId !== key) {
      return { armed: false, status: 'foreign_tenant', reason: 'reservation_tenant_mismatch', tenantId: key }
    }

    const reservationId = reservation?.id
    const status = reservation?.status
    const result = await runtime.timer.syncReservationState(reservationId, reservation, {
      onStateChange: true,
      anchor: reservation?.createdAt || undefined,
    })

    // The live record is the authority on whether an arm actually exists - a
    // schedule rejection or invalidated arming publishes no record, so this
    // never reports a timer that is not queued.
    const live = reservationId && status ? runtime.timer.getTimer(reservationId, status) : null
    return {
      armed: live?.active === true,
      status: result?.status ?? 'unknown',
      reason: result?.reason ?? null,
      tenantId: runtime.tenantId,
    }
  }

  /** The live tenant runtimes, keyed by tenantId. */
  list() {
    return Array.from(this.#runtimes.values())
  }

  get size() {
    return this.#runtimes.size
  }

  /**
   * Destroy every tenant runtime BEFORE the shared scheduler and runtime are shut
   * down, so each tenant unregisters its own handler and cancels its own jobs while
   * the scheduler is still able to accept those calls.
   */
  async destroy() {
    if (this.#destroyed) return { destroyed: 0, alreadyDestroyed: true }
    this.#destroyed = true

    const runtimes = Array.from(this.#runtimes.values())
    this.#runtimes.clear()
    for (const runtime of runtimes) {
      await runtime.destroy()
    }
    return { destroyed: runtimes.length, alreadyDestroyed: false }
  }
}

/**
 * Startup entry point.
 *
 * Must run AFTER `registerCapabilities()` (so the shared `SchedulerCapability` exists
 * and is active) and AFTER the BookingRegistry has been reconstructed.
 *
 * @param {object} options
 * @param {object} options.runtime - Runtime bundle (needs `repositoryRuntime`)
 * @param {object} options.capabilityContext - The global commercial capability context
 * @param {object} options.capabilityRegistry - The shared CapabilityRegistry
 * @param {object} options.bookingRegistry - The shared process-local BookingRegistry
 * @param {object} [options.configuration] - Per-capability configuration, carried through
 * @returns {Promise<{ orchestrator: TenantReservationRecoveryOrchestrator, report: object }>}
 */
export async function startTenantReservationRecovery({
  runtime,
  capabilityContext,
  capabilityRegistry,
  bookingRegistry,
  configuration,
} = {}) {
  const orchestrator = new TenantReservationRecoveryOrchestrator({
    baseContext: capabilityContext,
    repositoryRuntime: runtime?.repositoryRuntime,
    capabilityRegistry,
    configuration,
  })

  const report = await orchestrator.recover(bookingRegistry)

  // BOOKING-EXPIRATION-LIVE-ARM-1. Published before returning so the public
  // traveler booking path can arm freshly-persisted reservations on the tenant
  // timers this orchestrator owns. A later boot replaces it; a destroyed
  // orchestrator keeps the reference but owns no runtimes, so arming through it
  // reports unavailable rather than succeeding against dead timers.
  sharedTenantReservationRecovery = orchestrator

  return { orchestrator, report }
}

export default startTenantReservationRecovery