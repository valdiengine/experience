# BOOKING-OCCUPIED-NIGHTS-1A - Implementation Report

**Status:** implemented locally, tests green, **not committed, not deployed**
**Worktree:** `C:\Users\casa\Documents\booking-pricing-1a`
**Branch:** `booking-pricing-1a`
**Baseline HEAD:** `bc939f846ee77be76dfddcd0c3469a3e426c6459` (unchanged by this work)

> This slice adds a pure UTC occupied-night helper and wires it into the availability
> read path. It does not connect persistence, does not activate pricing, and does not
> establish any historical release policy.

---

## 1. Baseline and exact changed-file list

Baseline verified before any edit:

| Item | Value |
| --- | --- |
| Worktree | `C:\Users\casa\Documents\booking-pricing-1a` |
| Branch | `booking-pricing-1a` |
| HEAD | `bc939f846ee77be76dfddcd0c3469a3e426c6459` |
| `git status --porcelain` at baseline | clean, 0 lines |
| Node | `v24.18.1` |
| `node_modules` | absent, and deliberately not installed |

Changed files at the end of this slice, exactly 6:

| File | State | Lines | Purpose |
| --- | --- | --- | --- |
| `capabilities/availability/availability.occupied-nights.js` | new | 189 | Pure UTC checkout-exclusive night expansion |
| `capabilities/availability/availability.occupied-nights.test.js` | new | 507 | 36 focused tests for the helper |
| `capabilities/availability/availability.manager.occupied-nights.test.js` | new | 350 | 15 focused tests for the real read path |
| `capabilities/availability/availability.errors.js` | modified | +8 | `AvailabilityDateRangeError` |
| `capabilities/availability/availability.manager.js` | modified | +2 / -3 | Read-path derivation only |
| `docs/ai/BOOKING_OCCUPIED_NIGHTS_1_REPORT.md` | new | this file | This report |

Final worktree status:

```
 M capabilities/availability/availability.errors.js
 M capabilities/availability/availability.manager.js
?? capabilities/availability/availability.manager.occupied-nights.test.js
?? capabilities/availability/availability.occupied-nights.js
?? capabilities/availability/availability.occupied-nights.test.js
?? docs/ai/BOOKING_OCCUPIED_NIGHTS_1_REPORT.md
```

Tracked diff stat: `2 files changed, 10 insertions(+), 3 deletions(-)`.

Staged files: none. No new commits created by this slice. Pushed: no. Merged: no. Deployed: no.

Deliberately **not** touched: `capabilities/persistence/repositories/reservation/reservation.repository.js`
(the persistence consumption, release and capacity-gate implementation), `availability.calendar.js`,
`availability.validation.js`, `reservation.validation.js`, `config.js`, `config.json`, CI,
capability bootstrap, runtime startup, any historical reservation record, and every other worktree.

---

## 2. What was built and why

### 2.1 The defect

`AvailabilityManager.checkAvailability` derived the occupied nights of a stay by asking
`AvailabilityCalendar.expandRange` for an **inclusive** `[checkIn, checkout - 1]` range, and it
computed that `checkout - 1` with local-time arithmetic:

```js
const endDate = new Date(checkOut)
endDate.setDate(endDate.getDate() - 1)
const dates = AvailabilityCalendar.expandRange(checkIn, endDate.toISOString().split('T')[0])
```

Two independent timezone faults follow, and they fail in different places:

1. **Checkout-minus-one wrapper failure.** `new Date('2026-04-05')` is parsed as UTC midnight, then
   `setDate` applies the *local* calendar day, and `toISOString()` converts back to UTC. In
   `America/Santiago` this shifts the result and yields 1 night where 2 are required.
2. **Inclusive loop failure.** `expandRange` increments the date one local day at a time while
   formatting in UTC. In `Australia/Lord_Howe` the 30-minute offset change on 2026-10-04 makes one
   civil-day step 23.5 hours, so the sequence produces a duplicate UTC date and the expected night
   count is wrong.

Corrected factual note: Lord Howe local `2026-10-04 10:30` **does** exist. The failure is the
duplicate UTC date caused by the 23.5-hour step, not a nonexistent local time.

Scope of the fault, stated precisely: a fixed non-zero offset is **not** by itself a cause. With a
constant offset the local civil day still maps one-to-one onto the UTC day and the legacy
arithmetic is correct. The defect is the mixing of a local-time step with UTC parsing and UTC
formatting, which diverges across the offset transitions relevant to the evaluated window. The two
cases above are the transitions that were actually observed to fail.

### 2.2 The replacement

`expandOccupiedNights({ startDate, endDate, maxNights })` computes occupancy directly in UTC and
never performs a local-time step.

- Strict format gate: `/^\d{4}-\d{2}-\d{2}$/`. Non-padded fields, whitespace, timestamps, slash or
  basic `YYYYMMDD` forms are all rejected before any date object is built.
- Supported years are `0001` to `9999`. `0000` and five-digit years are rejected. The parse uses
  `new Date(0)` plus `setUTCFullYear(year, month - 1, day)`, so year `1` stays year `1`.
  `Date.UTC` is deliberately avoided because it remaps years `0-99` into the 1900s.
- Each bound is validated by a UTC component round trip, so `2026-02-30` and `2026-13-01` are
  rejected instead of silently rolling over.
- A range of at least one night is required. Equal bounds and reversed bounds are rejected.
- The night count is computed in milliseconds and the bound is enforced **before** any array is
  allocated or any loop runs.
- The default bound is 3660 nights, exported as a constant, and can be overridden per call with a
  positive safe integer.
- Returns ascending, unique, consecutive `YYYY-MM-DD` strings, check-in inclusive and checkout
  exclusive. The input object is never mutated.

### 2.3 The error

`AvailabilityDateRangeError` extends `AvailabilityError` with code `INVALID_DATE_RANGE`, HTTP
status `422`, and preserved `details`, matching the conventions already in
`availability.errors.js`.

### 2.4 The integration

Only the derivation changed inside `checkAvailability`:

```js
const dates = expandOccupiedNights({ startDate: checkIn, endDate: checkOut })
```

Properties worth stating explicitly:

- The call sits **before** the `findMany` call, so an invalid range performs no availability
  repository operation at all.
- The method signature, the response structure, the `validateDateRange` guard, and the repository
  query are all unchanged.
- `AvailabilityCalendar` is still imported and still used by the block, reserve, calendar and
  `getByTarget` paths. This slice does not change inclusive calendar semantics anywhere.
- Checkout exclusion is **preserved, not introduced**. The previous derivation already intended a
  check-out-exclusive night list via `checkout - 1`, and the new helper yields the same set on
  windows where the legacy arithmetic happened to be correct. What changes is that the boundary is
  now computed in UTC rather than through local-time arithmetic, so checkout exclusion now holds
  on the offset-transition windows too. The capacity decision continues to read only occupied
  dates, so an unavailable **checkout** date does not reject an otherwise available stay, while an
  unavailable occupied night still does.

### 2.5 A stricter contract than before, and a validator correction

`AvailabilityManager` imports `validateDateRange` from
`capabilities/availability/availability.validation.js` (imported at `availability.manager.js:10`,
defined at `availability.validation.js:54`). **That validator throws** `AvailabilityValidationError`
on a reversed range or on a string it cannot parse.

Correction to an earlier claim: a separate "no-op guard" characterisation was wrong. Two distinct
`validateDateRange` functions are exported in this codebase, and they behave differently:

| Function | Location | Behaviour |
| --- | --- | --- |
| `validateDateRange` | `capabilities/availability/availability.validation.js:54` | **Throws** `AvailabilityValidationError`. This is the one `AvailabilityManager` uses. |
| `validateDateRange` | `capabilities/reservation/reservation.validation.js:1` | **Returns** `{ valid, errors }` and throws nothing. |

The earlier no-op-guard statement confused the availability validator that actually runs on this
path with the reservation-side validator that merely returns a verdict. The guard on this path is
not a no-op, and it is unchanged by this slice.

That guard parses with `new Date(string)`, which is lenient: it accepts `2026-1-1` and year `0000`,
and only rejects strings that fail to parse at all. The new helper rejects both. The guard is
intentionally left in place and keeps its own error type for reversed bounds and unparseable
strings; the helper adds `AvailabilityDateRangeError` for the cases it catches on its own. Both are
typed 4xx availability errors, and both occur before any repository call.

---

## 3. Tests

All commands were run from `C:\Users\casa\Documents\booking-pricing-1a`. Every suite is
framework-free, matching `capabilities/pricing/pricing.test.js`. No database, no network, no
provisioning, no application bootstrap, no runtime startup, no dependency installation.

### 3.1 Commands and results

| # | Command | Result | Exit |
| --- | --- | --- | --- |
| 1 | `node capabilities/availability/availability.occupied-nights.test.js` | 36 passed, 0 failed | 0 |
| 2 | `node capabilities/availability/availability.manager.occupied-nights.test.js` | 15 passed, 0 failed | 0 |
| 3 | `$env:TZ='UTC'; node capabilities/pricing/pricing.test.js` | 155 passed, 0 failed | 0 |
| 4 | `$env:TZ='America/Santiago'; node capabilities/pricing/pricing.test.js` | 155 passed, 0 failed | 0 |
| 5 | `$env:TZ='Australia/Lord_Howe'; node capabilities/pricing/pricing.test.js` | 155 passed, 0 failed | 0 |

Total new tests: 51, all passing. The ambient `TZ` was restored to empty after each run.

### 3.2 What the helper suite covers

Export contract; check-in inclusive and checkout exclusive; ascending, unique, consecutive output;
year boundary; leap day including the 1900 century rule and the 2000 four-hundred-year rule;
year `0001` with no `Date.UTC` remapping; years `0099`, `0100`, `1900`, `2000`, `9999`; rejection of
`0000` and five-digit years; missing, `null`, `undefined`, non-object, numeric, `Date`, array and
boolean bounds; empty strings; non-padded dates; leading and trailing whitespace; timestamps and
offset timestamps; `YYYYMMDD` basic format; slash format; garbage and embedded garbage; impossible
months and days; equal bounds; reversed bounds; a guarantee that no input ever yields an empty
array; the exported default bound at exactly 3660 and one night over; overridden bounds at their
exact boundary; sixteen invalid `maxNights` values; the largest safe integer as a valid bound;
explicit `undefined` selecting the default; input immutability under `Object.freeze`; and a check
that the helper imports no DB, network, filesystem or startup surface.

### 3.3 What the manager suite covers, and why a second file exists

The first suite proves the helper is correct in isolation. That is not sufficient, because the
defect lived in a caller: a correct helper that is never used fixes nothing. The second file
therefore exercises the **real** `AvailabilityManager` to prove the substitution actually happened
and that the surrounding behaviour is intact:

- The public response keys are unchanged: `available`, `blockedDates`, `checkIn`, `checkOut`,
  `details`, `totalNights`.
- Checkout exclusion is preserved under the new derivation: an unavailable **checkout** date does
  not reject an otherwise available stay, and the checkout date does not appear among the evaluated
  nights. This is a regression guard on existing intended behaviour, not a new capability.
- An unavailable occupied night, including on the first and last occupied night, does reject the
  stay and is reported in `blockedDates`.
- The evaluated nights match `expandOccupiedNights` exactly across seven representative ranges,
  including both DST windows, a year boundary, a leap day and a 90-night range.
- The repository query is still `{ accommodationId, date: { gte: checkIn, lte: checkOut } }`, and is
  issued exactly once.
- Seven invalid ranges each throw a typed 4xx availability error and produce **zero** repository
  calls; an invalid range is never reported as available.
- A range of 5114 nights is rejected by the technical bound without a query.

It is deliberately a read-path test with a stub in-memory repository. `checkAvailability` is a
**read** path, not the authoritative public reservation POST capacity gate, and this suite does not
claim to certify persistence.

### 3.4 Timezone evidence, not a timezone assumption

In-process mutation of `process.env.TZ` is unreliable on Windows, so **no test depends on the
ambient timezone**. Each timezone case runs the real module, and for the manager suite the real
manager, in an isolated child process with `TZ` set in the child environment before the process
starts. Each child reports its effective zone and its UTC offsets, and the parent asserts them. A
child that failed to honour the requested zone cannot match the expected offsets, so a mislabeled
run fails loudly instead of passing.

Expected offsets were measured on this platform for 2026 at January 15, July 15, April 5 and
October 4, using `Date.getTimezoneOffset()` (UTC minus local, in minutes):

| Zone | Jan | Jul | Apr 5 | Oct 4 | Resolved effective zone |
| --- | --- | --- | --- | --- | --- |
| `UTC` | 0 | 0 | 0 | 0 | `UTC` |
| `America/Santiago` | 180 | 240 | 240 | 180 | `America/Santiago` |
| `Australia/Lord_Howe` | -660 | -630 | -630 | -660 | `Australia/Lord_Howe` |
| `Pacific/Kiritimati` | -840 | -840 | -840 | -840 | `Pacific/Kiritimati` |
| `Asia/Kathmandu` | -345 | -345 | -345 | -345 | `Asia/Katmandu` |

Two details are load-bearing. `Asia/Kathmandu` canonicalises to the historical spelling
`Asia/Katmandu` under ICU, so the test accepts either and asserts the effective name explicitly
rather than assuming the requested string round-trips. And the January and July offsets genuinely
differ for **two** of the five listed zones, `America/Santiago` (180 vs 240) and
`Australia/Lord_Howe` (-660 vs -630). Only those two exercise a seasonal offset change. `UTC`,
`Pacific/Kiritimati` and `Asia/Kathmandu` hold a single fixed offset across all four probes, so for
those three the assertions confirm a fixed non-zero offset and a non-Latin zone do not perturb the
result, not that a transition was handled.

Sample evidence line emitted by each passing child, in `America/Santiago`:

```
evidence: TZ=America/Santiago effective=America/Santiago offsets(jan/jul/apr5/oct4)=180/240/240/180
```

In all five zones, both suites assert the two windows the legacy arithmetic got wrong:

- `2026-04-04` to `2026-04-06` yields exactly `['2026-04-04', '2026-04-05']`
- `2026-10-03` to `2026-10-05` yields exactly `['2026-10-03', '2026-10-04']`

### 3.5 Test-run corrections worth recording

Three assertions were wrong when first written and were corrected against actual behaviour. The
implementation was not at fault in any case, but the corrections are the substance of what the
tests actually established:

1. A month-boundary case was written as `assertRejected` for a range that is legitimately valid.
2. Reversed bounds were expected to raise `AvailabilityDateRangeError`, but the pre-existing
   `validateDateRange` guard fires first and raises `AvailabilityValidationError`. The guard was
   deliberately left intact, so the test now asserts the real, preserved convention.
3. An "over the bound" fixture was assumed to be 3661 nights when it is 3654, so it was correctly
   accepted. It was replaced with `2016-01-01` to `2030-01-01`, verified to be 5114 nights, which
   the helper rejects with `details.nights = 5114` and `details.limit = 3660`.

---

## 4. `git diff --check`

```
===== git diff --check (tracked) =====
no whitespace errors
diff --check EXIT: 0
```

Note that `git diff --check` inspects tracked modifications only, so it does not cover the four
untracked new files. Those were written and executed directly.

---

## 5. Focused diff

Tracked changes, the complete set:

```diff
diff --git a/capabilities/availability/availability.errors.js b/capabilities/availability/availability.errors.js
index c986fed..6c8fc71 100644
--- a/capabilities/availability/availability.errors.js
+++ b/capabilities/availability/availability.errors.js
@@ -58,6 +58,14 @@ export class AvailabilityCalendarError extends AvailabilityError {
   }
 }

+export class AvailabilityDateRangeError extends AvailabilityError {
+  constructor(message, details = {}) {
+    super(message, { code: 'INVALID_DATE_RANGE', statusCode: 422 })
+    this.name = 'AvailabilityDateRangeError'
+    this.details = details
+  }
+}
+
 export class AvailabilityOrphanError extends AvailabilityError {
   constructor(message) {
     super(message, { code: 'ORPHAN_AVAILABILITY', statusCode: 422 })
diff --git a/capabilities/availability/availability.manager.js b/capabilities/availability/availability.manager.js
index a555d8b..6107f43 100644
--- a/capabilities/availability/availability.manager.js
+++ b/capabilities/availability/availability.manager.js
@@ -10,6 +10,7 @@ import { AvailabilityWorkflow } from './availability.workflow.js'
 import { validateCreateData, validateUpdateData, validateWindowData, validateRuleData, validateSeasonData, validateBlockData, validateDateRange } from './availability.validation.js'
 import { AVAILABILITY_PERMISSIONS } from './availability.permissions.js'
 import { AvailabilityCalendar } from './availability.calendar.js'
+import { expandOccupiedNights } from './availability.occupied-nights.js'
 import { AvailabilitySearch } from './availability.search.js'

 export class AvailabilityManager {
@@ -392,9 +393,7 @@ export class AvailabilityManager {
     await this.#checkPermission(identity, AVAILABILITY_PERMISSIONS.READ)
     validateDateRange(checkIn, checkOut)

-    const endDate = new Date(checkOut)
-    endDate.setDate(endDate.getDate() - 1)
-    const dates = AvailabilityCalendar.expandRange(checkIn, endDate.toISOString().split('T')[0])
+    const dates = expandOccupiedNights({ startDate: checkIn, endDate: checkOut })

     const records = await this.#repo?.findMany({ accommodationId, date: { gte: checkIn, lte: checkOut } }) || []
     const recordMap = {}
```

Net effect on tracked source: 10 insertions, 3 deletions, across two files. The only behavioural
change in production code is the three lines replaced by one.

---

## 6. Corrections and withdrawn claims

The following statements from the earlier investigation are **withdrawn**. They are recorded here
because they were load-bearing for the design and must not be carried forward.

1. **Subset claim withdrawn.** A finite sample of legacy dates being correct does not prove that
   all legacy dates are a subset of the correct dates. No such proof is offered.
2. **Interval containment claim withdrawn.** Staying within the requested interval does not by
   itself prevent decrementing another reservation's capacity. Interval containment is not a
   capacity-safety argument.
3. **Legacy undercount claim withdrawn.** A correct UTC expansion of legacy records can still
   undercount capacity if the original creation actually consumed fewer dates than its interval
   implies. UTC correctness of the expansion is not the same as faithfulness to what was consumed.
4. **Equal-timezone claim withdrawn.** Two operations running under equal timezone names does not
   fully define their behaviour. Code versions and timezone-rule database versions are independent
   inputs, and neither is recorded for existing rows.
5. **`Date.UTC` claim withdrawn.** `setUTCFullYear` does **not** remap years `0-99` the way
   `Date.UTC` does. The helper uses `setUTCFullYear` precisely because of this, and the year `0001`
   case is under test.
6. **Second-cancellation claim withdrawn.** A second manager cancellation is not necessarily a
   no-op. Workflow-level rejection and a repository-level compare-and-set are distinct mechanisms
   and were not separately established.
7. **Duplicate-decrement claim withdrawn.** A duplicate decrement while `reserved_count` is 3 does
   not necessarily steal two units. The attributable excess depends on what the specific line
   actually consumed, which is not recoverable from current state alone.

Two further corrections: the public availability GET read check is not the authoritative
reservation POST capacity gate, and the current process timezone does not establish the timezone in
which a historical record was created.

---

## 7. Known remaining work

Nothing below was in scope for this slice, and none of it is implemented. No remediation plan is
proposed here, and no data repair, backfill, or normalisation of existing records is recommended,
authorised, or established as safe by this work.

**Persistence consumption and release live in the reservation repository, not the availability
repository.** The implementation is
`capabilities/persistence/repositories/reservation/reservation.repository.js`. It is unchanged by
this slice. Relevant to occupied-night derivation:

- `#expandDateRange` (`reservation.repository.js:22-30`) computes `endDate = new Date(endDate)` then
  `setDate(getDate() - 1)` and passes the result to `AvailabilityCalendar.expandRange`. This is the
  same local-time checkout-minus-one pattern that was just removed from the read path, so the
  persistence consumption path still carries it.
- The capacity gate is the conditional `UPDATE availability SET reserved_count = reserved_count + $1`
  at `reservation.repository.js:70-83`, guarded by a `reserved_count + $1 <= inventory` predicate.
- The release path is `releaseReservationLines` at `reservation.repository.js:364-421`, which marks
  lines released and issues the corresponding
  `UPDATE availability SET reserved_count = reserved_count - $1` guarded by
  `reserved_count >= $1`.

Because the persistence path is untouched, stored occupancy is still derived through the inclusive,
local-time primitive. A stay's read view, now derived in UTC by this slice, and its stored
occupancy can therefore still disagree. Whether and how the persistence path is brought onto a UTC
night contract is a separate, separately approved decision; this slice establishes neither the
method nor its safety.

**The transactional POST capacity gate was inspected during the preceding discovery, but was not
changed and not tested by this implementation.** It is the conditional `UPDATE` at
`reservation.repository.js:70-83`. The discovery read it to locate the authoritative gate; this
slice did not modify it and no test in this slice exercises it. The read-path fix does not by
itself make that statement correct, and nothing here should be read as evidence about it.

**Mock cancellation routing is untouched and pending.** `#releaseMockCapacity`
(`reservation.repository.js:276-309`) is the in-memory release path used by
`cancelReservationWithRelease`; it derives `reservedCount` from current state and returns
`{ released: [], noOp: true }` when no store is present. It is distinct from the SQL
`releaseReservationLines` path above. It was neither changed nor tested here, and no claim is made
that it routes cancellation correctly or consistently with the SQL path.

**Inclusive calendar semantics are untouched.** `AvailabilityCalendar.expandRange` and its callers
are unchanged, so every other consumer of that primitive, including
`reservation.repository.js:26`, still inherits the local-time and inclusive behaviour. Correcting
that primitive is pending and out of scope; it was a deliberate scope boundary, not an oversight.

**Historical release policy is not established.** No claim is made about how records created under
the old path should be released, and no such logic exists. Deciding it would require the
create-time timezone and the actually consumed dates per line, neither of which current state
records.

**Not certified by these tests.** Real SQL behaviour at scale; the 3660-night bound as a commercial
policy or as a Postgres performance limit; the transaction window and lock order under concurrency;
the reservation repository consumption, release and capacity-gate statements; availability search
and availability repository code paths; end-to-end parity against the full capability bundle; the
reservation POST flow; and any public HTTP status mapping of the new error beyond the `422` carried
on the class.

**Test-suite integration.** These are standalone files run by node directly, matching the existing
convention. They are not yet wired into any test runner, and there is no package test script in this
worktree.

**Pricing integration is pending.** Pricing remains inactive and was not integrated with anything in
this slice. `config.js` and `config.json` were not modified, no capability was registered or seeded,
and no pricing behaviour was exercised by these tests. The three protected historical reservation IDs
`7f820bae-870f-460d-a14f-96894c97db34`, `1f6de1dc-7279-4439-b73b-5c5c6b83f562` and
`07933bcb-f125-4115-99d8-4f289f71aad7` were not read, written or migrated.

---

## 8. Final statement

**IMPLEMENTED LOCALLY / NOT COMMITTED / NOT DEPLOYED**

Implemented locally in `C:\Users\casa\Documents\booking-pricing-1a` on branch `booking-pricing-1a`,
all changes unstaged and uncommitted, with `HEAD` still at the baseline
`bc939f846ee77be76dfddcd0c3469a3e426c6459`. Nothing was pushed, merged, activated or deployed.
No database, network, dependency installation, application bootstrap or runtime startup was
involved. No other worktree was touched.

Limitations, restated: this changes the availability **read** path only. The persistence
consumption and release implementation in
`capabilities/persistence/repositories/reservation/reservation.repository.js`, the transactional
POST capacity gate at `reservation.repository.js:70-83` (inspected during the preceding discovery,
but not changed and not tested here), the mock cancellation routing at
`reservation.repository.js:276-309`, inclusive calendar semantics elsewhere, historical create-time
timezone and consumed-date reconstruction, historical release policy, any data repair or
normalisation of existing records, and pricing integration all remain pending and unimplemented. The
51 new tests are local, dependency-free and unrun by CI.
