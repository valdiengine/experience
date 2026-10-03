# BOOKING-OCCUPIED-NIGHTS-1B — Implementation Report

**Status:** IMPLEMENTED LOCALLY / NOT COMMITTED / NOT DEPLOYED
**Worktree:** `C:\Users\casa\Documents\booking-pricing-1a`
**Branch:** `booking-pricing-1a`
**Baseline HEAD:** `39bd75979052697d484ffda1146d263f5c732a07` (unchanged; nothing staged)
**Runtime:** Node `v24.18.1`

This slice makes a new `DATE_RANGE` reservation line consume availability using the
UTC occupied-night contract from 1A, persist a server-owned record of exactly what was
consumed, and release exactly those recorded dates later. The record is the mechanism
that removes the dependency on the timezone of the process that happened to handle the
request.

---

## 1. Scope and files

Modified production files (3):

| File | Change |
| --- | --- |
| `capabilities/availability/availability.capability.js` | Narrow public surface: `expandOccupiedNights(input)`, `occupiedNightsExpansionVersion`, `occupiedNightsMaxNightsDefault` |
| `capabilities/availability/availability.errors.js` | `AvailabilityConsumptionRecordError` (code `INVALID_CONSUMPTION_RECORD`, status 422) |
| `capabilities/persistence/repositories/reservation/reservation.repository.js` | Consumption, reserved record, A/B/C release dispatch, version gate, reserved-key ownership |

Added test and documentation files (6):

| File | Purpose |
| --- | --- |
| `capabilities/availability/availability.capability.occupied-nights.test.js` | Capability public-surface behaviour + 4 static wiring guards |
| `capabilities/persistence/repositories/reservation/reservation.repository.occupied-nights.test.js` | **Real `ReservationRepository` behaviour** (101 tests) |
| `capabilities/persistence/repositories/reservation/test-support/pg-fail-closed-hooks.mjs` | Node module-customization hooks: `pg` resolves to a double |
| `capabilities/persistence/repositories/reservation/test-support/reservation.repository.test-support.mjs` | Programmable SQL/client double, in-memory adapter, context builder |
| `capabilities/persistence/repositories/reservation/test-support/occupied-nights-tz-fixture.mjs` | Timezone child-process fixture (create and legacy-release) |
| `docs/ai/BOOKING_OCCUPIED_NIGHTS_1B_IMPLEMENTATION_REPORT.md` | This report |

**9 files total: 3 modified production files + 6 new files (5 test/test-support files
and this report).** `git status --porcelain` shows 7 lines because the new
`test-support/` directory is reported as a single untracked directory entry.

Not modified: `package.json`, `package-lock.json`, migration files, capability
registration or configuration, `ReservationManager` cancellation routing, inclusive
calendars, pricing, public API/UI, historical data, runtime bootstrap, CI.

No migration. `reservation_lines.metadata` already exists as JSONB.

---

## 2. The `pg` import blocker is resolved

The earlier report recorded `ERR_MODULE_NOT_FOUND` for `pg` and left repository
behaviour unvalidated. The operator installed this worktree's own dependencies:

```
npm ci --ignore-scripts --no-audit --no-fund
```

Confirmed: `pg@8.23.0` present in `node_modules`, `PACKAGE_UNCHANGED=True`,
`LOCK_UNCHANGED=True` (`git diff -- package.json package-lock.json` is empty).

`ReservationRepository` is now importable and is exercised for real. No dependency was
installed by this work, and no package or lockfile change was made.

---

## 3. The reserved record

Key: `metadata.__occupiedNights`, reserved and server-owned.

```js
{ version: 1, dates: ['2026-04-03', '2026-04-04'], quantity: 1 }
```

* The actual order in `#buildLineMetadata` is: **copy the caller's unrelated metadata,
  delete the reserved key, then assign the server-derived record when one exists.** The
  delete happens unconditionally and before the record assignment, so a caller can
  neither forge nor override the record. On a line that produces no record the key is
  simply absent — the record is never written and then removed.
* The record and its `dates` array are frozen before persistence.
* The record is serialized into the existing `INSERT INTO reservation_lines` parameter.
* Record dates are strict `YYYY-MM-DD` civil dates. Consumption is **check-in inclusive
  and check-out exclusive**: a stay `2026-04-03 → 2026-04-07` consumes four nights.
* The same derived array feeds both the capacity consumption and the record, so they
  cannot disagree.

---

## 4. The three review findings and their fixes

### Finding 1 — writer/reader version compatibility

**Was:** `#requireOccupiedNightsProvider` accepted any safe integer version, while
release only understood version 1. A provider reporting version 2 would write a line
the repository could never release.

**Fix:** `reservation.repository.js:27` declares the supported set as data
(`Object.freeze([1])`). `#requireOccupiedNightsProvider` (`:92`) now tests **exact
membership** with `SUPPORTED_CONSUMPTION_RECORD_VERSIONS.includes(version)` (`:108`)
instead of `Number.isSafeInteger`, and returns a frozen
`{ availability, version }` (`:121`). The accepted version is captured once and reused
for the record (`:194`), so the written version is exactly the one that was checked.
The error carries `configKey` and `supportedVersions`. Release validates membership the
same way (`:346`).

Rejection happens before `transaction(...)` opens and before any mock state is touched.

**Evidence:** 11 executable tests. Versions 2, 0, -1, 1.5, `'1'`, `NaN`, `Infinity`,
`null`, `true`, `{major:1}` and a missing property are each rejected with
`RepositoryConfigurationError` while the client records **zero statements — not even
`BEGIN`**. One further test proves the write/read symmetry: version 2 is refused on
create *and* refused on release, so an unreleasable line cannot be created.

**Evidence that the version is captured once.** A separate test installs a provider whose
`occupiedNightsExpansionVersion` is a **getter** returning `1` on the first read and `2` on
every read after it, then runs a real create. It asserts the getter was read **exactly
once** and that the persisted record still carries version `1`. Because a second read would
either throw as unsupported or write `2`, the test fails if the read is not captured. An
earlier version of this test was misleading: it used a constant property and counted calls
to an unrelated method, so it could not have detected a second read. It was replaced rather
than kept alongside.

### Finding 2 — reserved metadata ownership across all modes

**Was:** `#buildLineMetadata` returned caller metadata unchanged when consumption was
`null`, so a forged `__occupiedNights` survived on a non-`DATE_RANGE` line.

**Fix:** `reservation.repository.js:227` deletes the reserved key unconditionally,
before the no-record early return. The server record is assigned only when a genuine
record exists. Unrelated caller keys are preserved.

**Evidence:** executable tests on both paths.
* `DATE_RANGE` + forged `{version:99, dates:['1999-01-01'], quantity:42}` → replaced by
  the genuine record; unrelated `channel` key preserved.
* A **non-`DATE_RANGE` compatibility fixture** (using the existing `NIGHTLY` mode value)
  with a forged record → the reserved key is **absent** from the persisted metadata;
  `keepMe` and a nested object survive. The repository branches only on
  `mode !== 'DATE_RANGE'`, so this exercises the no-record path. `NIGHTLY` is used here
  purely as a stand-in for that branch; no repository evidence establishes it as a
  supported production temporal contract, and it is not claimed as one.
* No caller metadata at all on a non-`DATE_RANGE` line → `{}`, so no reserved key is
  introduced where no record exists.
* A `DATE_RANGE` line with no `mode` property is not a `DATE_RANGE` line, so it takes the
  existing non-`DATE_RANGE` path and carries no record. This is pinned as existing
  behaviour, not introduced as a contract.

On the non-record path the reserved key is now absent by construction, so a forged key
cannot be smuggled in on a line that will never be released through the record path.

### Finding 3 — release must not bypass a present record via `temporal.mode`

**Was:** both release plans computed
`...(line.temporal?.mode === 'DATE_RANGE' ? this.#resolveRecordedReleaseDates(line) : { dates: [], source: 'not-applicable' })`.
A persisted record on a line whose mode was missing or incompatible therefore skipped
validation entirely, the line was marked `released_at`, and its recorded capacity stayed
reserved forever.

**Fix:** `#resolveRecordedReleaseDates` (`:423`) inspects reserved-record presence
**before** choosing the temporal-mode branch. Presence uses `hasOwnProperty`, never
truthiness. With no record it keeps the existing mode-specific behaviour unchanged; with
a record it validates regardless of mode. Both plans now call it unconditionally
(`:710` in-memory, `:810` PostgreSQL). `#validateConsumptionRecord` (`:332`) additionally
requires that the recorded temporal bounds be a strict, real civil `DATE_RANGE` and
throws `AvailabilityConsumptionRecordError` otherwise.

**Evidence:** 12 executable cases on the PostgreSQL path — missing `temporal`, `null`
`temporal`, array `temporal`, missing mode, `NIGHTLY`, unknown mode, lowercase
`date_range`, non-strict start, non-existent civil start, missing end, non-strict end,
unparseable bounds. Each asserts the throw **and** that neither `markLineReleased` nor
`releaseCapacity` was issued, so the line is not marked released and its capacity is not
stranded. A dedicated regression test pins the bypass shape: a record with `temporal:
null` must not silently release zero dates and be marked released. Two further tests
cover the in-memory path for a malformed record and for a missing mode, both asserting
that no availability row changed and `releasedAt` stayed `null`.

Legacy behaviour for record-less lines is retained, and historical cancellation is
**not** blanket-blocked: a record-less `DATE_RANGE` line still releases through the
untouched legacy branch, and a record-less non-`DATE_RANGE` line still performs no
capacity work. Four tests cover this.

---

## 5. Release dispatch

```
A. reserved record absent      -> legacy compatibility branch, unchanged
B. record present and valid    -> the recorded dates; quantity taken from the release CAS
C. record present but invalid  -> AvailabilityConsumptionRecordError, transaction unwound
```

A case C line is never downgraded to A. Validation checks the exact supported version,
strict real civil dates, ascending/unique/consecutive ordering, a positive safe integer
quantity matching the line, and **full check-out-exclusive coverage**: the first date
must equal `startDate`, the last date plus one day must equal `endDate`. That is a
structural proof of exact `[startDate, endDate)`, so truncated, over-long, gapped,
duplicate and descending lists all fail. No date is regenerated, and today's
`maxNights` is not consulted (asserted statically, since it is an absence property).

In case B the **dates** come from the record. The **quantity** used for the decrement does
not: the record's quantity is validated against the line, and the decrement is bound from
the quantity returned by the release CAS. See "Where the release quantity actually comes
from" in section 6.

**Scope of the strict validation.** The new record validation applies to `DATE_RANGE`
consumption. A line with any other temporal mode keeps its pre-existing expansion and
quantity coercion, and an unknown mode is therefore **not** rejected at create time. 1B
does not narrow which modes are accepted; it only guarantees that a line which *carries a
record* cannot bypass validation at release.

The existing conditional capacity guard and the `released_at` compare-and-set are
preserved verbatim. Both are asserted by text so a future edit cannot quietly remove
them: `reserved_count + $1 <= inventory` on create, and
`WHERE id = $1 AND released_at IS NULL` on the release mark.

---

## 6. Repository behaviour tests

`reservation.repository.occupied-nights.test.js` imports `ReservationRepository` from its
own module and calls its real public methods (`createReservationWithLine`,
`releaseReservationLines`, `cancelReservationWithRelease`). **No implementation is copied
into the test file** and the production logic is not re-implemented to be asserted
against. Static source checks are not used as a substitute for any behaviour below.

Normal date derivation always uses the real `AvailabilityCapability`. Narrow provider
doubles appear only where a mis-wired deployment must be simulated (missing capability,
missing method, and the ten bad versions).

### How physical database access was prevented

`ReservationRepository` imports `database/connection/postgres.connection.js`, which does
`import pg from 'pg'` and destructures `const { Pool } = pg` at module load. That module
is otherwise unreachable in a test process: `transaction()` acquires a real client, and
acquiring a real client opens a real socket.

The boundary is a **Node module-customization hook**
(`test-support/pg-fail-closed-hooks.mjs`). It is registered *before* the repository module
is imported, so the repository is reached by dynamic import and never by a hoisted static
import. Every bare `pg` import then resolves to `test-double:pg` instead of the real
package. Consequences:

* The genuine `pg` driver is **never loaded**, so it cannot be constructed, cannot
  connect, and cannot open a socket. **This repository's driver path therefore cannot open
  a physical database connection.**
* **What the guarantee is not.** The hook intercepts the *bare specifier `pg`* and nothing
  else. It is **not a general network sandbox**: it does not block sockets and it does not
  stop other modules from loading. And the real `postgres.connection.js` still executes
  `createPool()`, which **does read the database configuration and does consult
  `process.env.DATABASE_URL`** while choosing connection options, before it constructs the
  double `Pool`. That read genuinely happens. What prevents a connection is that the object
  constructed is the double, so a connection string is never used to open one. This
  report does not claim that no configuration read occurs, and no configuration value,
  environment dump or credential is printed or reproduced anywhere in the suite.
* The double `Pool` will only hand back the controlled client the test installed, and it
  throws for any capability a real driver would need but a double must not simulate —
  `pool.query()` is refused outright.
* The SQL/client double is also fail-closed: an **unprogrammed statement is a hard
  error**, so a test cannot silently pass over SQL it did not intend to run.
* `assertPgIsDoubled()` positively verifies the boundary by asserting that the `pg`
  specifier resolved to the double. The claim is checked, not assumed.

No real `Pool.connect`/`query`, no socket, no application startup, no bootstrap, no
provisioning, no HTTP reservation request and no Stage access. The in-memory path needs no
SQL at all. No production connection code was refactored to make this possible; the seam
is test-only, and none was needed in this pass.

A transaction double observes callback behaviour and rollback orchestration only. It
does **not** certify PostgreSQL constraints, SQL execution, locking, isolation,
concurrency or physical rollback.

### Covered

**Creation** — consumed dates equal the dates serialized into line metadata; the record
bound into the `INSERT` has exactly the three expected keys; one-cabin quantity stays 1
for `guestCount` 1, 2, 4 and 9; generic quantity 2/3/7 stays consistent between capacity
updates and the record; forged reserved metadata overwritten; unrelated metadata
preserved; frozen in memory and safe across a **JavaScript** `JSON.stringify`/`JSON.parse`
round trip of the bound parameter; 7 invalid quantities and 9 invalid bounds rejected
before any statement; missing capability and missing method rejected with their
`configKey`; the full version matrix.

**Release** — recorded dates drive exactly the intended decrements, with the tenant and
target bound per statement; the recorded quantity is used verbatim rather than defaulted;
19 invalid record classes rejected before any mutation (null, array, string, number,
missing/zero/string version, non-array/empty dates, non-date entries, duplicates, gaps,
descending, truncated, over-long, mismatched/zero/fractional quantity); full coverage
required; 12 incompatible-temporal cases; present invalid records never enter the legacy
path; absent records retain the legacy arithmetic; a repeated release and a zero-row
compare-and-set never decrement twice; a later malformed line leaves every earlier line
unreleased; an invalid record rolls back the reservation status update.

**Where the release quantity actually comes from.** These are two distinct things and the
report previously blurred them:

* The recorded `record.quantity` is **validated** against the selected line's quantity —
  `#validateConsumptionRecord` requires `Number(line?.quantity) === quantity`
  (`reservation.repository.js:388-390`). A mismatch is a case C error.
* The decrement parameter is **not** read from metadata. The release CAS is
  `UPDATE reservation_lines … RETURNING quantity`, and the loop uses
  `const quantity = releasedResult.rows[0].quantity` (`reservation.repository.js:831`) —
  i.e. the quantity returned by the database row, then bound as `$1` into the
  `reserved_count - $1` capacity update (`reservation.repository.js:834-848`).

So the metadata quantity is an assertion about consistency, not the source of the
decrement.

**Failure and rollback orchestration** — a create failure after capacity consumption
issues `ROLLBACK` and no `COMMIT`, with the client released; a zero-row capacity guard
throws `AvailabilityConflictError` and rolls back before the reservation insert; a
release failure after a release mark issues `ROLLBACK` and no `COMMIT`; a no-op
cancellation commits.

**In-memory path** — records and consumes; strips a forged reserved key; validates a
malformed record and a missing mode **before any store mutation**; rejects an unsupported
version and an invalid quantity before consuming anything; releases the recorded dates
and does not decrement on a repeated cancel; keeps the legacy branch for a record-less
line.

### What the transaction double does and does not prove

The `ROLLBACK` assertions verify that the **real** `postgres.connection.js`
`transaction()` issued `ROLLBACK` and withheld `COMMIT` when the repository's callback
threw, and that the repository ordered its statements so no mutation preceded validation.
That is orchestration. It is **not** evidence that a PostgreSQL server unwound anything.

The metadata round trip exercised by these tests is a **JavaScript** one:
`JSON.stringify` on the bound parameter, then `JSON.parse` in the test. It proves the
record survives JS serialization and that the parameter is the expected text. It is not a
`jsonb` column round trip, because no column is ever involved — the parameter goes to a
client double, not to a server.

Physical rollback, constraint enforcement, real `jsonb` round trips and column typing,
row-level locking, transaction isolation and cross-process concurrency remain
uncertified — they cannot be observed without a real database, which is out of scope here.

---

## 7. Timezone evidence

`TZ` is set before each child process starts, because in-process mutation of
`process.env.TZ` is unreliable on Windows. The fixture performs a real create through
the real repository and the real capability, and prints the record in its **serialized**
form. Zones are confirmed distinct: January/July offsets are `0/0` (UTC), `180/240`
(America/Santiago) and `-660/-630` (Australia/Lord_Howe).

Three windows were used, covering both DST directions in both DST zones:
`2026-04-03+4` (DST end), `2026-09-04+4` (Santiago DST start),
`2026-10-02+4` (Lord Howe DST start).

| Zone | Window | Crosses offset change | Offsets | Consumed = recorded |
| --- | --- | --- | --- | --- |
| UTC | 2026-04-03+4 | false | 0/0 | 04-03,04-04,04-05,04-06 |
| UTC | 2026-09-04+4 | false | 0/0 | 09-04,09-05,09-06,09-07 |
| UTC | 2026-10-02+4 | false | 0/0 | 10-02,10-03,10-04,10-05 |
| America/Santiago | 2026-04-03+4 | **true** | 180/240 | 04-03,04-04,04-05,04-06 |
| America/Santiago | 2026-09-04+4 | **true** | 240/180 | 09-04,09-05,09-06,09-07 |
| America/Santiago | 2026-10-02+4 | false | 180/180 | 10-02,10-03,10-04,10-05 |
| Australia/Lord_Howe | 2026-04-03+4 | **true** | -660/-630 | 04-03,04-04,04-05,04-06 |
| Australia/Lord_Howe | 2026-09-04+4 | false | -630/-630 | 09-04,09-05,09-06,09-07 |
| Australia/Lord_Howe | 2026-10-02+4 | **true** | -630/-660 | 10-02,10-03,10-04,10-05 |

New-line consumption and the recorded dates are identical in all nine combinations, and
quantity stays 1 while the reservation carries `guestCount: 4`.

**What the UTC rows do and do not show.** UTC is the **control**, not a failure case. It
has no offset change at all, which is precisely why it is the least discriminating zone:
the pre-existing local-time arithmetic *generally agrees* in UTC, so the UTC rows show
that the record path is exact where the old algorithm already agreed. They are **not**
evidence that UTC would break under local-time arithmetic. The zones that expose the
offset-transition failures are the two DST zones, which is exactly where the legacy
results below diverge.

**Cross-zone release.** The serialized record produced by a create in one zone is
transferred into another process, where the release runs under that process's ambient
zone. What was run is: **all 9 source records — 3 source zones × 3 windows — were
released in a single ambient destination zone.** Every one of those releases freed exactly
the nights recorded in its source zone, and every consumed night was freed.

This is **not** a full source/destination matrix. Only one destination zone was used for
the transfer run, and for the three records whose source zone equals the destination zone
the transfer is a same-zone case, which is a weaker test than a genuine cross-zone
release. A complete matrix would release each of the 9 records in each of the 3
destination zones (27 transfers); that was not run, so no claim is made about
source/destination combinations beyond the one destination actually exercised. No running
process's timezone is ever changed — only separate child processes are started with
different `TZ` values.

**Legacy branch, for contrast.** The same 4-night stay with a record-less line releases
**4 nights in UTC but only 3 in America/Santiago and 3 in Australia/Lord_Howe**. The
legacy branch is preserved byte-for-byte, and this is direct evidence that it is
timezone-dependent and therefore not evidence that historical release is correct.

---

## 8. Test results

| Command | Result | Exit |
| --- | --- | --- |
| `node capabilities/persistence/repositories/reservation/reservation.repository.occupied-nights.test.js` | 101 passed, 0 failed | 0 |
| `node capabilities/availability/availability.capability.occupied-nights.test.js` | 17 passed, 0 failed | 0 |
| `node capabilities/availability/availability.occupied-nights.test.js` (1A helper) | 36 passed, 0 failed | 0 |
| `node capabilities/availability/availability.manager.occupied-nights.test.js` (1A manager) | 15 passed, 0 failed | 0 |
| `node capabilities/pricing/pricing.test.js` (`TZ=UTC`) | 155 passed, 0 failed | 0 |
| `node capabilities/pricing/pricing.test.js` (`TZ=America/Santiago`) | 155 passed, 0 failed | 0 |

**Behavioural tests vs static source checks.** Of the 17 capability tests, 13 are
executable behavioural tests of the capability's public surface (including five timezone
subprocesses) and **4 are static source-text checks**, labelled `[static text]` in their
names and in the output. Those four are limited to properties runtime behaviour cannot
observe: absence of a sibling import of the occupied-night helper, retention of the
`AvailabilityCalendar` import for the legacy branch, absence of any `maxNights`
dependency inside the record validator, and the ordering of the delete relative to the
no-record return and the server assignment inside the metadata builder. They inspect text
and prove nothing about runtime.

Three static checks present in the earlier draft — the legacy/recorded/invalid dispatch
order, the structural coverage checks, and reserved-key assignment order — were **removed**
once the real repository tests covered them behaviourally. They were brittle positional
regexes duplicating real coverage, and keeping them would have created two places to
update for one behaviour change.

---

## 9. Transaction budget (corrected)

An earlier draft of this report stated "2N updates in one transaction". That was wrong.
The two sets of capacity updates happen in **separate transactions**: create has already
committed before release begins, so a single transaction never carries both sets. Counting
`BEGIN`/`COMMIT` as statements would also inflate the figure, so they are excluded below
and listed separately.

**Successful single-line create** — N = consumed nights:

| Statement | Count |
| --- | --- |
| Conditional `UPDATE availability` (one per consumed date) | N |
| `INSERT INTO reservations` | 1 |
| `INSERT INTO reservation_lines` | 1 |
| **Total, excluding `BEGIN`/`COMMIT`** | **N + 2** |

**Cancellation** — the statements are not a single per-night pattern, so they are listed
by role. For L lines releasing D dates in total:

| Statement | Count | Scope |
| --- | --- | --- |
| `UPDATE reservations` (reservation status update) | 1 | once per cancellation |
| `SELECT rl.* FROM reservation_lines …` (line select) | 1 | once per cancellation |
| `UPDATE reservation_lines SET released_at … RETURNING quantity` (release CAS) | L | **once per line, not per night** |
| `UPDATE availability SET reserved_count = reserved_count - $1` | D | once per released date |
| **Total, excluding `BEGIN`/`COMMIT`** | **2 + L + D** | |

For a single line of N nights that is **N + 3**. A previous draft of this report claimed
**2N + 1**, which is not supported by the code: it treated the per-line release CAS as
per-night and omitted the line `SELECT`. `BEGIN` and `COMMIT` add 2 more statements to
each transaction.

At the 3660-night technical ceiling this is roughly 3662 statements on create and, for a
one-line 3660-night cancellation, 3663 on release — a plausible but **unmeasured**
per-transaction cost. This remains a **technical expansion ceiling, not a commercial stay
limit**, and it is not a certified transaction budget: no real timing measurement was
taken. An operational maximum should be agreed before deployment.

---

## 10. Deployment gate and remaining limitations

**Historical release remains a deployment gate.** The legacy branch is deliberately
untouched, and section 7 demonstrates it is timezone-dependent: for the same 4-night stay
it releases 4 nights in UTC and 3 in Santiago and Lord Howe. That branch does not resolve
the create-time timezone, code version or timezone-rule version of any existing row. It
is **not** evidence that cancelling real historical reservations is correct. That risk
must be addressed or explicitly accepted before deployment.

**In-memory adapter limitations (disclosed, not fixed).**

* The in-memory adapter has **no transaction**. If a create throws after capacity has
  been consumed, the capacity change is not rolled back. This is pre-existing and is not
  addressed by 1B.
* Validation ordering is improved and tested — every candidate line is validated before
  the first store mutation, so a malformed record aborts while the store is untouched.
  That is what the tests certify. It is **not** atomicity. A failure *after* the
  mutation loop, such as the reservation write itself failing, can still leave partial
  state.
* Cancellation routing through `ReservationManager` is out of scope and was not changed.
  End-to-end mock cancellation remains uncertified.

**Physical PostgreSQL remains unvalidated.** No database, connection or network access
occurred. Still unverified: SQL parsing and planning, the real conditional-`UPDATE`
behaviour under row-level locking, constraint enforcement, real `jsonb` round trips and
column typing, transaction isolation, cross-process concurrency on the same
accommodation/date, and physical rollback. The transaction double covers orchestration
only, as stated in section 6.

**Also unverified:** the new `AvailabilityConsumptionRecordError` mapping through the
public HTTP error handler (out of scope), and the agreed operational transaction
maximum.

**No historical data was touched.** No backfill, no normalization, no synthetic records,
no inference of a record from an aggregate count, no current-timezone agreement gate, no
approval UI, no legacy deduplication. No pricing, configuration, CI, public API/UI,
inclusive-calendar or bootstrap change. Pricing remains inactive.

---

## 11. Local state

* `HEAD` is `39bd75979052697d484ffda1146d263f5c732a07`, unchanged.
* Nothing is staged. `git diff --cached --check` and `git diff --check` both exit 0.
* 9 files across 7 `git status --porcelain` lines: 3 modified production files,
  1 new capability test, 1 new repository test, 3 new test-support files, 1 new report.
* `package.json` and `package-lock.json` unmodified.
* **Final-review pass changed no production executable behaviour.** It touched the
  version-capture test fixture, test comments and this report. `reservation.repository.js`
  changed only in two comments (the invalid-mode claim and a report path that used
  hyphens where the filename uses underscores); no statement, branch or bound parameter
  was altered.
* The three modified production files are uniformly LF, matching the rest of the
  working tree under `core.autocrlf=true`; the diff is 43, 8 and 522 changed lines
  with no whole-file line-ending churn. New files have no trailing whitespace, no CR
  bytes and no BOM, and are valid UTF-8.
* No staging, commit, push, merge, deployment or Passenger restart was performed.

**IMPLEMENTED LOCALLY / NOT COMMITTED / NOT DEPLOYED**
