# BOOKING-LEGACY-RELEASE-GATE-1 - Refuse Unresolved Historical Consumption

Implements the D1 decision recorded in `docs/ai/BOOKING_RELEASE_READINESS_1_REPORT.md`: automatic
cancellation and release of a historical `DATE_RANGE` line that carries no versioned
occupied-night record is **refused** on both adapter paths. The write ordering
and rollback boundary are described below.

Where the refusal lands differs by adapter, and the two cases must not be conflated:

- **Writable Map.** The refusal happens during planning, before publication. No stored row is
  written at all, so there is nothing to roll back or restore.
- **PostgreSQL cancellation.** The reservation `UPDATE` is issued first, inside the enclosing
  `transaction()` and before any line is read. The refusal precedes every `released_at` and
  capacity write and is unwound by `ROLLBACK`. It is therefore not accurate to describe this path
  as making no writes; it is accurate to say the status update is never committed.

Physical PostgreSQL rollback is not demonstrated by these tests and remains uncertified; see
section 7.

Baseline: branch `booking-pricing-1a`, HEAD `a15cd1d541e771c053c018beffea0761fa90c6fb`, clean
worktree and empty index.

## 1. The decision, and what it replaces

The former policy had three branches at `#resolveRecordedReleaseDates`. Record absence with
`temporal.mode === 'DATE_RANGE'` fell through to `#legacyExpandDateRange` and returned
`source: 'legacy'`: the consumed dates were re-derived from the stored `temporal` bounds by
local-time iteration.

That arithmetic is why the record exists. `BOOKING-OCCUPIED-NIGHTS-1B` section 7 measured it
releasing **4 nights in UTC but only 3 in `America/Santiago` and `Australia/Lord_Howe`** for the same
4-night stay. The stored bounds record neither the create-time timezone, nor the code version, nor the
timezone-rule version, so the dates they imply are not evidence of what was consumed. The branch was a
compatibility freeze, never a correctness claim.

**Now:** record absence plus `DATE_RANGE` throws. Nothing is inferred from bounds, on any path.

## 2. Implementation

`capabilities/persistence/repositories/reservation/reservation.repository.js`:

- `#resolveRecordedReleaseDates(line, reservationId)` is the single shared resolution boundary used
  by both the PostgreSQL release (`releaseReservationLines`) and the writable Map release
  (`#commitMockCancellationSync`), so one rule covers both adapters.
- Record absent and `mode !== 'DATE_RANGE'` -> `{ dates: [], source: 'not-applicable' }`, unchanged.
- Record absent and `mode === 'DATE_RANGE'` -> `throw new AvailabilityConsumptionRecordError(...)`.
- Record present -> `#validateConsumptionRecord`, `source: 'recorded'`, unchanged.
- `reservationId` is passed by both callers for diagnosis only; it never participates in deriving
  dates. The `details` carry `reservationId`, `lineId` and `reason`, and **never** the metadata
  object.
- `#legacyExpandDateRange` was removed after a whole-tree search confirmed its only caller was the
  legacy release branch. `#expandDateRange` and `#legacyLocalExpandRange` are retained unchanged
  because `#prepareNewLineConsumption` still needs them for a non-`DATE_RANGE` line at creation.

The throw happens while the per-line plan is built, **before** the mutation loop of either adapter:
inside the caller's `transaction()` on PostgreSQL, inside the single synchronous section on the Map
path. It is deliberately not caught in the repository. Manager routing, repo-less cache cancellation,
creation and pricing arithmetic, calendar behaviour, SQL, schema and transaction infrastructure are
untouched.

## 3. Scope limits, deliberate

- No backfill, no record synthesis, no historical-data mutation. Legacy rows stay exactly as they
  are: unreleased and still identifiable by their missing record.
- No cancel-without-release feature in this milestone. That is the approved scope of this slice,
  not an unresolved decision: a non-releasing cancellation affordance was considered and excluded,
  so refused lines simply cannot complete through the normal path. A future proposal is possible
  but would be separate work under its own review, and it does not block or reopen this slice.
- The refusal does not broaden to unsupported temporal modes: a record-less non-`DATE_RANGE` line
  keeps its not-applicable behaviour, including being marked released.
- A reservation with **no lines at all** still cancels. Only a `DATE_RANGE` line without a record is
  refused. Deployment, PostgreSQL certification and expiration/recovery readiness stay open.

## 4. Changed expectations

Five assertions deliberately encoded the old policy. They were changed, not deleted: (1) occupied-nights
PG with no record, (2) the same with unrelated metadata, (3) historical cancellation described as "not
blanket-blocked", (4) the in-memory path asserted the "legacy branch preserved", (5) mock-cancel-atomic
asserted release to `reservedCount` 0 with the line marked released. Each now asserts the typed
refusal, with no mark, no capacity call and no metadata dump.

The timezone fixture's `legacy-release` operation became `record-less-refusal`. It previously
asserted the branch was reachable and its output zone-dependent -- evidence *for* the danger. It now
asserts the refusal is identical in every zone, which is the property that replaced it: the refusal
precedes any date derivation, so no arithmetic runs at all.

## 5. Coverage added

- Record-less `DATE_RANGE` cancellation on the Map path: typed error, exact `reason`, `lineId` and
  `reservationId` present, no metadata dump, status/capacity/`releasedAt` unchanged.
- The same on the PostgreSQL path: status update issued first, then the refusal, zero
  `markLineReleased`, zero `releaseCapacity`, `ROLLBACK` issued, `COMMIT` never.
- Mixed reservation, **valid recorded line first and record-less line second**, on both paths: the
  valid line resolves first, yet nothing is released -- not even for the valid line.
- Cancellation with no lines still commits as a no-op.
- Manager propagation through the real repository on the real writable adapter, record-less and mixed:
  the refusal propagates out of `cancelReservation`, the cache does not read cancelled, no cancelled
  event, no notification, and stored status, capacity and every `releasedAt` unchanged.
- Retained unchanged: valid versioned records releasing normally, malformed records rejected,
  non-`DATE_RANGE` not-applicable behaviour, and the not-applicable divergence analysis.

## 6. Test results

Only the three directly affected suites were run. No other suite was executed.

| Suite | Result |
| --- | --- |
| `reservation.repository.occupied-nights.test.js` | `total: 104  passed: 104  failed: 0`, exit `0` |
| `reservation.repository.mock-cancel-atomic.test.js` | `total: 27   passed: 27   failed: 0`, exit `0` |
| `reservation.manager.cancel-routing.test.js` | `total: 28   passed: 28   failed: 0`, exit `0` |

## 7. What these results do not prove

- **No PostgreSQL was involved.** The `pg` driver is the fail-closed double, and its "transaction"
  assertions record *orchestration* -- that `ROLLBACK` was requested and `COMMIT` was not. That a real
  database discards the status update is PostgreSQL's guarantee, not something a recording client can
  demonstrate. Physical transaction semantics remain uncertified, as before.
- The Map-path store assertions are real state, compared byte-for-byte with pre-call snapshots, but
  that mechanism is in-process only: no crash durability, no cross-process guarantee.
- No historical row was inspected, so the number of reservations actually affected is unknown. The
  4-vs-3 measurement is quoted from `BOOKING-OCCUPIED-NIGHTS-1B` section 7, not re-measured here.

## 8. Files changed

| File | Change |
| --- | --- |
| `reservation.repository.js` | refusal at the shared resolver; `reservationId` plumbed for diagnosis; `#legacyExpandDateRange` removed; comments corrected |
| `reservation.repository.occupied-nights.test.js` | five expectations changed; PostgreSQL full-cancellation and mixed-line refusal tests; timezone test rewritten |
| `reservation.repository.mock-cancel-atomic.test.js` | writable-Map expectation changed; refusal-snapshot and mixed-line tests |
| `test-support/occupied-nights-tz-fixture.mjs` | `legacy-release` -> `record-less-refusal`, reporting the refusal and retained capacity |
| `reservation.manager.cancel-routing.test.js` | two manager-propagation tests using the real repository |
| `BOOKING_RELEASE_READINESS_1_REPORT.md` | only the directly contradicted claims marked superseded: header note, section 1 legacy bullet and recommendation, section 5 recommendation, implementation boundary 3, working recommendation 1, D1 |
| `BOOKING_LEGACY_RELEASE_GATE_1_REPORT.md` | this report |

Historical slice reports (`BOOKING_OCCUPIED_NIGHTS_1B`, `BOOKING_CALENDAR_UTC_1`,
`BOOKING_CANCEL_ROUTING_1`, `BOOKING_MOCK_CANCEL_ATOMIC_1`) were **not** rewritten. They describe what
was true at their own HEAD; their pending-policy statements are superseded by this report rather than
retroactively edited.

## 9. Final Git state

Branch `booking-pricing-1a`, HEAD `a15cd1d541e771c053c018beffea0761fa90c6fb` (unchanged), staging
empty, `git diff --check` clean. No commit, push, staging, deployment, dependency change, database
access or historical-row mutation was performed.