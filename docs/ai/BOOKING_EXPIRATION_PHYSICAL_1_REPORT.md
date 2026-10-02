# BOOKING-EXPIRATION-PHYSICAL-1 — Pre-Execution Report

**Slice:** first physical certification of reservation expiration against a real
PostgreSQL / Neon connection, replacing the fake-client evidence that has stood in for
physical behaviour through BOOKING-EXPIRATION-ATOMIC-1 and
BOOKING-EXPIRATION-RECOVERY-1.
**Repository:** `C:\Users\casa\Documents\booking-pricing-1a`
**Branch:** `booking-pricing-1a`
**Certified baseline HEAD:** `c76c3eefc60846ca6f00c491c47b9d439858de0c` (identical to
`origin/booking-pricing-1a`, worktree clean at start)
**Harness:** `tests/physical/booking-expiration-physical-1.mjs`

**STATUS: PHYSICAL POSTGRESQL / NEON CERTIFIED**

**Certified baseline commit:**
`c76c3eefc60846ca6f00c491c47b9d439858de0c`

The certification completed on a **second controlled physical execution** against Neon.
Every mandatory invariant was proven physically, the harness cleanup reported zero residue,
and an independent post-certification SELECT-only residue check also reported zero residue
across all six fixture tables. See §17 for the full evidence and §18 for the certified
contract, and §19 for the explicit limitations of what this certification does **not** cover.

**Neon was not left mutated.** `ADDITIONAL_NEON_MUTATIONS=0` after the certified run,
`MIGRATIONS_RUN=0`, `SCHEMA_CHANGES=0`. No Stage access, no deployment, no Passenger restart,
nothing staged, nothing committed, nothing pushed.

---

## 1. What this slice certifies

The expiration path has been certified against an in-memory fake client and a fake pg
transaction, where `reservation.expiration-atomic.test.js` and
`reservation.recovery-1.test.js` inject a failure into a stubbed `client.query`. That proves
the code issues the right statements in the right order *as far as the fake interprets
them*. It does not prove PostgreSQL honours them: that the reservation status `UPDATE` and
the `released_at` mark and the guarded capacity decrement really commit or unwind together,
that the compare-and-set really refuses a stale delivery, or that the `tenant_id`
predicates really scope the statements.

This slice closes exactly that gap, and only that gap. It adds no new expiration
behaviour, no second implementation, and no production change.

| Test | Physical property being certified |
| --- | --- |
| A | Status change and capacity release commit **together**, once, for a real `requested` row |
| B | A repeated / stale delivery releases nothing a second time and changes nothing |
| C | A failure after the status `UPDATE` unwinds status, `released_at` and capacity |
| D | One tenant's context cannot read or modify another tenant's reservation |

## 2. External SELECT-only gates accepted

Two read-only gates were executed externally against the intended connection before this
pass and are accepted as pre-existing evidence.

**Gate 1 — connection and objects**

```
CONNECTION_OK=True
POSTGRESQL_CONFIRMED=true
DATABASE_NAME_PRESENT=true
RESERVATION_LINES_RELEASED_AT=true
AVAILABILITY_TARGET_ID=true
AVAILABILITY_TARGET_TYPE=true
MUTATING_SQL_EXECUTED=False
PREFLIGHT_PASS=true
NODE_EXIT=0
```

**Gate 2 — catalog**

```
TABLE_RESERVATIONS_PRESENT=true            TABLE_RESERVATIONS_REQUIRED_COLUMNS=true
TABLE_RESERVATION_LINES_PRESENT=true       TABLE_RESERVATION_LINES_REQUIRED_COLUMNS=true
TABLE_AVAILABILITY_PRESENT=true            TABLE_AVAILABILITY_REQUIRED_COLUMNS=true
TABLE_TENANTS_PRESENT=true                 TABLE_TENANTS_REQUIRED_COLUMNS=true
TABLE_COMPANIES_PRESENT=true               TABLE_COMPANIES_REQUIRED_COLUMNS=true
TABLE_ACCOMMODATIONS_PRESENT=true          TABLE_ACCOMMODATIONS_REQUIRED_COLUMNS=true
AVAILABILITY_ACCOMMODATION_DATE_UNIQUE=true
RESERVATION_LINES_RELEASED_AT_NULLABLE=true
AVAILABILITY_TARGET_ID_NOT_NULL=true
RESERVATIONS_STATUS_ENTERED_AT_PRESENT=false
CUSTOMER_ROWS_READ=False
MUTATING_SQL_EXECUTED=False
SCHEMA_GATE_PASS=true
NODE_EXIT=0
```

Note that Gate 2 already reported `AVAILABILITY_ACCOMMODATION_DATE_UNIQUE=true` from an
independent catalog method, while the harness detector later reported `false` on the same
database. That divergence is itself evidence that the defect was in the harness detector
rather than in the schema. See §16.

`RESERVATIONS_STATUS_ENTERED_AT_PRESENT=false` is expected and matches the source schema:
neither `status_entered_at` nor `expired_at` exists, so expiration liveness is derived
from `updated_at` plus the in-memory timer, and there is nothing to verify here.

## 3. Harness architecture

```
tests/physical/booking-expiration-physical-1.mjs
```

A single opt-in module. It is deliberately **not** named `*.test.js`, and
`tests/reports/generate.js` lists its suites explicitly, so no test runner, script or glob
in this repository can reach it.

**Production classes only.** The adapter, repository, manager and availability capability
are imported from their production modules, and every state change flows through them:

```
ReservationManager.createRequest()
  -> ReservationRepository.createReservationWithLine()
     -> database/connection/postgres.connection.js  transaction()      [real pg]

ReservationManager.expireReservationFromTimer(id, expectedStatus)
  -> ReservationRepository.expireReservationWithRelease()
     -> ReservationRepository.releaseReservationLines()
        -> database/connection/postgres.connection.js  transaction()   [real pg]
```

The only SQL written directly by the harness is:

1. SELECT-only preflight and SELECT-only physical assertions,
2. the synthetic structural scaffolding (tenant, company, accommodation, availability),
3. two explicitly labelled negative-control mutations on synthetic rows only (§7),
4. bounded cleanup addressed by exact deterministic ids (§9).

Reservations and reservation lines are **never** inserted directly. They are created by the
production manager so that the `metadata.__occupiedNights` record being certified is the
production-owned one, produced by
`AvailabilityCapability.expandOccupiedNights` and written by the repository's own INSERT.

**Minimal surrounding runtime, stated explicitly.** `createProductionStack()` builds a real
`PostgresReservationAdapter`, a real `ReservationRepository` (with `initialize()`), a real
`AvailabilityCapability` and a real `ReservationManager`. What is deliberately absent:

- **No scheduler and no timer.** Nothing is armed, so no in-memory delivery can race a
  physical measurement. Expiration is invoked directly through
  `expireReservationFromTimer(id, expectedStatus)`, which is the exact entry point a live
  timer calls and which carries the same expected state a timer carries. The manager
  reports `{ timer: { status: 'not_configured' } }` for creation and expiration, and the
  harness asserts on the expiration result only.
- **No auth runtime.** `ReservationManager.#checkPermission` takes its production no-auth
  path.
- **No event bus and no data manager.** The production emits are no-ops; the manager still
  fails loudly if the repository operation does not succeed, which is the behaviour under
  test.
- **No `bootstrapEnsueñoBookingRegistry()`.** `application.start.js` performs that
  read-only step for the PostgreSQL runtime; the harness skips it so no real tenant
  identity is ever read. Ensueño is not used anywhere in this certification.

`application.start.js` is otherwise not used, because it imports `jsonwebtoken`, which is
not installed in this working tree, and because it would boot the whole commercial runtime
against the certification database. Every class the expiration path actually uses is
instantiated directly instead, so the path under test is unchanged.

## 4. Deterministic fixture graph

Two synthetic tenants, fixed UUIDs, fixed slugs. The prefixes are unambiguous in any log
and the customer e-mail addresses use the reserved `example.invalid` TLD, so a leaked row
cannot reach anyone.

| Entity | Tenant A | Tenant B |
| --- | --- | --- |
| tenant | `9f1b0a00-0000-4000-8000-0000000000a1` / `physical-expiration-1-tenant-a` | `9f1b0a00-0000-4000-8000-0000000000b1` / `physical-expiration-1-tenant-b` |
| company | `…a2` / `physical-expiration-1-company-a` | `…b2` / `physical-expiration-1-company-b` |
| accommodation | `…a3` / `physical-expiration-1-accommodation-a` | `…b3` / `physical-expiration-1-accommodation-b` |
| availability | `…a4` (test A/B), `…a5` (test C1), `…a6` (test C2) | `…b4` (test D) |
| reservation | `…a7` (A/B), `…a8` (C1), `…a9` (C2) | `…b5` (D) |

Full ids are truncated to the `…` prefix above only for readability. The harness holds the
complete literals internally and uses them for **exact** preflight "does not already exist"
checks, exact residue counting and exact cleanup predicates.

**The harness deliberately does not print fixture ids or slugs.** No `marker()` call emits
an id, a slug, a SQL parameter or a row object; the marker arguments are booleans, counts and
fixed constants only. Truncated, non-sensitive fixture identity is documented here in the
report instead, which is why this table exists. Printing the ids would add nothing to the
audit trail that this table plus `FIXTURE_IDS_ABSENT` / `FIXTURE_SLUGS_ABSENT` /
`FIXTURE_RESIDUE_COUNT` / `FIXTURE_SLUG_RESIDUE_COUNT` already provide.

**Dates are execution-relative, ids are deterministic.** A fixed date would eventually age
out and start failing production validation (`checkIn` may not be in the past), which would
turn a re-run into a false failure. Each one-night stay is therefore computed as UTC
`today + 30/32/34/36` days with checkout one day later — always in the future, always far
below 365 days ahead, always a valid strict `YYYY-MM-DD` civil date, and always a distinct
`(accommodation_id, date)` tuple so the four availability rows never collide. The ids stay
fixed, so residue detection and cleanup remain exact.

**Reservation line ids are production-owned.** `ReservationManager.createRequest()` mints
the line id with `crypto.randomUUID()` and offers no override, so the harness cannot
predetermine it. It is captured from the production call and is covered by cleanup through
its reservation id. The reservation id itself *is* deterministic, and the harness asserts
that the manager honoured it rather than assuming it.

**Inventory 2, quantity 1**, for every fixture. With `inventory = 2` and `quantity = 1`
the production consume and release statements leave `availability.status = 'available'`
throughout (`reserved_count + 1 >= inventory` is false at 1 of 2), so a status flip can
never be mistaken for the count assertion.

## 5. Preflight — SELECT only, and fail closed

Runs to completion before any mutation, in this order, and stops the run on the first
failure. `createPool()` is the first thing it does, which is safe precisely because the
gate has already been evaluated.

1. `SELECT 1`, then `SELECT version()` must identify PostgreSQL.
2. All six required tables present in `current_schema()`.
3. All required columns present, per table.
4. `reservation_lines.released_at` present **and nullable** — it is the sole unreleased
   marker, so it must be able to hold NULL.
5. `availability.target_id` **NOT NULL**. This matters because the release path addresses
   capacity through `reservation_lines.target_id`, not through `accommodation_id`: a NULL
   target would make a release a silent no-op instead of a refusal.
6. `availability.target_type` present.
7. A unique index whose **ordered** key columns are exactly `(accommodation_id, date)` on
   `availability`, decided by PostgreSQL itself from `pg_class` / `pg_namespace` / `pg_index`
   / `pg_attribute` rather than assumed from the migration. Ordered equality rejects the
   reversed `(date, accommodation_id)` index, and partial, expression, invalid and
   three-column indexes are all rejected. See §16.3 and §16.4 for the defective detector this
   replaced and why it was wrong.
8. Every column the scaffolding will write actually exists, so schema drift cannot turn
   into a half-created fixture.
9. No row already exists under any deterministic fixture id, and none under any fixture
   slug — the "no previous certification residue" gate.

Migrations are **never** run automatically. If the target schema is behind, preflight fails
and the human decides.

## 6. Physical invariants that will be checked

**Test A — successful expiration (Tenant A).** Before the call: `reserved_count = 0`,
`status = 'available'`, `is_blocked = false`, `target_type = 'accommodation'`,
`target_id = <accommodation A>`. After the production `createRequest`: reservation
`status = 'requested'`, `reserved_count = 1`, exactly one line with `released_at IS NULL`,
`line.target_id = <accommodation A>`, and a `__occupiedNights` record at version 1 whose
`dates` is exactly the single occupied night and whose `quantity` is 1. After
`expireReservationFromTimer(id, 'requested')`: `status = 'expired'`, `reserved_count = 0`,
`released_at` non-null, `cancelled_at` still NULL (expiration must never write it), and
`availability.status` back to `available`. Tenant B's `reserved_count` is compared before
and after so a cross-capacity change is impossible to miss.

**Test B — repeated / stale delivery.** Manager level: a second
`expireReservationFromTimer(id, 'requested')` must be refused as `stale_state`. Repository
level: `expireReservationWithRelease(…, { expectedStatus: 'requested' })` is called
directly so the `status = $4` compare-and-set is exercised independently of the manager's
own short-circuit, and must throw. Physical before/after snapshots must show an unchanged
`released_at` timestamp (not merely a non-null one), `reserved_count` still 0, and the
reservation still `expired`.

## 7. Rollback proof design — two negative controls

Rollback cannot be certified by an outer transaction, because the production repository
opens its own pooled transaction and an outer wrapper would prove nothing about the
production boundary. It has to be certified by making the real transaction fail and then
reading the physical state. Two synthetic controls do that, deliberately at two different
failure points:

**Control C1 — legacy record-less DATE_RANGE refusal** (`AvailabilityConsumptionRecordError`,
BOOKING-LEGACY-RELEASE-GATE-1). The production manager cannot create a `DATE_RANGE` line
without its `__occupiedNights` record, so the record is removed from this synthetic line
with one bounded `UPDATE reservation_lines SET metadata = '{}'::jsonb WHERE id = $1 AND
reservation_id = $2`, addressed by exact ids on a synthetic row. Capacity is left alone
(`reserved_count` stays 1), so the release has nothing to do but refuse — and it refuses
*after* the reservation status `UPDATE` has already been issued inside the same
transaction. Required physical outcome afterwards: `status` still `requested`,
`reserved_count` unchanged, `released_at` still NULL.

**Control C2 — capacity underflow** (`AvailabilityConflictError`). `reserved_count` on this
synthetic availability row is set to 0 with one bounded `UPDATE ... WHERE id = $1 AND
tenant_id = $2`, so the guarded decrement `reserved_count >= $1` cannot match. Here the
release *marks the line released first* and only then fails. This is the stronger of the
two proofs: it shows status, `released_at` and capacity all unwind together. Required
physical outcome afterwards: `status` still `requested`, `released_at` still NULL,
`reserved_count` equal to its pre-call value.

C1 alone would prove only that the status write unwinds when the release refuses before
touching anything. C2 is what makes `ROLLBACK_PROOF_PASS` mean atomicity rather than
refusal.

Both controls are explicit, deliberate violations of fixture state, confined to synthetic
rows. No production validation is weakened to reach them; the refusals are the production
refusals. The manager's refusal surfaces as a thrown error by design — `#expireInternal`
does not catch the repository rejection — and the harness asserts on that throw and then on
the physical state, which is the evidence that matters.

## 8. Tenant isolation design

Tenant B owns a genuinely consumed, unreleased, `requested` reservation
(`reserved_count = 1`, `released_at IS NULL`), created through Tenant B's own production
manager. Tenant A's stack then attempts, in order:

1. `findById(B)` through Tenant A's repository context — the context tenant reaches the SQL
   as `tenant_id = <Tenant A>` via `BaseRepository._buildQuery()`, so this is a physical
   scoping proof, not only an in-memory guard. Must not resolve.
2. `expireReservationFromTimer(B, 'requested')` through Tenant A's manager — must be
   refused as `not_found`, because the manager cannot even load the row.
3. `findLinesByReservationId(Tenant A, B)` — the line query joins `reservations` and
   filters `r.tenant_id`, so it must return no rows.
4. `expireReservationWithRelease({ id: B, status: 'expired' }, Tenant A, { expectedStatus:
   'requested' })` — the repository write addressed with Tenant A's tenant id must throw
   on zero matched rows rather than silently succeed.

B's physical state is then read directly: still `requested`, `reserved_count` still 1,
`released_at` still NULL. Tenant B is afterwards expired through **its own** manager, so
its release is certified too and its capacity is restored through production code before
cleanup deletes the rows.

## 9. Cleanup strategy

Mandatory, idempotent, and bounded to ids this harness owns. There is no outer rollback
transaction, because production owns its own transactions.

```
try { certification } finally { cleanup }
```

`DELETE` order is reverse-FK, and every predicate is an exact id or an exact id set:

```
reservation_lines   WHERE reservation_id = ANY(<ids>) OR id = ANY(<ids>)
reservations        WHERE id = ANY(<ids>)
availability        WHERE id = ANY(<ids>)
accommodations      WHERE id = ANY(<ids>)
companies           WHERE id = ANY(<ids>)
tenants             WHERE id = ANY(<ids>)
```

The reservation id list is the union of the deterministic ids and the ids observed from the
production return values, so a graph that failed halfway through construction is still
fully covered.

Never used: `TRUNCATE`, `DELETE` by status, `DELETE` by date range, any delete not
addressed by a fixture id, or any table outside this list. No customer or Ensueño row is
read, written or deleted at any point.

After the deletes, residue is counted by exact ids across all six tables and again by exact
fixture slugs; both must be 0. A non-zero residue throws, which fails the run.
`closePool()` is then awaited and `getPoolStats() === null` is reported as
`POOL_CLOSED=true` — production connector evidence, not an assumption. **Cleanup failure
fails the certification** and the exit code is 1.

## 10. Fail-closed execution guards

Both gates must hold before a pool exists:

```
BOOKING_EXPIRATION_PHYSICAL_CERTIFY=1
DATABASE_URL=<present>
```

* Gate checked first, `DATABASE_URL` presence checked second.
* If either is missing: refuse, print the reason, print
  `POOL_CREATED=false`, exit 0 — **before** `createPool()`, `getPool()`, `query()`,
  `transaction()` or `isConnected()` is ever called.
* No localhost, default or fallback database configuration is used. This is the reason the
  gate is evaluated before any connection helper is touched: the production
  `createPool()` falls back to local config when `DATABASE_URL` is unset.
* `DATABASE_URL` is never printed. Neither is a username, a password, a host, a SQL
  parameter or a row object. `marker()` accepts only booleans, finite numbers and short
  non-sensitive tokens.

To execute, a human sets both variables deliberately in one process. Neither is stored in
the repository, and there is no `.env` file, npm script or CI wiring that could supply
them.

## 10a. Output safety — found by the final audit and remediated before any execution

The harness is designed to emit only secret-safe structured markers. This is a **design
guarantee about the harness**, not a claim about a run, because **physical execution has not
yet occurred**. No statement in this report should be read as an observation that a
certification run printed nothing sensitive; that claim can only be made from a real run's
captured output.

The final pre-execution audit found two output/robustness defects. Both were remediated
**before any physical execution**, and neither has ever reached a database.

### Defect 1 — raw `error.message` on harness failure paths

The certification and cleanup failure handlers printed `error?.message || error` with
`console.error`. `pg` error messages routinely embed the target hostname, an `IP:port`, or
the username, and the `|| error` fallback could stringify an entire error object.

Remediation: both calls were deleted. Failure is now reported only as

```
CERTIFICATION_FAILURE=<ErrorClassName>
CLEANUP_FAILURE=<ErrorClassName>
```

`describeError()` was additionally hardened. It no longer trusts `error.name` verbatim: the
value is admitted only when it matches `/^[A-Za-z][A-Za-z0-9_]{0,39}$/`, otherwise the fixed
literal `UnnamedError` is used, and a non-object throw yields `NonErrorThrow`.
`error.message`, `error.stack`, `error.code` and `error.detail` are never read. A hostile
`error.name` carrying a connection URL or an `IP:port` is reduced to `UnnamedError`.

### Defect 2 — production code prints raw `error.message` itself

Harness-side redaction alone was **not** sufficient, because the harness imports the real
production connector and that connector writes to the console on its own:

| Production site | Reachable from this harness | What it prints |
| --- | --- | --- |
| `database/connection/postgres.connection.js:84` | yes — any failed `query()` | `{ text, error: error.message }` |
| `database/connection/postgres.connection.js:99` | yes — `transaction()` client acquisition | `error.message` |
| `database/connection/postgres.connection.js:47` | yes — pool `error` event | raw `err` object |
| `database/connection/postgres.connection.js:51` | yes — pool `connect` event | a log line |
| `database/connection/postgres.connection.js:79` | only if `DATABASE_LOGGING=true` | query text |
| `capabilities/persistence/contracts/base.repository.js:22,69` | yes — repository construction and query building | trace objects with `contextTenantId` |
| `capabilities/reservation/reservation.manager.js:105` | **no** — returns early, no timer is attached | `error?.message \|\| error` |
| `capabilities/availability/availability.capability.js:141,149,157` | **no** — early return, no search/sync injected | raw `err` |

Remediation, applied **inside the harness only** — no production file was modified: the
harness installs an output guard before it constructs any production object or issues any
production query. The guard replaces `console.log/info/warn/error/debug/trace/dir` with a
counter that prints nothing. Marker output bypasses the guard entirely, because `marker()`
writes through `RAW_WRITE`, a reference to the real `console.log` captured at module load,
before the guard exists.

The consequence is stronger than a filter: during a gated run the terminal can only ever
receive marker lines. Suppressed lines are never printed; they are counted and reported as
`SUPPRESSED_PRODUCTION_OUTPUT_LINES=<n>`, so suppression is auditable rather than silent.
The guard is restored in the `finally` so the supervising process is never left with a muted
console.

### Defect 3 — `closePool()` rejection could escape `main()`

`await closePool()` was previously unguarded inside the `finally`. A rejection there escapes
`main()` as an unhandled rejection, Node prints its raw message and stack, and every final
marker after it is skipped.

Remediation: `closePool()` now has its own `try/catch`. A rejection is caught and reported as
`POOL_CLOSE_FAILURE=<ErrorClassName>`. Closure is tracked in its own `poolClosed` boolean,
independent of cleanup, so a clean database with a failed close is still a failed run. The
process also installs `unhandledRejection` and `uncaughtException` handlers, which report a
secret-safe marker, force a non-zero exit code, and suppress Node's default raw reporting.

Verified offline with a stubbed connector whose `closePool()` rejects with a hostile message:
`POOL_CLOSE_FAILURE=Error`, `POOL_CLOSED=false`, `CLEANUP_PASS=false`,
`BOOKING_EXPIRATION_PHYSICAL_1_PASS=false`, `NODE_EXIT=1`, process exit code 1, **empty
stderr**, no unhandled rejection, and none of the fake hostname, `IP:port`, username,
password or connection URL anywhere in the output.

### Final marker semantics

* `POOL_CLOSED` is emitted exactly once and reports only whether the pool is demonstrably
  gone (`getPoolStats() === null`).
* `CLEANUP_PASS` is emitted **exactly once**, from `main()`, and is `cleanupPassed && poolClosed`.
  It was previously emitted twice — once inside `cleanup()` from the residue count and once
  from `main()` — which could report contradictory values.
* The aggregate `BOOKING_EXPIRATION_PHYSICAL_1_PASS` is
  `certificationPassed && cleanupPassed && poolClosed`. A failed pool close can never be
  reported as a passing certification.

| Scenario | `POOL_CLOSED` | `CLEANUP_PASS` | aggregate `PASS` |
| --- | --- | --- | --- |
| certification failed, cleanup OK, close OK | true | true | **false** |
| certification failed, cleanup OK, close failed | false | false | **false** |
| certification OK, cleanup failed, close OK | true | false | **false** |
| certification OK, cleanup OK, close OK | true | true | **true** |

## 11. SSL warning — non-blocking technical debt

A `pg` SSL compatibility warning was observed during the external read-only gates. It is
**non-blocking for this certification and was deliberately not changed**: `database/config/database.config.js`
was not touched, and no SSL configuration is modified in this slice. It is recorded here as
technical debt for a separate slice. Any change to the connection's SSL or verification
behaviour must be reviewed on its own, because it affects every pooled connection in the
production runtime and not only this harness.

## 12. Local results for this pass

No database connection was opened at any point while producing this section: every check in
it and in §12a is an offline check. The separate controlled physical execution is recorded in
§14 and §16.

| Check | Result |
| --- | --- |
| `node --check tests/physical/booking-expiration-physical-1.mjs` | exit 0 |
| Run with no gate (no `BOOKING_EXPIRATION_PHYSICAL_CERTIFY`) | refused `gate_absent`, `POOL_CREATED=false`, `NODE_EXIT=0` |
| Run with gate=1 and `DATABASE_URL` removed from the child process | refused `database_url_absent`, `POOL_CREATED=false`, `NODE_EXIT=0` |
| Import-graph resolution (whole module graph evaluated, gate absent) | `IMPORT_GRAPH_OK=true` — every production import resolves and evaluates |
| Offline wiring validation (see below) | `OFFLINE_WIRING_VALIDATION_GREEN=true`, 21/21 |
| `reservation.expiration-atomic.test.js` (exercises the pg fail-closed hooks) | 63/63, exit 0 |
| `reservation.recovery-1.test.js` | 16/16, exit 0 |
| `reservation.timers-1.test.js` (exercises the pg fail-closed hooks) | 86/86, exit 0 |
| `reservation.manager.cancel-routing.test.js` (exercises the pg fail-closed hooks) | 28/28, exit 0 |
| `reservation.recovery.startup.test.js` | 13/13, exit 0 |
| `tests/aggregate/reservation.lifecycle.test.js` | 22/22, exit 0 |

### 12a. Remediation verification (audit follow-up, offline)

Re-run after the §10a remediation. Every check below ran with **no** connection and **no**
`DATABASE_URL`.

| Check | Result |
| --- | --- |
| `node --check tests/physical/booking-expiration-physical-1.mjs` | exit 0 |
| Run with no gate | refused `gate_absent`, `POOL_CREATED=false`, `NODE_EXIT=0`, exit 0 |
| Run with gate=1 and `DATABASE_URL` removed from the child environment | refused `database_url_absent`, `POOL_CREATED=false`, `NODE_EXIT=0`, exit 0 |
| Import-graph resolution (gate absent) | `IMPORT_GRAPH_OK=true` |
| Static scan: `console.*` in the harness | exactly one site — `RAW_WRITE`; every other occurrence is a comment |
| Static scan: `.message` in the harness | zero code sites; every occurrence is a comment |
| `describeError()` vs 9 hostile throws (fake host, `IP:port`, username, password, connection URL, hostile `.name`, bare string, `null`, `undefined`, number) | every output a bare safe identifier; descriptors were `Error, UnnamedError, UnnamedError, Error, Error, NonErrorThrow, NonErrorThrow, NonErrorThrow, NonErrorThrow`; no forbidden substring in any emitted line |
| Simulated `closePool()` rejection (inert stub connector, no socket) | `POOL_CLOSE_FAILURE=Error`, `POOL_CLOSED=false`, `CLEANUP_PASS=false`, `BOOKING_EXPIRATION_PHYSICAL_1_PASS=false`, `NODE_EXIT=1`, process exit 1 |
| Same simulation, stderr | **empty** — no unhandled rejection, no uncaught exception, no raw pg/network text |
| Same simulation, marker stream | markers only; the `[RUNTIME-PERSISTENCE-1 TRACE]` production lines from `base.repository.js` no longer appear, and `SUPPRESSED_PRODUCTION_OUTPUT_LINES=4` accounts for them plus the stub's own console writes |
| Duplicate-marker check | exactly one `CLEANUP_PASS`, exactly one `POOL_CLOSED` |
| Reservation regression suites re-run | `expiration-atomic` 63/63, `recovery-1` 16/16, `timers-1` 86/86, `manager.cancel-routing` 28/28, `aggregate/reservation.lifecycle` 22/22 — all exit 0, unchanged from the pre-remediation baseline |

The simulation harness and its stub live entirely outside the repository, under
`C:\Users\casa\AppData\Local\Temp\opencode\booking-sim`, and are throwaway. No production file
and no repository file other than the harness and this report was modified.

The offline wiring validation is a throwaway script kept **outside** the repository. It
constructs the same stack the harness constructs and, with a stub repository used only
inside that script, proves without connecting that: the adapter reports provider
`postgres`; `AvailabilityCapability` reports expansion version 1 and expands a one-night
range correctly; the repository initialises; the exact `createRequest` payload the harness
sends is accepted and returns `{ success: true, status: 'requested', reservationId }` with
the requested deterministic id honoured and `{ timer: { status: 'not_configured' } }`; the
production line data carries `targetType: 'accommodation'`, the accommodation `targetId` and
a `DATE_RANGE` temporal — which is what makes the release's `target_id` match the
availability row; `requested` resolves to the `expired` target; the two error class names
used as assertions are correct; and a missing reservation is refused as `not_found`. No
production file and no harness file was modified to obtain it.

## 13. Expected marker set

```
BOOKING_EXPIRATION_PHYSICAL_1_START=true
POSTGRESQL_CONFIRMED=true
REQUIRED_TABLES_PRESENT=true
REQUIRED_COLUMNS_PRESENT=true
RESERVATION_LINES_RELEASED_AT=true
RESERVATION_LINES_RELEASED_AT_NULLABLE=true
AVAILABILITY_TARGET_ID_NOT_NULL=true
AVAILABILITY_EXACT_UNIQUE_INDEX_COUNT=1
AVAILABILITY_ACCOMMODATION_DATE_UNIQUE=true
FIXTURE_WRITE_COLUMNS_PRESENT=true
FIXTURE_IDS_ABSENT=true
FIXTURE_SLUGS_ABSENT=true
PREFLIGHT_PASS=true
SCAFFOLD_CREATED=true
FIXTURE_INVENTORY=2
FIXTURE_QUANTITY=1

TENANT_A_INITIAL_RESERVED_COUNT=0
TENANT_A_AFTER_CREATE_RESERVED_COUNT=1
TENANT_A_STATUS_BEFORE=requested
TENANT_A_LINE_UNRELEASED_BEFORE=true
OCCUPIED_NIGHTS_RECORD_PRESENT=true
OCCUPIED_NIGHTS_VERSION=1
OCCUPIED_NIGHTS_MATCHES_OCCUPIED_NIGHT=true
TENANT_A_EXPIRATION_SUCCESS=true
TENANT_A_STATUS_AFTER=expired
TENANT_A_AFTER_EXPIRATION_RESERVED_COUNT=0
TENANT_A_LINE_RELEASED_AFTER=true
TENANT_A_AVAILABILITY_STATUS_RESTORED=true
TENANT_A_CANCELLED_AT_UNTOUCHED=true
TENANT_B_UNCHANGED_BY_TENANT_A_EXPIRATION=true
TEST_A_PASS=true

REPEATED_DELIVERY_REFUSAL_REASON=stale_state
REPEATED_DELIVERY_NO_SECOND_RELEASE=true
REPEATED_DELIVERY_RESERVED_COUNT=0
REPEATED_DELIVERY_STATUS=expired
REPOSITORY_STALE_GUARD_REFUSED=true
REPEATED_DELIVERY_PHYSICALLY_STABLE=true
REPEATED_DELIVERY_PASS=true

ROLLBACK_LEGACY_REFUSAL_RAISED=true
ROLLBACK_LEGACY_STATUS_AFTER=requested
ROLLBACK_CONTROL_LEGACY_REFUSAL_PASS=true
ROLLBACK_UNDERFLOW_RAISED=true
ROLLBACK_UNDERFLOW_STATUS_AFTER=requested
ROLLBACK_UNDERFLOW_RELEASED_AT_AFTER=true
ROLLBACK_CONTROL_CAPACITY_UNDERFLOW_PASS=true
ROLLBACK_PROOF_PASS=true

TENANT_ISOLATION_FIND_BY_ID=true
TENANT_ISOLATION_MANAGER_REFUSAL_REASON=not_found
TENANT_ISOLATION_LINES_VISIBLE_TO_TENANT_A=0
TENANT_ISOLATION_REPOSITORY_REFUSED=true
TENANT_B_STATUS_AFTER_ISOLATION=requested
TENANT_B_RESERVED_COUNT_AFTER_ISOLATION=1
TENANT_B_CLEAN_EXPIRATION=true
TENANT_ISOLATION_PASS=true

FIXTURE_RESIDUE_COUNT=0
FIXTURE_SLUG_RESIDUE_COUNT=0
POOL_CLOSED=true
CLEANUP_PASS=true
SUPPRESSED_PRODUCTION_OUTPUT_LINES=<n>
BOOKING_EXPIRATION_PHYSICAL_1_PASS=true
NODE_EXIT=0
```

Tenancy aside, the `*_UNRELEASED_*` markers are named for the fact they assert: `true` means
the line is **not** released. The pre-remediation names asserted the opposite reading; see the
historical mapping in §17.8.

`SUPPRESSED_PRODUCTION_OUTPUT_LINES` is expected to be non-zero on any successful run. A
value of `0` would mean the guard is not actually intercepting production output and must be
treated as a fault, not as good news.

A failure emits one or more of:

```
CERTIFICATION_FAILURE=<ErrorClassName>
CLEANUP_FAILURE=<ErrorClassName>
POOL_CLOSE_FAILURE=<ErrorClassName>
POOL_CLOSED=false
CLEANUP_PASS=false
UNHANDLED_REJECTION=<ErrorClassName>
UNCAUGHT_EXCEPTION=<ErrorClassName>
```

with `NODE_EXIT=1`. Every one of those values is a bare class name produced by
`describeError()`; no failure path prints a message, a stack or an error object. Stage markers
(`STAGE_REACHED`) are emitted as each test begins, so an absent stage marker identifies where
the run stopped. A missing per-test `*_PASS` marker means that test's proof was **not
established** — it is never synthesised, because attributing a specific test as failed when
the run may have stopped earlier would itself be a false claim.

## 14. Explicit statement for the first physical attempt

* **The physical harness WAS executed once**, against Neon, with both gates deliberately set.
* **It failed closed in the SELECT-only preflight, before any fixture mutation.** The
  scaffolding INSERTs, both negative-control UPDATEs and all cleanup DELETEs were never
  reached, because preflight refuses before `scaffold()` is called.
* **No Neon row was mutated by the harness.** `NEON_MUTATIONS=0`. The only statements issued
  were the preflight `SELECT`s and the cleanup `DELETE`s, all of which matched zero rows.
* **No migration was run and no schema was changed.** `MIGRATIONS_RUN=0`, `SCHEMA_CHANGES=0`.
* **No Stage access, no deployment, no Passenger restart.**
* **Nothing staged, nothing committed, nothing pushed.**
* **No secret was printed.** The §10a output guard withheld `SUPPRESSED_PRODUCTION_OUTPUT_LINES=5`
  lines of production console output — including the production connector's own
  `console.error(..., error.message)` sites — and every visible line was a secret-safe marker.
  `DATABASE_URL` was never printed; no username, password, host, connection URL or customer
  row appeared. This is now an **observation from a real run**, not a design claim.
* **A second physical execution has since been performed and CERTIFIED.** See §17.

## 15. Post-certification follow-ups

The certification is complete; these are follow-ups, **not** blockers.

1. Re-verify `RESERVATIONS_STATUS_ENTERED_AT_PRESENT=false` still holds; if a future migration
   adds that column, revisit the timer-anchor discussion in BOOKING-EXPIRATION-RECOVERY-1
   rather than assuming compatibility.
2. Decide separately whether to address the `pg` SSL compatibility warning. It is
   non-blocking technical debt and was deliberately left untouched in this slice — see §19.
3. Decide separately whether the production connector's own
   `console.error(..., error.message)` sites (`postgres.connection.js:84` and `:99`) should be
   fixed at source. This slice contained them with a harness-side output guard rather than
   modifying production code, so the production runtime still logs raw `pg` error text.
4. Timer ownership, generation semantics and delivery deduplication across processes remain
   uncertified and belong to BOOKING-EXPIRATION-RECOVERY-1.

## 16. First controlled physical execution — failed closed, and the detector fix

### 16.1 What happened

The first controlled Neon execution was run with both gates deliberately set. It stopped
safely inside the SELECT-only preflight:

```
BOOKING_EXPIRATION_PHYSICAL_1_START=true
DATABASE_URL_PRESENT=true
PREFLIGHT_STARTED=true
POSTGRESQL_CONFIRMED=true
REQUIRED_TABLES_PRESENT=true
MISSING_TABLE_COUNT=0
REQUIRED_COLUMNS_PRESENT=true
MISSING_COLUMN_COUNT=0
RESERVATION_LINES_RELEASED_AT=true
RESERVATION_LINES_RELEASED_AT_NULLABLE=true
AVAILABILITY_TARGET_ID_NOT_NULL=true
AVAILABILITY_TARGET_TYPE=true
AVAILABILITY_ACCOMMODATION_DATE_UNIQUE=false
CERTIFICATION_FAILURE=PhysicalCertificationError
FIXTURE_RESIDUE_COUNT=0
FIXTURE_SLUG_RESIDUE_COUNT=0
POOL_CLOSED=true
CLEANUP_PASS=true
SUPPRESSED_PRODUCTION_OUTPUT_LINES=5
BOOKING_EXPIRATION_PHYSICAL_1_PASS=false
NODE_EXIT=1
```

**Cleanup and closure evidence — all correct:**

| Marker | Value | Meaning |
| --- | --- | --- |
| `FIXTURE_RESIDUE_COUNT` | `0` | no synthetic row remained |
| `FIXTURE_SLUG_RESIDUE_COUNT` | `0` | no synthetic slug remained |
| `POOL_CLOSED` | `true` | the pool was demonstrably closed |
| `CLEANUP_PASS` | `true` | cleanup succeeded and the pool closed |

The run refused at preflight step 5, which is **before** `scaffold()`. No fixture INSERT, no
negative-control UPDATE and no residue DELETE ever matched a row. The §10a output guard
withheld 5 lines of production console output, and every visible line was a secret-safe
marker. **This first attempt is the evidence that the offline remediation worked.**

### 16.2 The diagnostic — Neon is correct

A separate, independent SELECT-only `pg_catalog` diagnostic was then run against the same
database:

```
AVAILABILITY_INDEX_COUNT=5
UNIQUE_INDEX_COUNT=2
EXACT_ACCOMMODATION_DATE_UNIQUE_COUNT=1
EXACT_ACCOMMODATION_DATE_UNIQUE=true
CUSTOMER_ROWS_READ=False
MUTATING_SQL_EXECUTED=False
SECRET_VALUES_PRINTED=False
DIAGNOSTIC_PASS=true
NODE_EXIT=0
```

**Conclusion: the Neon schema is correct. The harness detector was defective.** The exact
unique index over `(accommodation_id, date)` exists — there are 5 indexes on `availability`,
2 of them unique, and exactly 1 matches the required key. **No index was added, no migration
was run, and no schema was modified.** The fix belongs entirely in the harness.

### 16.3 Root cause of the false negative

The old detector asked PostgreSQL for a *list* and then decided the answer in JavaScript:

```sql
SELECT i.relname AS index_name, array_agg(a.attname ORDER BY k.ord) AS columns
FROM pg_class t
JOIN pg_index ix ON ix.indrelid = t.oid AND ix.indisunique
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, ord) ON TRUE
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
WHERE t.relname = 'availability'
GROUP BY i.relname
```

```js
const normalized = raw.map((column) => String(column).trim()).sort()
return normalized.length === 2
  && normalized.includes('accommodation_id')
  && normalized.includes('date')
```

Two independent defects combined into the false negative:

1. **`unnest(ix.indkey)` does not faithfully expand an `int2vector`.** `pg_index.indkey` is
   the legacy `int2vector` vector type, not a real array, and its coercion into an array is
   not a faithful expansion of every element. `array_agg` therefore never produced the
   required two-element list for **any** of the 5 indexes, so `normalized.length === 2` was
   false for every row the query returned.
2. **The answer was then re-derived in JavaScript from a driver-rendered `name[]`.** The
   fallback `String(row.columns || '').split(',')` would produce `['{accommodation_id',
   'date}']` if the driver ever returned the `{a,b}` text form — `includes('date')` is then
   false, producing the same false negative by a different route.

The same code also carried a **latent false positive**: `.sort()` before comparing discarded
key order, so a unique index over `(date, accommodation_id)` would have been **accepted** as
a match. And `WHERE t.relname = 'availability'` ignored the schema entirely, so a same-named
table in another schema could satisfy the check.

### 16.4 The remediation

All matching is now done **inside PostgreSQL**, and the client receives a single integer. No
JavaScript ever sees a `name[]`, an `attnum` array, an index name or any driver-specific
rendering.

```sql
SELECT COUNT(*)::int AS exact_accommodation_date_unique_count
FROM pg_class t
JOIN pg_namespace tn ON tn.oid = t.relnamespace
JOIN pg_index ix ON ix.indrelid = t.oid
WHERE tn.nspname = current_schema()
  AND t.relname = 'availability'
  AND ix.indisunique
  AND ix.indisvalid
  AND ix.indpred IS NULL
  AND ix.indexprs IS NULL
  AND ix.indnatts = 2
  AND (
    SELECT array_agg(a.attname ORDER BY k.ord)
    FROM unnest(string_to_array(ix.indkey::text, ' ')::smallint[]) WITH ORDINALITY AS k(attnum, ord)
    JOIN pg_attribute a
      ON a.attrelid = ix.indrelid
     AND a.attnum = k.attnum
     AND a.attisdropped = false
  ) = ARRAY['accommodation_id','date']::name[]
```

Key changes:

* `string_to_array(ix.indkey::text, ' ')::smallint[]` converts the `int2vector` through its
  text form into a genuine `smallint[]`, so **every** key attnum survives, in declaration
  order. This is the specific fix for defect 1.
* The ordered equality test is `= ARRAY['accommodation_id','date']::name[]`, evaluated by
  PostgreSQL. Because it is **ordered** equality, a reversed `(date, accommodation_id)`
  index is rejected. This fixes defect 3.
* `indnatts = 2` plus the array equality together reject `(accommodation_id, date,
  tenant_id)`.
* `indisunique` rejects non-unique indexes; `indisvalid` rejects an index still being built;
  `indpred IS NULL` rejects partial indexes; `indexprs IS NULL` rejects expression indexes.
* `tn.nspname = current_schema()` resolves the same table the unqualified production
  statements address, instead of any table with that name.
* `a.attisdropped = false` prevents a dropped key column from being counted.
* No index name is referenced anywhere, so a generated name is irrelevant.

The JavaScript side is now deliberately trivial — the only client-side logic is
`isExactAccommodationDateUnique(count)`, which returns `Number.isFinite(count) && count >= 1`.
A new marker `AVAILABILITY_EXACT_UNIQUE_INDEX_COUNT` reports the server-side count, so the
preflight evidence shows *how many* exact matches were found rather than only yes/no.

### 16.5 Offline verification of the new detector

The interpretation function was extracted verbatim from the harness and exercised directly.
The predicate itself is PostgreSQL-side, so its accept/reject behaviour was verified against a
throwaway catalog oracle over synthetic `pg_class` / `pg_index` / `pg_attribute` rows, kept
outside the repository. A sync guard asserts that all 13 condition fragments of the harness
SQL constant are still present verbatim, so the oracle cannot silently drift from the harness.

| Case | Expected | Result |
| --- | --- | --- |
| exact unique `(accommodation_id, date)` | true | **true** |
| non-unique `(accommodation_id, date)` | false | **false** |
| unique `(date, accommodation_id)` reversed | false | **false** |
| unique `(accommodation_id)` only | false | **false** |
| unique `(accommodation_id, date, tenant_id)` | false | **false** |
| no matching index | false | **false** |
| exact unique plus a decoy 3-column unique | 1 match | **1** |
| partial unique (`indpred` set) | false | **false** |
| invalid unique (being rebuilt) | false | **false** |
| expression unique (`indexprs` set) | false | **false** |
| unique key on a dropped column | false | **false** |
| unique `(tenant_id, accommodation_id)` | false | **false** |
| exact unique on a *different table* | false | **false** |
| exact unique in a *different schema* | false | **false** |

Interpretation-function cases: `1`→true, `5`→true, `0`→false, `"0"`→false, `undefined`→false,
`null`→false, `NaN`→false, `-1`→false.

Regression guards confirming the defective code is gone: `unnest(ix.indkey)`, the old
`array_agg ... AS columns`, the `.sort()` comparison, `GROUP BY i.relname` and
`Array.isArray(row.columns)` are all absent from the harness.

### 16.6 Status at the time of this section

At the moment the detector remediation was finished, **the second physical execution had not
yet been performed**. No connection was opened during that remediation:
`DATABASE_CONNECTIONS_OPENED_DURING_REMEDIATION=0`,
`DATABASE_MUTATIONS_DURING_REMEDIATION=0`, `SCHEMA_CHANGES=0`, `MIGRATIONS_RUN=0`. The
subsequent successful execution is recorded in §17.

## 17. Successful second controlled physical execution — the certified evidence

```
BOOKING_EXPIRATION_PHYSICAL_1_START=true
DATABASE_URL_PRESENT=true
PREFLIGHT_STARTED=true
POSTGRESQL_CONFIRMED=true
REQUIRED_TABLES_PRESENT=true
MISSING_TABLE_COUNT=0
REQUIRED_COLUMNS_PRESENT=true
MISSING_COLUMN_COUNT=0
RESERVATION_LINES_RELEASED_AT=true
RESERVATION_LINES_RELEASED_AT_NULLABLE=true
AVAILABILITY_TARGET_ID_NOT_NULL=true
AVAILABILITY_TARGET_TYPE=true
AVAILABILITY_EXACT_UNIQUE_INDEX_COUNT=1
AVAILABILITY_ACCOMMODATION_DATE_UNIQUE=true
FIXTURE_WRITE_COLUMNS_PRESENT=true
FIXTURE_IDS_ABSENT=true
FIXTURE_SLUGS_ABSENT=true
PREFLIGHT_PASS=true
SCAFFOLD_CREATED=true
FIXTURE_INVENTORY=2
FIXTURE_QUANTITY=1

TENANT_A_INITIAL_RESERVED_COUNT=0
TENANT_A_STATUS_BEFORE=requested
TENANT_A_AFTER_CREATE_RESERVED_COUNT=1
TENANT_A_LINE_UNRELEASED_BEFORE=true
OCCUPIED_NIGHTS_VERSION=1
OCCUPIED_NIGHTS_RECORD_PRESENT=true
OCCUPIED_NIGHTS_MATCHES_OCCUPIED_NIGHT=true
TENANT_A_EXPIRATION_SUCCESS=true
TENANT_A_STATUS_AFTER=expired
TENANT_A_AFTER_EXPIRATION_RESERVED_COUNT=0
TENANT_A_LINE_RELEASED_AFTER=true
TENANT_A_AVAILABILITY_STATUS_AFTER=available
TENANT_A_AVAILABILITY_STATUS_RESTORED=true
TENANT_A_CANCELLED_AT_UNTOUCHED=true
TENANT_B_UNCHANGED_BY_TENANT_A_EXPIRATION=true
TEST_A_PASS=true

REPEATED_DELIVERY_REFUSAL_REASON=stale_state
REPEATED_DELIVERY_NO_SECOND_RELEASE=true
REPEATED_DELIVERY_RESERVED_COUNT=0
REPEATED_DELIVERY_STATUS=expired
REPOSITORY_STALE_GUARD_ERROR=Error
REPOSITORY_STALE_GUARD_REFUSED=true
REPEATED_DELIVERY_PHYSICALLY_STABLE=true
REPEATED_DELIVERY_PASS=true

ROLLBACK_LEGACY_REFUSAL_ERROR=AvailabilityConsumptionRecordError
ROLLBACK_LEGACY_REFUSAL_RAISED=true
ROLLBACK_LEGACY_STATUS_AFTER=requested
ROLLBACK_LEGACY_RESERVED_COUNT_AFTER=1
ROLLBACK_LEGACY_RESERVED_COUNT_BEFORE=1
ROLLBACK_CONTROL_LEGACY_REFUSAL_PASS=true

ROLLBACK_UNDERFLOW_ERROR=AvailabilityConflictError
ROLLBACK_UNDERFLOW_RAISED=true
ROLLBACK_UNDERFLOW_STATUS_AFTER=requested
ROLLBACK_UNDERFLOW_RESERVED_COUNT_AFTER=0
ROLLBACK_UNDERFLOW_RESERVED_COUNT_BEFORE=0
ROLLBACK_UNDERFLOW_LINE_UNRELEASED_AFTER=true
ROLLBACK_CONTROL_CAPACITY_UNDERFLOW_PASS=true

TENANT_ISOLATION_FIND_BY_ID=true
TENANT_ISOLATION_MANAGER_REFUSAL_REASON=not_found
TENANT_ISOLATION_LINES_VISIBLE_TO_TENANT_A=0
TENANT_ISOLATION_REPOSITORY_ERROR=Error
TENANT_ISOLATION_REPOSITORY_REFUSED=true
TENANT_B_STATUS_AFTER_ISOLATION=requested
TENANT_B_RESERVED_COUNT_AFTER_ISOLATION=1
TENANT_B_CLEAN_EXPIRATION=true
TENANT_ISOLATION_PASS=true

ROLLBACK_PROOF_PASS=true
FIXTURE_RESIDUE_COUNT=0
FIXTURE_SLUG_RESIDUE_COUNT=0
POOL_CLOSED=true
CLEANUP_PASS=true
SUPPRESSED_PRODUCTION_OUTPUT_LINES=7
BOOKING_EXPIRATION_PHYSICAL_1_PASS=true
NODE_EXIT=0
HARNESS_NODE_EXIT=0
CERTIFICATION_COMMAND_PASS=True
```

The remediated detector reported `AVAILABILITY_EXACT_UNIQUE_INDEX_COUNT=1`, matching the
independent `pg_catalog` diagnostic exactly. Preflight passed, and the certification proceeded
to the full fixture lifecycle.

### 17.1 Happy path — capacity, status, release and availability

`TENANT_A_INITIAL_RESERVED_COUNT=0` → `TENANT_A_AFTER_CREATE_RESERVED_COUNT=1` →
`TENANT_A_AFTER_EXPIRATION_RESERVED_COUNT=0`. Production `createRequest()` really consumed one
unit of capacity, and production expiration really gave it back. Status moved
`requested` → `expired`. `released_at` went NULL → timestamp. `availability.status` returned to
`available`, which proves the release recomputed status rather than only decrementing the
counter. `TENANT_A_CANCELLED_AT_UNTOUCHED=true` proves the expiration path never writes
`cancelled_at` — the two terminal transitions stay distinct.

The occupied-nights metadata is production-written, not forged: `OCCUPIED_NIGHTS_VERSION=1`,
`OCCUPIED_NIGHTS_RECORD_PRESENT=true`, and `OCCUPIED_NIGHTS_MATCHES_OCCUPIED_NIGHT=true` proves
the recorded nights equal what `expandOccupiedNights` actually derives for the booked range.
`availability.target_id` was verified to equal the accommodation id the release addresses,
which is the precondition that makes the release a real write rather than a silent no-op.

### 17.2 Repeated and stale delivery

The second delivery of the same expiration was refused with
`REPEATED_DELIVERY_REFUSAL_REASON=stale_state`, and
`REPEATED_DELIVERY_NO_SECOND_RELEASE=true` with `REPEATED_DELIVERY_RESERVED_COUNT=0` and
`REPEATED_DELIVERY_STATUS=expired`. The physical state was byte-for-byte stable across the
redelivery. This is the compare-and-set on `status` doing its job: the guarded
`UPDATE ... WHERE status = $expected` matched zero rows, the repository refused, and capacity
was not released a second time.

### 17.3 C1 — legacy line without occupied-nights metadata

`ROLLBACK_LEGACY_REFUSAL_ERROR=AvailabilityConsumptionRecordError`. The production line's
metadata was stripped by the harness, so the release plan could not be validated; the refusal
happens during release planning, **before** any `released_at` write and before any capacity
decrement. The post-state proves nothing was changed:
`ROLLBACK_LEGACY_STATUS_AFTER=requested` and
`ROLLBACK_LEGACY_RESERVED_COUNT_AFTER=1` equals
`ROLLBACK_LEGACY_RESERVED_COUNT_BEFORE=1`. Capacity consumed by the create was preserved.

### 17.4 C2 — strong transactional rollback

This is the decisive proof. The control forced a capacity decrement to fail *inside a real
transaction*, after the status write and after the `released_at` write had already been issued:

* The `status` UPDATE is issued inside `transaction()` at `reservation.repository.js:1274`.
* Release planning validates, then the `released_at` compare-and-set runs at `:1491` —
  **before** the guarded capacity decrement at `:1505`.
* The decrement carries `AND reserved_count >= $1`. Capacity had been deliberately forced to
  `0`, so the guard matched **zero rows**.
* `releaseResult.rows.length === 0` → `AvailabilityConflictError` thrown at `:1522`.
* The throw propagates out of the transaction callback, and `postgres.connection.js:116-117`
  issues `ROLLBACK` and rethrows.

Because the three mutations — status, `released_at`, capacity — are issued on one connection
inside one `BEGIN`/`COMMIT` block, PostgreSQL's atomicity guarantees all three unwind together.
The physical post-state is the proof:

| Assertion | Value | Proves |
| --- | --- | --- |
| `ROLLBACK_UNDERFLOW_ERROR` | `AvailabilityConflictError` | the forced failure really raised |
| `ROLLBACK_UNDERFLOW_STATUS_AFTER` | `requested` | the status UPDATE was unwound |
| `ROLLBACK_UNDERFLOW_LINE_UNRELEASED_AFTER` | `true` | the `released_at` write was unwound |
| `ROLLBACK_UNDERFLOW_RESERVED_COUNT_AFTER` / `_BEFORE` | `0` / `0` | capacity is exactly as prepared, unchanged |

The `released_at` marker is the important one. The decrement failed *after* the line was
already marked released inside the transaction, yet `released_at` is `NULL` in the physical
read. Without transactional atomicity that row would have been left stamped as released while
the reservation was still `requested` and the capacity was never actually returned — a
silently inconsistent reservation. That exact inconsistency did not occur, so status, line
release marker and capacity mutation are proven atomically coupled for this failure path.

### 17.5 Tenant isolation

`TENANT_ISOLATION_FIND_BY_ID=true` (Tenant A's context can find its own reservation),
`TENANT_ISOLATION_LINES_VISIBLE_TO_TENANT_A=0` (Tenant A can see **zero** lines of Tenant B's
reservation), `TENANT_ISOLATION_MANAGER_REFUSAL_REASON=not_found` (the manager refuses rather
than leaking existence), and `TENANT_ISOLATION_REPOSITORY_REFUSED=true` with
`TENANT_ISOLATION_REPOSITORY_ERROR=Error` (the repository's `tenant_id` predicate matched zero
rows). Tenant A could neither read nor mutate Tenant B's reservation through the scoped
repository or the manager.

`TENANT_B_STATUS_AFTER_ISOLATION=requested` with
`TENANT_B_RESERVED_COUNT_AFTER_ISOLATION=1` proves Tenant B's reservation was untouched by all
of Tenant A's work — it stayed `requested` and its capacity stayed consumed — until Tenant B's
own manager expired it cleanly (`TENANT_B_CLEAN_EXPIRATION=true`).

### 17.6 Independent post-certification residue check

A separate SELECT-only query, run after the successful certification, is **independent
cleanup certification** — it does not trust the harness's own `finally`:

```
SYNTHETIC_TENANTS=0
SYNTHETIC_COMPANIES=0
SYNTHETIC_ACCOMMODATIONS=0
SYNTHETIC_AVAILABILITY=0
SYNTHETIC_RESERVATIONS=0
SYNTHETIC_RESERVATION_LINES=0
TOTAL_SYNTHETIC_RESIDUE=0
MUTATING_SQL_EXECUTED=False
SECRET_VALUES_PRINTED=False
RESIDUE_CHECK_PASS=true
NODE_EXIT=0
```

All six fixture tables are clean. This agrees with the harness's own
`FIXTURE_RESIDUE_COUNT=0` and `FIXTURE_SLUG_RESIDUE_COUNT=0`, giving two mutually independent
confirmations that Neon was left with no synthetic residue.

### 17.7 Output safety during the successful run

`SUPPRESSED_PRODUCTION_OUTPUT_LINES=7` — the §10a output guard withheld 7 lines of production
console output, including the production connector's own
`console.error(..., error.message)` sites and the `BaseRepository` trace objects. Every visible
line was a secret-safe structured marker. **No secret was observed in the certification
output**: no `DATABASE_URL`, username, password, hostname, connection URL or customer row.

### 17.8 Marker-name clarification (post-certification, marker-only)

A final review of three markers found that two **names** were semantically misleading while
the underlying **assertions were correct**. They were renamed for future runs. No expression,
assertion or certification logic was altered, and Neon was **not** re-run.

| Historical marker | Exact expression | What `true` actually meant | Renamed to |
| --- | --- | --- | --- |
| `TENANT_A_LINE_RELEASED_BEFORE` | `line.released_at === null` | line is **NOT** released before expiration | `TENANT_A_LINE_UNRELEASED_BEFORE` |
| `TENANT_A_LINE_RELEASED_AFTER` | `afterExpire.lines[0]?.released_at !== null` | line **IS** released after expiration | unchanged — already accurate |
| `ROLLBACK_UNDERFLOW_RELEASED_AT_AFTER` | `after.lines[0]?.released_at === null` | `released_at` is still **NULL** after rollback | `ROLLBACK_UNDERFLOW_LINE_UNRELEASED_AFTER` |

The recorded output above is transcribed with the new names for readability. **The certified
run literally emitted `TENANT_A_LINE_RELEASED_BEFORE=true` and
`ROLLBACK_UNDERFLOW_RELEASED_AT_AFTER=true`**, and the mapping in this table is the authoritative
interpretation of that historical output. Two of the three names asserted the negation of what
they measured, so reading them literally would invert the meaning of the proof.

One further observation, not a defect: the two "after" markers use `lines[0]?.released_at`,
and `undefined !== null` is `true`. A missing line could therefore make the marker alone
misleading. It cannot affect the certification, because each marker is immediately followed by
an `assert` that also requires `lines.length === 1`. The recorded run passed those asserts.

## 18. Certified contract

On certified commit `c76c3eefc60846ca6f00c491c47b9d439858de0c`, against Neon PostgreSQL,
`ReservationManager` → `ReservationRepository` → real `pg` transactions, this slice
physically certifies:

1. Production expiration moves a reservation `requested` → `expired`, writes `released_at`,
   returns the consumed capacity (`reserved_count` 1 → 0) and restores
   `availability.status`, without touching `cancelled_at`.
2. The occupied-nights record is production-written at version 1 and matches the real expanded
   night set.
3. A repeated delivery is refused as `stale_state` and releases no capacity a second time;
   physical state is stable.
4. A line without occupied-nights metadata is refused with
   `AvailabilityConsumptionRecordError` before any release write, leaving status and capacity
   intact.
5. The status write, the `released_at` compare-and-set and the guarded capacity decrement are
   **transactionally atomic**: a failure injected after the `released_at` write unwinds all
   three, proven physically by `AvailabilityConflictError` plus the restored `requested` status,
   `released_at` NULL and unchanged capacity.
6. One tenant cannot read or mutate another tenant's reservation through the scoped repository
   or manager; the other tenant's reservation and capacity remain untouched until it is expired
   by its own manager.
7. The fixture graph is completely removed afterwards — confirmed twice, by the harness and by
   an independent SELECT-only residue check.

## 19. Explicit limitations

This certification is deliberately narrow. It does **not** claim the following.

* **It certifies the tested physical PostgreSQL path only.** The invariant is proven for the
  statements and failure paths this harness exercised. It is not a proof about any untested
  code path, any other schema shape, or any PostgreSQL version other than the one certified.
* **It does not create distributed timer ownership or generation semantics.** No scheduler,
  no timer and no in-memory delivery is attached; expiration is invoked directly through the
  manager. Timer anchoring, delivery deduplication across processes and lease/generation
  ownership remain the subject of BOOKING-EXPIRATION-RECOVERY-1 and are **not** certified here.
  C2 proves transactional atomicity of the write path, not timer correctness.
* **It does not certify Stage or Passenger.** Nothing was deployed and no production process
  was exercised. The SSL compatibility warning from the read-only gates remains **non-blocking
  technical debt**: `database/config/database.config.js` was not touched, and no SSL or
  certificate-verification behaviour is changed in this slice. Any such change affects every
  pooled connection in the production runtime and needs its own review.
* **It does not justify schema changes.** The Neon schema was proven correct by an independent
  `pg_catalog` diagnostic. `MIGRATIONS_RUN=0` and `SCHEMA_CHANGES=0`. The first attempt's
  failure was a **harness defect**, and adding an index would have papered over a bug in the
  test rather than fixing the system.
* **Fixture dates are execution-relative**, so a re-run regenerates different dates by design.
  Only the deterministic ids and slugs are fixed.
* **The harness is opt-in and gated.** It cannot be reached by ordinary test discovery, and it
  refuses without both `BOOKING_EXPIRATION_PHYSICAL_CERTIFY=1` and a `DATABASE_URL`.