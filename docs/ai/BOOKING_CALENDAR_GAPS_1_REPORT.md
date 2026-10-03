# BOOKING-CALENDAR-GAPS-1 — Implementation Report

**Status:** implementation complete, retained suites green, awaiting Stage certification.
**Worktree:** `C:\Users\casa\Documents\booking-pricing-1a`
**Branch:** `booking-pricing-1a`
**Baseline commit:** `97b9958af8726f59130357ad2a9271fea4443353`
(`fix(availability): use UTC calendar arithmetic and isolate legacy expansion`)
**HEAD at delivery:** unchanged, `97b9958af8726f59130357ad2a9271fea4443353`
**Date of this work:** 2026-09-30

---

## 1. Outcome

`AvailabilityCalendar.detectGaps` was reported as producing a malformed, timezone-dependent
result in `Australia/Lord_Howe`. That report was correct, and the defect was worse than the
single reported case: in some transitions the method returns a gap whose `start` is **after**
its `end`.

The task also asked me to review `splitRange` for the same arithmetic problem and change it
**only if a concrete defect was demonstrated**. A concrete defect was demonstrated and
`splitRange` was fixed as well. It is the same defect class in the same file.

Both methods now derive every civil date with UTC-only arithmetic, consistent with the
`expandRange` fix already in the baseline.

The complete set of production changes:

| Method | Change | Behavioural lines |
| --- | --- | --- |
| `detectGaps` | `gapStart` and `gapEnd`: `setDate(getDate())` → `setUTCDate(getUTCDate())` | 2 |
| `splitRange` | `segEnd`: `setDate(getDate())` → `setUTCDate(getUTCDate())` | 1 |
| `detectGaps` | `Math.floor` day count: **byte-identical to the baseline** | 0 |
| `mergeRanges` | none — reviewed, contains no local-time date arithmetic | 0 |
| `detectOverlap` | none — reviewed, contains no local-time date arithmetic | 0 |

**Exactly three behavioural lines change, all of them `setDate`/`getDate` → `setUTCDate`/
`getUTCDate`.** Nothing else about the calculation was touched: the `gapDays` line is unchanged
from the baseline character for character, and `git diff` reports no diff hunk on it. Everything
else in the diff is added documentation or fixture data.

### A correction made during review

An earlier draft of this change also replaced `Math.floor` with `Math.round` on the gap day
count, on the reasoning that both operands are UTC midnights so the quotient is an exact
integer and the two functions agree. **That change has been reverted.** The reasoning was
sound only for midnight-aligned inputs: `detectGaps` does not validate that its arguments are
`YYYY-MM-DD` civil dates, so for an input carrying a time of day `floor` and `round` can
disagree. Which one is correct for such input is a separate, pre-existing question and was
never in scope.

The same draft also hoisted the day-length literal `1000 * 60 * 60 * 24` into a named
`MS_PER_DAY` constant. That was a readability change, not a fix, and it was **also reverted**: it
put a diff on the very line that had to stay untouched, and it was not part of the requested
scope. The `gapDays` expression is now byte-identical to the baseline, which is verifiable with
`git diff -U0 -- capabilities/availability/availability.calendar.js`: it prints no hunk for that
line.

---

## 2. Root cause

Both methods take civil dates. A `YYYY-MM-DD` string is parsed by `new Date(str)` as **UTC
midnight**, and the results are formatted back out with `toISOString()`. The bounds are
therefore pure UTC instants.

The bug was the one-day steps taken *between* those UTC instants:

```js
// BEFORE — mixed UTC and local arithmetic
const gapStart = new Date(prevEnd)          // UTC midnight
gapStart.setDate(gapStart.getDate() + 1)    // steps in LOCAL time
gapStart.toISOString()                      // ...then read back as UTC
```

`setDate` operates on the **local** calendar. Near a daylight-saving transition the local
calendar skips or repeats an hour, so stepping "one day" forward or backward in local time
does not land on the adjacent UTC instant. The formatted UTC date then lands a day early or
a day late.

The fix keeps the whole sequence in one time base:

```js
// AFTER
const gapStart = new Date(prevEnd)
gapStart.setUTCDate(gapStart.getUTCDate() + 1)
```

This is the same reasoning, and the same fix, already applied to `expandRange` in `97b9958`.

### Why the object contradicted itself

`gapDays` was computed as `Math.floor((currStart - prevEnd) / (1000 * 60 * 60 * 24)) - 1`, and
that calculation was never wrong. The problem was that `days` described the *correct* gap while
`start` and `end` described a *drifted* one. That is why the original output contradicted
itself: `days: 1` over a `2026-10-03 .. 2026-10-04` span, which contains two days.

Because the day count was already right and the bounds were wrong, the fix is confined to the
bounds. Leaving the count alone is what keeps the change to three lines.

---

## 3. Demonstrated defects, with literal outputs

Every baseline value below is the real return value of the **baseline** implementation
(`97b9958`), produced by running the unmodified source from that commit in a child process
under an explicit `TZ`. Corrected values are what the implementation now returns in **every**
zone. These same literals are asserted in the retained test suite (section 9), so a reviewer
can confirm each one by re-running it.

### 3.1 `detectGaps` — `Australia/Lord_Howe`

Input, a one-day gap on `2026-10-04`, immediately after the Lord Howe October transition:

```js
[{ start: '2026-10-03', end: '2026-10-03' }, { start: '2026-10-05', end: '2026-10-05' }]
```

| | Result |
| --- | --- |
| Baseline | `{ start: '2026-10-03', end: '2026-10-04', days: 1 }` |
| Fixed | `{ start: '2026-10-04', end: '2026-10-04', days: 1 }` |

The baseline result **re-includes `2026-10-03`, a day the caller reported as occupied**, and
its `days: 1` contradicts its own two-day span.

The same transition in April produces the mirror-image failure:

```js
[{ start: '2026-04-03', end: '2026-04-03' }, { start: '2026-04-05', end: '2026-04-05' }]
```

| | Result |
| --- | --- |
| Baseline | `{ start: '2026-04-04', end: '2026-04-03', days: 1 }` |
| Fixed | `{ start: '2026-04-04', end: '2026-04-04', days: 1 }` |

A gap whose `start` is **after** its `end**. Any consumer ordering or iterating this span would
be wrong.

### 3.2 `detectGaps` — `America/Santiago`

```js
[{ start: '2026-09-06', end: '2026-09-06' }, { start: '2026-09-08', end: '2026-09-08' }]
```

| | Result |
| --- | --- |
| Baseline | `{ start: '2026-09-06', end: '2026-09-07', days: 1 }` |
| Fixed | `{ start: '2026-09-07', end: '2026-09-07', days: 1 }` |

Again the baseline re-includes the occupied `2026-09-06`.

```js
[{ start: '2026-04-04', end: '2026-04-04' }, { start: '2026-04-06', end: '2026-04-06' }]
```

| | Result |
| --- | --- |
| Baseline | `{ start: '2026-04-05', end: '2026-04-04', days: 1 }` |
| Fixed | `{ start: '2026-04-05', end: '2026-04-05', days: 1 }` |

### 3.3 `detectGaps` — the 2027 second occurrence

The defect recurs at the corresponding transitions in 2027, on shifted dates rather than the
same day-and-month, so a fix pinned only to 2026 would not be a fix:

| Zone | Input | Baseline | Fixed |
| --- | --- | --- | --- |
| `Australia/Lord_Howe` | `2027-10-02` / `2027-10-04` | `{ start: '2027-10-02', end: '2027-10-03', days: 1 }` | `{ start: '2027-10-03', end: '2027-10-03', days: 1 }` |
| `America/Santiago` | `2027-09-05` / `2027-09-07` | `{ start: '2027-09-05', end: '2027-09-06', days: 1 }` | `{ start: '2027-09-06', end: '2027-09-06', days: 1 }` |

### 3.4 `splitRange` — segments silently lose their last day

`splitRange('2026-04-01', '2026-04-07', ['2026-04-05'])` in `Australia/Lord_Howe`:

| | Result |
| --- | --- |
| Baseline | `[{ start: '2026-04-01', end: '2026-04-03' }, { start: '2026-04-05', end: '2026-04-07' }]` |
| Fixed | `[{ start: '2026-04-01', end: '2026-04-04' }, { start: '2026-04-05', end: '2026-04-07' }]` |

The segments no longer tile the requested range: `2026-04-04` belongs to neither segment, so
the union of the segments is **not** the range the caller asked to split. This breaks the
property that the split is a partition.

`splitRange('2026-04-01', '2026-04-07', ['2026-04-06'])` in `America/Santiago`:

| | Result |
| --- | --- |
| Baseline | `[{ start: '2026-04-01', end: '2026-04-04' }, { start: '2026-04-06', end: '2026-04-07' }]` |
| Fixed | `[{ start: '2026-04-01', end: '2026-04-05' }, { start: '2026-04-06', end: '2026-04-07' }]` |

`2026-04-05` is dropped.

And in 2027, `splitRange('2027-04-01', '2027-04-07', ['2027-04-04'])` in `Australia/Lord_Howe`
returns `[{ 2027-04-01 .. 2027-04-02 }, { 2027-04-04 .. 2027-04-07 }]`, dropping `2027-04-03`.

---

## 4. How the `splitRange` defect was initially missed, and what corrected it

**This is a correction to my own earlier finding, recorded here rather than hidden.**

An early sweep of `splitRange` reported **zero** mismatches over 856,680 cases per zone, on the
basis of which I first concluded that `splitRange` had no demonstrated defect. That conclusion
was wrong, and the sweep was at fault, not the method.

The sweep varied the **range start** across the window while holding a fixed set of **split
dates** in April. The range started at most 60 days into the year, so every range ended before
April and **no split ever fell inside any range**. With no split applied, `splitRange` returns
a single unchanged segment, which always matches UTC. The sweep was structurally incapable of
exercising the defect — it only ever compared the no-op path.

Re-running with the range spanning the split dates found 2,375 failing cases in
`America/Santiago` immediately. The lesson is now encoded in the retained test suite, which
places splits inside ranges on every drifting date and additionally asserts that segments tile
the range exactly (section 9).

---

## 5. Drift dates observed during exploratory investigation

> **Status of this section: exploratory.** The enumeration below was produced by a temporary
> script that was run during investigation and then deleted. **It is not reproducible from the
> repository**, and no retained test performs this enumeration. It is recorded as investigative
> context only and is **not** part of the verification basis for this change.

A temporary script walked every day of 2026 and 2027 for both methods in both zones and
reported which dates drift. For the two zones of interest it reported:

`splitRange` — split dates where the segment end drifts:

| Zone | Split dates reported as drifting |
| --- | --- |
| `America/Santiago` | `2026-04-06`, `2027-04-05` |
| `Australia/Lord_Howe` | `2026-04-05`, `2027-04-04` |

`detectGaps` — gap dates where the bounds drift:

| Zone | Gap dates reported as drifting |
| --- | --- |
| `America/Santiago` | `2026-04-05`, `2026-09-07`, `2027-04-04`, `2027-09-06` |
| `Australia/Lord_Howe` | `2026-04-04`, `2026-10-04`, `2027-04-03`, `2027-10-03` |

Two observations from that investigation did influence the retained tests:

1. **The drift occurs on the day *after* the transition, not on the transition date itself.**
   Splitting on the transition date happens to be correct. The retained suite therefore pins
   the four `splitRange` dates above *and* two control dates where the split path does **not**
   drift, so it cannot be said to overstate the breadth of the defect.
2. **The defect is zone-specific in both directions.** Lord Howe's drifting dates were computed
   correctly in Santiago and vice versa, because the two zones have different offsets and
   different transition instants. A test asserting only one zone, or only the transition date
   itself, would have passed against the broken implementation. The retained suite asserts both
   zones separately.

**What the retained tests do and do not establish.** The fixtures pin these specific dates as
regression cases, and the retained suite asserts each zone's behaviour independently. It does
**not** prove that these are the only drifting dates, and it does not prove completeness for
any zone, any year, or any method. Establishing that would require an exhaustive committed
sweep, which does not exist. The fix is structural rather than date-specific — it removes the
mix of time bases rather than special-casing particular days — which is the reason the
individual dates are regression examples rather than a patch list.

---

## 6. Exploratory baseline sweep (deleted script, not reproducible)

> **Status: exploratory, not verification.** Run by a temporary script that has been deleted.
> Not reproducible from the repository. Recorded for investigative context; **not** a basis for
> certification.

Per zone, over `2026-01-01 .. 2027-12-31`: 295,240 `splitRange` cases and 79,800 `detectGaps`
cases, compared against a UTC reference. Results:

| Zone | `splitRange` bad | `detectGaps` bad |
| --- | --- | --- |
| `UTC` | 0 | 0 |
| `Asia/Kathmandu` | 0 | 0 |
| `America/Havana` | 0 | **635** |
| `America/Santiago` | **2,375** | **244** |
| `Australia/Lord_Howe` | **2,444** | **216** |
| `Pacific/Chatham` | **2,444** | **223** |
| `Australia/Adelaide` | **2,444** | **216** |

`Asia/Kathmandu` was the useful negative control: its UTC offset is 5h45, an offset no
`Date`-formatting bug produces, and it has no DST, so it was already correct.

`America/Havana` showed the defect is not confined to southern-hemisphere zones. It had the
highest `detectGaps` failure count of any zone probed, and **it is not among the three zones in
the retained suite.** That is a genuine coverage limitation, recorded in section 13.

---

## 7. Exploratory post-fix sweep (deleted script, not reproducible)

> **Status: exploratory, not verification.** An earlier version of this report presented the
> 302,916 figure below as "verification". That was wrong and is corrected here: the sweep was
> run by a temporary script that has been deleted, **is not reproducible from the
> repository**, and is **not** part of the verification basis for this change.

12 zones, a UTC reference as the comparison target. Per zone: 19,710 `splitRange` cases and
5,533 `detectGaps` cases across the 2026–2027 window.

| | Count |
| --- | --- |
| Zones | 12 |
| `splitRange` cases | 236,520 |
| `detectGaps` cases | 66,396 |
| Total | 302,916 |
| Mismatches vs the reference | 0 |
| Gaps where `days` ≠ inclusive span length | 0 |

The 12 zones were `UTC`, `America/Santiago`, `Australia/Lord_Howe`, `Pacific/Chatham`,
`Asia/Kathmandu`, `America/Havana`, `Australia/Adelaide`, `Europe/London`, `America/New_York`,
`Asia/Tehran`, `Pacific/Apia` and `America/Sao_Paulo`. Nine of them are absent from the retained
suite; adding them was out of scope for this task and is listed in section 13 as a known
limitation rather than claimed as coverage.

**This number must not be quoted as repository verification.** The script that produced it is
gone. The retained verification basis is the 27-test suite in section 9 and its results in
section 12.

---

## 8. Files changed

| File | Git state | Change |
| --- | --- | --- |
| `capabilities/availability/availability.calendar.js` | modified, tracked | 3 behavioural lines (`setUTCDate`/`getUTCDate`) plus contract documentation on `detectGaps` and `splitRange` |
| `capabilities/availability/test-support/availability.calendar.tz-fixture.mjs` | modified, tracked | `gaps` and `splits` fixture arrays and payload sections added; purely additive |
| `capabilities/availability/availability.calendar.gaps.test.js` | **new, untracked** | focused suite, 27 tests |
| `docs/ai/BOOKING_CALENDAR_GAPS_1_REPORT.md` | **new, untracked** | this report |

Diffstat for the two tracked files: `148 insertions(+), 3 deletions(-)`, of which 3 lines are
behavioural (`setDate`→`setUTCDate`) and the rest are documentation or fixture additions. The
3 deletions are the 3 `setDate`/`getDate` lines being replaced; no other baseline line is
modified or removed.

Nothing has been staged or committed. The two new files are untracked and are **not** part of
any commit; they become part of the repository only when someone stages and commits them.

### Explicitly NOT touched

- `capabilities/persistence/repositories/reservation/reservation.repository.js` — untouched;
  the legacy expansion isolation from `97b9958` is preserved as frozen.
- `expandRange`, `calculateAvailability`, `calculateOccupancy`, `normalize`, `findFreePeriods`,
  `findBlockedPeriods` — untouched.
- `mergeRanges`, `detectOverlap` — reviewed, no local-time date arithmetic, left unchanged.
- Dependencies, schema, configuration, `package.json` — untouched. No dependency added or
  installed. No test runner wiring; the new suite is invoked directly.
- No physical database, no network, no application bootstrap.

---

## 9. The retained test suite

New file `capabilities/availability/availability.calendar.gaps.test.js` (**currently untracked**),
framework-free and matching the style of the existing `availability.calendar.utc.test.js`. It
imports only the real `AvailabilityCalendar` and uses no database, network, or application
bootstrap. **This is the verification basis for this change.**

### Preserved-contract tests (in-process, timezone-independent)

- `detectGaps`: empty input, single range, adjacent ranges, overlapping ranges, identical
  ranges, one-day gap, multi-day gap, month boundary, year boundary, leap day (present in 2024,
  absent in 2023), three ranges producing two gaps, and input non-mutation.
- `detectGaps`: `days` always equals `expandRange(start, end).length` for every emitted gap.
- `splitRange`: no splits, split equal to the range start, split equal to the range end, split
  beyond the end, unsorted splits, month/year/leap boundaries, absent Feb 29 in a common year.
- `splitRange`: segments tile the original range exactly — first segment starts at `start`,
  last ends at `end`, each segment begins the day after the previous ends, and the total
  covered length equals the length of the original range. Checked on the four drifting split
  dates from section 5 and the two non-drifting controls.

### Timezone matrix (child process per zone)

Zones: `UTC`, `America/Santiago`, `Australia/Lord_Howe` — the three zones named in the task
brief. Each runs the real module in a child process with `TZ` set in the child's environment
before start; `process.env.TZ` is not mutated in-process, which is unreliable on Windows.

The fixture payload carries 14 `expansions`, 17 `gaps` and 17 `splits` entries. Each child
asserts:

1. the **effective zone** resolved from the child process, not merely the requested string;
2. the **January and July UTC offsets**, so an ignored `TZ` fails instead of silently counting
   as coverage of a zone never exercised;
3. `detectGaps` returns the **exact literal objects** for all 17 gap fixtures;
4. `splitRange` returns the **exact literal objects** for all 17 split fixtures;
5. every emitted gap satisfies `days == expandRange(gap.start, gap.end).length`;
6. the same inputs produce **byte-identical** gap and split output in all three zones.

### The expected values are literals, not derived from UTC

This distinction matters for how much weight the suite carries. `EXPECTED_GAPS` and
`EXPECTED_SPLITS` contain hard-coded date strings — transcribed calendar facts such as
`{ start: '2026-10-04', end: '2026-10-04', days: 1 }`. **No expected value in the suite is
produced by running the implementation in UTC.** If the implementation were wrong in every zone
including UTC, these assertions would still fail.

UTC appears in the suite only in three supporting roles, none of which is the source of truth:

| Role | What it does |
| --- | --- |
| Zone-independence check | asserts Santiago and Lord Howe produce byte-identical JSON to UTC — a consistency assertion, redundant given the literal checks |
| Negative control | asserts the baseline implementation was already correct in UTC, bounding the blast radius of the change |
| Self-consistency invariant | uses `expandRange` as an independent oracle for the `days` count |

### Regression proof against the original implementation

The tests reconstruct the original `detectGaps` and `splitRange` from the **pinned** commit
`97b9958af8726f59130357ad2a9271fea4443353` into an isolated temp directory, verify the copy
really contains the local-time `setDate` calls and does not contain the UTC fix, byte-compare
the temp file against `git show`, run the **same** fixture against it, and assert the literal
malformed outputs from section 3.

- The baseline is pinned to an explicit commit, **not** `HEAD`. If this work is later
  committed, `HEAD` would hold the corrected implementation and the comparison would silently
  compare the fix against itself and pass vacuously. Pinning prevents that.
- The temp directory is removed in a `finally` block on every path, including when `git show`
  or a validation assertion throws.
- A final test asserts the temp copy is gone and that the worktree calendar file still holds
  the UTC steps.
- `HEAD` is never moved and no worktree file is written by the comparison.
- The pinned commit must exist in the repository for this test to run. It does today, as
  `HEAD`.

---

## 10. Existing behaviour deliberately preserved

| Behaviour | Status |
| --- | --- |
| `detectGaps([])` → `[]` | unchanged |
| `detectGaps([oneRange])` → `[]` | unchanged |
| Adjacent ranges → no gap | unchanged |
| Overlapping ranges → no gap | unchanged |
| Gap bounds inclusive, one-day gap as `{start: d, end: d, days: 1}` | unchanged |
| `days` = `Math.floor((currStart - prevEnd) / (1000 * 60 * 60 * 24)) - 1` | **unchanged, byte-identical to the baseline** |
| `detectGaps` does not mutate its input | unchanged, now tested |
| `splitRange` sorts split dates internally | unchanged |
| Split at range start or beyond range end ignored | unchanged |
| Valid range with no usable split → the whole range as one segment | unchanged |
| Invalid range (`end` before `start`) → `[]` | unchanged |
| Unparseable or otherwise unsupported bounds → **not certified**; existing comparisons may also yield `[]` | unchanged, uncertified |
| Segment `{start, end}` output shape | unchanged |
| UTC behaviour of every method | unchanged |

An earlier draft of the `splitRange` documentation stated it returns "an empty result for a
range with no usable split". That was wrong and contradicted both the implementation and the
tests: for a valid range with no usable split, the method falls through to the final segment
push and returns the whole range. The doc comment has been corrected.

That correction must not be read as "`splitRange` returns `[]` **only** when `end` is before
`start`. The method validates nothing, so an unparseable bound produces an `Invalid Date` whose
comparisons are all false and can also fall through to `[]`. The claim is limited to the two
cases this work actually covers: **a valid range with no usable split returns the whole range
as one segment**, and **a reversed range returns `[]`**. Inputs outside the valid-input domain
are deliberately left uncertified — see the residual-risk note on `splitRange` validating
nothing in section 13, which records this as pre-existing and out of scope.

`UTC` is the control zone throughout: the baseline was already correct there, and the retained
suite confirms UTC output is unchanged both before and after the fix. The change therefore
affects behaviour only where behaviour was previously wrong.

---

## 11. Product ambiguity

**None. No decision is needed from the product owner.**

The instruction was to change `splitRange` only if a concrete defect was demonstrated and the
intended behaviour was established. Both conditions are met without ambiguity:

- **The defect is demonstrated** with literal wrong outputs in section 3.4, and the original
  implementation itself returned the correct value in the same zone for nearby non-transition
  dates, so the correct behaviour is not a matter of interpretation.
- **The intended behaviour is already established** by three independent, consistent sources:
  the method's own existing output on every non-transition date; the inclusive-range contract
  that `expandRange` and the rest of the calendar already implement and that
  `availability.calendar.utc.test.js` asserts; and the internal consistency requirement that
  splitting an inclusive range must partition it. The fixed output is the only value that
  satisfies all three.

The minimal change was therefore made without pausing for confirmation.

---

## 12. Retained suite results

These four suites are the verification basis for this change. **All four were re-run after the
final code state**, i.e. after both the `Math.round` → `Math.floor` restoration and the
`MS_PER_DAY` hoist removal. These are the current numbers, not carried over from an earlier
revision.

| Suite | Command | Result | Exit code |
| --- | --- | --- | --- |
| Focused gaps suite (new, untracked) | `node capabilities/availability/availability.calendar.gaps.test.js` | 27 / 27 | 0 |
| Calendar UTC suite (existing) | `node capabilities/availability/availability.calendar.utc.test.js` | 26 / 26 | 0 |
| Availability capability suite (existing) | `node capabilities/availability/availability.capability.occupied-nights.test.js` | 19 / 19 | 0 |
| Reservation occupied-nights suite (existing) | `node capabilities/persistence/repositories/reservation/reservation.repository.occupied-nights.test.js` | 101 / 101 | 0 |

The two suites requested for this correction — the gaps suite and the calendar UTC suite — were
run first and passed; the two pre-existing suites were then re-run as well so that every row
above reflects the same final code. `node --check` on the modified module also exits 0.

The new suite is not wired into any runner or `package.json` script and must be invoked
directly. No existing runner was modified.

Repository state at delivery:

- `git diff --check` — exit 0, no whitespace errors.
- `git diff --cached --check` — exit 0.
- `git rev-parse HEAD` — `97b9958af8726f59130357ad2a9271fea4443353`, **unchanged**.
- `git status --short --untracked-files=all` — two modified tracked files plus two new
  untracked files; no temporary probe scripts remain.
- Nothing staged, committed, pushed, merged, or deployed. No database access.

---

## 13. Residual risk and limitations

1. **No production callers today.** `git grep` over the whole worktree, including untracked
   files, finds no call site for `detectGaps`, `splitRange`, `mergeRanges` or `detectOverlap`
   outside the definition, the tests, and documentation. The immediate blast radius is
   therefore the pure calendar engine itself. The methods remain part of the capability's
   documented public API (`docs/architecture/AVAILABILITY-CAPABILITY.md`) and of the ROADMAP
   deliverable, so the fix matters for the first caller rather than being dead code.
2. **Zone coverage is three zones.** The retained suite covers `UTC`, `America/Santiago` and
   `Australia/Lord_Howe`, the zones named in the brief. The exploratory sweep in section 7
   touched twelve zones, including `America/Havana`, `Pacific/Chatham`, `Asia/Kathmandu`,
   `Asia/Tehran` and `Europe/London`. `America/Havana` had the highest baseline
   `detectGaps` failure count of any zone probed and is **not** covered by a retained test.
   Extending the zone list is a test-only change; it was not requested here and is recorded as
   a gap rather than claimed as coverage.
3. **No exhaustive retained verification.** There is no committed exhaustive sweep. The
   retained suite is 27 targeted tests. Sections 5, 6 and 7 are exploratory and are not
   reproducible; the numbers in them must not be cited as verification.
4. **Completeness of the drift-date list is unproven.** Section 5 lists dates found by a
   deleted exploratory script. The retained fixtures pin those dates but do not establish that
   they are the only drifting dates, in these zones or in any zone or year.
5. **`splitRange` validates nothing.** Reversed and unparseable inputs follow whatever
   `new Date` produces. Pre-existing, not timezone-related, left unchanged as out of scope.
   Worth a separate task if inputs can be user-supplied.
6. **`mergeRanges` mutates the objects it merges.** It copies the array but not the range
   objects, so `last.end = ...` writes into the caller's object. Observed during review; not a
   timezone defect, has no callers, left unchanged as out of scope.
7. **`detectGaps` does not validate its input domain.** This is precisely why `Math.floor` was
   kept rather than "simplified" to `Math.round`; see section 1. Timestamps carrying a time of
   day are neither supported nor defined, and remain undefined.
8. **`detectGaps` requires sorted, non-overlapping input.** It does not sort or validate. That
   precondition is now documented on the method.
9. **The two new files are untracked.** Until they are staged and committed, the fix has no
   test coverage in the repository, and the regression test's pinned baseline commit is
   currently the same as `HEAD`.

---

## 14. Pending decisions — not resolved here

These remain open and are **not** addressed by this task:

1. **PostgreSQL certification** — still outstanding; requires a physical database.
2. **Historical-release policy — record-less legacy reservations only.**
   Legacy reservations without a versioned occupied-night record do not carry
   an explicit list of the dates originally consumed. Applying corrected
   arithmetic to their stored range does not, by itself, establish that list.
   Their release policy remains pending. This does not establish that the
   stored range itself is corrupt.
   Versioned-record validation and recorded-date release were implemented
   in BOOKING-OCCUPIED-NIGHTS-1B. Physical PostgreSQL certification and the
   separately listed integration/deployment gates remain pending.
3. **Mock cancellation routing** — still outstanding.
4. **Pricing integration** — still outstanding.
5. **Stage certification** — this task must be certified before proceeding, per the
   `BOOKING-CALENDAR-UTC-1` follow-up decision. `detectGaps` was previously recorded as a
   demonstrated unfixed defect; the defect is now fixed and covered by the retained suite, so
   the corresponding section of `docs/ai/BOOKING_CALENDAR_UTC_1_REPORT.md` should now be read
   as superseded on that point. Certification should rest on the retained suite results in
   section 12, not on the exploratory figures in sections 5 to 7.

Also noted for the record: the UTC report states that `splitRange` had "no demonstrated
failure". This report supersedes that statement — a failure was demonstrated, it is fixed
here, and the retained suite covers it.

---

## 15. Deliverables

| Deliverable | Git state |
| --- | --- |
| `capabilities/availability/availability.calendar.js` — 3 behavioural lines plus contract documentation | modified, tracked, unstaged |
| `capabilities/availability/test-support/availability.calendar.tz-fixture.mjs` — `gaps` and `splits` fixtures, additive | modified, tracked, unstaged |
| `capabilities/availability/availability.calendar.gaps.test.js` — 27 focused tests | **new, untracked** |
| `docs/ai/BOOKING_CALENDAR_GAPS_1_REPORT.md` — this report | **new, untracked** |

No probe scripts, scratch files, or temporary directories remain in the worktree. All seven
temporary investigation scripts created during this task, including those behind the figures in
sections 5 to 7, were deleted.
