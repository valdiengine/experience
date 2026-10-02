# BOOKING-EXPIRATION-RECOVERY-1 — Implementation Report

**Slice:** wire the scheduler into the commercial runtime and reconstruct reservation
expiration timers from persisted state after a restart — including recovery for the
**real** `BookingRegistry` tenants, not only the synthetic commercial tenant.
**Branch:** `booking-pricing-1a`
**Baseline HEAD:** `72775e5871bff54afba0e2748ffc7dde560d82b9` (identical to
`origin/booking-pricing-1a`, worktree clean at start)
**Status:** implemented, tested, unstaged. Nothing committed, pushed or deployed.

---

## 1. Problem

**Part A — no scheduler in the commercial runtime.** The commercial runtime registered
nine capabilities and no scheduler. `ReservationTimer.activate()` resolves the scheduler
capability from the registry, so in the real commercial path it had nothing to register its
expiration handler against: every expiration timer in production was dead on arrival. On
top of that, timers were pure in-memory state, so a process restart silently dropped every
armed timer and every queued job. A reservation that needed expiration while the process
was down stayed `requested`/`owner_pending`/`payment_pending` forever, holding capacity.

**Part B — recovery ran under the wrong tenant.** Part A's fix made recovery work, but
only for the synthetic `commercial` tenant: `registerCapabilities()` activates
`ReservationCapability` with `tenant = DEFAULT_TENANT`, and that tenant owns no real
reservations. Real reservations live under the tenants recorded in the process-local
`BookingRegistry` (reconstructed at startup from PostgreSQL), and the only runtime that
reached them was the request-scoped manager built by
`buildTravelerContext(baseContext, target)` inside the public Booking path — whose timers
die with the HTTP request. So after a Passenger restart an Ensueño reservation could still
stay `requested` forever even though recovery "succeeded" for `commercial`.

## 2. Design

Two independent facts drive the design:

1. **The durable source of truth is the reservation row.** Timer maps and scheduler jobs
   are disposable delivery records; the persisted reservation status, together with the
   timestamp of the state entry that made it expirable, is what survives a restart.
2. **The repository is already tenant-scoped.** `BaseRepository._buildQuery()` injects
   the capability context's tenant into every read, so recovery is an ordinary
   tenant-scoped query, not a cross-tenant scan.

Therefore recovery re-arms from persisted state through the *existing* single expiration
path. There is no second expiration writer and no status-only fallback.

### Part A — the shared scheduler and the capability-scoped recovery

```
activation order (registry order)
  SchedulerCapability.activate()
  ReservationCapability.activate()
    -> ReservationTimer.activate()        // registers the expiration handler
    -> ReservationTimer.recoverFromPersistedState()
         -> manager.findReservationsByStatus(expirable statuses)   // tenant-scoped read
         -> per row: syncReservationState(id, row)                 // no onStateChange, no anchor reset
         -> checkExpiration()                                     // one existing sweep, same path as live work
```

### Part B — real tenant ownership at startup

```
application.start()
  3b. bootstrapEnsueñoBookingRegistry()   -> shared BookingRegistry (installed via setBookingRegistry)
  4.  registerCapabilities(...)           -> shared SchedulerCapability active, commercial scope recovered
  4b. startTenantReservationRecovery({ runtime, capabilityContext, capabilityRegistry,
                                       bookingRegistry: getBookingRegistry(), configuration })
         -> BookingRegistry.list()                                  // real registered targets
         -> deduplicate by tenantId                                 // two companies may share one tenant
         -> per unique tenant:
              scoped context  = { ...capabilityContext, tenant: <REAL tenant> }
                                .repositories = createRepositoriesFacade(repositoryRuntime, scoped)
                                // capabilities stays the SHARED CapabilityRegistry
              new ReservationManager(scoped) + new ReservationTimer(scoped, { manager })
              timer.activate()                                      // own handler: reservationExpiration:reservation-N
              timer.recoverFromPersistedState()                     // same tenant-scoped recovery as Part A
         -> structured report { status, reason, bookingTargets, uniqueTenants,
                                unusableTargets, sharedScheduler, totals, tenants[] }
  5.  validateRuntime(...)
```

Why `4b` and not inside `ReservationCapability`: activation happens under the synthetic
tenant, so the real tenant identities do not exist yet at that point. `4b` runs after the
registry is reconstructed and after the shared scheduler is active, and its lifetime owner
is the startup bundle (`bundle.tenantReservationRecoveryRuntime`).

Lifecycle and ordering:

- One runtime per tenant, held for the process lifetime, so reconstructed future deadlines
  stay armed and their handlers stay resolvable.
- **Attempt-ownership invariant.** From the moment an attempt creates its
  `ReservationManager`/`ReservationTimer` until the runtime is stored in `#runtimes`, the
  orchestrator owns everything that attempt created. Every attempt ends in exactly one of
  two states — adopted into `#runtimes` and owned for the process lifetime, or fully
  destroyed before the failure is returned or rethrown. There is no third state. So a
  throw between a successful `activate()` and adoption cannot orphan an activated timer with
  its handler still registered on the shared scheduler: the throw handler destroys the timer
  (unregistering the handler and cancelling the jobs it queued), detaches it from the
  manager, and rethrows so the outer `tenant_recovery_threw` reporting stays authoritative.
  The same release runs on a non-registered activation, before the structured
  `timer_not_registered` failure is returned.
- A repeated `recover()` pass **reuses** the existing runtime and re-reads persisted state
  through the same timer, so no second handler is registered and no duplicate job is queued
  for the same reservation. (An earlier revision rebuilt the runtime on every pass, which
  duplicated the queued job; the suite caught it.)
- A structured recovery result of `partial` or `failed` is **not** grounds for destroying an
  adopted runtime — it may still own correctly reconstructed timers — so degraded semantics
  are unchanged.
- `cleanup()` destroys the tenant runtimes **first**, before the capabilities and therefore
  before `SchedulerCapability.destroy()`, because each tenant timer unregisters its own
  handler and cancels its own jobs while the shared scheduler is still alive.

### Failure semantics — CHOICE B: degraded, not fail-fast

A per-tenant activation or recovery failure marks the aggregate result `degraded` and is
reported per tenant with its reason and error; startup is **not** failed. Rationale:
reservation expiration is one duty among many; `ReservationCapability.activate()` already
chooses to *report* a failed timer registration rather than throw, and `start()` has no
fail-fast contract for capability activation outcomes. Killing the whole platform (Booking
API, search index, repository runtime) because one tenant's recovery could not arm would be
a strictly larger outage than the problem. A tenant whose recovery failed is reported and
the next restart retries it.

### Non-goals (deliberately not implemented)

- No filesystem or database persistence for scheduler jobs. The commercial runtime has
  `dataManager: null`; scheduler jobs stay in memory and are treated as disposable.
- No distributed / multi-process timer ownership. Two processes would each recover their
  own timers; correctness across processes rests on the manager's expected-status
  compare-and-set, which makes a duplicate expiration a no-op rather than a double
  release. This is inherited from the atomic-expiration slice, not solved here.
- No cross-tenant scan, and no replacement of the repository tenant scoping.
- `buildTravelerContext()` is not reused wholesale for startup: it installs a traveler auth
  facade and a request-scoped availability manager, which are request semantics. Only the
  repository-scoping contract is reused.
- `capabilities/reservation/reservation.recovery.js` (historical, status-only repair) is
  deliberately **not** reused: its writers bypass the manager's atomic path and its
  availability handling conflicts with the released-line contract.

## 3. Changes

| File | Change |
| --- | --- |
| `runtime/startup/capability.bootstrap.js` | Import `SchedulerCapability`; add it to `COMMERCIAL_CAPABILITIES` immediately **before** `ReservationCapability`; document the ordering constraint and the ten-capability count. |
| `runtime/startup/reservation.recovery.bootstrap.js` | **New** (Part B). `enumerateBookingTenants()`, `TenantReservationRecoveryOrchestrator`, `TenantReservationRuntime`, `startTenantReservationRecovery()`. Attempt ownership: adopt-or-release, so a failed attempt never leaves a registered handler, job or timer behind. |
| `runtime/startup/application.start.js` | Step 4b invocation after `registerCapabilities()` and before validation; `tenantReservationRecovery` + `tenantReservationRecoveryRuntime` on the bundle; `completed` event summary; `cleanup()` destroys tenant runtimes before the capabilities. |
| `capabilities/reservation/reservation.config.js` | New `getExpirableStatuses()`, derived from `TIMEOUT_SETTINGS`, so the recovery candidate set has one source. |
| `capabilities/reservation/reservation.manager.js` | New `#tenantId` and `findReservationsByStatus(statuses)`: refuses to run without a tenant, reads per status, classifies read failures (`no_tenant_scope`, `repository_unavailable`, `repository_read_failed`), and defensively drops rows whose `tenantId` is not the context tenant (reported as `foreignRows`). |
| `capabilities/reservation/reservation.timer.js` | New `recoverFromPersistedState()`, `#recoverOneReservation()` and `#foldSweep()`; durability documentation updated to distinguish post-commit failures. |
| `capabilities/reservation/reservation.capability.js` | Runs recovery immediately after a **successful** timer activation; exposes `timerActivation` and `expirationRecovery`; clears them on destroy. |
| `tests/capability/capability.base.test.js` | Comment corrected (ten capabilities). The existing assertion `registry.size >= 9` still holds (now 10). |
| `docs/architecture/COMMERCIAL_RUNTIME_STARTUP.md`, `COMMERCIAL_RUNTIME_SMOKE_TEST.md` | Capability count, scheduler ordering, and the new step 4b documented. |
| `capabilities/reservation/reservation.recovery-1.test.js` | **New** Part A focused suite (16 tests). |
| `runtime/startup/reservation.recovery.startup.test.js` | **New** Part B startup suite (13 tests). |

### Recovery report shapes

`recoverFromPersistedState()` always returns a structured report: `source`, `tenantId`,
`instanceId`, `handler`, `at`, plus `status`/`reason`/`error`, `statuses`, `scanned`,
`foreignRows`, `sweep`, `totals` and one entry per reservation
(`outcome`, `persistedStatus`, `anchorAt`, `expiresAt`, `overdue`, `generation`, `jobId`,
`error`).

| Situation | Result |
| --- | --- |
| Handler not registered | `skipped` / `timer_inactive` (refuses to arm work nothing can run) |
| Scheduler missing | `failed` / `scheduler_unavailable` (loud, not silent) |
| `autoExpiration:false` | `skipped` / `auto_expiration_disabled` — even for overdue rows |
| Persisted read failed | `failed` / `repository_read_failed` etc. |
| Row armed | `armed`, original `anchorAt`/`expiresAt` preserved |
| Deadline already elapsed | `expired` via the normal sweep and atomic manager path |
| Row without a usable anchor | `failed` / `no_anchor_timestamp`, **no deadline invented** |
| Row vanished | `skipped` / `state_unavailable` |
| Sweep failure before commit | `failed` |
| Sweep failure after commit | `committed_post_commit` (copied through from the sweep) |

A recovery that could not do part of its work reports `partial`, never `ok`.

`startTenantReservationRecovery()` returns the aggregate startup result:
`source`, `at`, `durationMs`, `status` (`ok` | `degraded`), `reason`, `bookingTargets`,
`uniqueTenants`, `unusableTargets`, `sharedScheduler` (`capabilityId`, `instanceId`,
`reused`), `totals` (`ok`, `degraded`, `failed`, `armedTimers`, `expired`) and `tenants[]`
with `tenantId`, `companies`, `status`, `reason`, `timerActivation`, `recovery`, `runtime`.

## 4. Guarantees and explicit non-guarantees

Preserved from the certified timer/atomic slice, and re-verified here:

- Expiration happens **only** through `ReservationManager`, with the approved mapping
  `requested -> expired`, `owner_pending -> no_response`, `payment_pending -> expired`.
- Deadlines are anchored to the persisted state-entry timestamp, so a restart never
  restarts the clock.
- `autoExpiration:false` cannot be overridden by age.
- Repeated recovery / repeated delivery produces no second transition, no second capacity
  release, no second timer record and no duplicate queued job.
- A stale expected status is refused; a reservation that changed state while down is not
  expired.
- One tenant, one owner: two registered companies sharing a `tenantId` yield exactly one
  tenant runtime and exactly one report entry.

Added by the ChatGPT Review Pass 6 lifecycle remediation, and proved by tests 13-14:

- A tenant attempt is either adopted (owned for the process lifetime) or fully released —
  never left half-built. A tenant whose activation or recovery throws leaves no registered
  handler, no queued job, no armed timer and no retained runtime behind.

Explicitly **not** claimed:

- Durable scheduler state, cross-process timer ownership, Neon behaviour, Stage
  certification. Not implemented, not tested, not claimed.
- Full `application.start()` execution is **not** covered by the Part B suite. This
  workspace cannot import `application.start.js` at all — it pulls `jsonwebtoken`, which is
  not installed (see §6). The suite therefore calls the same production functions `start()`
  calls, in the same order (`bootstrapRuntime` → `registerRepositories` →
  `registerCapabilities` → `setBookingRegistry` → `startTenantReservationRecovery`) and
  asserts the wiring contract the orchestrator depends on. This is recorded as a limitation,
  not claimed as `start()` coverage.
- In the commercial runtime `context.dataManager` is `null`, so
  `tenantConfig.<tenant>.reservation` cannot be loaded there and `autoExpiration`
  resolves to its default (`true`) for the tenant runtimes as well as the commercial one.
  This limitation predates this slice and is unchanged: the switch is verified against the
  production loading mechanism (`dataManager.get('tenantConfig.<tenant>.reservation')`), not
  through a commercial-bootstrapped tenant config.

## 5. Tenant isolation

Isolation is enforced twice and tested with live real-tenant rows:

1. Structurally: `findReservationsByStatus()` goes through the capability context's
   repository, which injects the context tenant into the query.
2. Defensively: rows whose `tenantId` differs from the context tenant are dropped and
   counted in `foreignRows`.

Part A (capability scope) creates, for two tenants, identical overdue reservations that each
hold real capacity consumed through the real `createRequest` path, restarts both, then
brings tenant A up and asserts: A sees exactly one row (`foreignRows: 0`, nothing from B),
A's overdue reservation expires and releases A's capacity, and B's reservation, B's held
capacity, B's timers and B's jobs are all untouched.

Part B (startup scope) proves the same for the real startup path, and adds the enumeration
rules:

- Two registered tenants recover independently: A's overdue reservation expires and releases
  only A's capacity; B's fresh reservation, B's capacity, B's timer and B's queued job are
  untouched, and tenant A holds **no** timer for tenant B's reservation.
- Two targets sharing one `tenantId` produce exactly one tenant runtime, one report entry
  with both companies, and the shared reservation appears exactly once.
- A tenant absent from the `BookingRegistry` is never scanned: its overdue reservation is
  not expired, its capacity is not released, no job is scheduled for it — while the
  registered tenant in the same run *is* recovered, so this is scoping, not a silent no-op.

The failure mode of a wrong or missing scope remains "nothing recovered for that tenant"
(visible in the report), never "another tenant's reservations expired".

## 6. Tests

**Part A** — `capabilities/reservation/reservation.recovery-1.test.js`, 16 tests against
the **real** commercial wiring (`registerCapabilities()` + `InMemoryRepositoryAdapter`).
"Restart" is simulated by deactivating and destroying every capability and building a fresh
capability context over the same repository store, so no state is re-seeded after a restart.

**Part B** — `runtime/startup/reservation.recovery.startup.test.js`, 13 tests against the
**real startup sequence**. Reservations are created through the **real public
`BookingAdapter`** (`createBookingAdapter(platform.apiContext, getBookingRegistry())`), so
each row, its line and its consumed capacity come from the production write path and belong
to a REAL tenant id. A "restart" destroys the orchestrator, every capability and the engine,
then boots again over the same repository store — nothing is re-seeded after a restart.

| # | Test | Requirement proved |
| --- | --- | --- |
| 1 | startup establishes recovery ownership for the registered tenant | Registry drives recovery; tenant context carries the REAL tenant id; the global commercial context is untouched |
| 2 | startup recovers a real tenant reservation without bootstrapping that tenant capability | Discovery happens from the registry alone; overdue row expired through the atomic path, capacity released exactly once, released line present, repeated pass releases nothing again, no runtime for `commercial` |
| 3 | repeating recovery adds no second runtime, timer or release | Idempotency across two extra passes: one runtime, one timer, one pending job, no double release, one released line |
| 4 | a future deadline is reconstructed from the persisted entry and stays live | Deadline anchored to the persisted state-entry timestamp, `overdue:false`, timer live after startup, job pending, an early delivery reports `not_due` + `requeue` and expires nothing |
| 5 | (same test, later step) | Delivery **after** the deadline expires the reservation and releases capacity exactly once |
| 6 | two registered tenants with different tenantIds recover independently | One runtime per tenant, cross-tenant timers/jobs absent |
| 7 | two targets sharing one tenantId produce exactly one tenant recovery runtime | Deduplication by `tenantId`, both companies attributed, one report entry, reservation seen once |
| 8 | a tenant absent from the BookingRegistry is never scanned or expired | No cross-tenant scan; the registered tenant in the same run is still recovered |
| 9 | cleanup destroys tenant handlers, jobs and timers before the scheduler | Orchestrator destroyed while the scheduler is alive: timers dropped, queued jobs cancelled, handler inert, idempotent second destroy, handler distinct from the commercial one |
| 10 | a failed tenant recovery is visible in the aggregate report without failing startup | Choice B: `degraded` + `some_tenants_failed`, per-tenant `timer_not_registered`, `recovery.status: skipped`, `sharedScheduler.reused: false`, totals counted, failed tenant not retained, nothing expired |
| 11 | the one shared SchedulerCapability serves every tenant | Exactly one scheduler capability; every tenant context resolves that same instance; per-tenant handler names are distinct; queued job ids are unique and tenant-qualified; commercial registry still holds exactly ten capabilities |
| 12 | public BookingAdapter behaviour is unchanged by the startup recovery | Resolution states, public booking in the right tenant, `requested` status, capacity held, and the tenant runtime adopts the same persisted row (one writer, no divergence) |
| 13 | an unexpected throw after activation leaves no orphaned timer, handler or job | Handler registered first, then recovery throws: aggregate `degraded`/`some_tenants_failed`, tenant `failed`/`tenant_recovery_threw` with the original error, no runtime retained, no pending job and the unregistered handler no longer runs, the reservation stays `requested` with its capacity, the healthy tenant still expires in the SAME pass, and orchestrator cleanup stays idempotent |
| 14 | the non-registered activation path leaves no temporary timer resources | A failed activation reports `timer_not_registered` **and** the timer built for that attempt is released: not active, no timers, nothing recovered, nothing expired, orchestrator owns nothing, cleanup idempotent |

Test 13 injects the throw through call-through prototype patches scoped to one tenant
(`ReservationTimer.prototype.checkExpiration`, which `recoverFromPersistedState()` calls
*after* arming the recovered deadlines), so the failure happens with a registered handler
and a queued job already in hand. Removing the release from the throw path makes test 13
fail (`no job of the abandoned attempt may remain pending: expected 0, got 1`), so the test
proves the invariant rather than the absence of a regression.

### Results

| Suite | Result | Exit |
| --- | --- | --- |
| `runtime/startup/reservation.recovery.startup.test.js` | 13/13 | 0 |
| `capabilities/reservation/reservation.recovery-1.test.js` | 16/16 | 0 |
| `capabilities/reservation/reservation.timers-1.test.js` | 86/86 | 0 |
| `capabilities/reservation/reservation.expiration-atomic.test.js` | 63/63 | 0 |
| `tests/aggregate/reservation.lifecycle.test.js` | 22/22 | 0 |
| `capabilities/reservation/reservation.manager.cancel-routing.test.js` | 28/28 | 0 |
| `tests/capability/booking3.test.js` | 24/24 | 0 |
| `tests/capability/booking31.test.js` | 14/14 | 0 |
| `tests/capability/booking41.test.js` | 36/36 | 0 |
| `tests/capability/booking42.test.js` | 30/30 | 0 |
| `tests/capability/booking43.test.js` | 24/24 | 0 |
| `tests/capability/reservation-currency.test.js` | 12/12 | 0 |
| `tests/capability/booking44.test.js` | 29/30 | 1 |
| `git diff --check` | clean | 0 |

### Pre-existing failures, not caused by this slice

- `tests/capability/booking44.test.js` — `booking44:pg-guard:mock-sync-consume-wired` asserts
  the source text of `reservation.repository.js` contains `#releaseMockCapacity(`. That file
  is **untouched** by this slice (`git diff HEAD --` on it is empty) and does not contain
  the string, so the guard already fails at the certified baseline.
- `runtime/startup/smoke.test.js` and any full `application.start()` import —
  `ERR_MODULE_NOT_FOUND: Cannot find package 'jsonwebtoken'` (not installed in this
  workspace). Fails during import of `runtime/auth/...`, before any capability wiring runs.
  This is why the Part B suite targets the startup sequence directly.
- `runtime/startup/api.smoke.test.js` / `api.integration.test.js` — `ERR_MODULE_NOT_FOUND:
  Cannot find module 'api/routes/push.routes.js'` (file absent). Same category: missing
  dependency/file, not a wiring regression.

`tests/capability/capability.base.test.js` is a shared base module with no `runIfMain`
call, so it executes nothing when run directly; its checks run inside the booking suites
above, which pass.

`capabilities/persistence/contracts/base.repository.js` logs an unconditional
`[RUNTIME-PERSISTENCE-1 TRACE]` line per repository construction and per query (pre-existing
debug output, untouched here). The Part B suite boots the platform many times, so it filters
those lines in its own `console.log` rather than changing the source.

## 7. Working tree

```
 M capabilities/reservation/reservation.capability.js
 M capabilities/reservation/reservation.config.js
 M capabilities/reservation/reservation.manager.js
 M capabilities/reservation/reservation.timer.js
 M docs/architecture/COMMERCIAL_RUNTIME_SMOKE_TEST.md
 M docs/architecture/COMMERCIAL_RUNTIME_STARTUP.md
 M runtime/startup/application.start.js
 M runtime/startup/capability.bootstrap.js
 M tests/capability/capability.base.test.js
?? capabilities/reservation/reservation.recovery-1.test.js
?? docs/ai/BOOKING_EXPIRATION_RECOVERY_1_REPORT.md
?? runtime/startup/reservation.recovery.bootstrap.js
?? runtime/startup/reservation.recovery.startup.test.js
```

9 modified files and 4 new files (2 suites, 1 bootstrap module, this report).
`git diff --cached` is empty: nothing is staged. No commit, push, deploy, Neon/Stage access,
or destructive Git command was used.