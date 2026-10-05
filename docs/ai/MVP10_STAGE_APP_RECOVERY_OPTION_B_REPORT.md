# MVP10 — Stage Recovery via `stage_app` (Option B) — Report

**Checkpoint:** MVP10 — Stage recovery checkpoint following runtime adoption of the
restricted PostgreSQL role `stage_app`
**Database:** `valdi_test`
**Branch:** `p15.3-development`
**Security-rotation baseline commit:** `6f3870de4839659a1cc219c1504781dbde438500`
**Scope of this document:** documentation only. No runtime code, database
configuration, `.env` file, Passenger configuration, or SQL migration was modified by
this task. No `GRANT`/`REVOKE` was executed by this task. Stage was not restarted by
this task.

---

## 1. Executive status

| Checkpoint | Status |
|---|---|
| Gate 1B-2 — Owner permission matrix | **CLOSED / CERTIFIED** (prior gate; not re-run) |
| Stage availability after `stage_app` adoption | **RECOVERED** |
| Option B administrative preflight | **COMPLETE / PASS** |
| Option B privilege grants | **CLOSED / CERTIFIED** |
| Independent post-COMMIT certification | **COMPLETE / EXACT MATCH** |
| Targeted Passenger restart | **EXECUTED** (operator) |
| Public `/health` | **HTTP 200**, physical PostgreSQL |
| Deployed CRLF-normalized comparison | **CLOSED / CERTIFIED** |
| `BOOKING-STAGE-APP-WRITE-1` | **NOT EXECUTED** — immediate next gate |
| Gate 1C | **PENDING** |
| `neondb_owner` rotation | **BLOCKED** |
| JWT / VAPID rotation | **PENDING** |
| Overall credential incident | **OPEN** |

Canonical records:

```text
OPTION_B_GRANTS=CLOSED_CERTIFIED
STAGE_RECOVERY=CLOSED
STAGE_HTTP_STATUS=200
STAGE_PERSISTENCE_PROVIDER=postgres
STAGE_PERSISTENCE_STATUS=up
STAGE_PERSISTENCE_PHYSICAL=true
DEPLOYED_CRLF_NORMALIZED_COMPARISON=CLOSED_CERTIFIED
BOOKING_STAGE_APP_WRITE_1=NOT_EXECUTED
```

---

## 2. Incident sequence

1. The Node.js Selector `DATABASE_URL` was changed to the restricted `stage_app`
   connection targeting `valdi_test`. Selector configuration and app-root `.htaccess`
   `DATABASE_URL` were subsequently verified equal, and the 13-key environment
   inventory was confirmed intact and nonempty.
2. A targeted Passenger restart was performed.
3. Stage returned **HTTP 503**.
4. Sanitized `stderr.log` evidence showed PostgreSQL rejecting the startup path with
   `permission denied for table tenants`, and `SQLSTATE 42501` was observed, including
   in startup-failure entries.
5. The earlier assumption that the Owner-session tables were the only relevant
   PostgreSQL consumer for this runtime was **contradicted by startup evidence** and was
   reopened. The closed Booking milestones were **not** reopened.
6. Code tracing established the actual PostgreSQL startup consumer surface (§4).
7. Two remediation options were presented. **Option B** was explicitly selected.

### 2.1 Why the failure presented as a global 503

The startup rejection happened during initialization, before any HTTP listener was
bound. The failure was therefore not health-specific: every route, including
`/health`, returned 503 because there was no process listening to answer.

A separate, independent corroboration of the persistence wiring was already present in
the public surface: the health handler returns 503 only on its PostgreSQL branch, while
its non-PostgreSQL branch reports `status: up` unconditionally. An observed 503
therefore established that the deployed worker was resolving the PostgreSQL persistence
provider, not the in-memory one.

### 2.2 Supporting code provenance note

A byte-level comparison of deployed files against the security-rotation baseline commit
was performed for the files on the traced startup path:

- `experience/booking/ensueno.booking.resolver.js` — **byte-exact match**. This is the
  file that issues the query that produced `permission denied for table tenants`, so the
  failing SQL itself is certified committed code.
- `web/staging.passenger.js`, `web/start.web.js`,
  `runtime/startup/reservation.recovery.bootstrap.js` — byte-exact match.
- `web/web.server.js`, `runtime/startup/application.start.js`,
  `runtime/startup/capability.bootstrap.js`,
  `capabilities/persistence/adapters/postgres/postgres.reservation.adapter.js` —
  differed from the baseline blob and were observed to contain CRLF line endings.

A line-ending normalization check (CRLF to LF, compared against the baseline hash) was
subsequently executed as a **read-only** Stage verification and **completed
successfully**. See §2.2.1.

### 2.2.1 Deployed CRLF-normalized comparison — CLOSED / CERTIFIED

An earlier raw SHA-256 comparison found four deployed files differing from their expected
baseline hashes while also containing CRLF line endings. A later **read-only** Stage
verification normalized CRLF to LF **in memory only** and recalculated SHA-256. **No
deployed file was modified by that operation.**

All four normalized hashes matched their expected baseline hashes:

```text
SUMMARY_CHECKED=4
SUMMARY_MATCHED=4
ALL_FOUR_CHECKED=true
ALL_FOUR_MATCH=true
CRLF_NORMALIZED_COMPARISON_COMPLETE=true
SSH_LASTEXITCODE=0

DEPLOYED_CRLF_NORMALIZED_COMPARISON=CLOSED_CERTIFIED
```

This establishes **logical equivalence after line-ending normalization** for those four
specific deployed files, and closes the provenance question raised by the raw comparison.
The 503 observed before the grants and the HTTP 200 observed after them therefore occurred
on a tree whose traced startup path is content-equivalent to the security-rotation baseline
commit.

### 2.2.2 Scope limit of the CRLF certification

This certification covers **only those four files**. It is **not** a certification of the
entire deployed repository, of the remaining four files that were already byte-exact, or of
any deployed file outside the traced startup path. No broader deployed-tree claim is made
or implied.

---

## 3. Historical Gate 1B-2 connection recovery

Gate 1B-2 had previously certified the restricted Owner permission matrix on
`valdi_test`. Its exact historical execution mechanism was recovered and is recorded
here because Option B reused it.

```text
Execution host:   Windows local
Execution file:   C:\Users\casa\Downloads\gate1b2-approved.ps1
Command:          powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$HOME\Downloads\gate1b2-approved.ps1"
Connection source: environment variable NEON_ADMIN_URL
```

### 3.1 The detail that mattered

The script did **not** connect to the database pathname originally contained in the
administrative URL. It rewrote the pathname **in memory** and only then connected,
equivalent to:

```js
const DB = 'valdi_test';
const u = new URL(process.env.NEON_ADMIN_URL);
u.pathname = '/' + DB;
const cs = u.toString();
```

It then connected using local Node.js with `pg`.

The target was physically guarded, not assumed, by selecting `current_database()`
before mutation and re-asserting it inside the transaction. Historical evidence:

```text
TARGET_DATABASE_CONFIRMED=true
TXN_DATABASE_REASSERTED=true
```

### 3.2 Administrative role

```text
ADMIN_ROLE_NAME=NOT_EVIDENCED
```

The historical output did not print `current_user` or `session_user`. **No claim is made
that the administrative role was `neondb_owner`.** The later preflight (§5) establishes
capabilities of the connecting role without asserting its historical identity.

### 3.3 Gate 1B-2 result (closed, not re-run)

Certified direct privileges introduced by that gate:

| Table | Privileges |
|---|---|
| `public.users` | `SELECT` |
| `public.owner_sessions` | `SELECT`, `INSERT`, `UPDATE` |
| `public.owner_application_grants` | `SELECT` |

Markers:

```text
TRANSACTION_COMMITTED=true
CERT_COMPLETE=true
GRANTS_COMPLETE=true
NODE_EXIT_CODE=0
```

No extra table privileges, sequence privileges, default privileges, ownership,
membership, schema `CREATE`, or function grants were introduced by that gate. Gate 1B-2
was **not** recreated, re-run, or extended by this checkpoint.

---

## 4. Option B rationale

### 4.1 Traced startup reconstruction path

The failing query was traced to committed code:

| Step | Location |
|---|---|
| Passenger entry | `web/staging.passenger.js:19-22` |
| Provider resolution | `web/start.web.js:22` |
| Runtime handoff | `web/web.server.js:227-229` |
| Startup gate | `runtime/startup/application.start.js:73`, `:143-145` |
| Resolver | `experience/booking/ensueno.booking.resolver.js:167-230` |

The rejected statement:

```sql
-- experience/booking/ensueno.booking.resolver.js:88-91
SELECT id, name FROM tenants WHERE slug = $1 LIMIT 1
-- :103-106
SELECT id, tenant_id FROM companies WHERE slug = $1 LIMIT 1
-- :126-129
SELECT id, tenant_id, company_id FROM accommodations WHERE slug = $1 LIMIT 1
```

The error propagated out of the fail-closed resolver, was wrapped as a runtime bootstrap
error at `runtime/startup/application.start.js:251-257`, and aborted initialization
before any listener was bound.

### 4.2 Why this ran despite `FEATURE_DATABASE=false` and `DEFAULT_PROVIDER=mock`

Two differently-scoped variables were conflated:

- The pipeline override block at `runtime/startup/application.start.js:40-57` is passed
  only to the configuration pipeline (`:85-88`). It feeds the resolved configuration and
  runtime validation (`:187-189`). It never influences `options.persistenceProvider`.
- The PostgreSQL branches at `runtime/startup/application.start.js:118`, `:126`, and
  `:143` gate on `persistenceProvider`, which is sourced from the `PERSISTENCE_PROVIDER`
  environment variable via `web/start.web.js:22`.

`DEFAULT_PROVIDER` is never read at those gates. The feature flags disabled only a
provider-registration diagnostic; they did not and could not disable the persisted
identity reconstruction.

### 4.3 Traced expiration-recovery surface

After the reconstruction succeeds, `runtime/startup/application.start.js:170-177` runs
the per-tenant reservation expiration recovery, which performs reads and **writes**:

| Operation | Location |
|---|---|
| `SELECT * FROM reservations WHERE status = $1 AND tenant_id = $2 AND deleted_at IS NULL` | `reservation.manager.js:329` → `contracts/base.repository.js:93-96` → `postgres.reservation.adapter.js:213` |
| `UPDATE reservations SET status, updated_at ... RETURNING *` | `reservation.repository.js:1446-1452` |
| `SELECT rl.* FROM reservation_lines JOIN reservations ...` | `reservation.repository.js:1464-1471` |
| `UPDATE reservation_lines SET released_at ... RETURNING quantity` | `reservation.repository.js:1489-1494` |
| `UPDATE availability SET reserved_count, status, updated_at ... RETURNING id` | `reservation.repository.js:1505-1519` |

The `RETURNING` clauses are why `SELECT` is required on all three write tables
independently of the read paths.

Verified as **not** on the startup path: hydration under the synthetic commercial tenant
is guarded (`reservation.capability.js:43-48`), its recovery is skipped
(`reservation.capability.js:108-118`), runtime validation is structural, and no
migration, seed, or DDL executes from Passenger startup.

### 4.4 The asymmetry that defined the option choice

The two startup consumers fail differently:

- **Step 3b (identity reconstruction) fails fatally.** It throws through
  `runtime/startup/application.start.js:251-257` and takes the whole process down.
- **Step 4b (expiration recovery) fails degraded, not fatally.** Per-tenant failures are
  caught and reported at `reservation.recovery.bootstrap.js:325-337`; startup continues.

A read-only grant on the three reconstruction tables would therefore have restored
availability while silently disabling automatic reservation expiration, leaving
persisted reservations able to remain pending indefinitely. Option B was selected to
repair the complete traced surface rather than accept a degraded runtime.

**Option B is a repair of the traced startup and expiration-recovery permission surface.
It is not a certification of Booking functionality.**

---

## 5. Preflight evidence

A read-only administrative preflight was executed against `valdi_test` **before** any
new grant, reusing the recovered historical mechanism: `NEON_ADMIN_URL` was parsed and
its pathname changed in memory to `/valdi_test`.

```text
TARGET_DATABASE_CONFIRMED=true
ADMIN_IS_SUPERUSER=false
ADMIN_CAN_CREATE_ROLE=true
STAGE_APP_ROLE_EXISTS=true

TABLE_TENANTS_EXISTS=true
ADMIN_OWNS_TENANTS=true
ADMIN_TENANTS_SELECT=true
BEFORE_STAGE_APP_TENANTS_SELECT=false

TABLE_COMPANIES_EXISTS=true
ADMIN_OWNS_COMPANIES=true
ADMIN_COMPANIES_SELECT=true
BEFORE_STAGE_APP_COMPANIES_SELECT=false

TABLE_ACCOMMODATIONS_EXISTS=true
ADMIN_OWNS_ACCOMMODATIONS=true
ADMIN_ACCOMMODATIONS_SELECT=true
BEFORE_STAGE_APP_ACCOMMODATIONS_SELECT=false

TABLE_RESERVATIONS_EXISTS=true
ADMIN_OWNS_RESERVATIONS=true
ADMIN_RESERVATIONS_SELECT=true
BEFORE_STAGE_APP_RESERVATIONS_SELECT=false
ADMIN_RESERVATIONS_UPDATE=true
BEFORE_STAGE_APP_RESERVATIONS_UPDATE=false

TABLE_RESERVATION_LINES_EXISTS=true
ADMIN_OWNS_RESERVATION_LINES=true
ADMIN_RESERVATION_LINES_SELECT=true
BEFORE_STAGE_APP_RESERVATION_LINES_SELECT=false
ADMIN_RESERVATION_LINES_UPDATE=true
BEFORE_STAGE_APP_RESERVATION_LINES_UPDATE=false

TABLE_AVAILABILITY_EXISTS=true
ADMIN_OWNS_AVAILABILITY=true
ADMIN_AVAILABILITY_SELECT=true
BEFORE_STAGE_APP_AVAILABILITY_SELECT=false
ADMIN_AVAILABILITY_UPDATE=true
BEFORE_STAGE_APP_AVAILABILITY_UPDATE=false

TARGET_TABLE_COUNT=6
ALL_TARGET_TABLES_EXIST=true
ADMIN_IS_TABLE_OWNER_COUNT=6
GRANT_AUTHORITY_CHECKS=9
GRANT_AUTHORITY_PASS=9
ADMIN_ROLE_CAN_GRANT=true
OPTION_B_ADMIN_PREFLIGHT_PASS=true
OPTION_B_ADMIN_PREFLIGHT_COMPLETE=true
NODE_EXIT_CODE=0
```

### 5.1 Authoritative pre-change privilege baseline

**All nine Option B `stage_app` privilege checks were `false` immediately before the
remediation.** This is the authoritative pre-change privilege baseline for the six
target tables.

### 5.2 Preflight conclusions

- The administrative role was sufficient but not superuser, and did hold grant authority
  over all six targets. No ownership or superuser escalation was required.
- The target database was physically confirmed rather than inferred from the URL.

---

## 6. Exact privilege matrix applied

Exactly this surface was authorized and applied:

| Table | Privileges |
|---|---|
| `public.tenants` | `SELECT` |
| `public.companies` | `SELECT` |
| `public.accommodations` | `SELECT` |
| `public.reservations` | `SELECT`, `UPDATE` |
| `public.reservation_lines` | `SELECT`, `UPDATE` |
| `public.availability` | `SELECT`, `UPDATE` |

Total required privilege pairs: **9**.

The physical transaction used two `GRANT` statements equivalent to:

```sql
GRANT SELECT ON TABLE
  public.tenants,
  public.companies,
  public.accommodations
TO stage_app;

GRANT SELECT, UPDATE ON TABLE
  public.reservations,
  public.reservation_lines,
  public.availability
TO stage_app;
```

### 6.1 Explicitly not authorized and not applied

No `INSERT`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER`, DDL, ownership change,
sequence or default privilege, superuser attribute, or role-inheritance expansion was
authorized by Option B. The Gate 1B-2 Owner surface was neither extended nor altered.

No sequence grants were required: the traced path contains no `INSERT`, and the schema
declares primary keys as UUID-with-default rather than serial or identity columns.

---

## 7. Transaction evidence

```text
OPTION_B_EXECUTION_BEGIN=true
GRANT_LITERAL_STATEMENT_COUNT=2
GRANT_EXPECTED_PRIVILEGE_PAIR_COUNT=9

TARGET_DATABASE_CONFIRMED=true
TARGET_TABLE_COUNT=6
ADMIN_IS_TABLE_OWNER_COUNT=6
AUTHORITY_REASSERTED=true

BEGIN_ISSUED=true
TXN_DATABASE_REASSERTED=true

GRANT_STATEMENTS_ISSUED=2
TRANSACTION_COMMITTED=true
APPLYING_CONNECTION_CLOSED=true
```

The target database and administrative ownership were re-asserted immediately before
mutation, the work was wrapped in an explicit transaction, the transaction committed, and
the applying connection was closed before certification.

---

## 8. Independent post-COMMIT certification

A **new** PostgreSQL connection was opened after the applying connection was closed, so
certification did not observe uncommitted state of the mutating session.

```text
CERT_DATABASE_CONFIRMED=true

POST_STAGE_APP_TENANTS_SELECT=true
POST_STAGE_APP_COMPANIES_SELECT=true
POST_STAGE_APP_ACCOMMODATIONS_SELECT=true

POST_STAGE_APP_RESERVATIONS_SELECT=true
POST_STAGE_APP_RESERVATIONS_UPDATE=true

POST_STAGE_APP_RESERVATION_LINES_SELECT=true
POST_STAGE_APP_RESERVATION_LINES_UPDATE=true

POST_STAGE_APP_AVAILABILITY_SELECT=true
POST_STAGE_APP_AVAILABILITY_UPDATE=true

POST_REQUIRED_PRIVILEGE_COUNT=9
POST_REQUIRED_PRIVILEGES_ALL_TRUE=true

POST_OPTION_B_DIRECT_GRANT_ROW_COUNT=9
OPTION_B_DIRECT_GRANTS_EXACT_MATCH=true

POST_PROHIBITED_PRIVILEGES_HELD=0

CERT_COMPLETE=true
OPTION_B_GRANTS_COMPLETE=true
OPTION_B_EXECUTION_COMPLETE=true
NODE_EXIT_CODE=0
```

Two independent properties are established here:

1. **Completeness** — all 9 required privileges are held by `stage_app`.
2. **Minimality** — exactly 9 direct grant rows exist, matching the authorized surface
   exactly, and **0** prohibited privileges are held.

Recorded status: `OPTION_B_GRANTS=CLOSED_CERTIFIED`.

---

## 9. Passenger recovery evidence

After Option B certification, the operator performed a **targeted restart of the
`turistic-stage` Node.js application** through the CloudLinux/cPanel Node.js Selector.
No additional environment variables were intentionally changed during this restart.

The first public health request after the restart returned **HTTP 200**. Exact sanitized
response:

```text
HTTP_STATUS=200

{
  "status": "ok",
  "environment": "staging",
  "persistence": {
    "status": "up",
    "provider": "postgres",
    "physical": true,
    "entityName": "unknown",
    "latency": 54
  }
}
```

Observed markers:

```text
STAGE_HTTP_200_RECOVERED=True
STAGE_POST_OPTION_B_HEALTH_COMPLETE=true
```

Recorded status:

```text
STAGE_RECOVERY=CLOSED
STAGE_HTTP_STATUS=200
STAGE_PERSISTENCE_PROVIDER=postgres
STAGE_PERSISTENCE_STATUS=up
STAGE_PERSISTENCE_PHYSICAL=true
```

The previous startup blocker, `permission denied for table tenants`, is considered
resolved for the successfully restarted runtime.

---

## 10. Certification boundary

### 10.1 What this checkpoint certifies

1. `stage_app` can successfully support the traced startup reconstruction permission
   surface.
2. `stage_app` holds the traced `SELECT`/`UPDATE` permission surface required for the
   expiration-recovery tables included in Option B.
3. Passenger successfully restarted after those grants.
4. Public Stage returned HTTP 200.
5. The health endpoint reported physical PostgreSQL persistence: `provider=postgres`,
   `status=up`, `physical=true`.
6. The original 503 startup incident, caused by insufficient `stage_app` access to
   `tenants`, is resolved.
7. The Option B grant surface is exactly the authorized surface, with zero prohibited
   privileges held.
8. For the four files listed in §2.2, the deployed tree is logically equivalent to the
   security-rotation baseline commit after line-ending normalization
   (`DEPLOYED_CRLF_NORMALIZED_COMPARISON=CLOSED_CERTIFIED`).

### 10.2 What this checkpoint does NOT certify

- All Booking write paths are **not** certified.
- Reservation `POST` is **not** certified under `stage_app`.
- `INSERT` privileges required by reservation creation are **not** traced and were **not**
  granted.
- Durable reservation persistence across a Passenger restart under `stage_app` is **not**
  certified.
- The full cancellation/release lifecycle under `stage_app` is **not** certified.
- Live Owner-session PostgreSQL identity has **not** been independently certified.
- All PostgreSQL consumers have **not** been migrated away from the old identity.
- `POSTGRES_*` has **not** been remediated.
- Gate 1C is **not** closed.
- `neondb_owner` is **not** yet rotatable.
- JWT / VAPID rotation is **not** complete.
- The overall credential incident is **not** closed.
- The deployed repository as a whole is **not** certified by the CRLF-normalized
  comparison, which covers only the four files in §2.2.

### 10.2.1 Absence of evidence is not evidence of loss

It is **not** stated, and must not be inferred, that reservations are currently being
lost. The outstanding item is an **uncertified** contract, not a known defect: durable
reservation persistence under the new restricted runtime identity has simply **not yet
been re-certified**. `BOOKING-STAGE-APP-WRITE-1` (§12) exists to close that gap.

### 10.3 Interpretation limits that must not be overstated

- The health endpoint proving physical PostgreSQL does **not** by itself prove the exact
  database role used by every independent runtime pool. A `physical: true` response and
  an HTTP 200 are compatible with several distinct runtime identities; it is evidence of
  a working PostgreSQL-backed runtime, not an identity attestation.
- The absence of a permission failure on the traced startup path is **not** proof that
  no other PostgreSQL permission problem exists. Untraced consumers, notably the request-
  time reservation creation path, remain outside this checkpoint.
- Option B certifies a permission surface for the traced paths. It is not a functional
  certification of the Booking aggregate.
- The CRLF-normalized comparison certifies **logical equivalence for four named files
  only** (§2.2.2). It must not be restated as a whole-repository deployment certification.
- The closed Booking milestones are unaffected. This checkpoint reopens only the
  specific assumption that Owner-session tables were the sole relevant PostgreSQL
  consumer, and that assumption is now resolved in the negative with a traced remedy.

---

## 11. Remaining security rotation work

### 11.0 Ordering constraint — product safety gate first

The Security Rotation work in this section is **not abandoned or deprioritized**. It is
retained in full as the remaining path to retiring the compromised credentials.

However, `BOOKING-STAGE-APP-WRITE-1` (§12) is recorded as the **immediate product safety
gate**, to be executed **before** proceeding with destructive credential retirement
(§11.2 – §11.6). The rationale is ordering, not deprioritization: retiring the old
identities while the durable Booking write lifecycle under the new restricted runtime
remains uncertified would remove the fallback without first proving the replacement
carries production responsibility.

### 11.1 Live runtime identity certification

Must distinguish, as separate evidence:

- saved Selector configuration;
- process environment;
- independently opened diagnostic connections;
- the actual application PostgreSQL pool/session identity.

### 11.2 Legacy `POSTGRES_*` remediation

Selector `POSTGRES_*` was previously confirmed to still reference the old PostgreSQL
target/identity and does not match `DATABASE_URL`. It was **not** silently rewritten
during this checkpoint. Remediating it requires its own evidence and authorization.

### 11.3 Gate 1C

Maintenance/cron cleanup remains **pending**. Known architecture:

```text
cron
  -> external wrapper
  -> /home/rodrigo/etc/owner-session-env
  -> Node
  -> cleanup
```

This path historically references the old administrative identity / database
configuration. The appropriate maintenance identity and cleanup contract must be
evaluated.

**Constraint:** `DELETE` must **not** be added to `stage_app` merely to satisfy cron.
The cleanup contract has to be traced first.

### 11.4 `neondb_owner` rotation

**BLOCKED** until the remaining consumers are identified and remediated.

### 11.5 `JWT_SECRET` / VAPID

Rotation remains **pending**, sequenced after database consumer cleanup.

### 11.6 Final incident closure

Only after the remaining credentials and consumers have been handled and independently
certified.

### 11.7 Carry-over tooling note — CRLF normalization

**Closed.** Deployed-file hash verification against the security-rotation baseline is now
resolved for the traced startup path: the four CRLF-affected files were confirmed
logically equivalent after in-memory normalization (§2.2.1,
`DEPLOYED_CRLF_NORMALIZED_COMPARISON=CLOSED_CERTIFIED`).

Residual methodology requirement, not an open defect: the deployed tree mixes LF and CRLF
line endings, so **any future** deployed-vs-baseline hash comparison must normalize line
endings in memory before comparing. A raw hash comparison alone will report false
differences for CRLF-affected files. The normalization must never be applied by writing to
the deployed file.

---

## 12. Next gate — `BOOKING-STAGE-APP-WRITE-1`

**Status: NOT EXECUTED.** This gate has not been run. Nothing in this section is a claim
of certification.

**Gate name:** `BOOKING-STAGE-APP-WRITE-1`
**Gate kind:** Booking certification under the restricted `stage_app` identity
**Sequence position:** immediate next gate, ahead of the destructive credential-retirement
steps in §11.2 – §11.6 (see §11.0)

### 12.1 Objective

Determine whether the actual public Stage Booking write lifecycle works durably under
`stage_app`.

### 12.2 Principal question this gate must answer

> Can a reservation created in public Stage under the restricted `stage_app` runtime be
> persisted durably, survive a Passenger restart, and subsequently release its capacity
> correctly?

### 12.3 Intended sequence

1. Trace the actual public Stage reservation `POST` path.
2. Determine the exact PostgreSQL operations and minimum privileges used by reservation
   creation.
3. Compare those requirements against the current `stage_app` privilege surface recorded in
   §6.
4. **Do NOT pre-grant `INSERT` or any other privilege.**
5. If additional privileges are physically required, define and review a least-privilege
   matrix before any mutation.
6. Execute one controlled synthetic Stage reservation **only after** the permission
   contract is understood.
7. Verify the reservation exists through the public/product path and, where appropriate,
   physical persistence evidence.
8. Verify availability/capacity reflects the reservation.
9. Perform a targeted Passenger restart.
10. Verify the **same** reservation still exists after the restart and that its capacity
    state remains correct.
11. Exercise the appropriate cancellation/release path.
12. Verify capacity is released exactly and persistent state remains consistent.

### 12.4 Explicit prohibitions for this gate

- No pre-granting of `INSERT` or any other privilege.
- No `DELETE` added to `stage_app` to satisfy the Gate 1C cron contract without first
  tracing that contract (§11.3).
- No certificate of "all Booking functionality". The gate certifies the specific
  create → survive-restart → release lifecycle under test, nothing wider.

### 12.5 After `BOOKING-STAGE-APP-WRITE-1`

1. Certify the actual application PostgreSQL pool/session identity from inside the running
   Passenger runtime, distinguishing it from saved configuration and from independently
   opened diagnostic connections (§11.1).
2. Decide the `POSTGRES_*` remediation with explicit authorization (§11.2).
3. Then proceed with §11.3 – §11.6: Gate 1C identity, `neondb_owner` rotation,
   `JWT_SECRET` / VAPID rotation, and final incident closure.

Gate 1C and `neondb_owner` rotation remain blocked behind these items and are not
recommended for execution yet.

---

## 13. Related records

- `docs/ai/CURRENT_STATE.md` — current project state and checkpoint index
- Gate 1B-2 certification — prior checkpoint, closed, not re-run by this work
- `docs/ai/BOOKING_EXPIRATION_RECOVERY_1_REPORT.md` — design origin of the traced
  expiration-recovery surface referenced in §4.3

---

## 14. Correction history

| Revision | Change |
|---|---|
| Initial report | Recorded the deployed CRLF-normalized comparison as prepared but **not recorded**, and recorded it as open tooling debt (§11.7). Proposed `Gate 1B-4` as the next gate (§12). |
| Correction | The CRLF-normalized comparison **was** subsequently completed successfully and is now recorded as `DEPLOYED_CRLF_NORMALIZED_COMPARISON=CLOSED_CERTIFIED` (§2.2.1), with an explicit scope limit (§2.2.2), added to the certified list (§10.1 item 8), and downgraded from open debt to methodology note (§11.7). Next gate replaced with `BOOKING-STAGE-APP-WRITE-1` (§12). Added the product-safety-first ordering constraint (§11.0) and the absence-of-evidence clarification (§10.2.1). |

The initial record was wrong on one point and is corrected here: the CRLF-normalized
comparison was **not** left unrecorded. It completed and all four normalized hashes
matched.