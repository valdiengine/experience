# BOOKING-CALENDAR-UTC-1 — Implementation Report

**Status:** IMPLEMENTED LOCALLY / NOT COMMITTED / NOT DEPLOYED
**Worktree:** `C:\Users\casa\Documents\booking-pricing-1a`
**Branch:** `booking-pricing-1a`
**Baseline HEAD:** `5288b05b445d1e953d0496602e49a31338dafcb2` (unchanged by this work)
**Runtime:** Node `v24.18.1`

> This slice corrects the **inclusive** availability calendar to timezone-independent
> UTC arithmetic, and isolates the reservation repository's historical expansion so the
> correction cannot move it. It does not change what either contract means.

---

## 1. Root cause

`AvailabilityCalendar.expandRange` (`capabilities/availability/availability.calendar.js`)
parsed and formatted in UTC but **iterated in local time**:

```js
const current = new Date(startDate)   // 'YYYY-MM-DD' -> UTC midnight
const end = new Date(endDate)         // 'YYYY-MM-DD' -> UTC midnight
while (current <= end) {
  dates.push(current.toISOString().split('T')[0])   // formats in UTC
  current.setDate(current.getDate() + 1)            // steps in LOCAL time
}
```

`new Date('2026-04-03')` is UTC midnight by the ES date-only rule, and `toISOString()`
formats in UTC, so the sequence is a UTC sequence being advanced by a local civil day.
A local civil day is not always 24 hours, and the offset transition is exactly where it
is not. Two distinct failures follow, both observed:

* **A 23-hour step (spring forward)** lands the next instant on a UTC instant whose date
  has already been emitted, so `toISOString()` **repeats a date**.
* **A 25-hour step (fall back)** pushes the instant past `end` — itself a UTC midnight —
  so the loop exits early and the **final inclusive day is silently dropped**.

Traced example, `America/Santiago`, `expandRange('2026-09-04', '2026-09-07')`:

| Iteration | Instant emitted | Local wall time | Offset | Emitted string |
| --- | --- | --- | --- | --- |
| 1 | `2026-09-04T00:00:00Z` | Thu Sep 03 20:00 | −240 | `2026-09-04` |
| 2 | `2026-09-05T00:00:00Z` | Fri Sep 04 20:00 | −240 | `2026-09-05` |
| 3 | `2026-09-06T00:00:00Z` | Sat Sep 05 20:00 | −240 | `2026-09-06` |
| 4 | `2026-09-06T23:00:00Z` | Sun Sep 06 20:00 | **−180** | `2026-09-06` **again** |

The fourth step is 23 hours, so it re-enters the same UTC date. The result was
`['2026-09-04','2026-09-05','2026-09-06','2026-09-06']`: a duplicate, and `2026-09-07`
missing entirely.

**Scope of the fault, stated precisely.** A fixed non-zero offset is **not** by itself a
cause: with a constant offset the local civil day still maps one-to-one onto the UTC day
and the old arithmetic is correct, which is why UTC was never wrong. The defect is mixing
a local-time step into a UTC sequence. It manifests at offset transitions, and the
drifted instant can also end past `end` and truncate a plain range that merely *contains*
a transition.

**Measured before the fix** (real implementation, 14 cases × 3 zones):

| Case | UTC | America/Santiago | Australia/Lord_Howe |
| --- | --- | --- | --- |
| `2026-04-03`→`2026-04-06` | 4 correct | **3, final day dropped** | **3, final day dropped** |
| `2026-09-04`→`2026-09-07` | 4 correct | **4 but `09-06` duplicated** | 4 correct |
| `2026-10-02`→`2026-10-05` | 4 correct | 4 correct | **4 but `10-03` duplicated** |
| `2026-04-04`→`2026-04-07` | 4 correct | **3, final day dropped** | **3, final day dropped** |
| same-day, month/year boundary, leap day | correct | correct | correct |

The same input produced three different answers depending only on the process timezone.

---

## 2. The change

`expandRange` now does all three of its date operations in UTC:

```js
static expandRange(startDate, endDate) {
  const dates = []
  const current = new Date(startDate)
  const end = new Date(endDate)

  if (Number.isNaN(current.getTime()) || Number.isNaN(end.getTime())) return dates

  while (current.getTime() <= end.getTime()) {
    dates.push(current.toISOString().split('T')[0])
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return dates
}
```

UTC has no daylight saving, so a UTC civil day is always exactly 86 400 000 ms and
`setUTCDate(getUTCDate() + 1)` always advances one civil date. The guard makes the
existing "unparseable input yields `[]`" behaviour explicit instead of relying on a
`NaN` comparison falling through.

### Preserved inclusive contract

| Property | Status |
| --- | --- |
| Both endpoints inclusive | Preserved |
| Same-day range returns exactly that day | Preserved, asserted |
| Output is an array of `YYYY-MM-DD` strings | Preserved |
| Ascending order | Preserved, asserted |
| Reversed range → `[]` | Preserved, asserted |
| Unparseable bound → `[]`, no throw | Preserved, asserted |
| Arguments not mutated | Preserved, asserted |
| Month/year rollover | Preserved, now exact in every zone |
| Leap day, incl. `2024-02-29` alone | Preserved, now exact in every zone |

### Inclusive calendar vs checkout-exclusive occupied nights

These are **two different contracts**, and both are preserved:

* **Inclusive calendar dates** — `AvailabilityCalendar.expandRange(start, end)` returns
  every date from `start` to `end` **including both**. This is what the fixed method
  still does. Callers such as `calculateAvailability` and `normalize` build a date-indexed
  view, and they keep that meaning.
* **Checkout-exclusive occupied nights** — `expandOccupiedNights` (BOOKING-OCCUPIED-NIGHTS-1A)
  returns `[checkIn, checkOut)`, **excluding** checkout. It is reached through the
  availability capability, in UTC, and is not touched here.

The fix does **not** implement the calendar in terms of the occupied-night helper, and it
does **not** add a day to the end date to convert between them. They remain independent
contracts that happen to share a capability directory. A recorded line is still
consumed, validated and released by the 1B record path
(`#prepareNewLineConsumption`, `#validateConsumptionRecord`,
`#resolveRecordedReleaseDates`), none of which is coupled to the calendar or to
`maxNights`.

**One distinction worth stating explicitly, because it is easy to conflate:** the calendar
treats a reservation as blocking **checkOut itself** — `calculateAvailability` calls
`expandRange(res.checkIn, res.checkOut)`, which is inclusive, so a checkout date shows as
blocked. That is the pre-existing calendar behaviour and it is preserved unchanged. It is
*not* the same rule as occupied nights, which exclude checkout.

Whether blocking the checkout date is the *desired product rule* is **not** decided or
certified by this slice. It is recorded here as observed, unchanged behaviour so it is not
mistaken for an endorsement.

---

## 3. Files changed

| File | State | Purpose |
| --- | --- | --- |
| `capabilities/availability/availability.calendar.js` | modified | UTC-only `expandRange`; contract documented in place |
| `capabilities/persistence/repositories/reservation/reservation.repository.js` | modified | **Authorized scope extension** — isolate the legacy expansion from the calendar |
| `capabilities/availability/availability.calendar.utc.test.js` | new | 26 focused tests against the real calendar |
| `capabilities/availability/test-support/availability.calendar.tz-fixture.mjs` | new | Child-process TZ fixture |
| `capabilities/availability/availability.capability.occupied-nights.test.js` | modified | Authorized correction: the obsolete substring guard replaced by a structural import check |
| `docs/ai/BOOKING_CALENDAR_UTC_1_REPORT.md` | new | This report |

Six files. No other file was modified, added or deleted.

---

## 4. The discovered coupling, and the authorized isolation

**The coupling.** `ReservationRepository#expandDateRange`
(`reservation.repository.js:48`) did not implement its own expansion; it called
`AvailabilityCalendar.expandRange`:

```js
return AvailabilityCalendar.expandRange(
  temporal.startDate,
  endDate.toISOString().split('T')[0]
)
```

So correcting the calendar silently changed a **historical release path** that 1B had
deliberately frozen. Measured before any edit, a record-less 4-night line released:

| Zone | Legacy released, before the calendar fix |
| --- | --- |
| UTC | 4 |
| America/Santiago | **3** |
| Australia/Lord_Howe | **3** |

With the calendar corrected and the repository untouched, this became 4 in Santiago and
Lord Howe — i.e. correcting an inclusive calendar primitive would have **changed
historical release output** as a side effect, and 5 committed 1B tests failed:

| 1B test | Asserted | Observed with an unmodified repository |
| --- | --- | --- |
| legacy inclusive arithmetic (×3, PostgreSQL adapter) | 3 dates | 4 dates |
| in-memory path keeps the legacy branch | 3 dates | 4 dates |
| "legacy output must be zone-dependent" | UTC 4, Santiago 3 | UTC 4, **Santiago 4** |

That is a product decision, not an implementation detail, so it was raised before
proceeding. **Option 1 was authorized**: isolate the legacy expansion inside the
repository, changing `reservation.repository.js` for that single purpose only.

**The isolation.** `#expandDateRange` keeps its original local-time checkout adjustment
(`endDate.setDate(endDate.getDate() - 1)`) and now calls a new private
`#legacyLocalExpandRange`, which is a **verbatim copy** of `expandRange` as it stood at
HEAD — the six-line local-time loop, and nothing else. The dependency edge from the
repository to the calendar is gone, so no future change to the shared calendar can move
the historical path.

**The full legacy call chain, inspected before editing.** `#expandDateRange` has
**two** callers, not one:

1. `#resolveRecordedReleaseDates` (`:432`) → `#legacyExpandDateRange` → `#expandDateRange`
   — the record-less `DATE_RANGE` release branch, reached by **both** adapters: the
   in-memory plan at `:713` and the PostgreSQL plan at `:813`.
2. `#prepareNewLineConsumption` (`:186`) — the **create** path for lines whose mode is not
   `DATE_RANGE`.

Both call sites behaved identically before this slice, so isolating the shared method
restores the whole repository to its pre-slice behaviour. Callers
`availability.manager.js:224,302,377,486`, `admin.capability.js` and
`tests/fixtures/availability.fixture.js` get the corrected calendar.

**Equivalence verified against the pre-slice implementation.** The five committed 1B
assertions are unchanged and green; they encode the pre-slice values literally and span
both adapters and the timezone/transition fixtures. Specifically:

* PostgreSQL adapter — record-less line, and record-less line with unrelated metadata.
* In-memory adapter — record-less line.
* Timezone/transition fixtures — `the legacy branch is preserved and is demonstrably
  timezone-dependent` still **passes**, so the legacy path is still demonstrably
  zone-dependent (UTC 4 vs Santiago 3) and the 1B deployment gate is intact.

### The corrected structural import check

The obsolete committed guard at
`availability.capability.occupied-nights.test.js:314` was:

```js
await test('[static text] repository keeps the availability calendar import for the legacy branch', () => {
  assert(repositorySource.includes('AvailabilityCalendar'),
    'the legacy compatibility branch still needs AvailabilityCalendar')
  assert(repositorySource.includes('#legacyExpandDateRange'),
    'the legacy branch must be explicitly named')
})
```

**What it was intended to protect.** At 1B authoring time the legacy branch really did
import and call `AvailabilityCalendar`. The first assertion was a wiring check that the
import had not been dropped during the 1B refactor, so the historical release path could
not silently lose its dependency. The second asserted the branch was still *named*.

**Why it had to change.** The import is now gone, so the rationale is obsolete — yet the
assertion still **passed**, on nothing but prose. Measured: after stripping every comment
line, `AvailabilityCalendar` appears in **0** executable lines. The string survived only
in the isolation comments explaining why the import was removed. A commented-out import
would have satisfied it just as well. A dead import was therefore deleted rather than
retained, and no source text was added to keep the check green.

**The correction.** The substring check was replaced by a structural one, under a clearly
labelled `[structural imports]` heading, in `extractImportSpecifiers`:

1. **Comments are stripped first.** `stripComments` walks the source with a small
   scanner that blanks line and block comment bodies while preserving string and
   template contents (the specifiers live inside quotes) and preserving newline
   positions. It tracks string, template and regex literals so a `//` or `/*` *inside* a
   literal is not mistaken for a comment; `/` is disambiguated from division by the usual
   previous-token heuristic. A comment can therefore neither manufacture nor hide an
   import.
2. **Only real declarations are matched.** Two line-anchored forms are collected —
   `import ... from 'spec'` and the side-effect `import 'spec'` — each bounded by
   `[^;'"]*?` so a match cannot run past a semicolon or a quote into unrelated code.
   Results are sorted by declaration position so the two passes preserve source order.
3. **It is a declaration scan, not a text search.** The forbidden import is then detected
   by resolving each specifier against the repository's own URL and matching the
   resulting **path**, not by looking for a word.

**Not added deliberately:** no assertion that a private method name such as
`#legacyLocalExpandRange` appears. That would repeat the same substring weakness under a
different label — a rename would fail it, and a comment could satisfy it. Historical
compatibility is asserted behaviourally instead, by executing the real repository.

**Limited evidentiary value, stated plainly.** This check proves exactly one thing: the
repository holds **no static ESM import edge** to the calendar module. It does not prove
the legacy branch still behaves as before, that the calendar is timezone-correct, or that
releasing historical reservations is safe. It also cannot see a CommonJS `require()` or a
dynamic `import()`. Behaviour is covered by
`reservation.repository.occupied-nights.test.js`, whose five pre-slice legacy assertions
and timezone-equivalence check are unchanged.

**The check is not vacuous.** Two guards protect it:

* `the parser recovers the repository's real imports` asserts the parser finds at least
  four declarations and recovers all four real specifiers, so "found nothing" cannot make
  the negative assertion pass by accident.
* `comments cannot manufacture or hide an import declaration` runs seven adversarial
  fixtures through the parser: commented-out imports (line and block) must **not** be
  collected; an import with interleaved comments must **still** be collected; a quoted
  `import` inside a string is not a declaration; a regex containing `/`, `/*` and `*/`
  is not a comment; ordering is preserved.

**Mutation-verified.** Temporarily restoring the calendar import to
`reservation.repository.js` and rerunning the suite made the check fail as it should —
`expected [], got ["../../../availability/availability.calendar.js"]`, exit `1`. The file
was then restored, so the check is known to detect the condition it claims to.

Result: `availability.capability.occupied-nights.test.js` now reports
**19 passed, 0 failed** (the one obsolete test was replaced by three).

---

## 5. Tests

The **real** `AvailabilityCalendar` is imported and exercised.

Expectations come from two sources, and the split matters:

* **Literal lists** — every same-day range and every transition-spanning range in
  `EXPECTED` is written out as explicit dates. These are what actually pin the
  regression, and they are what the 366-day span cross-checks against.
* **Derived lists** — `addDays`/`span` build expected output for the longer ranges
  (the 365-day year, month rollovers, the 366-day span). An earlier draft of this
  report claimed these helpers built inputs only and derived no expected output;
  that was wrong, and it is corrected here.

A shared bug in `addDays` would in principle let a matching bug in `expandRange` pass.
That risk is mitigated rather than eliminated: the helper is a different implementation
from the code under test — it builds from a `Date` and steps the UTC date, with no
inclusive/exclusive bounds logic at all — and the derived cases are cross-checked
against the literal transition expectations, with endpoints pinned literally.

Timezone coverage runs the real module in **child processes** with `TZ` set in the child
environment before start. In-process `process.env.TZ` mutation is unreliable on Windows
and is not used. The 366-day range is computed **inside the child**, so a zone-dependent
implementation cannot pass by being correct only in the parent process.

| Suite | Result | Exit |
| --- | --- | --- |
| `node capabilities/availability/availability.calendar.utc.test.js` | **26 passed, 0 failed** | 0 |
| `node capabilities/availability/availability.occupied-nights.test.js` (1A helper) | 36 passed, 0 failed | 0 |
| `node capabilities/availability/availability.manager.occupied-nights.test.js` (1A manager) | 15 passed, 0 failed | 0 |
| `node capabilities/availability/availability.capability.occupied-nights.test.js` (1B capability) | 19 passed, 0 failed | 0 |
| `node capabilities/persistence/repositories/reservation/reservation.repository.occupied-nights.test.js` (1B repository) | 101 passed, 0 failed | 0 |
| `node tests/aggregate/availability.lifecycle.test.js` | 31/31 | 0 |
| `node tests/aggregate/reservation.lifecycle.test.js` | 22/22 | 0 |
| `node tests/runtime/runtime-persistence-1-availability.test.js` | 97/97 | 0 |
| `node tests/runtime/runtime-persistence-1.test.js` | 18/18 | 0 |
| `node web/booking-widget-availability.test.js` | 42/42 | 0 |
| `node capabilities/pricing/pricing.test.js` | 155 passed, 0 failed | 0 |

The 1B repository suite keeps its own `pg` import hook; it never connected to PostgreSQL.

### Coverage in the new suite

Same-day ranges; both endpoints; shape, ordering and uniqueness; a 365-day year; month
boundaries in both directions; year boundaries; leap day alone, leap day inside a span,
Feb 2024 vs Feb 2023 lengths, and absence of a phantom `02-29` in a common year; reversed
range; unparseable and `undefined` bounds; argument non-mutation; `normalize`;
`calculateAvailability`; `calculateOccupancy`; a 366-day span across both transitions; and
inherited-method regressions.

### Effective-timezone evidence

Each child reports its resolved zone and its January and July UTC offsets, and the parent
**asserts** them, so a run whose `TZ` was silently ignored fails instead of quietly
counting as coverage of a zone never exercised.

| `TZ` | Resolved zone | Jan offset | Jul offset |
| --- | --- | --- | --- |
| `UTC` | `UTC` | 0 | 0 |
| `America/Santiago` | `America/Santiago` | 180 | 240 |
| `Australia/Lord_Howe` | `Australia/Lord_Howe` | −660 | −630 |

Exact dates, not counts, are asserted for 13 ranges in **every** zone: same-day,
two-day, plain 4-day, month boundary, year boundary, leap-day span, leap day alone,
non-leap `02-29` span, and four transition-spanning ranges. All three zones produce
byte-identical output, and the transition-spanning ranges are additionally asserted to
contain no repeated date, no gap, and to include their final date.

The suite also passes when run under an ambient non-UTC `TZ`
(`America/Santiago` 26/0, `Australia/Lord_Howe` 26/0), so the in-process assertions are
zone-proof too.

### The regression is demonstrated, not asserted

`the original implementation at HEAD fails the exact-date assertions this suite now makes`
reconstructs the **original** `expandRange` from `git show HEAD:…` into an isolated
`mkdtemp` directory, reads the file back to confirm it matches the committed original
byte-for-byte, and runs the identical fixture against it. Nothing in the worktree is
written, moved or overwritten, and the temp copy is deleted in a `finally` block.

Recorded result:

| Zone | Original at HEAD | Fixed |
| --- | --- | --- |
| UTC `2026-04-03`→`04-06` | 4 dates (control, unchanged) | 4 dates |
| Santiago `2026-04-03`→`04-06` | **3 dates, final day dropped** | 4 dates |
| Lord Howe `2026-10-02`→`10-05` | **`['10-02','10-03','10-03','10-04']`** | 4 correct |
| Santiago vs Lord Howe, all ranges | **outputs differ** | **outputs identical** |

A second test asserts the temp copy is deleted and that the worktree calendar still holds
the UTC step, so the comparison cannot leave the worktree altered.

---

## 6. Input behaviour not covered

Stated plainly rather than implied:

* **Strict-format rejection is not implemented here.** `expandRange` does not validate the
  shape of its input; it accepts whatever `new Date()` can parse and rejects only what
  `new Date()` yields as `NaN`. The exact set of accepted strings is therefore whatever
  the runtime's parser accepts, and it is engine- and version-dependent — `2026-4-3`,
  `2026/04/03` and full ISO timestamps are all in that class. No test in this slice
  pins which of those are accepted, and no claim is made here that any particular
  non-canonical form such as a basic `20260403` is accepted; that was asserted without
  evidence and is withdrawn. The 1A helper's strict `/^\d{4}-\d{2}-\d{2}$/` gate was
  deliberately **not** copied in: tightening this method's accepted inputs would break
  existing callers and is a separate contract decision. Non-existent civil dates such as
  `2026-02-30` still roll over via `new Date()` rather than being rejected.
* **Year range.** Years `0000`–`0099` go through `new Date()`'s parser, not the
  `setUTCFullYear` construction the 1A helper uses to avoid 1900s remapping. No test
  covers years below 0100.
* **Non-`YYYY-MM-DD` arguments are untested.** Every case in this suite passes either a
  `YYYY-MM-DD` string or a `Date`. The suite does not establish what `expandRange` does
  with a non-midnight timestamp such as `2026-04-03T09:30:00Z`, nor with `Date` objects
  built from such an instant, nor with `null`, `true`, numbers or other
  `Date`-convertible values. What the implementation does is straightforward —
  `setUTCDate(getUTCDate() + 1)` advances the civil date while preserving the
  time-of-day, and the emitted value is `toISOString().slice(0, 10)` — but that reading
  of the code is **not** backed by a test in this slice, so it is recorded as untested
  rather than as known behaviour. (An earlier draft of this report asserted that
  non-midnight inputs "can repeat dates"; that claim was not supported by a test and has
  been withdrawn.)
* **`mergeRanges`, `splitRange`, `detectOverlap`, `detectGaps` are unchanged.**
  `detectGaps` was found during discovery to be **demonstrably timezone-dependent**, and
  `splitRange` uses the same mixed local/UTC pattern with no demonstrated failure. Both
  were **left unchanged as out of scope**; `detectGaps` is scheduled as a separate
  follow-up slice that must complete before Stage certification (section 7).
* **No test runner integration.** The suite is a standalone file run by `node`, matching
  the existing convention. There is no `package test` script in this worktree.
* **A 3660-night-style bound is not enforced here.** `expandRange` has no ceiling; that
  bound belongs to the occupied-night contract and is deliberately not coupled in.

---

## 7. Pending, explicitly not resolved

* **PostgreSQL certification remains pending.** No database, connection or network access
  occurred. The 1B repository suite uses its `pg` import hook and never opened a physical
  connection; real SQL behaviour, constraints, locking, isolation, concurrency and
  physical rollback are still uncertified.
* **Historical release policy remains a deployment gate, and this slice did not resolve
  it.** The legacy path is now *isolated*, not *fixed*: its local-time arithmetic is
  preserved verbatim and is still demonstrably timezone-dependent (UTC 4 vs Santiago 3).
  It still does not resolve any existing row's create-time timezone, code version or
  timezone-rule version. Cancelling real historical reservations remains unapproved. The
  isolation makes the coupling impossible to reintroduce by accident; it makes the
  remaining risk *more visible*, not smaller.
* **Non-`DATE_RANGE` create consumption keeps its pre-existing local-time behaviour.**
  `#expandDateRange` is also the create path for non-`DATE_RANGE` lines
  (`:186`), so that path retains the timezone dependence it had before this slice. It is
  neither improved nor worsened here, and is recorded rather than left implicit.
* **Mock cancellation routing is untouched and pending.** `#releaseMockCapacity` and the
  routing of `cancelReservationWithRelease` were not changed.
* **Pricing integration is pending.** Pricing remains inactive; the pricing suite passes
  but nothing was integrated.
* **`detectGaps` remains a demonstrated, unfixed defect, and is now an explicitly
  scheduled follow-up.** In `Australia/Lord_Howe` it returns the malformed gap
  `{start: '2026-10-03', end: '2026-10-04', days: 1}` where the correct gap is
  `2026-10-04` alone, because it combines a fixed 24-hour `Math.floor` with local-time
  `setDate`. It was **left unchanged here as out of scope**, because it returns
  `{start, end}` objects whose inclusive semantics interact with `expandRange`, so
  correcting it is its own contract review. **Decision taken:** it is deferred to a
  **separate follow-up slice**, to be started only after `BOOKING-CALENDAR-UTC-1` is
  reviewed and committed, and it is **recorded as a pending item that must be resolved
  before Stage certification**. That follow-up is **not** implemented in this slice.
* **`splitRange` uses the same mixed local/UTC pattern** but **no failure was
  demonstrated** for it. It is included in the same follow-up review rather than
  treated as proven-safe.
* Not touched: database schema, dependencies, `package.json`, `package-lock.json`, UI,
  public API, CI, capability registration or configuration. The three protected historical
  reservation IDs `7f820bae-870f-460d-a14f-96894c97db34`,
  `1f6de1dc-7279-4439-b73b-5c5c6b83f562` and
  `07933bcb-f125-4115-99d8-4f289f71aad7` were not read, written or migrated.

---

## 8. Repository state

* `git diff --check` and `git diff --cached --check` both exit 0.
* `HEAD` is `5288b05b445d1e953d0496602e49a31338dafcb2`, unchanged.
* Nothing is staged. No commit, push, merge, deployment or Passenger restart.
* 6 files: **3 modified** (`availability.calendar.js`,
  `availability.capability.occupied-nights.test.js`, `reservation.repository.js`) and
  **3 new** (`availability.calendar.utc.test.js`,
  `test-support/availability.calendar.tz-fixture.mjs`, this report).

**IMPLEMENTED LOCALLY / NOT COMMITTED / NOT DEPLOYED**
