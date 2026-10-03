# BOOKING_RELEASE_READINESS_1 — Cancellation Release Gate Audit (refined)

Static, code-only audit. No database access, no historical-row inspection, no runtime probes, no
executable changes. HEAD `392d2d3e7f1ce2a62e1504c6eac6487fdbfedf80` (`booking-pricing-1a`).

> **Update — BOOKING-LEGACY-RELEASE-GATE-1 (implemented).** D1 is decided: unresolved historical
> `DATE_RANGE` consumption is **refused**, at `#resolveRecordedReleaseDates`, for both adapters, before
> any write. `#legacyExpandDateRange` and `source: 'legacy'` no longer exist; the
> `#legacyLocalExpandRange` arithmetic remains only for non-`DATE_RANGE` creation-time consumption.
> Superseded claims below are the ones marked *(superseded)*; the audit's other findings — §2 mock
> atomicity, §3 manager/business release, §4 expiration reachability, §2.3 divergences — are unchanged
> and still stand as written. Line references in the original text were accurate at the audited HEAD and
> are left as historical record; see `docs/ai/BOOKING_LEGACY_RELEASE_GATE_1_REPORT.md`.

## Call chain

`api/routes/reservation.routes.js:403 cancel` -> `:415` tenant-scoped / `:429` service ->
`reservation.service.js:24` -> `reservation.manager.js:312`, also reached from
`reservation.capability.js:121`, `owner.manager.js:167`,
`admin/reservation-admin/reservation.admin.js:106` and
`business/manager/business-reservation.manager.js:192` -> `:196` delegate -> same method, **then**
`:197-203` a second release attempt. Manager `:312`: `:313` permission, `:314` load, `:319`
transition, `:322` branch on `config.persistenceProvider === 'postgres'`, `:324-330` repository
path, `:331-343` else path. Repository: `reservation.repository.js:786
cancelReservationWithRelease` (adapter gate `:791`), mock `:793-799` via
`#releaseMockCapacity:740`, PostgreSQL `:801` in `transaction()` -> `:838
releaseReservationLines` -> `:468 #resolveRecordedReleaseDates`. Record key `__occupiedNights`
(`:15`), expansion version `1` (`availability.occupied-nights.js:49`).

## 1. Legacy refusal scope — narrow condition

`#resolveRecordedReleaseDates` (`:468-484`) has three branches, and **record absence is not by
itself a defect**:

- `:472-476` no record **and** `temporal.mode !== 'DATE_RANGE'` -> `{ dates: [], source:
  'not-applicable' }`. Record absence here is **expected, not a defect**: `#prepareNewLineConsumption`
  (`:228-233`) returns `consumption: null` for non-DATE_RANGE lines, and `#buildLineMetadata`
  (`:268-276`) deletes any caller-forged `__occupiedNights` (`:272`) and assigns a record only when
  one genuinely exists (`:273-274`).
- *(superseded)* `:477` no record **and** `mode === 'DATE_RANGE'` -> `#legacyExpandDateRange` (`:120-121` ->
  `#expandDateRange:67`), `source: 'legacy'`. This is the unproven case. **Now:** this branch refuses
  with `AvailabilityConsumptionRecordError` instead of expanding bounds; the legacy release source is
  gone.
- `:480-483` record present -> `#validateConsumptionRecord`, `source: 'recorded'`.

**Expected absence does not prove "never consumed capacity" — and the mechanism does not either.** For
non-DATE_RANGE lines `#prepareNewLineConsumption:231` still derives `dates` via `#expandDateRange`,
and **create consumes them in both adapters**: PostgreSQL loops those dates incrementing
`reserved_count` (`reservation.repository.js:528-550`, `WHERE ... AND reserved_count + $1 <=
inventory`), and the mock does `#consumeMockAvailability(r, dates, quantity, availStore)` (`:662-664`
against `:703-731`). Release for the same line returns `dates: []` (`:474-476`), so a
`source: 'not-applicable'` line that *did* consume capacity would be released by nothing: the night
stays held and the line never gets `releasedAt`.

**But no supported caller can reach that state.** The only production caller of
`createReservationWithLine` is `reservation.manager.js:153`, whose `lineData.temporal` is hard-coded
to `{ mode: 'DATE_RANGE', … }` (`:140`), and the other creation path writes no line (`:158-159`). The
`not-applicable` branch is therefore reachable only by direct repository callers — **permissive
input, not an established contract** (evidence in D5). It is a latent hazard, not an in-product leak.

Therefore:

**Recommended condition: refuse on `source === 'legacy'`** — record absent *and*
`temporal.mode === 'DATE_RANGE'`. Leave `recorded` releasing. The predicate belongs at the `:477`
branch so both adapters inherit it. `#readLineMetadata` (`:334`, corrupt-string throw `:344`) is
unchanged and still guards a case C record. *(superseded — implemented as recommended; the predicate is
now the refusal itself, and the throw happens inside the per-line plan before either adapter's mutation
loop.)*

`not-applicable` must **not** be blanket-refused either — that would make every directly-submitted
non-DATE_RANGE line uncancellable. Leave the permissive branch behaving as it does and document it as
unsupported input; no refusal, no date inference. Resolved as **D5**.

## 2. Mock atomicity — corrected characterization

The mock release is **not** correct in the sense implied previously. What is already true: record
resolution for every candidate runs up front via `.map` in the plan (`:756-759`, `:856-859`), so an
invalid or absent-record case C aborts before any store write. What is **not** true: this
prevalidation covers the *record* only. Capacity preconditions are evaluated **during** mutation.

- **Ordering is inverted, and ordering is not atomicity.** Mock releases capacity first, then updates
  status (`:794` then `:795`). PostgreSQL updates status first (`:802-818`) then releases (`:826-830`)
  inside `transaction()` (`:801`). Reordering alone only moves the window; it does not make the pair
  atomic. If `update` throws after capacity was released, capacity is released and status is not; if
  capacity application throws after status was written, status is cancelled and capacity is not.

### 2.1 What the in-memory store actually is

`this.adapter?.constructor?.store` resolves to exactly one class:
`InMemoryRepositoryAdapter` (`tests/capability/capability.mock.repositories.js:88`). Relevant bodies:

```js
static store = new Map()                       // :89  entityName -> Map(id -> row)

#table() {                                     // :96-101  lazily CREATES the table on read
  if (!InMemoryRepositoryAdapter.store.has(this.entityName)) {
    InMemoryRepositoryAdapter.store.set(this.entityName, new Map())
  }
  return InMemoryRepositoryAdapter.store.get(this.entityName)
}

async update(query = {}, data = {}) {          // :157-164  whole-object replacement
  const matched = this.#matching(query)
  if (matched.length === 0) return null        // :159  RESOLVES null, does not throw
  const first = matched[0]
  const updated = mergePaths({ ...first }, data)
  this.#table().set(first.id, updated)
  return updated
}

async beginTransaction()  { return { id: `inmem_tx_${Date.now()}`, provider: 'in-memory' } }  // :236
async commitTransaction() { return true }   // :237   <- no state captured
async rollbackTransaction() { return true } // :238   <- ALWAYS true, restores nothing
```

Three consequences that decide the whole mechanism:

1. **There is no transaction to use.** `beginTransaction` captures nothing and
   `rollbackTransaction` is a no-op that returns `true`. Calling it would simulate a rollback while
   changing nothing — worse than not calling it.
2. **`update` resolves `null` on no match** (`:159`); it does not throw. PostgreSQL instead throws
   when `RETURNING *` yields no row (`:820-824`).
3. **There is no interleaving inside the capacity mutation.** `#releaseMockCapacity` (`:740-784`)
   contains **no `await`** — `#mockAvailabilityRow` (`:693-701`), `#readLineMetadata` (`:334`),
   `#resolveRecordedReleaseDates` (`:468`) and every `Map.set` are synchronous, and the method is not
   even declared `async` (it is called un-awaited at `:794`). It therefore executes as one
   uninterrupted critical section from entry to `return`.

### 2.2 Synchronous atomic section in the repository (superseded design, implemented as BOOKING-MOCK-CANCEL-ATOMIC-1)

Two earlier proposals here are **withdrawn** and were not implemented:

- the **undo log** — its restore ran after `await this.update(...)`, so a concurrent writer's change
  to the same row would have been clobbered by pre-image replay;
- **Phase B/C decide-then-publish** — `update` is `async`, so a synchronous throw inside its body
  becomes a **rejected promise**, not a synchronous throw; calling it un-awaited and then writing
  capacity/`releasedAt` publishes those writes even though the status write failed. Likewise
  `adapter.find()` returns a Promise and cannot be inspected synchronously.

**Implemented instead** (see `docs/ai/BOOKING_MOCK_CANCEL_ATOMIC_1_REPORT.md`): a single synchronous
section `#commitMockCancellationSync` in the repository. It calls no async function and contains no
`await`, so it cannot interleave with another request; the failure modes are exception ordering, not
races.

- **Validate (reads only).** Locate the stored reservation row by `{id, tenantId, deletedAt: null}`;
  select unreleased candidates explicitly; verify line ownership and that a line's `targetId` agrees
  with the authoritative accommodation, refusing a mismatch rather than choosing one; resolve and
  validate each record with the existing policy; derive capacity deltas from the validated lines,
  aggregate them by capacity row, and reject a missing row or an aggregate shortfall.
- **Prepare.** Every replacement object is built up front. Pre-images are captured for the
  reservation row, every availability row touched and every line touched. No stored row is mutated.
- **Publish.** Status, then capacity, then `releasedAt`, in one turn.
- **Restore.** On a synchronous publication failure, replay the pre-images in reverse order through
  the pristine `Map.prototype.set`, so a failure injected on the publication path cannot also defeat
  the restore, then re-throw the original error.

**Scope:** in-process and turn-bounded only. No crash durability and no cross-process transaction
are claimed. The `AggregateError` incomplete-rollback branch is a defensive net that the supported
injection surface cannot reach.

**Where the names come from (verified, not schematic).** Table keys are `adapter.entityName` for the
reservation table (`reservation` in the runtime adapter, `reservations` in the repository test
double), `'reservation_lines'` and `'availability'`. Capacity rows are matched on
`row.accommodationId` (`#mockAvailabilityRow`), lines carry `reservationId`, `targetId`, `quantity`,
`releasedAt` and `metadata.__occupiedNights`.


### 2.3 Divergence register (handled by §2.2 unless marked open)

- **No conditional capacity write** — *handled by step 1.* Mock reads `reservedCount` and subtracts
  unconditionally (`:769`), clamped by `Math.max(0, ...)` (`:769`), recomputing status (`:774`) via
  `availStore.set` (`:770`). PostgreSQL instead uses
  `... AND reserved_count >= $1 ... RETURNING id` (`:879-893`) and throws
  `AvailabilityConflictError` when no row matches (`:895-899`). Today the mock therefore *succeeds
  silently while releasing less than it should*, where PostgreSQL refuses; the aggregated
  precondition in step 1 converts this into a refusal in both.
- **Multiple lines on one capacity row** — *handled by step 1.* The mock re-reads the row each
  iteration (`#mockAvailabilityRow:765`, `:693-701`), so it observes its own prior write and the
  arithmetic is sequential — but every line subtracts its own `line.quantity` (`:768`) with no floor
  check. Concrete divergence: inventory 1, `reservedCount` 1, two lines of quantity 1 on the same
  date. Iteration 1 decrements to 0; iteration 2 clamps `Math.max(0, 0 - 1)` to 0 and still writes
  `releasedAt` — capacity under-released, second line falsely marked released, no signal. PostgreSQL
  issues one conditional UPDATE per date and aborts the transaction on the first shortfall. Only the
  per-row aggregate precondition closes this; a per-line check would still pass both lines
  individually.
- **`released_at` writes are unconditional** — *handled by the §2.2 primitive.* Mock sets `releasedAt`
  per line inside the mutation loop (`:779`), so a line can be marked released while its decrement was
  clamped. The per-row aggregate precondition rejects that case during validation, before any write,
  and `releasedAt` is published last inside the single synchronous section.
- **Two further divergences.** Mock candidates (`:748-750`) filter on `reservationId` with no tenant
  scope, where PostgreSQL joins `reservations` on `tenant_id` (`:841-844`) — *handled by the §2.2
  primitive's tenant-scoped stored-row matching*. Mock release keys rows by `line.targetId` (`:765`)
  while mock create keys by
  `r.accommodationId` (`:706`) — **not reachable from current production callers**, which set
  `targetId: reservation.accommodationId` (`reservation.manager.js:141`). That is caller
  construction, not validation of stored rows; §2.2 verifies ownership from stored data and refuses a
  stored divergence before writing capacity. No behaviour change is proposed for unsupported direct
  repository input in this slice — see D6.
- **`#table()` mutates on read** (`capability.mock.repositories.js:96-101`): any read of an unknown
  entity creates its table. Harmless for correctness, but it means a restore pass must not treat
  "table absent" as an error condition.

## 3. Manager fallback and the business release

- **No repository — not "false success".** `#persist` (`:858-884`) throws only when `isPostgres`
  (`:879-881`); with no repo and a non-PostgreSQL config it falls through to `#cacheReservation`
  (`:883`), and `#cacheReservation` (`:842-857`) writes both `#reservations` and
  `#context.dataManager`. `#loadReservation` (`:63-83`) reads the cache **first**, then the repo, then
  `dataManager` — so cache-backed reservations are a supported, first-class read path, and
  `createRequest:158-159` creates them for the no-`accommodationId` branch. In that configuration the
  cache **is** the datastore of record, no line was ever created, and therefore no capacity was ever
  consumed: mutating the cache is a consistent cancellation, not a false success. **Recommendation:
  do not change this path's success semantics.** The one invariant worth asserting is narrower — if
  `reservation_lines` exist for a reservation while `#repo` is absent, capacity *was* consumed and a
  silent success would be wrong. That combination cannot arise from `createRequest` (`:153` throws
  without a repo) but could arise from runtime repo disposal or reconfiguration, which this audit has
  not traced.
- **Silent-success correction.** `cancelReservationWithRelease`'s mock branch returns
  `this.update(...)` directly (`:795`), and the adapter resolves `null` on no match
  (`capability.mock.repositories.js:159`). `reservation.manager.js:329` ignores the return value and
  calls `#cacheReservation(updated)` (`:330`), so a no-op release yields `{ success: true }` (`:356`)
  with nothing updated. This is the genuine silent path — and it is on the **mock** side. PostgreSQL
  throws on a zero-row `UPDATE ... RETURNING *` (`:820-824`), so it cannot produce this.
- **Business path creation.** `business-reservation.manager.js:143-152` delegates `createReservation`
  with `accommodationId`, so `reservation.manager.js:136-153` creates a DATE_RANGE line and a
  versioned record. Business-created reservations **do** have lines. `:814` (archive) calls the
  delegate directly and correctly skips the extra release.
- **Does the extra release run after a successful line-backed cancellation?** Yes. `:196` awaits the
  delegate with no `try`/`catch`, so a repository failure propagates and `:197` is skipped; on
  success `:197-205` runs. After the manager routes to `cancelReservationWithRelease`, the repository
  has already decremented `reserved_count` and recomputed status (`:879-893`), and then
  `availability.manager.js:349-369` runs over the same dates with `date.lte` (`:354`) —
  **check-out inclusive**, one night wider than any occupied-night set. Concrete over-restoration: a
  night still fully held by a *different* reservation keeps `status: 'reserved'`, so this query
  matches it and sets it `AVAILABLE` (`:358-362`) **without decrementing `reserved_count`**, exposing
  inventory that is still consumed.
- **Actual callers of `reserve()` / `release()`** (`availability.manager.js:290`, `:349`):

  | Path | `reserve()` | `release()` |
  | --- | --- | --- |
  | `api/routes/availability.routes.js:133` / `:144` (`reserve` / `release` route) | yes | **yes** |
  | `business.service.js:1373` / `:1376-1381` (`reserveDate` / `releaseDate`) | yes | **yes** |
  | `business.service.js:236-240` -> `business.manager.js:403`/`:407` | yes | yes |
  | `availability.service.js:45` / `:49` (capability service) | yes | yes |
  | `business-reservation.manager.js:201` (inside cancellation) | no | yes |

- **Conclusion — this reverses the earlier "do not remove" position.** `business-reservation.manager.js:201`
  is **not** the only caller of `release()`. A separately supported explicit hold-release operation
  exists and is unaffected by removing it: `POST`/route `availability.routes.js:144` ->
  `business.service.js:1376-1381` -> `business.manager.js:407` ->
  `business-availability.manager.js:128`. `reserve()` is reachable the same way at
  `availability.routes.js:133`, so an operator who creates a line-less `status: RESERVED` hold has an
  explicit route to release it. Combined with the finding that business-created reservations are
  always line-backed, `:201` is **redundant for line-backed cancellations and unsafe for everything
  else**, and its `catch { }` (`:203`) is what makes it silent. Recommended change: delete `:197-203`
  from the cancellation path and leave the route intact. Whether `:201` was compensating for any
  caller not visible in this tree is the one thing still unverified.
- **`reservation.selector.js:96` / `:119`** call `availability.reserveDates(...)` /
  `availability.releaseDates(...)`, which are also **absent** from the capability surface (§1). Same
  class of defect as `updateAvailability`; noted for completeness, not part of this contract.

## 4. Expiration / recovery reachability

Defined in code, but no in-tree caller establishes activity:

- `ReservationRecovery.runAllRecoveries` (`reservation.recovery.js:321`) and
  `recoverExpiredReservations` (`:219`) are exposed at `reservation.capability.js:140-141`, and
  `recoverExpiredReservations()` is reached from `runAllRecoveries` (`:323`). A whole-tree search
  finds **no other caller and no `api/` route**, so no invocation path exists in this repository.
- The timer is constructed (`reservation.capability.js:34`) and armed on create (`:87`, `:100`) with
  `autoExpiration` defaulting to true (`reservation.config.js:10`, read `reservation.timer.js:32`).
  `#scheduleExpiration` (`:121-132`) delegates to the `scheduler` capability and has **no else
  branch**: with no scheduler present the job is silently never scheduled while the timer map entry
  remains.
- The scheduled handler name `reservationExpiration` (`reservation.timer.js:126`) is **never passed
  to `registerHandler`** anywhere in the tree. `scheduler/executor.js:80-82` throws
  `Handler not found: reservationExpiration`; `scheduler.manager.js:120-122` silently skips an
  unregistered handler.

This audit is code-only and cannot establish whether these paths run in Stage. It establishes only
that they are reachable in code and unreferenced in-tree. **Deployment assessment: PENDING — not
decided here.** The earlier "does not block deployment" wording is withdrawn: pre-existing does not
mean safe, `autoExpiration` defaults to true (`reservation.config.js:10`) so the timer arming path is
the default branch, and a reservation that relies on `expireReservation` (`:365`, which releases
nothing on any adapter) plus this recovery job has **no working release mechanism in this tree**.
Determining whether that configuration is reachable in Stage requires evidence this audit cannot
produce. The unregistered `reservationExpiration` handler is recorded as a finding, not repaired here.

## 5. Historical policy — corrected wording

Preserving legacy release **does not always complete and does not reliably return capacity.** It
re-derives a date set from stored bounds, so it may restore the wrong nights, the wrong quantity, or
fail outright — `reserved_count >= $1` (`:891`) raises `AvailabilityConflictError` (`:895-899`), and
the mock path instead clamps (`:769`).

**Correction on visibility.** An earlier draft of this report claimed neither outcome is observable
to the caller. That is wrong for PostgreSQL. Traced propagation: `releaseReservationLines` throws
inside the caller's `transaction()` (`:801`, `:838-903`) -> `cancelReservationWithRelease` propagates
(`:826-830`) -> `reservation.manager.js:329` has no `try`/`catch` and propagates -> the direct API
route wraps the tenant-scoped call in `try`/`catch` and returns **`HTTP 500` with
`{ error: error.message }`** (`api/routes/reservation.routes.js:421-425`); the unauthenticated
fallback at `:429` has no handler and propagates out of the route. The rollback is database-side; the
**failure is visible to the caller as a thrown error**, not swallowed. The business path likewise
propagates (`business-reservation.manager.js:196`, no `try`/`catch`), and because the throw skips
`:197` the extra release never runs. The **only** swallowed error here is that extra release's
`catch { }` (`:203`) — and the **only** silent success is the mock's resolved-`null` update (§3).

Preserve vs refuse, stated without overclaiming:

- **Preserve** — cancellation may succeed, may roll back, or may silently restore the wrong amount or
  dates; produces no marker distinguishing those outcomes; and converts an unresolved record into an
  apparently resolved one, destroying the evidence needed to tell them apart.
- **Refuse** — aborts before any mutation, so capacity is never moved on an assumption and the
  unresolved set stays identifiable. Cost: those cancellations cannot complete through the normal
  path, and an explicit non-releasing cancellation may be needed.

Recommendation: refuse for `source === 'legacy'` only (section 1). *(superseded — implemented; refusal
is the shipped behaviour, and the "refuse" bullet above is now the observed behaviour rather than a
trade-off argument.)* **No backfill, normalization or
historical mutation is authorized or proposed here.** Reconciliation requires trustworthy evidence
for each affected reservation and a separately reviewed mechanism; this audit establishes neither,
and re-deriving a record from stored bounds or re-running the corrected UTC expansion over an
existing row would fabricate the very evidence that is missing. Legacy rows stay as they are,
unreleased, and explicitly flagged.

## Implementation boundaries

In scope for the next slice:

1. `reservation.manager.js:322-343` — remove the `config.persistenceProvider` gate and call
   `this.#repo.cancelReservationWithRelease` whenever `#repo` exists (the repository already
   branches on the actual adapter at `:791`); keep the `#persist` + cache path for the repo-less
   case **unchanged** — it is a supported contract, not a defect (§3). Do **not** make it report
   failure merely because no repository exists. Instead assert only the real invariant: lines present
   while `#repo` is absent is a configuration error and must not return success.
2. Delete the dead `availability.updateAvailability` calls (`:335-341`, `:248-255`).
3. `reservation.repository.js` — refuse `source === 'legacy'` at the `:477` branch for both adapters.
   *(superseded — implemented; the shared resolver now throws
   `AvailabilityConsumptionRecordError` for a record-less `DATE_RANGE` line and takes `reservationId`
   for diagnosis only.)*
4. **SUPERSEDED by BOOKING-MOCK-CANCEL-ATOMIC-1 (implemented).** The proposed
   `InMemoryRepositoryAdapter.commitReservationCancellationSync` primitive was **not** created, because the
   adapter was verified first and the assumption was wrong: the only Map-backed writable adapter is
   `InMemoryRepositoryAdapter` in `tests/capability/capability.mock.repositories.js` (production's
   `mock.repository.adapter.js` is a no-op placeholder with no store), and its `store` is a static map of
   tables that the repository already reads directly. The atomic section therefore lives in the
   repository as `#commitMockCancellationSync`, operating on `store.get(adapter.entityName)`,
   `store.get('reservation_lines')` and `store.get('availability')`, with the pristine
   `Map.prototype.set` captured at module load for rollback. No adapter method was added and no
   transaction framework was introduced.
5. `business-reservation.manager.js:197-203` — delete the extra release from the cancellation path.
   The explicit hold-release operation at `availability.routes.js:144` /
   `business.service.js:1376-1381` is unaffected and remains the supported way to clear a line-less
   hold (§3).
6. Treat a resolved-`null` return from `cancelReservationWithRelease` as a failure on the manager
   side (`reservation.manager.js:329` currently ignores it), which is what closes the only silent
   success path.

Out of scope for this slice, to be tracked separately: `expireReservation` (`:365`), the recovery
job's dead `updateAvailability` call (`reservation.recovery.js:230`, `:394`, `:483`), and the
unregistered `reservationExpiration` scheduler handler (§4, deployment assessment pending).

Tests to add alongside (no database) — each asserts **all three stores byte-identical** to their
pre-call snapshots on failure, and none inspects source text for `await`:

1. **status-update failure** — publication throws on the `reservations` write; `availability` and
   `reservation_lines` unchanged.
2. **failure after an intermediate capacity write** — throw on the *second* of N `availability`
   writes; the first is rolled back, all three stores unchanged.
3. **failure at line marking** — throw on a `releasedAt` write; capacity and status rolled back.
4. **aggregate quantity shortfall** — `sum(quantity) > reservedCount` across lines on one row; throws
   in validation with zero writes.
5. **repeated cancellation** — second call returns `{ noOp: true }`, no second decrement, store
   unchanged relative to the first call's result.

Plus: manager routing under mock and postgres-configured contexts; config-versus-adapter divergence;
`legacy` refusal asserting no status change and no capacity mutation on both adapters; mock missing-row
throw; a rollback-failure case asserting `AggregateError` names the unrestored entry; and a regression
that `availability.routes.js:144` explicit release still works after `:197-203` is removed. Existing
`reservation.repository.occupied-nights.test.js` covers both adapters, repeat release (`:903`) and
case C (`:741-827`).

Certification additionally requires confirming on a real connection that the compare-and-set (`:866`)
and `reserved_count >= $1` guard (`:891`) hold under a concurrent double cancel; that pair is the
concurrency claim and has only been tested against a mock client.

## Working recommendations for this slice

These are implementation decisions, **not** authorization to mutate historical data.

1. **Refuse** automatic release for unresolved historical `DATE_RANGE` consumption — `source ===
   'legacy'` (`:477`) throws on both adapters, before any write. *(superseded — implemented; a
   record-less `DATE_RANGE` line throws `AvailabilityConsumptionRecordError` naming `reservationId`,
   `lineId` and the reason, with no metadata dumped, on both adapter paths.)*
2. **No cancel-without-release feature** in this slice.
3. **Remove** the extra business cancellation release (`business-reservation.manager.js:197-203`);
   **preserve** the explicit hold-release APIs (`availability.routes.js:133-152`).
4. **Preserve** supported repo-less cache cancellation (§3); assert only that lines-present-without-
   repository is a configuration error.
5. **Do not infer** historical consumed dates, and **do not** choose a mismatched target arbitrarily —
   §2.3's divergence is unreachable through any supported caller.
6. Keep expiration/recovery **deployment readiness pending** (§4).

## Remaining decisions that materially change behavior

- **D1** Legacy record-less policy for DATE_RANGE lines: refuse (recommended) vs preserve. Decides
  whether any reconciliation tooling enters scope at all — and no tooling is authorized until
  separately reviewed. *(superseded — decided: **refuse**. Implemented as
  BOOKING-LEGACY-RELEASE-GATE-1. No reconciliation tooling is authorized, no backfill was performed and
   no historical row was touched. The cost of refusal is accepted for this milestone: a
   non-releasing cancellation affordance was considered and excluded, so refused lines cannot
   complete through the normal path — see D2.)*
- **D2** *(closed by scope decision, not deferred)* Whether a non-releasing cancellation affordance
  is required for refused legacy lines, and who may invoke it. BOOKING-LEGACY-RELEASE-GATE-1 resolved
  this for the current milestone by **excluding** the affordance: no cancel-without-release feature
  ships here, and refused record-less lines simply cannot complete through the normal path. This is
  not an open decision blocking that slice. A future proposal remains possible, but it is separate
  work under its own review.
- **D3** **RESOLVED by this pass — no longer open.** Whether `business-reservation.manager.js:201`
  is retained. The `reserve()`/`release()` caller inventory (§3) shows the explicit operation at
  `availability.routes.js:144` / `business.service.js:1376-1381` is independent, and that
  business-created reservations are always line-backed, so `:201` is redundant where it runs and
  unsafe where it over-reaches. Recommendation: delete it. Residual risk — a caller outside this
  tree compensating through `:201` — is unverified and cannot be closed by code inspection.
- **D4** Whether `expireReservation` (`:365`) and the recovery job's broken call are in the same
  release or a separate slice. Interacts with the §4 deployment assessment, which is **pending**.
- **D5** **Answered by caller evidence — closed as unsupported input, not a product decision.**
  `createReservationWithLine` has exactly **one** production caller, `reservation.manager.js:153`,
  and its `lineData.temporal` is hard-coded:

  ```js
  // reservation.manager.js:137-141
  const lineData = {
    lineId:   reservation.lineId,
    targetId: reservation.accommodationId,
    quantity: ...,
    temporal: { mode: 'DATE_RANGE', startDate: ..., endDate: ... },
  }
  ```

  The other production creation path, `#persist` → `createReservation` (`:158-159`), writes **no line
  at all**. So **no supported creation caller can submit a non-DATE_RANGE line**; the `not-applicable`
  branch (`:228-233`, `:474-476`) is reachable only by a caller that builds `lineData` itself and
  calls `createReservationWithLine` directly — i.e. permissive repository input
  (`reservation.repository.occupied-nights.test.js`), **not an established product contract**.
  Consequence: there is no in-product `not-applicable` consumption-without-release leak to decide
  about. Keep the permissive branch as-is and document it as unsupported; do **not** add a refusal
  (it would make directly-submitted lines uncancellable) and do **not** infer consumed dates.
- **D6** **Answered by caller evidence — unreachable through any supported caller.** The same single
  caller sets `targetId: reservation.accommodationId` (`:141`), so both values are equal *by
  construction*; and both adapters' consume step read `r.accommodationId`, which `...reservationData`
  preserves verbatim (`:509`) with no override. The `:706` (create) vs `:765` (release) divergence
  therefore requires a direct repository caller — permissive input, **not an established product contract**. **No behaviour change
  is proposed for that unsupported input in this slice.** Because caller construction does not
  validate stored data, §2.2 verifies ownership before writing capacity (line `tenantId` matches the
  reservation's, capacity rows match `{ tenantId, targetId, date }`, stored `line.targetId` is among
  the resolved targets) and **refuses** a stored divergence rather than choosing a target. No
  tautological assertion is added at the manager's construction site.

## Final Git state

Branch `booking-pricing-1a`, HEAD `392d2d3e7f1ce2a62e1504c6eac6487fdbfedf80` (unchanged), staging
empty, and this report the only worktree change (`??` untracked). This pass changed documentation
only: no code, test, dependency, schema or configuration file was modified; no database access,
staging, commit, push or deployment.
