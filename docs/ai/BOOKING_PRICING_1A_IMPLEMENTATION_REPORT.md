# BOOKING-PRICING-IMPLEMENTATION-1A — Implementation Report

**Status:** implementation complete, tests green, **not activated**
**Baseline:** `b6c0d3bd00e492faf0813992ac3ebcb6f43749a6` (`p15.3-development`, APP ZONE integration head)
**Worktree:** `C:\Users\casa\Documents\booking-pricing-1a`
**Branch:** `booking-pricing-1a` — HEAD is still the baseline commit; all changes are unstaged and uncommitted

> This revision covers the targeted review pass. A remediation summary is in
> section 9. Sections 1–8 describe the slice as it now stands.

---

## 1. What was built

A reusable, product-agnostic accommodation pricing engine plus an inert Ensueño policy
declaration. Nothing in this slice is reachable from the running application.

| File | State | Purpose |
| --- | --- | --- |
| `capabilities/pricing/pricing.policy.js` | new, 710 lines | Normalization, validation, immutable copies, canonical identity |
| `capabilities/pricing/pricing.calculator.js` | new, 501 lines | Pure price calculation and UTC date-list validation |
| `capabilities/pricing/pricing.test.js` | new, 1985 lines | 155 focused tests, no DB/network/filesystem |
| `docs/ai/BOOKING_PRICING_1A_IMPLEMENTATION_REPORT.md` | new, this file | This report |
| `companies/cl/los-rios/valdi/ensueno-curinanco/config.js` | modified, +72 lines | Named export `ACCOMMODATION_PRICING_POLICY` only |

Full changed-file status:

```
 M companies/cl/los-rios/valdi/ensueno-curinanco/config.js
?? capabilities/pricing/
?? docs/ai/BOOKING_PRICING_1A_IMPLEMENTATION_REPORT.md
```

Staged files: none. Commits on this branch: none.

---

## 2. Policy declaration placement and why it is inert

`ACCOMMODATION_PRICING_POLICY` is a **named** export in the company config module. The
configuration loader reads this file and consumes `module.default` only
(`experience/source/filesystem.configuration.source.js:98-99`), so a named export is never
inspected. The provisioner is not wired to the declaration either. Therefore:

- Nothing registers, seeds, prices, or displays from this declaration.
- **The default export is unchanged.** Verified by importing the baseline and current modules
  and comparing `JSON.stringify(default)`: 2326 bytes vs 2326 bytes, identical, 17 properties
  on both sides.

**Scope of that claim.** `JSON.stringify` equality proves the two modules produce the same
*serialized exported data*. It does **not** prove byte identity of the source file: two
source files can differ in whitespace, key order, line endings, or encoding while
serializing identically. The only textual change inside `config.js` is the closing brace
gaining a trailing newline, plus the appended block, confirmed from the git diff. No encoding
normalization was performed; the mojibake seen in pasted diff output is a terminal rendering
artifact, and raw-byte inspection was unnecessary because the byte-length and
serialized-value checks already agreed.

### Temporary coexistence of legacy fields

The legacy fields in the default export are still the **only** values the runtime can observe,
and they still carry pre-policy figures:

- `experiences[].pricePerNight` → `90000`
- `capabilities.booking.configuration.basePricePerNight` → `90000`
- `capabilities.booking.configuration.pricePerNightFourGuests` → `100000`
- `capabilities.booking.configuration.additionalGuestPerNight` → `8000`

These are **not** a second source of truth and must not be read together with the new
declaration. They are intentionally retained (not deleted) in this slice and are scheduled for
removal in the activation slice, together with the wiring that replaces them.

`config.json` in the same directory is an inert duplicate. It was **not modified and not
deleted**. An earlier planning pass proposed deleting it; that is out of scope here and was
not done.

---

## 3. Approved commercial policy (as declared)

CLP per cabin per occupied night, checkout excluded. One cabin consumes one inventory unit per
night. Unchanged by the review pass.

| Guests | With hot tub | Without hot tub |
| --- | --- | --- |
| 1–2 | 90000 | 80000 |
| 3–4 | 100000 | 90000 |
| 5 | 108000 | 98000 |
| 6 | 116000 | 106000 |

- Standard sleeping capacity `4`; maximum occupancy `6`.
- Guests 5 and 6 bring their own mattress.
- Additional guest: `8000` per guest per night, applied above 4 guests.
- Check-in `16:00`, check-out `13:00`.
- Inclusions: pools, saunas, quartz beds, camping-area access; the hot-tub option adds
  `tinaja` and is the only inclusion difference between the two options.

Model: **nightly occupancy tiers with an additional-guest charge above a threshold.** No
per-person activity mode was introduced.

---

## 4. Money contract

Amounts are integer **currency units**, not minor units. The active declaration is in CLP, a
currency with no minor unit, so an amount denotes whole pesos: the `t1_2` rate for the
hot-tub option is the literal per-night figure in the declared currency.

Not in scope here, and still open for activation:

- **Persistence type.** Whether these integers are stored in a `DECIMAL` column, and whether
  validation confirms the chosen column range or conversion preserves them exactly, is an
  activation concern. This module chooses no persistence type.
- **Other currencies.** The engine validates only the three-uppercase-letter shape of a
  currency code. It does not verify that a code is a supported ISO currency, nor that the
  currency's exponent matches the amounts. A test asserts this explicitly by confirming that
  `ZZZ` is accepted on shape alone.

No tariffs were changed, no currency conversion was added, and no multi-currency subsystem was
introduced. `PRICING_MAX_SAFE_AMOUNT` is an arithmetic guard, not a monetary scale.

---

## 5. Engine contract

`pricing.policy.js`
- `resolvePolicy(raw)` returns `absent`, `valid`, or `invalid` — absent is distinguishable
  from malformed, and absent exposes neither policy nor fingerprint.
- Field-by-field normalization; unknown keys dropped; no non-numeric amount is coerced to zero.
- Recursive immutable copy: the resolved policy no longer aliases the declaration and is
  deeply frozen (a shallow freeze is explicitly tested and rejected).
- Rejected: negative, fractional, and beyond-safe-integer amounts; gaps or overlaps in tier
  coverage; coverage that stops short of standard capacity; a tier extending above standard
  capacity; occupancy above standard capacity with no `additionalGuests`; duplicate option ids;
  duplicate tier ids, including contiguous non-overlapping ones; unknown basis; unknown,
  missing, null, or wrongly typed `schemaVersion`; a non-object declaration.
- `schemaVersion` must be **exactly** `PRICING_SCHEMA_VERSION`. A missing value is a defect,
  never a wildcard: a policy that does not declare which contract it satisfies cannot be
  assumed to be interpreted as this one.
- Every count and bound must be a **safe** integer. `Number.isInteger` accepts magnitudes far
  beyond 2^53-1 (`1e300` is an "integer" to it), which would then lose precision in
  arithmetic.
- Currency must be exactly three uppercase ASCII letters.
- Check-in/check-out must be real 24-hour `HH:MM` values: 00–23 hours, 00–59 minutes.
- Option labels and declared condition text must be nonblank.
- **Present-but-malformed is never normalized into absence.** `additionalGuests` or its
  `condition` that is present but not a plain object is recorded as malformed and rejected.
  Silently degrading a broken declaration to "no additional-guest terms" would under-charge
  every guest above standard capacity. Legitimate omission (`null` or an absent key) is still
  accepted, and the documented normalized representation is preserved.
- Invalid policies surface `PricingPolicyError` / an `invalid` resolution through the supported
  public entry points, never an incidental `TypeError`.

`pricing.calculator.js`
- `calculateAccommodationPrice({ policy, optionId, guestCount, occupiedDates })`.
- Revalidates the policy so a defect can never reach arithmetic; refuses an unsupported basis.
- Validates the option (absent, unknown, and non-string ids are errors, never defaulted) and
  the raw guest count **before** any coercion. Guest counts must be safe integers.
- Base rate is selected on the guest count capped at the additional-guest threshold, so guests
  5 and 6 price on the top declared tier plus the per-guest charge.
- Explicit occupied-date list: nonempty, strict `YYYY-MM-DD`, real calendar dates, unique,
  ascending, consecutive. Duplicates, descending order, gaps, and impossible dates
  (`2026-02-30`, `2026-11-31`, `2026-04-31`, non-leap `02-29`) are all rejected with distinct
  codes.
- Overflow and invalid arithmetic rejected via the safe-integer guard.
- The fingerprint is **always recomputed** from the policy being priced; a cached
  `__fingerprint` is ignored on purpose, so a stale or altered field cannot misidentify a
  snapshot.

### Condition applicability
A declared condition surfaces only when the party **both** has a genuinely additional guest
**and** has reached `condition.fromGuest`. Both tests are required: a condition beginning at
guest 6 must not appear for a party of five, even though the fifth guest is charged the
additional rate. Validation constrains `fromGuest` to the additional-guest range
(`threshold + 1 .. maxOccupancy`): a condition at or below the threshold would attach to guests
charged nothing extra, and one above `maxOccupancy` could never apply at all.

Approved Ensueño behavior is preserved: no condition at 1–4 guests, condition present at 5 and
6. A generic fixture with a condition beginning at guest 6 verifies absence at five and presence
at six.

### Guest-count string form
`/^\d+$/` originally also admitted zero-padded values such as `"03"`. That was tightened to
require a canonical decimal round trip, so `"3"` is accepted while `"03"` and `"0003"` are
rejected. Two spellings of one count would otherwise let a raw-value-keyed log or fingerprint
disagree with what was actually priced.

### Date handling is UTC-only, by construction
All parsing uses `setUTCFullYear`/`getUTC*` and never a local-time accessor, so results cannot
shift with the host timezone or a DST transition. Leap-day and DST-spanning lists are covered.

**Date logic was not modified during the review pass**, so the timezone sweep was not repeated.
The earlier sweep (110/110 under `UTC`, `America/Santiago`, `UTC+13`, `Australia/Lord_Howe`,
`Pacific/Kiritimati`, `Asia/Kathmandu`) remains the record for that code path, which is
byte-identical to what shipped in the first pass.

This slice **does not change** the repository/calendar date algorithm. The prior audit finding
(a local-time `setDate` year-borrowing defect, demonstrated on Santiago and Lord Howe) stands
as a prerequisite for the activation slice and is unresolved here.

---

## 6. Policy identity and fingerprint

The fingerprint is a **revision identifier**: a stable content-derived id so two processes can
tell whether they are looking at the same terms.

It is **not** a signature, MAC, token, or any form of authorization or acceptance. FNV-1a is
unkeyed and trivially recomputable by anyone holding the policy, so it proves nothing about
provenance and nothing about who agreed to what. It must never be used to decide that a quote
or booking is authentic, unchanged since issuance, or approved. Anything with those
requirements needs a keyed construction in the activation slice; none is introduced here.

### What the identity covers

Included, because each can change the commercial terms without moving a rate:

- `schemaVersion` — a different contract is a different agreement, even at identical rates.
- Check-in and check-out times — arrival and departure deadlines are terms the guest accepts.
- Option `inclusions` — what the guest actually receives. The two options are priced and
  deliver differently; the delivered set is the obligation. This is covered by the policy as a
  whole rather than per option, so swapping which option delivers the hot tub is detected even
  when the rate is unchanged.
- `additionalGuests.condition.text` and `.fromGuest` — the stated requirement and the guest
  count from which it applies. A guest charged an extra rate is entitled to know under which
  condition.
- Basis, currency, capacities, tier ranges, every rate, the additional-guest threshold and
  rate, and the option identity set.

**Excluded, documented boundary: option `label` only.** A label is display-only copy used where
the option is presented; it is not part of what is agreed and is routinely restyled or renamed
without touching price or obligations. Excluding it keeps a pure rename from invalidating
outstanding quotes. If a label ever becomes legally or commercially operative, it belongs in the
identity and this boundary must be revisited.

### Encoding

Identity is `JSON.stringify` of an explicitly ordered canonical structure — not
delimiter-concatenated identifiers. Object key order is fixed by the literal, so the rendered
document is byte-stable regardless of arrival order, and JSON quoting and escaping keep a value
containing a separator from colliding with the boundaries between fields. Unordered sets (tiers,
options, rates, inclusions) are sorted; every array is copied first, so the input is never
mutated. A test feeds condition text containing `\u0001`, `|`, `{`, `}`, `=`, and `"` and
confirms no collision with a shorter value.

---

## 7. Snapshot and line semantics

`quantity: 1`, `unitPrice: <complete stay amount>`, `lineTotal: <complete stay amount>`, with
`unitPriceBasis: 'complete_stay_per_unit'`. One occupied unit consumes one inventory unit, so
the complete-stay amount is both the unit amount and the line total. No nightly average is
stored as the unit price. The breakdown (`nights`, tier, additional-guest fields, capacities,
option inclusions, mattress condition) is part of the snapshot.

Deliberately absent from the snapshot: any tax inclusion/exclusion flag, any tax amount, and any
statement that the price was persisted, accepted, or commercially confirmed. Tax treatment is
unknown and therefore left unstated rather than guessed. No client-controlled monetary override
exists: only the option id and guest count are read from the caller, and every amount comes
from the policy.

---

## 8. Verification performed

```
node capabilities/pricing/pricing.test.js
```
**Results: 155 passed, 0 failed (exit 0).**

```
node web/config-authority.test.js
```
**Results: 6 passed, 0 failed (exit 0).**

Coverage: all 12 guest/option combinations at one and two nights against the operator figures;
tier resolution and the additional-guest rule; condition applicability including the guest-6
generic fixture; the Ensueño condition behaviour; snapshot shape and JSON round trip; breakdown
sums; line arithmetic; arithmetic guards including deliberate overflow and unsafe integers;
guest and option validation; tier-coverage and duplicate-tier-id validation; strict date parsing
and list validation; immutability and deep freeze; fingerprint determinism, stability, sensitivity,
and collision resistance; canonical-form coverage and non-mutation; identifier-key handling
including `__proto__`; typed error surfaces; layer isolation.

### Test runs that could not complete, and why

`tests/runtime/ensueno-booking-resolver.test.js` **cannot run in this worktree**: there is no
`node_modules`, and the test transitively imports `pg` via
`database/connection/postgres.connection.js`. Installing dependencies was explicitly out of
scope, and no shared `node_modules` may be touched.

That suite passing 46/46 in the `app-zone-pwa-1-integration` worktree is **not verification of
this branch** — that worktree is at the baseline commit and does not contain these changes. No
assertion in that suite has been executed against this branch. The config change is additive
(one named export, default export serialized-identical to baseline) and the test reads only
`.default`, so the risk is low, but the check is genuinely unverified and must be run once
dependencies are available.

Unrelated pre-existing blockers in the repository (missing `web/push-1.test.js` module, no
PostgreSQL connection available) were not touched.

---

## 9. Remediation pass (targeted review)

Ten review items, all closed. The approved tariff matrix and the product declaration were not
modified.

**Identity completeness.** `canonicalPolicyForm` previously excluded `schemaVersion`, check-in
and check-out times, option inclusions, and the condition text and applicability — all of which
can change the agreed terms while leaving every amount untouched. All are now included. Option
`label` remains excluded, with the display-only rationale documented in code and in section 6.

**Canonical encoding.** The old fingerprint built its input by joining fields with `|`, `:`,
`{}`, `,` and `=` separators. It now hashes `JSON.stringify` of an explicitly ordered canonical
structure. Sorting is done on copies, so `canonicalPolicyForm` no longer mutates its input
(asserted by test).

**Fingerprint is a revision id, not a signature.** Documented as such at the function and in
section 6, including the explicit prohibition on using it for authenticity or acceptance. No
token or acceptance infrastructure was added.

**`schemaVersion` is now mandatory and exact.** Previously `null` was accepted silently.

**Duplicate tier ids rejected**, including the case that motivated the fix: two contiguous,
non-overlapping bands sharing one id. A test pairs the rejected case with an accepted control.

**Safe integers required** for capacities, tier bounds, additional thresholds, condition
applicability, and guest counts.

**Currency validated as exactly three uppercase ASCII letters**, with an explicit test that a
syntactically valid but non-ISO code is still accepted, documenting the limit of the claim.

**Times validated as real 24-hour values.** The previous `^\d{2}:\d{2}$` accepted `24:00` and
`23:60`.

**Blank labels and condition text rejected**, using the existing trimmed representation.

**Present-but-malformed no longer becomes absence.** A non-object `additionalGuests` or
`condition` is now recorded as malformed and rejected instead of normalizing to `null`.

**Typed error surface.** Defective declarations across 12 shapes are asserted to produce
`PricingPolicyError` and an `invalid` resolution through `resolvePolicy`, `normalizePolicy`, and
`validatePolicy`, never a `TypeError`. `canonicalPolicyForm` is asserted not to throw on a
defective policy, since the calculator calls it directly.

**Own-property rate checks and identifier keys.** `in` was replaced with
`Object.prototype.hasOwnProperty.call`, so an inherited member such as `constructor` can no
longer satisfy tier coverage. Rate maps are built with `Object.create(null)` and populated via
`Object.defineProperty`, so a `__proto__` tier key is captured as ordinary data and then
rejected, rather than reassigning a prototype. `copyPolicy` was hardened the same way.
`__proto__`, `constructor`, and `prototype` are refused as tier and option ids.

**Condition applicability.** The calculator previously emitted the condition whenever
`extraGuestCount > 0`, ignoring `condition.fromGuest`. It now requires both, and validation
bounds `fromGuest` to the additional-guest range. The approved Ensueño behaviour is asserted
unchanged.

**Money contract documentation.** The header comment previously mixed "integer minor units"
with currency units. Both modules now state plainly that amounts are integer currency units,
and list persistence-type and multi-currency concerns as explicitly deferred to activation.

**Two incidental defects found and fixed while testing.** Two tariff literals had been written
into engine comments as illustrative examples, which the layer-isolation test correctly flagged;
both were reworded. Separately, guest-count validation used `Number.isInteger`, which accepts
`1e300`; it now requires a safe integer.

---

## 10. Remaining activation limitations

Not implemented here, by instruction:

1. Wire the declaration into booking and eliminate the legacy `90000/100000/8000` fields as a
   second source of truth.
2. Persist snapshots, define acceptance, and decide the cancellation and modification model.
3. Choose the persistence type for monetary amounts and validate that the chosen range or
   conversion preserves them exactly.
4. Provision/seed integration.
5. API and UI exposure.
6. Resolve the calendar date-algorithm defect found in the audit.
7. Add dependency-backed regression runs, including the resolver suite.
8. If quotes ever need authenticity or acceptance guarantees, a **keyed** construction; the
   current unkeyed fingerprint cannot serve.

### Corrections to carry into later slices

- **Snapshot immutability includes the full breakdown.** A total plus a currency is not enough
  to reconstruct what was charged; the itemisation must be stored immutably as well.
- **Ordinary updates must not replace a pricing snapshot with a newer version.** Preserve the
  snapshot taken at booking.
- **Historical consumed dates and release are a separate concern** requiring a bounded
  correction, not an incidental edit alongside this work.
- Option-aware copy is already authorized; no additional approval is needed.
- No HMAC secret and no acceptance infrastructure is introduced in this slice.
- The provisioner creates missing rows, which is a write. It must not be called as part of
  pricing.

---

## 11. Constraint compliance

- Work performed only in the isolated worktree on its own branch. Main (`551e631`) and the APP
  ZONE worktree (`b6c0d3b`, clean status) are unmodified.
- Files edited during the review pass are limited to the four authorized paths. `config.js` was
  not touched by this pass; its diff against baseline is unchanged at +72 lines.
- No commit, staging, push, merge, or deploy.
- No dependency installation; no shared `node_modules` modified.
- No network, physical database, provisioning, or application bootstrap.
- No SSH or contact with Stage or any shared infrastructure.
- No runtime activation, API, UI, persistence, cancellation, or historical-data change.
- Tariff matrix and product declaration unchanged.
- `config.json` neither modified nor deleted.
- `docs/ai/CURRENT_STATE.md` not edited.
- No encoding normalization; mojibake in pasted output was treated as a terminal rendering
  artifact and not acted on.
