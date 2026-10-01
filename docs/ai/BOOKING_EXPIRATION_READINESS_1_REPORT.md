# BOOKING_EXPIRATION_READINESS_1 - Expiration and Recovery Release Audit

Static, code-only audit: no database access, no historical-row inspection, no runtime probes, no executable changes. HEAD `06a03a566ff71ce94aae28a4f168f46c105c3648` (`booking-pricing-1a`).

**Status note (added after the audit).** Every claim below describes that HEAD and is preserved as the baseline record. Slice A of this audit — the atomic expiration with recorded release, the `REQUESTED -> EXPIRED` transition, the `NO_RESPONSE` outcome and event, and the removal of the business range release — has since been implemented in the working tree, uncommitted, on top of that same HEAD. Two claims are therefore superseded and are annotated inline: **P7** below (`reservation.events.js` now defines `NO_RESPONSE`) and the business range release in section 6 (removed, mirroring the approved cancel decision). Everything else — the timer findings in section 3, the recovery findings in section 5, the status/count divergence as a pre-existing condition, and the certification verdict in section 13 — is unchanged by that slice, and slices B and C remain outstanding. See `BOOKING_EXPIRATION_ATOMIC_1_REPORT.md` for the implementation and its evidence.

**Answer: expiration cannot bypass the release gate, but only because it never reaches it.** The gate exists solely in `cancelReservationWithRelease` (`reservation.repository.js:1119`) -> `releaseReservationLines` (`:1171`) -> `#resolveRecordedReleaseDates` (`:497`, refusal `:509-516`). No expiration or recovery path calls any of them. Expiration writes status and releases nothing; the business expiration wrapper and two recovery sub-paths instead reach capacity via ungated range operations.

## 1. Entry points and permissions

- No route exposure. `api/routes/reservation.routes.js:78-89` has ten routes including `cancel` (`:87`); `expire` and recovery are absent. The surface is in-process only.
- `reservation.capability.js:130-132` `expireReservation` (**no identity argument**), `:136-138` `runRecovery`, `:140-148` `runAllRecoveries`, `:150-160` three `recover*` wrappers.
- Business path: `business.service.js:370` -> `business.manager.js:537` -> `business-reservation.manager.js:215`.
- `#checkPermission` returns `true` when `!auth || !identity` (`reservation.manager.js:38-45`, `:39`), so the `CANCEL` check at `:383` is a no-op on the capability path. Auth stays fail-open until wired. The business path does gate: `business-reservation.manager.js:216-217`.

## 2. What `expireReservation` does

`reservation.manager.js:382-404`: permission (`:383`), load (`:384`), transition `EXPIRED` (`:389`), `#persist(updated)` (`:390`), notify (`:392-399`), emit `EXPIRED` (`:401`).

- `#persist` (`:875-901`) is a status-only `repo.update({ id }, reservation)` (`:885`) plus cache write (`:900`). No release call, unlike cancellation at `:344`.
- Capacity is **retained indefinitely**: no `released_at`, no occupied-night decrement. This fails toward over-retention, so it does not contradict the legacy gate; it is a capacity leak.
- `EXPIRED` still drives `reservation.capability.js:49` -> `:194-196` -> `search.delete`: the index drops the reservation while capacity stays held.

## 3. Automatic expiration: a scheduled task with no registered handler

- `reservation.capability.js:87` arms a timer per successful `createRequest`. Defaults (`reservation.config.js:6-15`): `autoExpiration: true`, `requestedTimeout` 12h, `ownerPendingTimeout` 24h, `paymentTimeout` 6h; `getTimeout` (`:32-39`) falls back to `ownerPendingTimeout`.
- `startReservationTimer` (`reservation.timer.js:31-51`) records a map entry, then `#scheduleExpiration` (`:48`) **only if a scheduler capability exists** enqueues a delayed job with `handler: 'reservationExpiration'` (`:121-132`, `:126`). There is no `else`: without a scheduler the caller still gets `{ success: true, timerId }`, so an armed timer does not imply a scheduled job.
- `'reservationExpiration'` is never passed to `registerHandler` (`scheduler.capability.js:153`, `scheduler.manager.js:179`, `executor.js:31`); it appears only in the `stopTimer` filter (`reservation.timer.js:67`) and the enqueue (`:126`).
- **The requested distinction: a scheduled task naming an unregistered handler, not a registered executable handler.** `executor.execute` throws `Handler not found` (`executor.js:80-83`), caught at `:101`, retried up to 3x (`scheduler.capability.js:40`, `executor.js:106-115`) identically each time.
- Each failure increments the **single shared** `CircuitBreaker` (`scheduler.capability.js:45-47`, threshold 5); past it `executor.js:59-65` blocks **all** that scheduler's jobs for 60s.
- `#expireReservation` (`reservation.timer.js:138-160`) bypasses the manager: transitions directly (`:147`), writes via its own `repo.update` (`#saveReservation:185`), skips permissions.
- `checkExpiration()` calls it **unawaited** (`:87`), deletes the map entry (`:88`), and `#saveReservation` swallows repository errors (`:189`), so failures are nearly invisible.
- `reservation.capability.js:124-125` stops the `OWNER_PENDING` and `PAYMENT_PENDING` timers on cancel but **not** the `REQUESTED` timer from `:87`, so that job outlives a cancellation.

## 4. Workflow inconsistency: `REQUESTED -> EXPIRED` declared and unreachable

`reservation.workflow.js:16-20` `EXPIRATION_TARGETS`; `canExpire` (`:142-144`) is `true` for all three entries, but `VALID_TRANSITIONS` (`:22-74`) disagrees.

- `REQUESTED` (`:23-28`) does **not** allow `EXPIRED`.
- `OWNER_PENDING` (`:29-36`) allows `EXPIRED` (`:33`), so the manager forces `EXPIRED` (`reservation.manager.js:389`) while the timer targets `NO_RESPONSE` (`reservation.timer.js:143`): two entry points, two terminal statuses, both reported successful.
- `PAYMENT_PENDING` (`:43-48`) allows `EXPIRED` (`:45`). `CONFIRMED` (`:49-55`) does not.
- `transition` throws on an undeclared pair (`:96-101`), so `expireReservation` on a `REQUESTED` reservation throws an uncaught `Invalid transition` instead of returning `{ success: false }`.

## 5. Recovery

- Activation is manual and in-process only. `runAllRecoveries` (`reservation.recovery.js:321-333`) runs pending, expired and notification recovery - **not** `scanAndRepair` (`:146-150`); the scan path is reachable only via `runRecovery`.
- Candidate selection is status-and-age only, with no line or occupied-night inspection: `owner_response_exists` and `pending_owner_stuck` (`:45-68`, 48h), `availability_not_blocked` for `CONFIRMED` (`:70-82`), `stale_request` for `REQUESTED` over 48h (`:84-96`), `payment_stuck` for `PAYMENT_PENDING` over 24h (`:98-110`), `notification_failed` (`:112-121`).

**5.1 `availability.updateAvailability` does not exist.** The capability exposes `init`/`activate`/`deactivate`/`destroy`, `expandOccupiedNights`, `occupiedNightsExpansionVersion`, `occupiedNightsMaxNightsDefault`, and the `manager`/`service` getters (`availability.capability.js:17,23,36,40,46,50,72,82,92`). Neither `updateAvailability` nor `isAvailable` exists on the capability or on `availability.manager.js`; `isAvailable` appears only as a *caller* in `availability.admin.js:120-124`, `reservation.manager.js:189` and `reservation.recovery.js:542`. The two former guard with `typeof`/`?.`; recovery does not. Existing tests already record the gap (`reservation.manager.cancel-routing.test.js:664`, `tests/aggregate/reservation.lifecycle.test.js:8`).

**Error semantics correction.** Calling a method that does not exist throws `TypeError` **synchronously at the call site**; `await` is irrelevant to whether it throws, and this is distinct from an existing async method returning a rejected Promise, which only surfaces at the `await`. The two unawaited sites therefore fail in two different ways:

- `:394` (`#repairAvailabilityNotBlocked`, `:388-410`) has **no enclosing `try`**. The synchronous `TypeError` propagates through `#repairIssue` and `repair()` (`:131-140`, also unguarded) into `scanAndRepair()` (`:146-150`) and out of `runRecovery`. The `:401` emit and the `:406` `{ success: true }` return are never reached; `runRecovery` rejects with no partial results.
- `:483` (`#repairPaymentStuck`, `:473-500`) **is** inside the `try` at `:477`, so the same synchronous `TypeError` is caught at `:497` and reported as `{ success: false, error }`. Note `#saveReservation` at `:479` already persisted the `EXPIRED` status, so this is a partial write followed by a reported failure.
- `reservation.recovery.js:229-236` is guarded only by `if (availability)` (`:229`), so it throws inside the `try` at `:227`, is caught at `:252`, and never reaches `:238`. `:225` then re-selects the same reservation on **every** scan: a non-converging loop that never releases.
- `reservation.manager.js:248-255` is `?.`-guarded (`:248`) and therefore inert.

**5.2 `scan()` throws on any confirmed reservation.** `#checkAvailabilityBlocked` (`reservation.recovery.js:539-546`) calls the missing `availability.isAvailable(...)` at `:542`, unguarded, from unguarded `#detectIssues:71`. One `CONFIRMED` reservation makes `scan()` throw and propagate through `runRecovery` with no partial results.

**5.3 `#repairStaleRequest` cannot perform its only action.** `reservation.recovery.js:425` requests `REQUESTED -> EXPIRED`, undeclared per section 4, so it throws, is caught at `:433`, and returns `{ success: false, error: 'Invalid transition' }`. Every `REQUESTED` reservation over 48h old is re-detected and re-failed forever. `#repairPaymentStuck` (`:473-500`) does transition successfully, but then makes the dead unawaited call at `:483`, which throws the same synchronous `TypeError` inside the `try` at `:477`; it is caught at `:497`, so the emit at `:491` and the `{ success: true, action: 'expire_and_release' }` return at `:496` are both unreachable whenever an availability capability is present. It reports `{ success: false, error }` after `:479` has already persisted `EXPIRED` — the partial write described in section 5.1, not a reported success.

**5.4 Divergence.** `#getReservations` (`:556-564`) falls back to `dataManager` only when the repository is absent **or empty** (`:560`), and `#saveReservation` (`:585-604`) swallows repository errors (`:592`) while always mirroring into `dataManager`, so a repair can report success against cache while the store is unchanged.

**5.5 Actual read contracts for a consumption check.** `availability.capability.js:46` exposes `get manager()`, so the real readers are on `availability.manager.js`: `checkAvailability(accommodationId, checkIn, checkOut, identity)` (`:392-417`) returns per-date `{ date, available: status === 'available', status }` plus `blockedDates`; `getCalendar` (`:373-389`), `getOccupancy` (`:419`), `getMany` (`:168`) also exist. `expandOccupiedNights` (`availability.occupied-nights.js:159`) is pure date expansion, not a read.

The limitation must be stated rather than papered over: **none of these is reservation-scoped.** `checkAvailability` answers only "is any night in this range non-available"; it cannot attribute a held night to a reservation, and because it is `status`-based it inherits the status/count divergence described in section 6. It also requires an `identity`, and `availability.manager.#checkPermission` is not audited here. The only contract that answers "what should this reservation hold" is line-side: `reservation.repository.findLinesByReservationId(tenantId, reservationId)` (`:1240-1291`) returns `temporal`, `quantity`, `metadata` (carrying the versioned consumption record) and `releasedAt`. Joining those two - recorded nights versus the availability projection - is the check that does not yet exist, and inventing a synthetic `blocked: true` default would report a successful verification that was never performed. This report therefore proposes no replacement value for `:545`; it records the gap.

## 6. Business expiration: the one releasing path, and it is ungated

`business-reservation.manager.js:215-230`. After a successful delegate (`:219`), the guard is `result?.success && reservation?.accommodationId` (`:220`), and it calls `availabilityManager.releaseReservation(accommodationId, dates?.checkIn, dates?.checkOut, identity)` (`:224`) inside `try { } catch { }` (`:221`, `:226`). **Guard correction: `accommodationId` presence is not proof that the reservation has any reservation lines.** The legacy gate explicitly supports a line-less reservation (`#resolveRecordedReleaseDates`, `reservation.repository.js:501-506` returns `source: 'not-applicable'` when no record exists and the mode is not `DATE_RANGE`), so a line-less hold reaches this release and is flipped by date range.

This is the same shape of operation as `BOOKING-CANCEL-ROUTING-1` removed from `cancelReservation` (comment at `:198-209`). Chain: `business-availability.manager.js:126-131` -> `availability.service.js:48` -> `availability.manager.js:349-369`.

- `release` filters `accommodationId` and `status: RESERVED` (`:352`) with `date` `gte checkIn` / `lte checkOut` (`:353-354`) - **check-out inclusive**, wider than any occupied-night set - and applies **no `reservationId` filter** (`:352`), so every `RESERVED` record in range matches regardless of which reservation holds it.
- It writes only `status` and `notes` through the availability repository (`:357-363`). It does **not** touch `reserved_count` and does **not** touch `reservation_lines.released_at`.

**Correction: no double-decrement follows.** Because the range operation never decrements `reserved_count`, a later legitimate cancellation of another reservation performs its single, correct decrement. There is no double-count. The defect is a **status/count divergence**, and the evidence for it is specific:

- Writers of `reserved_count` are only the reservation repository - increment `reservation.repository.js:570`, decrement `:1215`. Neither is reached here.
- `postgres.availability.adapter.js:63-64` derives `available = Math.max(0, inventory - reserved_count)`, so the derived availability stays reduced after the status flip.
- **Readers that trust `status` alone and are therefore exposed:** `availability.manager.js:373-389 getCalendar`, which returns `status: recordMap[d].status` (= `available`) next to `available`/`capacity` still reflecting the hold, so one response self-contradicts; and `availability.manager.js:309`, whose conflict gate in `reserve()` tests only `existing.status`, so a status-level reserve is admitted over a night whose count still holds another hold.
- **Counter-evidence, stated for honesty:** the actual booking capacity gates are count-checked and remain closed. The mock gate requires `row.status !== 'available' || reservedCount + quantity > inventory` to fail (`reservation.repository.js:750`) and the PostgreSQL gate requires `status = 'available' AND reserved_count + $1 <= inventory` (`:568-584`). So this audit finds **no demonstrated overbooking path**; the demonstrated defect is a status projection that disagrees with the count.

The bare `catch { }` at `:226` hides failures and still emits `RESERVATION_EXPIRED` (`:227`). `availabilityReleased` is never set on this path; it is written in exactly one place codebase-wide (`reservation.recovery.js:238`), unreachable per 5.1.

## 7. Record-category matrix

| Category | Capability | Timer | Recovery | Business |
| --- | --- | --- | --- | --- |
| Versioned record present | Status only (`manager.js:382-404`) | Status only (`timer.js:147-148`) | Dead `updateAvailability` (`recovery.js:230`) | Range status flip, count untouched (`business-reservation.manager.js:224`) |
| Record-less `DATE_RANGE` | Not consulted; no release | Not consulted | Not consulted | Range flip proceeds; the gate is never consulted |
| Line-less hold (`accommodationId` set) | Status only; nothing recorded to release | Status only | `TypeError` loop, no convergence (`recovery.js:225-259`) | Range flip proceeds on a hold the gate treats as `not-applicable` |

The legacy refusal is neither weakened (unreachable) nor enforced (the business path releases such a line by arithmetic the gate would refuse). `#resolveRecordedReleaseDates` must become the only entry point to capacity release for the guarantee to mean anything.

## 8. Code-proven versus deployment-dependent

- Proven from code: no route exposure; no release in `expireReservation`; missing `updateAvailability` and `isAvailable`; unregistered `reservationExpiration`; the `REQUESTED -> EXPIRED` gap; the ungated business release; the four EXPIRED writers (`reservation.manager.js:389`, `reservation.timer.js:147`, `reservation.recovery.js:425`, `:478`); zero test coverage.
- Not verified, deployment-dependent: whether a scheduler capability exists at runtime (`reservation.capability.js:23` omits `scheduler` from dependencies); whether `runtime.auth` is wired; the tenant override at `reservation.config.js:77-85`; per-tenant `autoExpiration`; whether retry manager and circuit breaker reach `executor` (`scheduler.capability.js:62`).
- PostgreSQL physical rollback remains uncertified per the legacy gate report. No runtime claim here.

## 9. Test coverage: search scope and results

Scope: all 101 tracked paths matching `test|spec` (85 `.js`, 4 `.mjs`, 7 `.md`, 5 `.json`), searched with `git grep` across `*test*.js`, `*test*.mjs` and `tests/`. The four `.mjs` files are test-support fixtures, not suites.

| Term | Matches | Assessment |
| --- | --- | --- |
| `ReservationWorkflow`, `reservation.workflow` | 0 | No suite imports the transition tables |
| `canTransition`, `VALID_TRANSITIONS` | 0 | No transition-table coverage |
| `ReservationTimer`, `reservation.timer` | 0 | No timer coverage |
| `ReservationRecovery`, `reservation.recovery` | 0 | No recovery coverage |
| `expireReservation`, `runAllRecoveries`, `recoverExpiredReservations`, `scanAndRepair` | 0 | No expiration coverage |
| `EXPIRED` | 1 (`web/push-1.test.js`) | Push-notification TTL, unrelated |
| `NO_RESPONSE`, `no_response` | 0 | No coverage |

Broader `expire|Expiration` matches (`owner-session-2.test.js`, `tests/runtime/runtime-persistence-1-route-scoping.test.js`, `web/owner-1.test.js`, `web/push-*.test.js`) were inspected and are all owner-session token expiry, push TTL or JWT `expiresIn` - none touch reservation lifecycle.

The conclusion is zero behavioral coverage, established by term and scope rather than by method name alone. There is also documented intent: `tests/aggregate/reservation.lifecycle.test.js:5-11` states that `confirmReservation`/`cancelReservation` call a non-existent `availability.updateAvailability(...)` and that "those two paths are intentionally not exercised here". That suite also never reaches expiration.

## 10. Bounded implementation proposal

Three slices. **A is the load-bearing slice; B and C are not safe to ship without it.** Deleting the business range release alone is *not* a completed expiration fix - it converts a status/count divergence into a pure capacity leak on every business expiration, which is a different defect, not an absent one.

### A. Atomic terminal transition plus recorded release

Dependency: none. Blocks B and C.

The release mechanics to share, not duplicate. `cancelReservationWithRelease` (`reservation.repository.js:1119-1170`) already separates the two concerns:

```js
// :1126-1132  adapter selection, then mock path
if (!hasPostgres) { this._enforceContext(); const { reservation } = this.#commitMockCancellationSync(reservationData, tenantId); return reservation }
// :1134-1169  PostgreSQL path
return transaction(async (client) => {
  const reservationResult = await client.query(`
    UPDATE reservations
    SET status = $1, cancelled_at = $2, special_requests = $3, updated_at = NOW()
    WHERE id = $4 AND tenant_id = $5
    RETURNING *`, [reservationData.status, reservationData.cancelledAt || null, reservationData.notes || null, reservationData.id, tenantId])
  if (reservationResult.rows.length === 0) throw new Error(`Reservation ${reservationData.id} update failed - not found or not authorized`)
  const release = await this.releaseReservationLines(client, reservationData.id, tenantId)
  return { reservation: reservationResult.rows[0], release }
})
```

`releaseReservationLines` (`:1171-1206`) resolves and validates every line's record **before** the first mutation, then marks `released_at` with a compare-and-set (`AND released_at IS NULL`, `:1200`), so a repeat release yields no row and cannot decrement twice.

The transition tables that must agree (`reservation.workflow.js`):

```js
// :16-20  EXPIRATION_TARGETS
[REQUESTED]: EXPIRED, [OWNER_PENDING]: NO_RESPONSE, [PAYMENT_PENDING]: EXPIRED
// :23-28  VALID_TRANSITIONS[REQUESTED]  — no EXPIRED
// :29-36  VALID_TRANSITIONS[OWNER_PENDING] — EXPIRED at :33
// :43-48  VALID_TRANSITIONS[PAYMENT_PENDING] — EXPIRED at :45
// :49-55  VALID_TRANSITIONS[CONFIRMED] — no EXPIRED
// :69     VALID_TRANSITIONS[EXPIRED] = []   (terminal)
```

Shape of the change, not a specification:

1. Extract the status-update-plus-release core so `cancelReservationWithRelease` and a new sibling share it rather than copying the transaction body. The gate at `:497` and the compare-and-set at `:1200` are then inherited unchanged, which is what makes the legacy refusal apply to expiration.
2. Preserve the terminal status as a parameter, so `EXPIRED` and `NO_RESPONSE` stay distinguishable rather than one hardcoded literal.
3. **Do not assume `cancelled_at` is appropriate for expiration.** It is set by the manager (`reservation.manager.js:322`) and written by the SQL at `:1138`/`:1146`; if expiration never sets it, `cancelledAt || null` yields `null`, which is correct. Any decision to stamp a different field is product's (P6).
4. **Preserve existing contracts.** `transition` throws on an undeclared pair (`:96-101`) and must stay. Repository release idempotency (compare-and-set) and manager workflow idempotency are different: a repeat `expireReservation` on an `EXPIRED` reservation throws `Invalid transition: expired → expired` because `:69` is empty. Converting that throw into a result object or a no-op is **not** proposed here (P8).
5. Repoint the four EXPIRED writers to the shared call - `reservation.manager.js:390`, `reservation.timer.js:147`, `reservation.recovery.js:425`, `:478` - and remove the business range release at `business-reservation.manager.js:220-226` in the same change, so business expiration is never release-less.

### B. Timer registration and routing

Dependency: **A**. A registered handler that expires without releasing would activate the leak at scale instead of leaving it dormant.

- Register `reservationExpiration` against the reservation capability, routing to the shared expiration call from A rather than to the timer's private transition (`reservation.timer.js:147`).
- Stop timers on every terminal transition, including `REQUESTED`, which `reservation.capability.js:124-125` omits, and await `checkExpiration()` (`:87`) so failures are not silent.
- Make the absent-scheduler case explicit instead of returning `{ success: true, timerId }` with nothing scheduled (`reservation.timer.js:121-132`).

### C. Recovery reconciliation

Dependency: **A** for anything that transitions or releases; otherwise independent.

- Delete the dead calls: `reservation.recovery.js:229-236`, `:394-399`, `:483-488`, and the inert `reservation.manager.js:247-255`.
- Fix `:542` to an existing contract, or record that `availability_not_blocked` cannot be verified (section 5.5). Do not fabricate a result.
- Note that `scan()` currently rejects whenever a `CONFIRMED` reservation exists, so `runRecovery` cannot complete today; fixing `:542` is a prerequisite for any reconciliation run being meaningful.

## 11. Behavioral tests required

Tests only; no production behavior is changed here.

- `expireReservation` with a valid record releases each recorded night exactly once and sets `released_at`; a **repository-level** repeat release is a no-op via the compare-and-set.
- Record-less `DATE_RANGE` refuses with `AvailabilityConsumptionRecordError`, leaves `released_at` null and `reserved_count` untouched, and does not commit the status update on PostgreSQL.
- The same refusal is reached from the manager, the timer and both recovery writers, proving the gate is shared rather than duplicated.
- The manager-level repeat-expiration contract is **pinned, not changed**: assert the current `Invalid transition: expired → expired` throw, or, if product later approves a no-op, assert that instead in a separate decision.
- `EXPIRED` and `NO_RESPONSE` are each preserved as distinct terminal statuses and distinct events; `reservation.events.js` defines `EXPIRED` (`:20`) but has **no** `NO_RESPONSE` event, so this needs an explicit decision. **Implemented in slice A:** `reservation.events.js` now also defines `NO_RESPONSE`, and both statuses emit their own event.
- `scan()` returns issues when a `CONFIRMED` reservation exists instead of throwing; `#repairAvailabilityNotBlocked` is asserted to fail loudly rather than report `{ success: true }`.
- `stale_request` repair on a `REQUESTED` reservation either succeeds or reports a clear refusal, never a silent `Invalid transition`.
- `recoverExpiredReservations` converges: a second run reports `recovered: 0, failed: 0`.
- Business `expireReservation` issues **zero** availability range-release calls for a recorded line, a record-less `DATE_RANGE` line, and a line-less hold.
- Status/count divergence: after business expiration the availability row is either untouched or moved through the gated path; `status` and derived `available` must not disagree.
- If the timer is retained, a scheduled job either executes or is never enqueued, and accrues no shared circuit-breaker failures.

## 12. Product decisions requiring confirmation

Retained as recommendations, none implemented:

- **P1 - `REQUESTED` after 12h: expire or re-confirm?** Recommend expiring - add `EXPIRED` to `VALID_TRANSITIONS.REQUESTED` (`:23-28`). The 12h `autoExpiration: true` default clearly intends it; the transition table is the defect.
- **P2 - `OWNER_PENDING` timeout target?** Recommend `NO_RESPONSE`, matching `EXPIRATION_TARGETS:18`, which distinguishes an unanswered owner from a customer timeout and is consistent with `business-reservation.manager.js:378`. `VALID_TRANSITIONS:33` currently permits `EXPIRED`, which is the divergence.
- **P3 - `PAYMENT_PENDING` timeout target?** Recommend keeping `EXPIRED` (`EXPIRATION_TARGETS:19`, permitted at `:45`). Listed for confirmation, not because it conflicts.
- **P4 - `CONFIRMED` remains non-expirable?** Recommend confirming intent and leaving `:49-55` unchanged; a confirmed reservation requires cancellation.
- **P5 - Failing release: retain or release anyway?** Recommend retaining (fail-closed), but surface it - a run leaving an expired reservation unreleased must emit and log rather than silently increment `failed`.
- **P6 - Expiration timestamp semantics.** `cancelled_at` is a cancellation field. Decide whether expiration stamps a distinct field, stamps nothing, or reuses `cancelled_at` before any shared SQL is written. This report does not assume `cancelled_at` is appropriate.
- **P7 - `NO_RESPONSE` event.** `reservation.events.js` has `EXPIRED` (`:20`) and no `NO_RESPONSE`. Decide whether a distinct event is added or `EXPIRED` is emitted for both. **Decided and implemented in slice A:** a distinct `reservation:no_response` event was added, emitted only for the `NO_RESPONSE` outcome, with `EXPIRED` kept for the other two; `reservation.capability.js` subscribes to it and removes the reservation from the search index exactly as `EXPIRED` does. `EXPIRED` is never emitted for an unanswered owner.
- **P8 - Repeat expiration.** Current behavior is a thrown `Invalid transition`. Decide explicitly whether that stays, becomes a result object, or becomes a no-op. Not changed here.
- **P9 - Business range release.** Recommend removal, consistent with the approved cancel decision. Preserve `business-availability.manager.js:126` as the operator-facing API for clearing a line-less hold.

## 13. Certification verdict

**Not certifiable.** The substantive finding stands: expiration status writers bypass the recorded release path, and business expiration retains an unsafe range release. What this revision corrects is the severity and the evidence, not the conclusion.

The legacy gate is intact - no path reaches `#resolveRecordedReleaseDates` and none weakens it - but it certifies nothing about expiration, because expiration does not use it. The business defect is a status/count divergence with no demonstrated overbooking path, since the real capacity gates remain count-checked (`reservation.repository.js:750`, `:568-584`).

Two findings remain release-blocking: the business range release (section 6) and zero behavioral coverage across the whole expiration and recovery surface (section 9).

Recommended gate: land slice A with the section 11 tests, then B and C. Deleting the business release on its own is not an acceptable end state. Until A lands, no expiration or recovery behavior may be described as guaranteed, and no statement about it belongs in Stage-facing documentation. Re-run this audit after A; only then is a certification claim meaningful.

**Deployment reachability remains conditional.** Nothing above asserts that the scheduler capability, `runtime.auth`, or the business reservation path is wired in any running composition; `reservation.capability.js:23` does not list `scheduler` among its dependencies, and all reachability statements are code-level only.