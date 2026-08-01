# Commercial Runtime Verification — P13.5.4

> **Phase:** P13.5.4
> **Type:** Runtime verification (production-readiness gate before P13.6 — Payment)
> **Scope:** Business · Accommodation · Availability · Visitor · Reservation · Search · CMS Sync · Runtime Events
> **Status:** Completed (static-only; execution checks deferred to a runtime environment)
> **Verdict:** **RUNTIME BLOCKERS FOUND**
> **Readiness score:** **53 / 100**

---

## 1. Executive Summary

The Commercial Aggregate reached **92/100 — READY FOR RUNTIME VERIFICATION** in P13.5.3. This phase
attempted to validate it at runtime: bootstrap the aggregate, execute the five lifecycles, fire the
events, and prove the repository/authorization/health contracts end-to-end.

**Result.** The aggregate *code* is healthy (P13.5.3 corrections verified statically), but the
aggregate **cannot execute in the current codebase**. Three independent facts combine into a hard
runtime blocker:

1. **No runtime wiring exists.** `BootstrapPipeline` (`runtime/bootstrap/bootstrap.pipeline.js`)
   and `RuntimeEngine` (`runtime/runtime.engine.js`) have **zero callers**. The only executable
   entry (`src/main.js` → `src/app.js` → `engine/core/bootstrap.js`) builds a minimal context
   (`{ tenant, dataManager, provider, eventBus }`), loads only `['gallery','booking','notifications','pwa']`,
   and never assembles `context.runtime` or `context.repositories` — the two contracts every
   commercial capability consumes.
2. **The repository contract was defective.** `PersistenceCapability` exposed `context.repositories.<name>`
   through a Proxy whose `get` returned an *unawaited Promise* from an async resolver — so
   `await repo.findMany(...)` could never reach the repository. **Fixed in this phase** (lazy facade).
3. **The repository infrastructure is unwired.** Zero of the 25+ repository classes are registered,
   zero adapters exist for the default `'mock'` provider, no `PersistenceCapability` is loaded into
   any tenant, and the pipeline's `initializeRepositories` / `initializeCapabilities` steps are stubs
   that return `{}` / `[]`.

Additionally, **no JavaScript runtime is installed on this machine** (checked `node`, `deno`, `bun`,
`qjs`, `jsc` and standard install paths) — even the legacy browser app cannot be executed here.
Execution-dependent audit items are therefore documented as *pending runtime* rather than verified.

Four concrete code defects were fixed (see §12) — including a broken import graph that made the
entire capability registry (`capabilities/core/register.js`) unloadable. The project-wide
import-resolution scan now passes with **0 missing across 1048 relative imports**. Everything else is
classified as architectural and **not** implemented, per the phase rule *"only fix issues that prevent
runtime execution; classify architectural issues."*

---

## 2. Verification Method & Environment

| Item | Detail |
|---|---|
| Method | Static source audit: import-graph greps, contract tracing, lifecycle tracing, event inventory, runtime-isolation scan, dependency-reversal scan |
| Runtime | **None available** (`node`, `deno`, `bun`, `qjs`, `jsc`, `nodejs` — not found on PATH or standard install paths) |
| Execution checks | Marked **PENDING RUNTIME** (cannot bootstrap, run flows, or fire events) |
| Static checks | Bracket/paren balance on edited files; module-specifier resolution verified for every edited import |
| Source of truth | `COMMERCIAL_AGGREGATE_VALIDATION.md` (P13.5.2 + P13.5.3, 92/100) |

---

## 3. Runtime Validation — 14-Point Checklist

| # | Check | Status | Notes |
|---|---|---|---|
| 1 | Business lifecycle + cascades | **PASS** (static) | `business.manager.js` CRUD/status transitions + archive/restore/delete cascades verified in P13.5.2/P13.5.3; execution pending runtime |
| 2 | Accommodation lifecycle | **PASS** (static) | create/attach/detach/archive/publish/hide/delete/duplicate (`business-accommodation.manager.js`); ownership checks verified |
| 3 | Availability lifecycle | **PASS** (static) | block/unblock/reserve/release/season/rule/bulk/occupancy (`business-availability.manager.js`, `availability.manager.js`); **residual H4** — availability absent from business cascades (P13.5.2, open) |
| 4 | Reservation lifecycle + status transitions | **PASS** (static) | all 15 lifecycle ops guarded + identity-forwarding + workflow transitions verified (P13.5.3 C1–C3) |
| 5 | Visitor lifecycle | **PASS** (static) | CRUD/merge/VIP/blacklist/tags/attach-detach (`business-visitor.manager.js`) verified |
| 6 | Authorization via `context.runtime.auth` | **PASS** (code) / **BLOCKED** (wiring) | Every write path calls `#checkPermission`; but no wiring assembles `context.runtime.auth` (see §7) |
| 7 | Repository via `context.repositories.*` | **FIXED** (defect) / **BLOCKED** (wiring) | Proxy Promise defect fixed (§12 RB1); no repos registered, no adapters (§4.1 RB4) |
| 8 | Runtime Events | **PASS** (static) / PENDING RUNTIME | Emission inventory complete, payloads carry aggregate ids + identity (§8); firing unverifiable without runtime |
| 9 | Runtime Isolation | **PASS** | Zero PostgreSQL/Drizzle/JWT/OAuth/HTTP imports in the five commercial capabilities (§4.3) |
| 10 | Circular Dependency Audit | **PASS** | No reverse imports; capabilities never import `runtime/*`, `runtime/*` never imports capabilities (§4.4) |
| 11 | Aggregate Integrity | **PASS** (static) | `businessId`/`accommodationId`/`visitorId` preserved end-to-end (P13.5.3 C1) |
| 12 | Search Synchronization | **PASS** (code) / dormant | Event-driven index/remove + sync push exist (`business.capability.js:85-109`) but require `context.runtime.search/sync`, which nothing wires |
| 13 | CMS Synchronization | **PASS** (design) / **BLOCKED** | Runtime CMS step (`BootstrapPipeline.#initializeCMS`) is a stub; only legacy CMS path exists |
| 14 | Runtime Health | **PASS** (contract) / **BLOCKED** (wiring) | `RuntimeHealth` contract is sound; never instantiated, capability `health()` not implemented, pipeline health hardcodes `healthy` |
| 15 | Production Readiness | **53/100 — RUNTIME BLOCKERS FOUND** | §10 |

---

## 4. Dependency Audit

### 4.1 Repository wiring (context)

| Check | Result |
|---|---|
| Repositories registered (`engine.register` / `persistence.register`) | **NONE** — zero callsite for any commercial entity; `PersistenceCapability` never loaded by a tenant |
| Adapters registered (`registerAdapter`) | **NONE** — default provider `'mock'` has no adapter; `repository.factory.js:53-60` throws `No adapter registered` |
| Repo resolution contract | `factory.resolve(entityName, context)` **requires `context.tenant`** (`repository.factory.js:89-91`); capability context must carry it |
| Repository engine instantiated | Only inside `PersistenceCapability.init`; that capability is never loaded |
| `BootstrapPipeline.#initializeRepositories` | **Stub** — emits `count: 0`, returns `{}` (`bootstrap.pipeline.js:195-198`) |
| `BootstrapPipeline.#initializeCapabilities` | **Stub** — emits `count: 0`, returns `[]` (`bootstrap.pipeline.js:200-203`) |

### 4.2 Commercial capability loading

| Check | Result |
|---|---|
| Tenant config referencing commercial capabilities | **NONE** — `engine/core/bootstrap.js:44` loads only `['gallery','booking','notifications','pwa']` |
| Capability registration | All 31 available in `capabilities/core/register.js`, but only the 4 legacy ones are ever `activate()`d |
| Entry-point caller of `BootstrapPipeline`/`RuntimeEngine` | **NONE** — definitions exist; no `new BootstrapPipeline(...)` / `new RuntimeEngine(...)` anywhere |

### 4.3 Runtime isolation (forbidden infra in capabilities)

| Check | Result |
|---|---|
| `pg` / `postgres` / `drizzle` / ORM imports in commercial caps (business, accommodation, availability, visitor, reservation) | **ZERO** — PASS |
| JWT/OAuth/WordPress/HTTP/axios/express imports in commercial caps | **ZERO** — PASS |
| `process.env` / `require(...)` in commercial caps | **ZERO** — PASS |
| `window` / `document` in commercial caps | **ZERO** — PASS (browser globals appear only in `public`, `tenant`, `pwa`/`pwa-engine` — browser-bound capabilities where they are domain-appropriate) |
| Postgres/Drizzle code | Present only under `capabilities/persistence/providers/postgres/` as **lazy `require`** inside functions (`postgres.pool.js:60`, `drizzle.client.js:36-39`) — dormant unless the `postgres` provider is configured (it never is) |

### 4.4 Circular dependency (module graph)

| Check | Result |
|---|---|
| `capabilities/**` importing `runtime/**` | **ZERO** — capabilities consume runtime only through `context.runtime.*` (correct) |
| `runtime/**` importing `capabilities/**` | **ZERO** — PASS (no reverse edges) |
| Capability → Service → Manager → (Context) | Clean single-direction flow; all inter-capability edges go through `context.capabilities.get(...)`, never imports |

---

## 5. Aggregate Audit (static, lifecycle trace)

Verified against P13.5.2/P13.5.3 evidence; all five lifecycles are structurally complete and
enforce ownership + status rules:

- **Business** (root, orchestration-only): DRAFT → ACTIVE/PENDING/… transitions via `BusinessWorkflow`; emits per-status events (`business.manager.js:99`); cascades archive/restore/delete to accommodation, reservation, visitor (verified P13.5.2).
- **Accommodation**: owned by business; create/attach/detach/archive/publish/hide/delete/duplicate; emits with `businessId`+`accommodationId` (`business-accommodation.manager.js:183-402`).
- **Availability**: day/season/rule calendar ops + occupancy; emits with `accommodationId`/`businessId` (`business-availability.manager.js:108-384`). **Residual H4**: business-level archive/restore/delete does not cascade availability.
- **Reservation**: 15 guarded lifecycle ops, repository-first persistence with in-memory + DataManager fallback (`reservation.manager.js:30-32,63-98,785-811`), workflow-validated transitions (P13.5.3).
- **Visitor**: CRUD/merge/VIP/blacklist/tags; attach/detach reservation (`business-visitor.manager.js:130-433`).

**Behavioral note:** `business.manager.js:133-134,164-165` `createBusiness`/`updateBusiness` have **no**
DataManager fallback — they require a working repository. This is a hard dependency on the (currently
unwired) repository layer, not a defect.

---

## 6. Repository Audit

| Area | Finding |
|---|---|
| Contract (`context.repositories.*`) | **RB1 — FIXED.** Proxy returned an unawaited `Promise` from `async #resolveRepository` (`repository.capability.js:22-43`); every `await repo.method()` silently no-op'd. Replaced with a lazy facade that awaits resolution and forwards method calls, memoizing resolved repos. Behavior preserved: unregistered names yield `undefined`-returning methods (managers fall back to caches/DataManager); registered-but-failing repos still rethrow (fail loud). |
| Repository class imports | **RB2 — FIXED.** 25 top-level `capabilities/persistence/repositories/*.repository.js` imported `../base.repository.js`, which does not exist (`base.repository.js` lives under `contracts/`). Any import of these classes crashed module resolution. Repointed to `../contracts/base.repository.js` (matching the nested variants). |
| Registration | **RB4 (architectural).** Zero `register(entityName, { class })` calls; `RepositoryEngine` never instantiated outside the never-loaded `PersistenceCapability`. |
| Adapters | **RB4 (architectural).** `defaultProvider: 'mock'` has no adapter (`repository.factory.js:12-13,53-60`); repo creation therefore always fails even if registered. |
| Decorators | Configured as enabled by default (cache/retry/audit/timestamps) but **never registered** (`repository.factory.js:16-21,62-72`); silently skipped — no-op, no crash. |
| Hydration | `ReservationManager.hydrate()` repo-first (`reservation.manager.js:89-99`) — requires a working `findMany`; pending runtime. |
| Health | `RepositoryEngine.health()` depends on `registry`/`factory`/`transaction` (`repository.engine.js:65-70`); usable once wired. |

---

## 7. Authorization Audit

| Area | Finding |
|---|---|
| Per-operation coverage | **PASS.** All 15 reservation lifecycle ops + business CRUD/transitions call `#checkPermission` (P13.5.3 C3); service layer asserts read (`#assertRead`); identity forwarded on every emit (including checkIn/checkOut/noShow). |
| Contract | `context.runtime.auth` → `authorize/can/cannot/explain` (`auth.runtime.context.js`) matches manager usage. |
| Fail-open risk | `reservation.manager.js:38-39` returns `true` when `!auth || !identity`; `business.manager.js:60` same pattern. Until RB3 is resolved, identity-present calls **skip authorization silently**. Acceptable only for a demo harness; **must be wired before P13.6**. |
| Role coverage | Built-in roles cover owner/staff; visitor self-cancel remains **denied by design** (visitor scope: `reservation:create|read`). |

---

## 8. Event Audit

| Area | Finding |
|---|---|
| Naming | `capability:event` convention respected across all five capabilities (e.g., `business:created`, `reservation:confirmed`, `business-reservation:reservation_checked_in`). |
| Payloads | All lifecycle emits carry aggregate identifiers (`businessId`, `reservationId`, `accommodationId`, `visitorId`) + `identity`; cascades tagged `action: 'cascade_*'` (`business-reservation.manager.js:787-816`, `business-visitor.manager.js:806-834`). |
| Orphans/duplicates | None found in the commercial set (94 business emits + 38 reservation emits inventoried). |
| Subscribers | `BusinessCapability` subscribes CREATED/UPDATED/PUBLISHED/UNPUBLISHED/ARCHIVED/DELETED/RESTORED → search index/remove + sync push (`business.capability.js:24-83`). |
| Dormancy | Search/sync handlers early-return without `context.runtime.search/sync` (`business.capability.js:85-109`) — nothing wires them today. |
| Firing | Emission itself pending runtime (RB6). |

---

## 9. Runtime Health Audit

| Area | Finding |
|---|---|
| `RuntimeHealth` contract | Sound: per-module `checkModule`, aggregation, `RUNTIME_HEALTH_CHANGED` events (`runtime/runtime.health.js`). |
| Wiring | **Never instantiated**; pipeline imports it but doesn't use it. |
| Pipeline health | `BootstrapPipeline.#healthCheck` hardcodes all statuses to `'healthy'` (`bootstrap.pipeline.js:236-280`) — reports healthy regardless of actual state. Inconsistent with `RuntimeEngine.healthCheck` which honestly reports `'unknown'` and only claims healthy with evidence (`runtime.engine.js:167-189`). |
| Capability health | No commercial capability implements `health()`; `RuntimeHealth.checkAll` has nothing to probe. |
| Failure semantics | `RuntimeEngine.start` catches provider failures and continues unless `fallbackOnFailure === false` (`runtime.engine.js:115-123`) — fail-open; future-module slots (`null` class) are safely skipped (`runtime.engine.js:99-100`). |

---

## 10. Production Readiness Scoring

| Domain | Weight | Score | Rationale |
|---|---|---|---|
| Architecture | 0.15 | 9/10 | Clean aggregate design; zero coupling violations |
| Runtime | 0.15 | **0/10** | Cannot execute — no entry point, no wiring |
| Repository | 0.15 | 2/10 | Contract defect fixed; zero registrations/adapters |
| Authorization | 0.10 | 5/10 | Code coverage excellent; runtime auth unwired (fail-open) |
| Events | 0.10 | 9/10 | Complete, namespaced, aggregate-id payloads |
| Aggregates | 0.10 | 9/10 | Integrity preserved (P13.5.3 C1); H4 residual |
| Synchronization | 0.05 | 4/10 | Triggers present; runtime.sync unwired |
| Search | 0.05 | 4/10 | Index/remove present; runtime.search unwired |
| CMS | 0.05 | 2/10 | Runtime CMS step is a stub |
| Maintainability | 0.10 | 8/10 | Well-factored, documented, static-audited |
| **Overall** | 1.00 | **53/100** | **RUNTIME BLOCKERS FOUND** |

---

## 11. Blocking Issues

| ID | Severity | Status | Description |
|---|---|---|---|
| RB1 | **Critical** | **FIXED (P13.5.4)** | `PersistenceCapability` Proxy returned an unawaited Promise → `context.repositories.*` unusable |
| RB2 | **Critical** | **FIXED (P13.5.4)** | 27 repository classes imported nonexistent `../base.repository.js` / `../read.repository.js` / `../write.repository.js` → module-resolution crash; repointed to `../contracts/…` |
| RB9 | **Critical** | **FIXED (P13.5.4)** | Persistence module tree unloadable: `errors/repository.errors.js` and `events/repository.events.js` were missing (empty dirs) though imported by 10 files (incl. `BaseRepository`, `RepositoryEngine`, `PersistenceCapability`) — created both modules with the required exports |
| RB10 | **Critical** | **FIXED (P13.5.4)** | Capability registry unloadable: `cms/wordpress.provider.js` (`../../../engine/…` off-by-one) and `exploration/exploration.manager.js` (`../` missing segment, ×2) broke `register.js` at load — corrected; **the entire registry now loads** |
| RB3 | **Critical** | Architectural — open | No runtime entry: `BootstrapPipeline`/`RuntimeEngine` have no callers; legacy bootstrap assembles no `context.runtime`/`context.repositories` and loads no commercial capability |
| RB4 | **Critical** | Architectural — open | Repository infrastructure unwired: zero repo registrations, zero adapters, `PersistenceCapability` never loaded, pipeline repository/capability steps are stubs |
| RB5 | **High** | Architectural — open | No tenant/capability configuration for the commercial aggregate exists |
| RB6 | **High** | Environment — open | No JS runtime installed on the machine; execution checks pending |
| RB7 | **Medium** | Architectural — open | Authorization fail-open when `context.runtime.auth` absent; must be wired before P13.6 |
| RB8 | **Medium** | Residual — open | H4: availability not included in business archive/restore/delete cascades |

---

## 12. Fixes Applied (P13.5.4)

All four fixes were validated with a project-wide import-resolution scan: **1048 relative imports in
`capabilities/`, `runtime/`, `engine/` now resolve — 0 missing** (was 40+).

1. **`capabilities/persistence/repository.capability.js`** (RB1) — replaced the Proxy-returned-Promise
   with a lazy facade (`#facadeFor` / `#buildFacade`): repository resolution is awaited, memoized on
   success, and method calls forward to the resolved repository. Unregistered names resolve to
   `undefined`-returning methods (preserving manager fallback); registered-but-failing repositories
   still rethrow. `destroy()` clears the facade and resolution caches. Static verification: brace/paren
   balance OK.
2. **27 × `capabilities/persistence/repositories/*.repository.js`** (RB2) — corrected imports of the
   nonexistent `../base.repository.js` (25 files) and `../read.repository.js` / `../write.repository.js`
   (2 files: `analytics`, `audit`) to `../contracts/base|read|write.repository.js` (forward slashes;
   verified via grep that all 27 resolve and no stale specifier remains).
3. **`capabilities/persistence/errors/repository.errors.js` + `events/repository.events.js`** (RB9) —
   created the missing modules (empty `errors/`/`events/` directories) with the exports already consumed
   by the persistence layer: `RepositoryError` base + `RepositoryConfigurationError` / `RepositoryNotFoundError`
   / `RepositoryValidationError` / `RepositoryConcurrencyError` / `RepositoryTransactionError`;
   `REPOSITORY_EVENTS` (10 events) + `createRepositoryEvent`. Follows the `runtime/runtime.errors.js` /
   `runtime/runtime.events.js` conventions. Unblocks `BaseRepository`, `RepositoryEngine`, `RepositoryFactory`,
   `RepositoryRegistry`, `TransactionManager`, `UnitOfWork`, `OptimisticLockMixin`, and `PersistenceCapability`.
4. **`capabilities/cms/wordpress.provider.js` + `capabilities/exploration/exploration.manager.js`** (RB10) —
   corrected broken specifiers (`../../../engine/providers/base.provider.js` → `../../engine/providers/base.provider.js`;
   `../exploration.schema.js` / `../exploration.events.js` → `./exploration.schema.js` / `./exploration.events.js`).
   These imports were reachable from `capabilities/core/register.js` (`CMSCapability`, `ExplorationCapability`),
   so **the capability registry could not load at all** — the whole platform bootstrap (legacy and runtime)
   was broken at the module-graph level.

No other changes were made. Architectural blockers (RB3–RB8) are intentionally **not** implemented.

---

## 13. Recommendations (path to P13.6 — Payment)

1. **P13.5.5 — Runtime entry & wiring.** Add an entry point that runs `BootstrapPipeline` with a
   commercial tenant config (`business`, `accommodation`, `availability`, `visitor`, `reservation`,
   `persistence`, `notifications`), constructing a `RuntimeContext` and attaching `runtime` +
   `repositories` to the capability context.
2. **Repository registration module.** Register the repository classes against the engine
   (`descriptor: { class }`), honoring their static metadata (`entityName`, `dependencies`, `aggregate`,
   `softDeletable`, …) and satisfying the registry's dependency validation.
3. **Default adapter.** Provide an in-memory adapter for the `'mock'` provider (or switch the default),
   so repositories resolve without external infrastructure; keep postgres/drizzle as opt-in.
4. **Decorators.** Either implement `cache`/`retry`/`audit`/`timestamps` decorators or disable them
   until implemented (currently silent no-ops).
5. **Health integration.** Implement `health()` on commercial capabilities; have the pipeline use
   `RuntimeHealth` instead of hardcoding `'healthy'`.
6. **Install a JS runtime** and execute the P13.5.4 pending-runtime checks (lifecycle flows, event
   firing, hydration, event assertions, health probes).
7. **Close H4** (availability cascade) as part of the aggregate work.

---

## 14. Final Verdict

> **RUNTIME BLOCKERS FOUND.** The Commercial Aggregate code is sound and statically verified
> (architecture, events, authorization coverage, isolation all pass), and four blocking code defects
> were fixed in this phase. However, the aggregate cannot execute: there is no runtime entry point,
> no commercial capability wiring, and no repository registrations/adapters. Execution-dependent
> verification remains **pending a runtime environment and the P13.5.5 wiring step**.
>
> **Not ready for P13.6 (Payment).**

---

## Appendix — Evidence Index

| Claim | Evidence |
|---|---|
| No JS runtime on machine | `Get-Command node/deno/bun/qjs/jsc` — all not found; standard install paths checked |
| No `BootstrapPipeline`/`RuntimeEngine` callers | grep `new RuntimeEngine|new BootstrapPipeline` — only definitions (`runtime.engine.js:29`, `bootstrap.pipeline.js:91`) |
| Legacy bootstrap context/capabilities | `engine/core/bootstrap.js:44,66-73,83-88` (`{tenant,dataManager,provider,eventBus}`, `['gallery','booking','notifications','pwa']`) |
| Pipeline stubs | `bootstrap.pipeline.js:195-203` (`initializeRepositories`→`{}`, `initializeCapabilities`→`[]`) |
| Proxy Promise defect | `repository.capability.js` (pre-fix lines 22-43) → fixed (post-fix lines 24-71) |
| Broken repo imports (27) | `repositories/*.repository.js` importing `../base.repository.js` (25) + `../read|write.repository.js` (2) → fixed to `../contracts/…` |
| Missing errors/events modules (10 importers) | `capabilities/persistence/errors/` + `events/` were empty dirs → created `repository.errors.js`, `repository.events.js` |
| Registry-breaking imports | `cms/wordpress.provider.js` + `exploration/exploration.manager.js` → corrected; full scan now **0 missing / 1048 relative imports** |
| Zero registrations/adapters | grep `registerAdapter\(|register\('reservation'|new RepositoryEngine` — no commercial callsites |
| Factory context requirement | `repository.factory.js:88-98` (`context.tenant` required) |
| Adapter-missing error | `repository.factory.js:53-60` |
| Fail-open auth | `reservation.manager.js:38-39`, `business.manager.js:60` |
| Event inventory | `business/*.manager.js` (94 emits), `reservation/*` (38 emits) — payloads include aggregate ids |
| Search/sync dormancy | `business.capability.js:85-109` (`context?.runtime?.search/sync` guard) |
| Pipeline health hardcode | `bootstrap.pipeline.js:243-249` (defaults `'healthy'`) |
| H4 residual | `COMMERCIAL_AGGREGATE_VALIDATION.md` P13.5.2 residual items |
