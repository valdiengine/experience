# BOOKING_EXPIRATION_ATOMIC_1 - Atomic expiration with recorded release (slice A)

Implementation report for slice A of `BOOKING_EXPIRATION_READINESS_1`. Baseline HEAD `06a03a566ff71ce94aae28a4f168f46c105c3648` (`booking-pricing-1a`). Uncommitted working-tree change; nothing staged, committed or pushed. No database, Stage or network access, and no schema change.

Companion document: `BOOKING_EXPIRATION_READINESS_1_REPORT.md` (the audit this slice answers). The earlier draft also cited `BOOKING_EXPIRATION_LEGACY_RELEASES.md`; no such file exists, and the historical refusal record it meant is `BOOKING_LEGACY_RELEASE_GATE_1_REPORT.md`.

## 1. What changed

**The defect.** `expireReservation` wrote a terminal status and released nothing: `reservation.manager.js` called `#persist` (a status-only `repo.update`) instead of any release path, so a reservation that expired kept its `released_at` null and its `reserved_count` consumed forever. The business wrapper compounded it with an extra range-based release over `checkIn..checkOut` inclusive. The versioned occupied-night release gate existed, but only cancellation reached it.

**The fix.** Expiration is now the sibling of cancellation and shares its mechanics rather than copying them.

- `reservation.repository.js` - the Map release core `#commitMockCancellationSync` gained an `options` argument carrying the operation name and an optional `expectedStatus` precondition, and the PostgreSQL half of both operations was extracted into `#postgresTerminalTransitionWithRelease`. The new public `expireReservationWithRelease` requires `expectedStatus` and validates the **pair** against `EXPIRATION_TRANSITIONS`, the single map from source status to its one approved outcome, rather than trusting either half independently. Its PostgreSQL statement writes `status` and `updated_at` **only**: `cancelled_at` and `special_requests` are absent from the SET list, so they are neither set nor cleared, and a pre-existing `cancelled_at` survives. The Map path builds its replacement row from the **stored** row - the same two owned fields the SQL writes - and checks the precondition against that stored row before any line selection, record resolution or capacity work.
- `reservation.workflow.js` - declares `REQUESTED -> EXPIRED` and `getExpirationTarget()`, which resolves the three approved mappings (`REQUESTED -> EXPIRED`, `OWNER_PENDING -> NO_RESPONSE`, `PAYMENT_PENDING -> EXPIRED`) and returns `null` for everything else, including `CONFIRMED`.
- `reservation.manager.js` - derives the target from the reservation's actual state, routes repository-backed expiration through `expireReservationWithRelease` with the source status as the precondition, and returns `{ success: true, status }`. A repository without the method fails loudly; a `null` result or a rejection fails loudly. Notification and the outcome-specific event are emitted only after persistence succeeds.
- `reservation.events.js` / `business.events.js` - added `reservation:no_response` and `business.reservation:no_response`, distinct from their `EXPIRED` counterparts.
- `reservation.capability.js` - subscribes to `NO_RESPONSE` and removes the reservation from the search index, exactly as `EXPIRED` does. Without it, an unanswered owner would have remained listed and searchable in the index while its capacity had been released.
- `business-reservation.manager.js` - the extra range release is removed, mirroring the approved cancel decision. The payload's event follows the resulting status, so an unanswered owner is not reported as expired.

The expiry reasons and notification bodies remain those already in `reservation.manager.js`; the `NO_RESPONSE` body is distinct and names the absent owner reply.

## 2. What was preserved

- **Cancellation is unchanged, and this is asserted rather than asserted-in-prose.** Its SQL, bound parameters, empty-result message, error classes and Map merge semantics are byte-identical; `cancelReservationWithRelease` is now a thin caller of the shared core. Its PostgreSQL statement keeps `cancelled_at = $2` and `special_requests = $3` and gains no status predicate.
- **Return shapes match cancellation per adapter**: the bare stored row (or `null`) on the Map path, a `{ reservation, release }` wrapper from the PostgreSQL transaction.
- **The legacy release gate is shared, not duplicated.** `#resolveRecordedReleaseDates` is the single resolution boundary, so a record-less `DATE_RANGE` line, a malformed record, a missing capacity row and an aggregate shortfall are refused identically from both operations, on both adapters.
- **`released_at` idempotency** is unchanged, as is the refusal to skip line-side work when the availability table is absent.
- **Post-publication subscriber-error policy**: `_emit` stays outside the rollback section, so a throwing subscriber still propagates after the stores are committed. That is the established contract and was not changed.
- **Timer and recovery code is untouched.** Defaults and overrides in `reservation.config.js`, the timer arming/deadline logic and both recovery writers are exactly as they were.

## 2b. Corrected claims from the review pass

Two claims in an earlier draft of this report were wrong and are corrected here rather than left standing.

- **Business delegation failures were already propagating.** The draft said the removed range release "ran inside a bare `catch`", implying the slice changed whether a delegation failure reached the caller. It did not. In `business-reservation.manager.js` the `await this.#delegateService(...)` call sits **outside** the try/catch that used to wrap the range release, so a delegation rejection was already propagating to the caller before this slice and still does. What the removal changed is narrower: a failure of the **range release itself** is no longer silently discarded, because that release is gone and the delegated call now performs the real one. The test is retitled to say what it actually pins.
- **Field preservation is enforced by the repository, not by caller restraint.** The draft implied preservation held because callers passed clean payloads. It did not: the Map path published its replacement row by merging the **caller's payload** over the stored row, so a payload carrying a value for an unrelated field silently overwrote the stored one. The replacement row is now built from the **stored** row - `{ ...stored, status, updatedAt }` - which is the same two fields the PostgreSQL `SET` list writes. Preservation is now a property of the repository boundary and is asserted against a deliberately conflicting payload.

`expectedStatus` is likewise scoped accurately: it guards competing writes to the **same reservation**, not two independent reservations expiring concurrently.

**Cache freshness is not claimed.** The manager's `#cacheReservation` writes the manager's own transitioned domain object, not a re-read of the stored row. After a same-status stale snapshot the **store** is correct - it keeps the winning writer's unrelated fields - but the in-memory cache can still carry the manager's stale unrelated fields. That is a pre-existing cache-coherency limitation, recorded as a known limit by a dedicated test instead of being glossed over.

## 3. Deliberately not done

- **No timer or recovery routing (slices B and C).** `reservationExpiration` is still unregistered, the timer still transitions privately, `checkExpiration()` is still unawaited, the `REQUESTED` timer is still not stopped on cancellation, and the dead `#repairPaymentStuck`/`#repairStaleRequest` calls remain. Slice A makes those paths *safe to route*; it does not route them.
- **No physical certification.** No PostgreSQL server was contacted. Nothing here certifies SQL parsing, column constraints, JSONB round trips, row-level locking, transaction isolation, cross-process concurrency, or physical rollback. The `expectedStatus` predicate guards competing writes to the **same reservation** - a row that moved on between the caller's read and this write. Two **different** reservations expiring at the same moment are not what it guards, and no concurrent case is tested against a real server.
- **No schema or migration**, and no new column for an expiry timestamp. Decided for this milestone: expiration stamps nothing. `cancelled_at` is a cancellation field and is left exactly as stored, and a repeated expiration is **not** an open question either - it stays the established `Invalid transition` throw, which makes no write and releases nothing further. Both are now pinned by tests rather than left to interpretation.
- **No backfill or historical-row repair**, and no event-delivery framework.
- **No consent or policy UI.** The approved future work is a readable pre-submission booking policy, explicit unchecked acceptance, a policy version and an acceptance timestamp. None of it is implemented here, and no commercial terms were assumed.

## 4. How it was verified

Focused suite: `node capabilities/reservation/reservation.expiration-atomic.test.js` - **63/63 pass**. It exercises the real `ReservationManager`, `ReservationRepository`, `InMemoryRepositoryAdapter`, `ReservationWorkflow`, `ReservationCapability`, `BusinessReservationManager`, events and status modules; nothing is re-implemented, and no assertion reads source text.

Regressions, all green after the change:

| Suite | Result |
| --- | --- |
| `reservation.repository.occupied-nights.test.js` | 104/104 |
| `reservation.repository.mock-cancel-atomic.test.js` | 27/27 |
| `reservation.manager.cancel-routing.test.js` | 28/28 |
| `tests/aggregate/reservation.lifecycle.test.js` | 22/22 |
| `tests/aggregate/business.lifecycle.test.js` | 37/37 |
| `tests/aggregate/commercial.aggregate.test.js` (touches the changed modules) | 33/33 |
| `tests/runtime/runtime-persistence-1.test.js` (touches the changed modules) | 18/18 |

Coverage of the required behaviours, all behavioural:

- The three approved transitions end to end on real Map state: terminal status landed, both recorded nights released, the line marked released.
- Outcome-specific events and notifications, with the pre-existing `EXPIRED` sentence unchanged and positive controls that the notification and event paths are reachable at all.
- `CONFIRMED` is refused as non-expirable and every store is left byte-identical; repeated expiry of an `EXPIRED` or `NO_RESPONSE` reservation throws the established `Invalid transition` and releases nothing further. That behaviour is **decided for this milestone and pinned, not changed**.
- Field preservation, asserted as repository behaviour rather than caller restraint: a pre-existing `cancelledAt` survives untouched, a `null` one is not stamped, unrelated fields including `specialRequests` are preserved, and a payload conflicting with **every** unrelated stored field (`cancelledAt`, `notes`, `metadata`, `specialRequests`, `accommodationId`, `tenantId`) changes nothing beyond `status` and `updatedAt`. The release for that case is shown to use the **stored** accommodation, not the payload's.
- A **same-status stale snapshot** - narrower than the status guard, because the stored status still matches and the expiration legitimately proceeds - cannot overwrite unrelated fields another writer changed in the meantime. The store keeps the other writer's values, and a separate test records that the manager's cache does not, without claiming cache freshness.
- Refusals with no partial publication: record-less `DATE_RANGE`, a malformed record, mixed valid-first/legacy-second, missing availability row, aggregate shortfall, absent availability table. A record-less non-`DATE_RANGE` line is distinguished from "no lines" and still expires.
- Repository contract: unsupported or missing `expectedStatus`, missing stored row resolving to `null`, and a stale expiration refused because the **stored row** disagrees even when the payload claims a different status.
- The **approved pair** is validated, not two independent allow-lists. All three approved pairs are exercised as controls, and the three unapproved combinations of individually valid statuses - `requested -> no_response`, `payment_pending -> no_response`, `owner_pending -> expired` - are refused with no status write, no capacity release and no line marked released. Because the check precedes adapter dispatch, the PostgreSQL path refuses identically and issues **no statement at all**, not even `BEGIN`.
- Manager contract: missing method, `null` result, repository rejection and an unknown id each produce no success event, no notification and no terminal cache state.
- Shared-night ownership: with inventory 2 and two units held, expiring one reservation leaves exactly one unit consumed and one sellable.
- PG double orchestration: one transaction, `BEGIN`/`COMMIT` once, statement order `update -> selectLines -> markLineReleased -> releaseCapacity x2`, the expected status in the `WHERE` clause with its bound parameters, `cancelled_at` and `special_requests` absent from the expiration statement, and `ROLLBACK` requested (never `COMMIT`) for a zero-row update, a record-less line, a mixed reservation, a shortfall and a missing capacity row. Cancellation's own SQL is asserted unchanged after the extraction.

**Test-support defect fixed.** `kindsSeen()` in `reservation.repository.test-support.mjs` returned 0-based call indices rather than counts, because the counter and the 0-based `callIndex` were one expression. It is only used by the new suite, so nothing else depended on the wrong values.

**Claim boundaries.** Map assertions are real single-process state; the PG double records real statement ordering and transaction choreography but is not a server; physical rollback, isolation and concurrency remain uncertified.

## 5. Changed files, and repository state

```
 M capabilities/business/business.events.js
 M capabilities/business/manager/business-reservation.manager.js
 M capabilities/persistence/repositories/reservation/reservation.repository.js
 M capabilities/persistence/repositories/reservation/test-support/reservation.repository.test-support.mjs
 M capabilities/reservation/reservation.capability.js
 M capabilities/reservation/reservation.events.js
 M capabilities/reservation/reservation.manager.js
 M capabilities/reservation/reservation.workflow.js
?? capabilities/reservation/reservation.expiration-atomic.test.js
?? docs/ai/BOOKING_EXPIRATION_READINESS_1_REPORT.md
?? docs/ai/BOOKING_EXPIRATION_ATOMIC_1_REPORT.md
```

`git diff --check` exits 0 (no whitespace errors). Branch `booking-pricing-1a`, HEAD `06a03a566ff71ce94aae28a4f168f46c105c3648`, index empty - nothing staged. Seven production files plus one test-support file are modified; the focused test, the audit report and this report are new and untracked.

Production diffstat (the seven production files):

```
 capabilities/business/business.events.js           |   7 +
 .../manager/business-reservation.manager.js        |  35 +-
 .../reservation/reservation.repository.js          | 352 +++++++++++++++++++--
 capabilities/reservation/reservation.capability.js |  17 +
 capabilities/reservation/reservation.events.js     |   9 +
 capabilities/reservation/reservation.manager.js    | 139 +++++++-
 capabilities/reservation/reservation.workflow.js   |   7 +
 7 files changed, 519 insertions(+), 47 deletions(-)
```

Reproduce the full production diff with:

```
git -C C:\Users\casa\Documents\booking-pricing-1a diff -- capabilities/business/business.events.js capabilities/business/manager/business-reservation.manager.js capabilities/persistence/repositories/reservation/reservation.repository.js capabilities/reservation/reservation.capability.js capabilities/reservation/reservation.events.js capabilities/reservation/reservation.manager.js capabilities/reservation/reservation.workflow.js
```

It is also embedded verbatim in Appendix A below.

## 6. Corrections to the audit report

`BOOKING_EXPIRATION_READINESS_1_REPORT.md` is preserved as the baseline record of HEAD `06a03a5`, with three corrections made in place:

- **§5.3** claimed `#repairPaymentStuck` reports `{ success: true, action: 'expire_and_release' }`. It does not: the dead call at `:483` throws synchronously inside the `try` at `:477` and is caught at `:497`, so the emit at `:491` and the success return at `:496` are unreachable and the method reports `{ success: false, error }` - after `:479` already persisted `EXPIRED`. This also removed a contradiction with the correct statement already in §5.1.
- **P7 and §11** claimed `reservation.events.js` has no `NO_RESPONSE` event; slice A added one, so both are annotated as superseded.
- A status note at the top records that slice A is implemented on top of the audited HEAD, and that the timer findings (§3), recovery findings (§5), the status/count divergence as a pre-existing condition and the certification verdict (§13) are unchanged, with B and C outstanding.

## 7. Follow-ups

1. **Slice B** - register `reservationExpiration`, stop the timer on every terminal transition including `REQUESTED`, await `checkExpiration()`, and make the absent-scheduler case explicit instead of returning `{ success: true, timerId }` with nothing scheduled.
2. **Slice C** - delete the dead recovery calls and the inert availability branch, and converge `recoverExpiredReservations`; route both recovery writers through the shared expiration call so the gate is reached from every writer.
3. **Open product decisions.** Only one remains genuinely open: whether a failed release is surfaced to the caller rather than merely counted. Two questions that earlier drafts listed here are now **decided for this milestone** and are enforced by tests, not left open: expiration stamps no timestamp of its own (`cancelled_at` is left exactly as stored), and a repeated expiration stays the established `Invalid transition` throw with no write and no further release.
4. **Not yet certifiable.** No Stage-facing or release guarantee about expiration is warranted until B and C land and the audit is re-run against a real PostgreSQL server.

---

## Appendix A - full production diff

Verbatim `git diff` of the seven production files against HEAD `06a03a5`, uncommitted. The test-support counter fix and the new focused suite are test artifacts, listed in section 5. One incidental whitespace change is included and flagged below: `reservation.repository.js` previously ended without a trailing newline and now has one.

```diff
diff --git a/capabilities/business/business.events.js b/capabilities/business/business.events.js
index dd2f332..3890c5b 100644
--- a/capabilities/business/business.events.js
+++ b/capabilities/business/business.events.js
@@ -51,6 +51,13 @@ export const BUSINESS_RESERVATION_EVENTS = {
   RESERVATION_REJECTED: 'business.reservation:rejected',
   RESERVATION_CANCELLED: 'business.reservation:cancelled',
   RESERVATION_EXPIRED: 'business.reservation:expired',
+  // BOOKING-EXPIRATION-ATOMIC-1. Sibling of RESERVATION_EXPIRED for the
+  // NO_RESPONSE outcome, so an owner who never answered is not reported to
+  // subscribers as an expiry. Consumers were inspected before adding this: no
+  // module subscribes to 'business.reservation:expired' by that literal, so the
+  // sibling introduces no handler that could silently miss an outcome, and
+  // nothing existing changes behaviour.
+  RESERVATION_NO_RESPONSE: 'business.reservation:no_response',
   RESERVATION_CHECKED_IN: 'business.reservation:checked_in',
   RESERVATION_CHECKED_OUT: 'business.reservation:checked_out',
   RESERVATION_ARCHIVED: 'business.reservation:archived',
diff --git a/capabilities/business/manager/business-reservation.manager.js b/capabilities/business/manager/business-reservation.manager.js
index 6809fee..3341b4c 100644
--- a/capabilities/business/manager/business-reservation.manager.js
+++ b/capabilities/business/manager/business-reservation.manager.js
@@ -2,7 +2,7 @@ import { BUSINESS_RESERVATION_EVENTS } from '../business.events.js'
 import { BusinessOrchestrationError } from '../business.errors.js'
 import { BUSINESS_PERMISSIONS } from '../business.permissions.js'
 import { BUSINESS_STATUS } from '../business.status.js'
-import { isArchivableStatus } from '../../reservation/reservation.status.js'
+import { isArchivableStatus, RESERVATION_STATUS } from '../../reservation/reservation.status.js'

 export class BusinessReservationManager {
   #context
@@ -217,14 +217,31 @@ export class BusinessReservationManager {
     await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
     const reservation = await this.#assertReservationBelongsToBusiness(reservationId, businessId)
     const result = await this.#delegateService('expireReservation', reservationId, identity)
-    if (result?.success && reservation?.accommodationId) {
-      try {
-        const availabilityManager = this.#availabilityManager
-        if (availabilityManager?.releaseReservation) {
-          await availabilityManager.releaseReservation(reservation.accommodationId, reservation.dates?.checkIn, reservation.dates?.checkOut, identity)
-        }
-      } catch { }
-      this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_EXPIRED, { businessId, reservationId, identity })
+    if (result?.success) {
+      // BOOKING-EXPIRATION-ATOMIC-1. The extra range-based release that used to
+      // run here is removed, mirroring BOOKING-CANCEL-ROUTING-1's removal from
+      // cancelReservation. The delegated reservation manager now routes through
+      // expireReservationWithRelease, which releases exactly the recorded
+      // occupied nights and marks those lines released. The operation removed
+      // here ran over checkIn..checkOut with check-out inclusive — one night
+      // wider than any occupied-night set — with no reservationId filter, so it
+      // matched every RESERVED night in range regardless of which reservation
+      // held it, wrote availability `status`/`notes` without touching
+      // `reserved_count` or `reservation_lines.released_at`, and hid every
+      // failure in a bare `catch { }`. Removing it cannot leave a leak behind,
+      // because the delegated call now performs the real release; the reverse
+      // deletion order would have.
+      //
+      // The payload's event follows the RESULTING status. Expiration resolves
+      // OWNER_PENDING to no_response and the others to expired, so a fixed
+      // `business.reservation:expired` would misreport an unanswered owner. The
+      // delegated result carries the status it actually landed.
+      this.#emit(
+        result.status === RESERVATION_STATUS.NO_RESPONSE
+          ? BUSINESS_RESERVATION_EVENTS.RESERVATION_NO_RESPONSE
+          : BUSINESS_RESERVATION_EVENTS.RESERVATION_EXPIRED,
+        { businessId, reservationId, identity, status: result.status ?? null }
+      )
     }
     return result
   }
diff --git a/capabilities/persistence/repositories/reservation/reservation.repository.js b/capabilities/persistence/repositories/reservation/reservation.repository.js
index 001045c..9d172b0 100644
--- a/capabilities/persistence/repositories/reservation/reservation.repository.js
+++ b/capabilities/persistence/repositories/reservation/reservation.repository.js
@@ -28,6 +28,34 @@ const SUPPORTED_CONSUMPTION_RECORD_VERSIONS = Object.freeze([1])
 /** Strict calendar date shape. Record dates must match it exactly. */
 const STRICT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

+/**
+ * The APPROVED source -> target pairs for an expiration, and the whole of it.
+ *
+ * BOOKING-EXPIRATION-ATOMIC-1. Two independent allow-lists — "these targets are
+ * terminal" and "these sources are expirable" — admit every cross product, so
+ * `requested -> no_response` and `owner_pending -> expired` both passed while
+ * being unapproved combinations. The pair is the approved unit, so it is
+ * declared as ONE map and validated as one pair: the target must be the value
+ * this source maps to. Any other combination is refused at the repository
+ * boundary, before any write or release, on both adapter paths.
+ *
+ * This mirrors `EXPIRATION_TARGETS` in reservation.workflow.js, which is
+ * already a source -> target map. It is duplicated here as a literal rather than
+ * imported because importing from `capabilities/reservation` into
+ * `capabilities/persistence` would be a cross-capability import (see the
+ * capability-context note above), and because this file already names domain
+ * tables and statuses as literals. The two are asserted equal, pair by pair, by
+ * the focused test suite, so a divergence is caught rather than silent.
+ *
+ * These are terminal outcomes only, so `cancelled` is absent by construction:
+ * expiration cannot express a cancellation even indirectly.
+ */
+const EXPIRATION_TRANSITIONS = Object.freeze({
+  requested: 'expired',
+  owner_pending: 'no_response',
+  payment_pending: 'expired',
+})
+
 /**
  * The pristine Map mutation method, captured at module load.
  *
@@ -837,6 +865,45 @@ export class ReservationRepository extends BaseRepository {
     return { ...row, ...shallow }
   }

+  /**
+   * The replacement row an EXPIRATION publishes, built from the AUTHORITATIVE
+   * STORED row and changing exactly two fields.
+   *
+   * BOOKING-EXPIRATION-ATOMIC-1. Expiration used to reuse the cancellation merge
+   * (`#mergeMockRow`), which shallow-copies every key the CALLER payload
+   * happens to carry onto the stored row. That makes unrelated-field preservation
+   * a property of the caller's restraint rather than of the repository: a payload
+   * carrying `cancelledAt`, `notes`, `metadata` or `accommodationId` silently
+   * overwrote the stored values, and the caller's `accommodationId` could also
+   * contradict the stored one while the release still used the stored row as its
+   * ownership authority. Expiration is a status-only operation, so it is given a
+   * replacement that is derived from the stored row instead:
+   *
+   *   - `status` — the approved target, the one field the operation owns;
+   *   - `updatedAt` — the maintained timestamp, matching `updated_at = NOW()` on
+   *     the PostgreSQL path;
+   *   - everything else, taken verbatim from the stored row: `cancelledAt`,
+   *     `cancelled_at`, `notes`, `metadata`, `specialRequests`, `customer`,
+   *     `dates`, `tenantId`, `accommodationId`, `businessId`, `resourceId`,
+   *     `guests`, `deletedAt`, and any field this code has never heard of.
+   *
+   * The stored row is spread first and only these two keys are assigned, so a
+   * caller cannot widen what expiration writes, whether by adding keys or by
+   * sending a value that happens to be `undefined` for one of them. The stored
+   * row is not mutated: a new object is returned.
+   *
+   * Cancellation keeps `#mergeMockRow` unchanged; this is used only when the
+   * synchronous section is serving expiration.
+   *
+   * @param {object} storedReservation the authoritative stored row
+   * @param {string} status the approved terminal target
+   * @param {string} now the same timestamp used for the capacity and line writes
+   * @returns {object} a new object; `storedReservation` is never mutated
+   */
+  #expirationReplacementRow(storedReservation, status, now) {
+    return { ...storedReservation, status, updatedAt: now }
+  }
+
   /**
    * The stored reservation row this cancellation is allowed to act on.
    *
@@ -892,7 +959,24 @@ export class ReservationRepository extends BaseRepository {
    * @param {string} tenantId
    * @returns {{reservation: object|null, release: {released: object[], noOp: boolean}}}
    */
-  #commitMockCancellationSync(reservationData, tenantId) {
+  #commitMockCancellationSync(reservationData, tenantId, options = {}) {
+    // BOOKING-EXPIRATION-ATOMIC-1. `options` selects which terminal operation
+    // this synchronous section is serving and adds the expiration-only
+    // precondition. The defaults reproduce the cancellation call EXACTLY, so
+    // `cancelReservationWithRelease` behaviour — including every error message
+    // below — is unchanged by the extraction.
+    const operation = options?.operation || 'cancelReservationWithRelease'
+    const expectedStatus = options?.expectedStatus ?? null
+
+    // How the replacement reservation row is BUILT. Cancellation merges the
+    // caller's payload over the stored row, byte-for-byte as before; expiration
+    // derives it from the stored row and changes only `status` and `updatedAt`,
+    // so unrelated-field preservation is enforced here instead of depending on
+    // which keys the caller happened to send. This flag changes nothing else —
+    // the selection, validation, planning, publication and rollback below are
+    // shared, and the ownership/capacity authority is the stored row either way.
+    const isExpiration = operation === 'expireReservationWithRelease'
+
     const store = this.adapter?.constructor?.store
     const reservationTable = store?.get?.(this.adapter?.entityName) || null
     const linesStore = store?.get?.('reservation_lines') || null
@@ -922,7 +1006,7 @@ export class ReservationRepository extends BaseRepository {
         {
           entityName: this.adapter?.entityName,
           entityId: reservationData?.id,
-          operation: 'cancelReservationWithRelease',
+          operation,
         }
       )
     }
@@ -941,6 +1025,37 @@ export class ReservationRepository extends BaseRepository {
       return { reservation: null, release: { released: [], noOp: true } }
     }

+    // BOOKING-EXPIRATION-ATOMIC-1. Expiration precondition, checked against the
+    // stored row rather than the caller payload, and before ANY line selection,
+    // record resolution or capacity work — so a stale expiration that no longer
+    // matches the caller's expectation cannot publish a partial or full release.
+    //
+    // WHAT IT GUARDS: competing writes to the SAME reservation. The caller read
+    // the row, and between that read and this write another writer — a
+    // confirmation, a rejection, a cancellation, or a second expiration — moved
+    // it on. The caller states the status it believes is stored, and if the
+    // stored row no longer says that, this expiration no longer describes the
+    // current row and must not act on it. It is not a lock and not a
+    // cross-reservation guard: it says nothing about whether some OTHER
+    // reservation can expire concurrently, and two different reservations
+    // expiring at the same moment are unaffected by it.
+    //
+    // This is deliberately NOT the `released_at` idempotency guard. A repeated
+    // release finding no unreleased lines is a no-op; that says nothing about
+    // whether the status write was still appropriate. This check answers the
+    // separate question: may this caller still move this row to a terminal
+    // status? Cancellation does not pass `expectedStatus` and is unaffected.
+    if (expectedStatus != null && storedReservation.status !== expectedStatus) {
+      throw new RepositoryValidationError(
+        `Reservation ${reservationData.id} is ${storedReservation.status ?? '(no status)'}, not ${expectedStatus}; refusing to ${operation}`,
+        {
+          entityName: this.adapter?.entityName,
+          entityId: reservationData?.id,
+          operation,
+        }
+      )
+    }
+
     // Used only to VERIFY line ownership below; when the stored row carries no
     // accommodation there is nothing to compare and no target is chosen.
     const authoritativeAccommodationId = storedReservation.accommodationId ?? null
@@ -959,7 +1074,7 @@ export class ReservationRepository extends BaseRepository {
       if (line?.tenantId != null && line.tenantId !== effectiveTenantId) {
         throw new RepositoryValidationError(
           `Reservation line ${line.id} belongs to tenant ${line.tenantId}, not ${effectiveTenantId}`,
-          { entityName: 'reservation_lines', entityId: line.id, operation: 'cancelReservationWithRelease' }
+          { entityName: 'reservation_lines', entityId: line.id, operation }
         )
       }
       if (
@@ -969,7 +1084,7 @@ export class ReservationRepository extends BaseRepository {
       ) {
         throw new RepositoryValidationError(
           `Reservation line ${line.id} targets ${line.targetId}, but reservation ${reservationData.id} holds ${authoritativeAccommodationId}; refusing to choose a target`,
-          { entityName: 'reservation_lines', entityId: line.id, operation: 'cancelReservationWithRelease' }
+          { entityName: 'reservation_lines', entityId: line.id, operation }
         )
       }
     }
@@ -1032,7 +1147,15 @@ export class ReservationRepository extends BaseRepository {

     // Every replacement object is prepared here, before the first write, and no
     // stored row is ever mutated in place.
-    const nextReservation = this.#mergeMockRow(storedReservation, reservationData)
+    //
+    // Expiration builds the reservation replacement from the STORED row and
+    // changes only `status` and `updatedAt` (see #expirationReplacementRow), so
+    // the caller's `cancelledAt`, `notes`, `metadata`, `accommodationId` and any
+    // other unrelated key cannot reach the store through this write. Cancellation
+    // keeps the caller-payload merge, unchanged.
+    const nextReservation = isExpiration
+      ? this.#expirationReplacementRow(storedReservation, reservationData.status, now)
+      : this.#mergeMockRow(storedReservation, reservationData)
     const nextCapacity = Array.from(capacityPlan.values(), ({ row, delta }) => ({
       id: row.id,
       next: this.#mockReleasedAvailability(row, this.#mockReservedCount(row) - delta, now),
@@ -1116,6 +1239,57 @@ export class ReservationRepository extends BaseRepository {
     }
   }

+  /**
+   * The PostgreSQL half of the shared atomic terminal-transition-with-release
+   * core, used by BOTH cancellation and expiration.
+   *
+   * BOOKING-EXPIRATION-ATOMIC-1. The two operations differ only in the status
+   * statement they issue; everything that makes the operation atomic is common
+   * and lives here exactly once:
+   *
+   *   - the enclosing `transaction()`, so the status update and every
+   *     `released_at` / capacity write commit or unwind together;
+   *   - missing-row handling (zero rows is an error, never a silent success);
+   *   - the call into `releaseReservationLines`, which owns the record validator,
+   *     the legacy DATE_RANGE refusal, the plan-before-mutate ordering and the
+   *     `released_at` compare-and-set.
+   *
+   * The caller supplies the statement because the two operations genuinely need
+   * different columns: cancellation stamps `cancelled_at` and carries the
+   * cancel reason into `special_requests`; expiration must touch NEITHER, so it
+   * supplies a statement that writes `status` and `updated_at` only. Extracting
+   * the shared part rather than copying the body is what keeps the two from
+   * drifting apart again.
+   *
+   * @param {object} reservationData
+   * @param {string} tenantId
+   * @param {object} options
+   * @param {string} options.sql the status UPDATE statement
+   * @param {Array}  options.params its bound parameters
+   * @param {string} options.emptyResultMessage thrown when the statement matches no row
+   * @returns {Promise<{reservation: object, release: {released: object[], noOp: boolean}}>}
+   */
+  async #postgresTerminalTransitionWithRelease(reservationData, tenantId, { sql, params, emptyResultMessage }) {
+    return transaction(async (client) => {
+      const reservationResult = await client.query(sql, params)
+
+      if (reservationResult.rows.length === 0) {
+        throw new Error(emptyResultMessage)
+      }
+
+      const release = await this.releaseReservationLines(
+        client,
+        reservationData.id,
+        tenantId
+      )
+
+      return {
+        reservation: reservationResult.rows[0],
+        release,
+      }
+    })
+  }
+
   async cancelReservationWithRelease(reservationData, tenantId) {
     this._enforceNotDisposed()
     this._enforceInitialized()
@@ -1131,9 +1305,8 @@ export class ReservationRepository extends BaseRepository {
       return reservation
     }

-    return transaction(async (client) => {
-      const reservationResult = await client.query(
-        `UPDATE reservations
+    return this.#postgresTerminalTransitionWithRelease(reservationData, tenantId, {
+      sql: `UPDATE reservations
          SET status = $1,
              cancelled_at = $2,
              special_requests = $3,
@@ -1141,33 +1314,152 @@ export class ReservationRepository extends BaseRepository {
          WHERE id = $4
            AND tenant_id = $5
          RETURNING *`,
-        [
-          reservationData.status,
-          reservationData.cancelledAt || null,
-          reservationData.notes || null,
-          reservationData.id,
-          tenantId,
-        ]
-      )
+      params: [
+        reservationData.status,
+        reservationData.cancelledAt || null,
+        reservationData.notes || null,
+        reservationData.id,
+        tenantId,
+      ],
+      // Preserved verbatim from the pre-extraction body.
+      emptyResultMessage: `Reservation ${reservationData.id} update failed - not found or not authorized`,
+    })
+  }

-      if (reservationResult.rows.length === 0) {
-        throw new Error(
-          `Reservation ${reservationData.id} update failed - not found or not authorized`
-        )
-      }
+  /**
+   * The APPROVED source -> target PAIRS for an expiration.
+   *
+   * BOOKING-EXPIRATION-ATOMIC-1. This is the expiration sibling of
+   * `cancelReservationWithRelease`. It shares the atomic mechanics with it — the
+   * same synchronous Map planning/publication/rollback, and the same PostgreSQL
+   * transaction — through #commitMockCancellationSync and
+   * #postgresTerminalTransitionWithRelease, rather than duplicating them. That is
+   * the point: expiration previously wrote status and released nothing, so the
+   * release gate in #resolveRecordedReleaseDates did not apply to it at all.
+   *
+   * The pair is validated as a PAIR, not as two independent allow-lists: the
+   * caller-stated source must map to the caller-stated target in
+   * EXPIRATION_TRANSITIONS. `requested -> no_response`,
+   * `owner_pending -> expired` and `payment_pending -> no_response` are each
+   * individually plausible and each unapproved, so admitting them on the strength
+   * of their members would be wrong. The check runs before any store work and is
+   * therefore identical on both adapter paths.
+   *
+   * What expiration deliberately does NOT do, so that it cannot become a
+   * cancellation with extra steps:
+   *
+   *   - it never writes `cancelled_at`, in any adapter. The PostgreSQL statement
+   *     below omits the column entirely, so it is neither set nor cleared to
+   *     NULL, and the Map replacement is built from the stored row with only
+   *     `status` and `updatedAt` assigned. A pre-existing `cancelledAt` on the
+   *     stored row survives expiration untouched.
+   *   - it never writes `special_requests` or any other unrelated column, on
+   *     either adapter.
+   *   - it accepts only the approved pairs, so `cancelled` cannot be reached.
+   *
+   * On the Map path the replacement row is derived from the AUTHORITATIVE STORED
+   * row, not from the caller payload. Preservation of `cancelledAt`, `notes`,
+   * `metadata`, `tenantId`, `accommodationId` and every other unrelated property
+   * is therefore a property of this method rather than of the caller's
+   * restraint: a payload carrying conflicting values for those keys cannot reach
+   * the store through this write. The release below likewise uses the stored
+   * row's accommodation as its ownership authority.
+   *
+   * `expectedStatus` is REQUIRED and is re-validated against the authoritative
+   * store, not the caller payload: the Map path compares the stored row's status
+   * before any line or capacity work, and the PostgreSQL predicate carries the
+   * same condition so the check also holds against a row that changed between
+   * the caller's read and this write. It guards competing writes to the SAME
+   * reservation: if another writer moved THIS row on, this expiration no longer
+   * describes it and is refused. It is not a lock and says nothing about other
+   * reservations. This is deliberately separate from the `released_at`
+   * idempotency guard, which only says a release already happened; it does not
+   * say the status write is still appropriate.
+   *
+   * RETURN SHAPE matches `cancelReservationWithRelease` per adapter, so a caller
+   * treats the result identically: the bare stored row (or null) on the Map
+   * path, a `{ reservation, release }` wrapper from the PostgreSQL transaction.
+   *
+   * NOT CERTIFIED: physical PostgreSQL rollback, and concurrency between
+   * processes. The Map path is synchronously atomic for store-write failures
+   * within one process and buys no crash durability.
+   *
+   * @param {object} reservationData domain object carrying `id` and the target `status`
+   * @param {string} tenantId
+   * @param {object} options
+   * @param {string} options.expectedStatus the source status the caller believes is stored
+   * @returns {Promise<object|null|{reservation: object, release: object}>}
+   */
+  async expireReservationWithRelease(reservationData, tenantId, { expectedStatus } = {}) {
+    this._enforceNotDisposed()
+    this._enforceInitialized()
+    this._enforceWritable()

-      const release = await this.releaseReservationLines(
-        client,
-        reservationData.id,
-        tenantId
+    const targetStatus = reservationData?.status
+
+    // The APPROVED PAIR, validated before any store work. Required, and validated
+    // rather than trusted: an expiration with no stated starting state has no way
+    // to detect that it is stale, and an unstated or wrong target has no way to
+    // be shown to be the one this source is approved to reach.
+    const approvedTarget = EXPIRATION_TRANSITIONS[expectedStatus]
+
+    if (approvedTarget === undefined) {
+      throw new RepositoryValidationError(
+        `Cannot expire reservation ${reservationData?.id}: ${JSON.stringify(expectedStatus)} is not a supported expiration source status`,
+        {
+          entityName: this.adapter?.entityName,
+          entityId: reservationData?.id,
+          operation: 'expireReservationWithRelease',
+        }
       )
+    }

-      return {
-        reservation: reservationResult.rows[0],
-        release,
-      }
+    if (targetStatus !== approvedTarget) {
+      throw new RepositoryValidationError(
+        `Cannot expire reservation ${reservationData?.id} from ${expectedStatus} to ${JSON.stringify(targetStatus)}: the approved outcome for ${expectedStatus} is ${approvedTarget}`,
+        {
+          entityName: this.adapter?.entityName,
+          entityId: reservationData?.id,
+          operation: 'expireReservationWithRelease',
+        }
+      )
+    }
+
+    const hasPostgres = this.adapter?.provider?.name === 'postgres'
+
+    if (!hasPostgres) {
+      this._enforceContext()
+      const { reservation } = this.#commitMockCancellationSync(reservationData, tenantId, {
+        operation: 'expireReservationWithRelease',
+        expectedStatus,
+      })
+      return reservation
+    }
+
+    return this.#postgresTerminalTransitionWithRelease(reservationData, tenantId, {
+      // `cancelled_at` and `special_requests` are deliberately absent from the
+      // SET list: expiration must preserve them exactly as stored, including a
+      // `cancelled_at` that is already populated. Only `updated_at` is
+      // maintained alongside the status, matching the Map replacement row's
+      // `{ ...stored, status, updatedAt }` — so the two adapters write the same
+      // two fields and neither can carry a caller's unrelated value into a column.
+      sql: `UPDATE reservations
+         SET status = $1,
+             updated_at = NOW()
+         WHERE id = $2
+           AND tenant_id = $3
+           AND status = $4
+         RETURNING *`,
+      params: [targetStatus, reservationData.id, tenantId, expectedStatus],
+      // Zero rows is ambiguous on this statement and deliberately not
+      // disambiguated with an extra read: the row may be missing, not
+      // authorized, or no longer in the expected status. The message says so
+      // rather than asserting one cause.
+      emptyResultMessage:
+        `Reservation ${reservationData.id} expiration did not match expected status ${expectedStatus}: the row is missing, not authorized, or is no longer ${expectedStatus}`,
     })
   }
+
   async releaseReservationLines(client, reservationId, tenantId) {
     const linesResult = await client.query(`
       SELECT rl.*
@@ -1289,4 +1581,4 @@ export class ReservationRepository extends BaseRepository {

     return []
   }
-}
\ No newline at end of file
+}
diff --git a/capabilities/reservation/reservation.capability.js b/capabilities/reservation/reservation.capability.js
index ce4d391..4b34001 100644
--- a/capabilities/reservation/reservation.capability.js
+++ b/capabilities/reservation/reservation.capability.js
@@ -47,6 +47,14 @@ export class ReservationCapability extends BaseCapability {
     this.on(RESERVATION_EVENTS.CONFIRMED, this.#onReservationConfirmed.bind(this))
     this.on(RESERVATION_EVENTS.CANCELLED, this.#onReservationCancelled.bind(this))
     this.on(RESERVATION_EVENTS.EXPIRED, this.#onReservationExpired.bind(this))
+    // BOOKING-EXPIRATION-ATOMIC-1. NO_RESPONSE is the expiration outcome for an
+    // unanswered OWNER_PENDING reservation and is terminal, exactly like
+    // EXPIRED. Without this subscription it would produce no search-index
+    // handling at all, so the reservation would stay listed in search while its
+    // capacity had been released — the same divergence EXPIRED already handled.
+    // This is the directly affected consumer being wired; no event-delivery
+    // framework is introduced and the existing EXPIRED path is unchanged.
+    this.on(RESERVATION_EVENTS.NO_RESPONSE, this.#onReservationNoResponse.bind(this))
     await super.activate()
   }

@@ -195,6 +203,15 @@ export class ReservationCapability extends BaseCapability {
     this.#triggerSearchRemove(event.reservation)
   }

+  /**
+   * The NO_RESPONSE expiration outcome is terminal, so it removes the
+   * reservation from the search index exactly as EXPIRED does.
+   * BOOKING-EXPIRATION-ATOMIC-1.
+   */
+  #onReservationNoResponse(event) {
+    this.#triggerSearchRemove(event.reservation)
+  }
+
   #triggerSearchIndex(reservation) {
     if (!reservation) return
     const search = this.context?.runtime?.search
diff --git a/capabilities/reservation/reservation.events.js b/capabilities/reservation/reservation.events.js
index 364892a..a6c0ba7 100644
--- a/capabilities/reservation/reservation.events.js
+++ b/capabilities/reservation/reservation.events.js
@@ -18,6 +18,15 @@ export const RESERVATION_EVENTS = {
   REJECTED: 'reservation:rejected',
   CANCELLED: 'reservation:cancelled',
   EXPIRED: 'reservation:expired',
+  // BOOKING-EXPIRATION-ATOMIC-1. NO_RESPONSE is a distinct terminal status
+  // (reservation.workflow.js VALID_TRANSITIONS and EXPIRATION_TARGETS) and the
+  // timeout target for OWNER_PENDING, but until now it had no event of its own:
+  // an owner who never answered produced no outcome event at all, and the timer
+  // mislabelled the case by emitting EXPIRED. It is added here rather than
+  // reusing EXPIRED so a subscriber can distinguish "the customer timed out"
+  // from "the owner never responded", which is the distinction EXPIRATION_TARGETS
+  // exists to make.
+  NO_RESPONSE: 'reservation:no_response',
   NO_SHOW: 'reservation:no_show',
   ARCHIVED: 'reservation:archived',
   RESTORED: 'reservation:restored',
diff --git a/capabilities/reservation/reservation.manager.js b/capabilities/reservation/reservation.manager.js
index 41ae32a..7abb866 100644
--- a/capabilities/reservation/reservation.manager.js
+++ b/capabilities/reservation/reservation.manager.js
@@ -1,3 +1,34 @@
+/**
+ * The customer-facing sentence for each expiration outcome.
+ *
+ * BOOKING-EXPIRATION-ATOMIC-1. A notification must describe what actually
+ * happened, so the two outcomes cannot share one message. The EXPIRED wording is
+ * the pre-existing sentence, kept byte-for-byte; NO_RESPONSE gets its own that
+ * names the real cause (no owner reply) instead of asserting a generic expiry.
+ * Copy is product-facing and is offered for review, not treated as approved legal
+ * or commercial wording.
+ */
+const EXPIRATION_NOTIFICATION_BODIES = {
+  [RESERVATION_STATUS.EXPIRED]: (reservation) =>
+    `Su solicitud de reserva para ${reservation.dates.checkIn} al ${reservation.dates.checkOut} ha expirado.`,
+  [RESERVATION_STATUS.NO_RESPONSE]: (reservation) =>
+    `Su solicitud de reserva para ${reservation.dates.checkIn} al ${reservation.dates.checkOut} se cerró porque el propietario no respondió.`,
+}
+
+/**
+ * The success event for each expiration outcome.
+ *
+ * BOOKING-EXPIRATION-ATOMIC-1. EXPIRED outcomes keep the existing EXPIRED event,
+ * so every current subscriber of `reservation:expired` keeps working unchanged.
+ * NO_RESPONSE gets the new specific event. This is a data lookup, not an event
+ * framework: there is no delivery layer, queue or retry introduced here, and the
+ * existing post-publication subscriber-error policy is untouched.
+ */
+const EXPIRATION_SUCCESS_EVENTS = {
+  [RESERVATION_STATUS.EXPIRED]: RESERVATION_EVENTS.EXPIRED,
+  [RESERVATION_STATUS.NO_RESPONSE]: RESERVATION_EVENTS.NO_RESPONSE,
+}
+
 /**
  * Reservation Manager — Central orchestration of reservation lifecycle
  *
@@ -375,10 +406,42 @@ constructor(context) {

   /**
    * Expire reservation (timeout, abandonment)
+   *
+   * BOOKING-EXPIRATION-ATOMIC-1. Expiration now moves the reservation to a terminal
+   * status AND releases its recorded occupied nights in ONE repository operation,
+   * so the release gate in the repository (#resolveRecordedReleaseDates) applies to
+   * expiration for the first time. Previously it wrote status only, via
+   * #persist, and released nothing — which is why the gate, while intact, certified
+   * nothing about expiration.
+   *
+   * Target selection follows the reservation's own current state, via
+   * EXPIRATION_TARGETS, rather than being hardcoded:
+   *
+   *     REQUESTED      -> EXPIRED
+   *     OWNER_PENDING  -> NO_RESPONSE
+   *     PAYMENT_PENDING-> EXPIRED
+   *     CONFIRMED      -> rejected (not expirable)
+   *
+   * Expiration is NOT cancellation: `cancelledAt` is never set, cleared or
+   * repurposed, cancellation's reason-into-`special_requests` write is not
+   * performed, and `cancelReservationWithRelease` is not called. Any pre-existing
+   * `cancelledAt` on the stored row is left exactly as it is.
+   *
+   * Unsupported source states are rejected BEFORE the repository is reached, so
+   * nothing is ever released for them, and the established thrown
+   * `Invalid transition` behaviour is preserved: for every state with no
+   * expiration target the call below raises that error, which is what repeated
+   * manager expiry of an already-terminal reservation still does.
+   *
+   * A repository that cannot perform the atomic operation fails loudly. There is
+   * no status-only degradation, because that is precisely the defect being fixed:
+   * a missing method, a null result or a rejection produces no success, no terminal
+   * cache entry, no success event and no notification.
+   *
    * @param {string} reservationId
-   * @param {object|null} identity
-   * @returns {{ success: boolean, errors?: string[] }}
-   */
+ * @param {object|null} identity
+ * @returns {{ success: boolean, status?: string, errors?: string[] }}
+ */
   async expireReservation(reservationId, identity) {
     await this.#checkPermission(identity, RESERVATION_PERMISSIONS.CANCEL)
     const reservation = await this.#loadReservation(reservationId)
@@ -386,21 +449,81 @@ constructor(context) {
       return { success: false, errors: ['Reservation not found'] }
     }

-    const updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.EXPIRED)
-    await this.#persist(updated)
+    // The target is derived from the state the reservation is actually in, so
+    // the three approved outcomes stay distinguishable and CONFIRMED stays
+    // non-expirable.
+    const targetStatus = ReservationWorkflow.getExpirationTarget(reservation.status)
+
+    if (!targetStatus) {
+      // Raises the established invalid-transition error for every unsupported
+      // state: CONFIRMED, an already-terminal reservation such as EXPIRED or
+      // NO_RESPONSE (repeated expiry), and anything else. Nothing has been
+      // persisted at this point and no release has been attempted.
+      ReservationWorkflow.transition(reservation, RESERVATION_STATUS.EXPIRED)
+      return {
+        success: false,
+        errors: [`Reservation ${reservationId} cannot be expired from status ${reservation.status}`],
+      }
+    }
+
+    const updated = ReservationWorkflow.transition(reservation, targetStatus)
+
+    // BOOKING-CANCEL-ROUTING-1 routing rule, applied to expiration: the branch is
+    // chosen by the presence of the repository, never by the
+    // config.persistenceProvider string, because the repository selects its own
+    // adapter internally.
+    if (this.#repo) {
+      if (typeof this.#repo.expireReservationWithRelease !== 'function') {
+        // Never degrade to status-only persistence: capacity would stay held
+        // while the caller was told the reservation had expired.
+        throw new Error(
+          `Reservation repository cannot release capacity for ${reservationId}: expireReservationWithRelease is unavailable`
+        )
+      }
+
+      // The result is only a success signal, and its shape is adapter-specific
+      // (a bare stored row or null on the Map path, a { reservation, release }
+      // wrapper from the PostgreSQL transaction) exactly as for cancellation. The
+      // cached value stays the domain object `updated`, so the cache read path is
+      // never fed a wrapper. The source status is passed as the repository's
+      // precondition, so a reservation that moved on between this read and the
+      // write cannot be expired by this call.
+      const persisted = await this.#repo.expireReservationWithRelease(updated, reservation.tenantId, {
+        expectedStatus: reservation.status,
+      })
+      if (!persisted) {
+        throw new Error(
+          `Reservation ${reservationId} expiration did not persist: repository returned no row`
+        )
+      }
+
+      this.#cacheReservation(updated)
+    } else {
+      // Repo-less cache-backed expiration. Preserved deliberately: this shape has
+      // no line to release — createRequest wrote none — so no capacity was ever
+      // consumed and mutating the cache is consistent. It is not reported as a
+      // failure merely for lacking a repository.
+      await this.#persist(updated)
+    }
+
+    // Emitted only after persistence succeeded. #emit is synchronous and
+    // subscriber-error behaviour is unchanged: a subscriber that throws still
+    // propagates after the write is committed.
+    const successEvent = EXPIRATION_SUCCESS_EVENTS[targetStatus]

     const notifications = this.#context?.capabilities?.get?.('notifications')
     if (notifications) {
+      const body = EXPIRATION_NOTIFICATION_BODIES[targetStatus]
       await notifications.send({
         channel: reservation.customer.channelPreference || 'email',
         recipient: reservation.customer.email || reservation.customer.phone,
-        body: `Su solicitud de reserva para ${reservation.dates.checkIn} al ${reservation.dates.checkOut} ha expirado.`,
+        body: typeof body === 'function' ? body(reservation) : body,
       })
     }

-    this.#emit(RESERVATION_EVENTS.EXPIRED, { reservationId, reservation: updated })
+    this.#emit(successEvent, { reservationId, reservation: updated, fromStatus: reservation.status, toStatus: targetStatus })

-    return { success: true }
+    return { success: true, status: targetStatus }
   }

   /**
diff --git a/capabilities/reservation/reservation.workflow.js b/capabilities/reservation/reservation.workflow.js
index 37a16f6..1ce58c5 100644
--- a/capabilities/reservation/reservation.workflow.js
+++ b/capabilities/reservation/reservation.workflow.js
@@ -20,9 +20,16 @@ const EXPIRATION_TARGETS = {
 }

 const VALID_TRANSITIONS = {
+  // BOOKING-EXPIRATION-ATOMIC-1. REQUESTED now declares EXPIRED, matching
+  // EXPIRATION_TARGETS above and the default `requestedTimeout` of 12h. Without
+  // it, `canExpire('requested')` was true while `canTransition` was false, so a
+  // requested reservation that timed out threw `Invalid transition` out of both
+  // `expireReservation` and the timer's expiration. Every pre-existing
+  // transition out of REQUESTED is retained; this is purely additive.
   [RESERVATION_STATUS.REQUESTED]: [
     RESERVATION_STATUS.OWNER_PENDING,
     RESERVATION_STATUS.REJECTED,
+    RESERVATION_STATUS.EXPIRED,
     RESERVATION_STATUS.CANCELLED,
     RESERVATION_STATUS.ARCHIVED,
   ],
```
