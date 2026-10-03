# BOOKING-EXPIRATION-TIMERS-1 — Delivery report

Slice B: trustworthy reservation expiration timers, wired on the production entry
path, with a deterministic focused suite. Branch `booking-pricing-1a`, baseline HEAD
`f139faa`. Nothing staged, nothing committed.

## What was broken

1. **Every timer ran at 24h.** `reservation.config.js` built its timeout table with
   UPPERCASE keys and indexed it with the lowercase values `RESERVATION_STATUS`
   actually produces, so every lookup missed and fell through to
   `|| ownerPendingTimeout`: `requested` expired at 24h instead of 12h and
   `payment_pending` at 24h instead of 6h. The same fallback hid an unusable
   override behind a plausible number.
2. **Scheduling was unawaited and unverified.** `#scheduleExpiration()` was called
   without `await` and its result ignored, so `{ success: true, timerId }` was
   returned even with no scheduler at all — an armed timer that nothing would ever
   run.
3. **The handler was never registered.** `reservationExpiration` was scheduled but
   never `registerHandler`'d, so no job could execute.
4. **Scheduled expiration was a second expiration writer.** The timer performed its
   own status transition with a `repo.update` fallback, bypassing the manager's
   atomic status+release operation, its permission checks and its event and
   notification contract entirely.
5. **`checkExpiration()` lost failures.** It fired the private write unawaited and
   deleted the map entry before the write finished, so a release failure was
   invisible.
6. **Deadlines restarted on every arm**, anchored to the moment of arming rather
   than to the successful state entry.
7. **Cancellation was cosmetic.** `SchedulerCapability.cancel()` reached only the
   executor, which knows nothing about the job collection: it returned
   `{ success: true }` while the stored job stayed `pending` and a later tick still
   ran it.
8. **`SchedulerCapability.runCleanup()` was a compile-time SyntaxError.**
   `this.#context` is a private field only `BaseCapability` declares. It made
   `capabilities/core/register.js` — and the whole capability registry —
   unloadable.

## What changed

| File | Change |
| --- | --- |
| `capabilities/reservation/reservation.config.js` | Timeout table keyed by the real lowercase statuses. `resolveTimeout()` reports `unsupported` / `auto_disabled` / `invalid_setting` and never substitutes a default. `getAutoExpirationSettings()` validates the switch. `getTimeout()` returns `null` for every state with no approved expiration. |
| `capabilities/reservation/reservation.timer.js` | Rewritten. `activate()` registers the handler before anything can be scheduled and returns the registration outcome. Per-instance handler name (`reservationExpiration:<instance>`) and explicit collision-free job ids. **Arming ownership:** the timer claims each arming *before* awaiting the scheduler, re-validates after the await, and withdraws only its own job when it has been superseded, so a stop, state change, deactivation, destruction or newer arming can no longer be undone by a scheduling result that was already in flight. Deadline anchored to the successful state entry (`createdAt` for `requested`, the transition's `updatedAt` afterwards); a duplicate sync in an unchanged state keeps the existing deadline. **One admission guard** (`#admit`) is shared by scheduled delivery, `checkExpiration()` and `retryTimer()`, and re-checked centrally in `#execute()` in the same synchronous step that claims the record, so an overlapping retry or sweep overlap cannot start a second attempt. The handler validates handler, instance, tenant, job id, generation, record identity, active state and deadline, and routes work only to `ReservationManager.expireReservationFromTimer()` with a live ownership token. **Operational failures throw** — `SchedulerManager.run()` marks a job completed whenever its handler resolves, so a resolved failure object would report a broken release as a successful job; stale, not-found, not-expirable, timer-invalidated and early outcomes remain distinguishable skips, and `checkExpiration()` collects a failure into `failed[]` instead of abandoning the rest of the sweep. Settling a record is conditional on record identity, so an older completion cannot delete a newer record for the same key. `destroy()` unregisters only its own handler. |
| `capabilities/reservation/reservation.manager.js` | `attachTimer()`, `timer`, `#syncTimers()`, `#withTimer()`, `#afterCommit()` and `#expireInternal()`. Wiring in the **manager**, because `ReservationService` and `BusinessReservationManager` call the manager directly and bypass the capability wrappers. **Sync ordering, stated exactly:** in every path that mutates reservation state, `#syncTimers()` runs immediately after the confirmed repository/cache mutation and before the first fallible step in that path — `createRequest`, `requestOwnerConfirmation`, both writes of `confirmOwner` (`owner_confirmed` and `payment_pending`), `rejectReservation`, `cancelReservation`, `#expireInternal`, `completeReservation`, `updateReservation` (only when the patch changes `status`), `checkInReservation`, `checkOutReservation`, `noShowReservation`, `archiveReservation`, `restoreReservation` and `deleteReservation`. `validateReservation` and the read paths mutate nothing and do not sync. `restoreReservation()` returns its timer outcome instead of discarding it. `expireReservationFromTimer()` validates the timer's expected state against the reservation it actually loads, carries it into the repository compare-and-set, and re-validates the timer's ownership token **after its own asynchronous pre-write phase and immediately before submitting the write**. `deleteReservation()` now verifies the repository actually deleted the row before dropping any timer, so a failed deletion cannot leave timer ownership removed for a reservation that is still there. |
| `capabilities/reservation/reservation.capability.js` | Constructs the timer with the manager; activates, deactivates and destroys it. Wrapper-only unawaited timer calls removed. The timer registration outcome is kept and exposed on `timerActivation` instead of being discarded, so an activation without a scheduler no longer reports success while no expiration handler exists. It is reported, not thrown: automatic expiration is off and says so, and the capability's other duties keep working. |
| `capabilities/scheduler/scheduler.capability.js` | `cancel()` now cancels the stored manager job as well as executor state. `unregisterHandler()` added. `runCleanup()` compile error fixed (`this.context`). |
| `capabilities/scheduler/scheduler.manager.js` | `unregisterHandler()`. `run()` honours a handler that resolves `{ requeue: true }`: the job returns to `pending` at its **original** `runAt`, so an early delivery no longer consumes the scheduled execution for that deadline and reports a premature run as a completed job. A handler failure that declares itself non-retryable (`error.retryable === false`) is failed permanently instead of being returned to `pending` by the generic retry counter. |
| `capabilities/scheduler/scheduler.jobs.js` | `markRequeued()`; `markFailed()` takes `permanent`. |
| `capabilities/scheduler/scheduler.events.js` | `JOB_REQUEUED`, so a requeue is observable like the other job transitions. |
| `capabilities/scheduler/executor.js` | `unregisterHandler()`. |

### Transitions between two approved states

While testing `createRequest → requestOwnerConfirmation`, the old `requested` job
came back `pending` after the transition. `syncReservationState()` only stopped a
record for the **same** status, so moving between two approved expirable states
(`requested → owner_pending`) left the previous timer armed: a dead job that could
only ever report `stale_state` when it finally fired. The sync now stops every
timer this instance holds for the reservation before arming, so exactly one
deadline — the current state's — can ever exist. Arming work that has not published
a record yet is invalidated for the same reason: a delayed arm must not resurrect a
state the reservation has left.

## Review corrections

The six review findings were addressed in one pass, each with deterministic
evidence:

1. **A pending arming could resurrect obsolete work.** Ownership is now claimed
   before the scheduler await and re-validated after it; a stop, state change,
   `deactivate()`, `destroy()` or a newer arming for the same key wins, and the
   losing arming withdraws **only its own** queued job.
2. **Admission was checked in three different places.** One shared `#admit()` guard
   now covers scheduled delivery, `checkExpiration()` and `retryTimer()`, and the
   manager re-checks a live ownership token immediately before the repository write,
   so an attempt whose timer was replaced mid-flight cannot start the write.
   Settlement is conditional on record identity.
3. **Timers were synced after fallible side effects.** Every manager path now syncs
   immediately after the confirmed write and before notifications, availability
   updates and event emits; the original error still propagates, and
   `restoreReservation()` returns its timer outcome.
4. **An early tick consumed the deadline.** A handler resolving `{ requeue: true }`
   returns the job to `pending` at its original `runAt`.
5. **Evidence gaps closed**: numeric `expiresAtMs`, a cancelled due job with a due
   uncancelled control, genuinely distinct tenant contexts on one shared scheduler,
   the `owner_pending → no_response` and `payment_pending → expired` outcomes with
   their own events and releases, legacy/malformed recorded lines through the real
   writable Map repository, the real capability lifecycle by direct import, a
   reported registration failure, and `autoExpiration: false`.
6. **Operational scheduled failures now reject.** A resolved failure object would
   have been marked a completed job; a pre-commit failure throws with the record
   retained and observable. A post-commit side-effect failure is the one operational
   failure that is *not* retryable and does *not* keep its timer, and is classified
   as such on every surface, including the report-oriented ones — see
   **Post-commit side-effect semantics** above.

### New evidence for the post-commit semantics

| Test | What it pins down |
| --- | --- |
| a CREATED subscriber that throws leaves the reservation persisted and its timer armed | Committed `requested` stands, the `requested` deadline is armed and backed by a queued job, the original subscriber error is observable |
| an expiration notification that throws is reported post-commit, not as a release failure | `success: true`, landed status reported, `postCommit.status: 'failed'`, `phase: 'post_commit'`, `retryable: false`, original error carried through, no `manager*` reason; terminal state and released capacity stand; no timer armed |
| the scheduled expiration fails as post-commit and keeps no retryable failure or armed job | The job fails with `post-commit` in the result and the original error text, never `manager_threw`; terminal state and release stand; no armed timer; stored job `failed`, not returned to `pending`; a forced re-delivery is a no-op and capacity is never released twice |
| an EXPIRED subscriber that throws keeps the same guarantees | Same, for the event subscriber instead of the notification transport |
| a delete subscriber that throws leaves the timer and its job already removed | Deletion stands, no armed timer, the queued job was already `cancelled` before the subscriber ran, the original error is observable, and the cancelled job cannot expire anything |
| failed persistence arms nothing on create and removes nothing on delete | An unpersisted create arms nothing and queues no job; an undeleted reservation keeps its deadline, its job stays `pending` and its capacity stays held |
| checkExpiration reports a post-commit notification failure as committed and non-retryable | The **sweep report** carries `reason: 'post_commit_failed'`, `phase: 'post_commit'`, `committed: true`, `retryable: false`, and the original error instance through `postCommitError`; terminal state and release stand; no armed timer and the queued job is `cancelled`; a later `retryTimer()` returns `no_timer` and capacity stays `'0,0'` |
| checkExpiration keeps a pre-commit release failure retryable and its timer armed | The ordinary case is unchanged: `retryable: true`, `committed: false`, `phase: null`, `postCommitError: null`; the status does not move and nothing is released; the timer record, `failedAttempts` and the `pending` job are all retained for an explicit retry |

## Post-commit side-effect semantics

Reconciling timers before the fallible steps is not enough on its own. A
notification or subscriber that throws **after** the write is committed must not be
reported as if the write failed, and must not invite a retry of work that is
already done.

For expiration, everything after the atomic transition and the capacity release is
post-commit:

- The committed terminal state is authoritative. It is not rolled back, and no
  rollback is implied anywhere in the result.
- The timers are reconciled first, so no timer and no queued job survives the
  committed terminal state.
- `#afterCommit()` returns `{ status, phase, retryable, error }` instead of
  throwing. The result is `{ success: true, status, postCommit }`: the transition
  succeeded, and the post-commit failure is reported next to it with the original
  error carried through unchanged. Nothing is swallowed, and the caller can see
  exactly which step failed.
- The timer passes `postCommit` through and fails the scheduled job with
  `reason: 'post_commit_failed'`, `phase: 'post_commit'`, `retryable: false`,
  `committed: true` — **not** `manager_threw`, which would have said the atomic
  transition or the release failed. The record is settled before the error is
  raised, so nothing is retained that could be retried.
- `SchedulerManager.run()` fails a job permanently when the handler declares its
  failure non-retryable, so the scheduler's generic retry counter cannot re-run a
  committed expiration. Even a forced re-delivery is a clean no-op, because the
  timer holds no record: capacity is never released twice.
- The report-oriented surfaces — `checkExpiration()` and `retryTimer()` — reach the
  same contract through `#attempt()`, which converts the throw into a value. It
  copies the thrown error's own classification (`retryable`, `phase`, `committed`,
  `postCommitError`) instead of restating it. Hardcoding `retryable: true` there was
  the last remaining hole: the timer was already settled, but `failed[0]` still
  claimed a committed expiration and release could be retried, which is false
  evidence about work that is already done. `retryable` is now
  `error.retryable !== false`, so an ordinary pre-commit manager or repository
  failure stays retryable and keeps its timer record, its `failedAttempts` and its
  pending job.

For the other paths, the post-commit steps still throw as they always did — that
is the established behaviour of those calls and their subscribers — and the only
change is that the timers were already reconciled before them. The original error
propagates unchanged; the tests assert both halves (the error is observable, and
the timer ownership is already correct).

## Test results

```
node capabilities/reservation/reservation.timers-1.test.js
  total: 86  passed: 86  failed: 0            exit 0

node capabilities/reservation/reservation.expiration-atomic.test.js
  total: 63  passed: 63  failed: 0            exit 0

node tests/aggregate/reservation.lifecycle.test.js
  [reservation.lifecycle] PASS: 22/22  FAIL: 0  exit 0

node capabilities/reservation/reservation.manager.cancel-routing.test.js
  total: 28   passed: 28  failed: 0            exit 0
```

The focused suite drives the **real** `ReservationTimer`, `ReservationManager`,
`ReservationRepository` on the real writable `InMemoryRepositoryAdapter`,
`ReservationConfig`, `ReservationCapability` by direct import,
`SchedulerCapability` with its real `SchedulerManager` and `SchedulerExecutor`, and
the real `AvailabilityCapability`. Jobs run through the two real call paths
(`manager.run` and `executor.execute`), never by calling a handler directly; the
scheduler capability is initialised but deliberately never activated when no
interval should run, so no `setInterval` runs and no test waits for wall-clock time.
Deadlines are never awaited — a timer is armed from a reservation whose state entry
is hours in the past, and assertions are arithmetic on the armed record's real
`anchorAt`/`expiresAtMs`.

The in-flight ordering is proved by suspending real awaits with a deferred promise:
one `schedule()` call held open while the stop/state change/deactivation/destruction
happens, and one repository read held open while the timer loses ownership. Nothing
is simulated; the production ordering is what runs.

Doubles are limited to the `dataManager` (the real one needs a provider), a
repository proxy for the release-failure and ownership cases, scheduler stubs for
the "missing / rejecting / lying scheduler" cases — none of which has a successful
real instance — and a delegating handle that pauses the first `schedule()` call of a
real `SchedulerCapability` while leaving every other method real.

## Claim boundary

Timer state and scheduler jobs live in this process. This slice certifies
ordering, guarding and reporting. It certifies **nothing** about durability, a
restart, a second process, or a real PostgreSQL server. Restart recovery is the
recovery slice and is untouched here; historical rows are not inferred either, so
only reservations whose state change this process performed are armed.

**Concurrency boundary.** The ownership token is in-process only. It prevents an
obsolete attempt from *starting* a write in this process; it is not a distributed
cancellation, not a durable generation, and not a database-level same-state
generation check, and it cannot recall a write another process has already submitted
or committed. Establishing that would need a repository/schema contract change,
which is deliberately **not** part of this slice.

**`SchedulerManager.run()` executes by id regardless of stored status.** `tick()`
filters by status, and the timer's own cancellation path cancels the queued job *and*
drops the record, so a delivered cancelled job is a no-op — that is what the
stopped-due-job-with-control test proves. Cancelling through
`SchedulerCapability.cancel()` directly, bypassing the timer, would still run the
handler; that is not a supported flow and is not changed here.

## Out of scope / not done

- No recovery redesign, no schema change, no repository-contract change, no
  database, Stage or network access.
- No pricing work.
- **Pre-existing, unrelated:** `capabilities/pwa-engine/offline/offline.manager.js:104`
  uses the private field `#onOnline`, which is never declared —
  `Private field '#onOnline' must be declared in an enclosing class`. That still makes
  `capabilities/core/register.js` unloadable and is untouched here. Direct imports of
  the modules this slice changed all succeed.
- Product-facing notification copy is unchanged.

## Final state — all changes unstaged

```
 M capabilities/reservation/reservation.capability.js
 M capabilities/reservation/reservation.config.js
 M capabilities/reservation/reservation.manager.js
 M capabilities/reservation/reservation.timer.js
 M capabilities/scheduler/executor.js
 M capabilities/scheduler/scheduler.capability.js
 M capabilities/scheduler/scheduler.events.js
 M capabilities/scheduler/scheduler.jobs.js
 M capabilities/scheduler/scheduler.manager.js
?? capabilities/reservation/reservation.timers-1.test.js
?? docs/ai/BOOKING_EXPIRATION_TIMERS_1_REPORT.md
```