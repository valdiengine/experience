# BOOKING-MOCK-CANCEL-ATOMIC-1 - implementation report (production + focused tests)

## Baseline
Branch `booking-pricing-1a`, HEAD `392d2d3e7f1ce2a62e1504c6eac6487fdbfedf80`. Worktree
`C:\Users\casa\Documents\booking-pricing-1a`. Pre-existing untracked: only
`docs/ai/BOOKING_RELEASE_READINESS_1_REPORT.md` (preserved).

## Files changed
- `reservation/reservation.repository.js` — synchronous all-or-nothing mock cancellation with
  pre-image capture and rollback. **The PostgreSQL branch is untouched.**
- `reservation/reservation.repository.mock-cancel-atomic.test.js` (new) — focused tests against the
  real repository and real writable adapter.
- `reservation.repository.occupied-nights.test.js` + `test-support/occupied-nights-tz-fixture.mjs` —
  fixture seeds only, no assertion changed (see *Existing-suite fixtures*).

## Table names, as observed
The reservation table key is the adapter's **own** `entityName`, not a literal:
`store.get(adapter.entityName)` → `reservation` for `InMemoryRepositoryAdapter`
(`tests/capability/capability.mock.repositories.js`), `reservations` for the repository test double
(`reservation.repository.test-support.mjs:182,303`). The other two keys are literals read from the
repository: `'availability'`, `'reservation_lines'`. No schema was assumed.

## Two adapter behaviours, kept distinct
1. **Writable Map adapter** (`InMemoryRepositoryAdapter`) — a static `store` of `Map`s the repository
   already reads directly. This is what the atomic section operates on. Its `create`/`update`
   persist, so an authoritative stored reservation row normally exists.
2. **Store-less mock adapter** (production `adapters/mock/mock.repository.adapter.js`) — a no-op
   placeholder with no `store`. All three lookups yield `null`, so no stored reservation exists and
   the operation returns `null` before any work. Nothing is ever released, exactly as before.

## Production changes
`cancelReservationWithRelease`'s non-PostgreSQL branch calls `#commitMockCancellationSync`, which calls
no async function and contains no `await`.

**Tenant, per the real `_buildQuery`** (base.repository.js:59-67):
```js
if (tenant && typeof tenant === 'string') q = { ...q, tenantId: tenant }
else if (tenant && typeof tenant === 'object' && tenant.id) q = { ...q, tenantId: tenant.id }
if (this.constructor.softDeletable && !q._includeDeleted) q = { ...q, deletedAt: null }
```
The context tenant is spread **over** the caller's query, so it **overrides** a supplied `tenantId` and
adds `deletedAt: null`. `_enforceContext()` is **not** equivalent and is not relied on — it only asserts
a context exists and compares no tenant (base.repository.js:55-57). The predicate is written out
explicitly, and a supplied tenant disagreeing with the context tenant is **refused**, not silently
replaced.

**Ordering:** resolve tenant → refuse disagreement → locate stored reservation (`{id, tenantId,
deletedAt: null}`) → return `null` if absent → select unreleased lines → verify line tenant and
`targetId` → resolve records (policy unchanged) → aggregate capacity → prepare → publish → rollback on
write failure. Absent-`availability`-table refusal, pre-images for reservation/every capacity row/every
line, `releasedAt` published last, rollback in reverse via module-captured `Map.prototype.set`.

## Notification is NOT covered by rollback
```js
// base.repository.js:79-81
_emit(event, data) { this.#context?.eventBus?.emit(event, { entityName: this.constructor.entityName, ...data, timestamp: Date.now() }) }
```
`_emit` is synchronous and invoked **outside** the rollback section, so a subscriber that throws
**rejects the caller after the stores are committed**. Asserted as real behaviour, not claimed away:
rollback restores **store-write failures only**. This preserves the prior contract — before this change
`_releaseMockCapacity` ran first and `this.update(...)` then emitted from inside `BaseRepository.update`,
so a throwing subscriber already rejected the caller with capacity mutated and the row written.
Swallowing listener errors, or rolling committed stores back because a listener failed, would be new
policy; neither is done.

## Intentional refusals added (mock path only)
1. **Missing capacity row** — previously `continue`d, skipping the decrement while still marking the
   line released. Now throws before any mutation.
2. **Absent availability table with occupied dates** — the whole capacity check sat inside
   `if (availStore)`, so with the table absent the check was skipped entirely and recorded consumption
   was still marked released. Now refused. A plan with **no** dates — a valid non-DATE_RANGE line,
   not-applicable — is scoped separately and still succeeds. This is distinct from a case C line (a
   record present but invalid), which aborts before any mutation.
3. **Aggregate shortfall on a shared row** — each line previously subtracted against the row it had
   just written and clamped at zero, so two lines under-released while both were marked released. Now
   aggregated per row and refused.
4. **No authoritative stored reservation** — ownership was previously resolved from the **caller
   payload** when no stored row matched, so lines and capacity could be released for a reservation that
   did not exist or belonged to someone else. The payload is no longer a fallback; a missing,
   soft-deleted or foreign-owned reservation returns `null` **before any release work**.
5. **Supplied tenant ≠ context tenant** — `_buildQuery` discards the caller's tenant; now refused.
6. **Line tenant mismatch** and **line `targetId` ≠ stored reservation `accommodationId`** — refused
   without choosing a target.

Cases 4-6 are refusals that were previously silent or absent. No existing test relied on any of them.

## Existing-suite fixtures
The real adapter persists on create; the `MockReservationAdapter` in test-support is a stub whose
`create`/`update` return copies **without writing**. Existing tests therefore ran with **no** stored
reservation row. Three fixture seeds were added (`mockRepo()`, the timezone-transfer test, the
timezone fixture) to match what the runtime adapter would have left behind. **No assertion, expectation
or test name was changed, weakened or skipped.**

## Tests — exact results
`reservation.repository.mock-cancel-atomic.test.js` — **26 passed, 0 failed**: success · no in-place
mutation · repeated cancel byte-identical · no-line reservation still cancelled · supplied≠context
tenant refused with the caller's own capacity rows seeded · agreement still succeeds · missing
reservation → `null` · soft-deleted reservation → `null` · foreign-owned reservation → `null` · target
mismatch · line tenant mismatch · two lines aggregated · aggregate shortfall · missing capacity row ·
**absent** availability table refused (uses `store.delete`, not an empty `Map`) · non-DATE_RANGE with an
absent table still published · three injected synchronous `set` failures each leaving all three stores
byte-identical · hostile `set` unable to strand a partial release · throwing subscriber leaves the
commit intact · non-throwing subscriber emits one event · legacy and non-DATE_RANGE policy preserved.

`reservation.repository.occupied-nights.test.js` — **101 passed, 0 failed**, pg fail-closed boundary
intact. Commands:
`node capabilities/persistence/repositories/reservation/reservation.repository.mock-cancel-atomic.test.js`
and `node capabilities/persistence/repositories/reservation/reservation.repository.occupied-nights.test.js`.

## Limitations
- Single-process, turn-bounded. No crash durability, no cross-process isolation, not a DB transaction.
- Rollback covers store-write failures only; a throwing event subscriber does not restore (above).
- The `AggregateError` incomplete-rollback branch is **unreachable through the supported injection
  surface** and no test claims to reach it. It is a defensive net.
- Pre-images are shallow copies; the snapshot is the state restored to.
- `reservation.manager.js:329` still ignores a falsy result, so a `null` cancellation resolves
  silently. Unchanged and out of scope.
- Manager routing, business release, expiration, recovery and legacy/non-DATE_RANGE policy untouched.

## Git state
```
 M capabilities/persistence/repositories/reservation/reservation.repository.js
 M capabilities/persistence/repositories/reservation/reservation.repository.occupied-nights.test.js
 M capabilities/persistence/repositories/reservation/test-support/occupied-nights-tz-fixture.mjs
?? capabilities/persistence/repositories/reservation/reservation.repository.mock-cancel-atomic.test.js
?? docs/ai/BOOKING_MOCK_CANCEL_ATOMIC_1_REPORT.md
?? docs/ai/BOOKING_RELEASE_READINESS_1_REPORT.md   (pre-existing, preserved)
```
HEAD `392d2d3e7f1ce2a62e1504c6eac6487fdbfedf80`, branch `booking-pricing-1a`, staging empty. No commit,
push, staging, deployment, dependency change or database access.
