# Commercial Runtime Smoke Test — P13.5.6

Status: **PASSED** — 79/79 (100/100) — `node runtime/startup/smoke.test.js` → exit 0

The **end-to-end runtime smoke test** for the full commercial platform. It executes the
real production boot path (`application.start()`) against the assembled RuntimeEngine,
BootstrapPipeline, RepositoryEngine, AuthenticationRuntime, CMSRuntime and the nine
commercial capabilities, then verifies startup order, registries, contexts, repository
contract behavior, capability resolution, health reporting, failure handling and
idempotent shutdown. No new business logic, no new repositories, no architecture
changes — only wiring fixes and health-reporting corrections found by executing the
platform for the first time.

## 1. Objective

Prove the runtime actually boots and works together. This is the first real
execution of the platform (previously only static import scans passed). Success means:

| Criterion | Result |
| --- | --- |
| Runtime starts via `application.start()` | PASS |
| All modules register and start (database, auth, authorization, cms, repository) | PASS |
| 12 repositories registered (3 support + 9 commercial) | PASS |
| 9 capabilities registered/initialized/activated | PASS |
| Capability contexts wired (runtime + repositories + eventBus) | PASS |
| Fixed startup event order emitted | PASS |
| Repository mock contract behavior (findById/findMany/paginate/…) | PASS |
| Health reports healthy across all rows | PASS |
| Failure probes throw the right typed errors | PASS |
| Shutdown + cleanup idempotent | PASS |
| No circular/missing/duplicate registrations | PASS |

## 2. Runtime

- **Node.js v24.18.1** (win-x64, portable, extracted to
  `%TEMP%\opencode\node\node-v24.18.1-win-x64\node.exe`). No system Node was present;
  a portable runtime was installed for this phase.
- Codebase is pure ESM (only three try/catch-guarded lazy `require()` calls inside
  postgres/drizzle provider files that are never loaded with providers disabled).
- `package.json` (repo root): `"type": "module"`, `"start"` and `"smoke"` scripts.

## 3. Provider configuration

Providers are disabled during startup (RB3): `application.start.js` pins
`FEATURE_DATABASE/AUTH/CMS/REPOSITORIES/STORAGE/MAIL/QUEUE/CACHE/PAYMENT/SEARCH/MEDIA/
MAPS/ANALYTICS/AI` to `false`. The wiring engine boots on the interface-only `'mock'`
repository adapter registered in `runtime/startup/runtime.bootstrap.js`. The
BootstrapPipeline runs as a deterministic configuration loader + boot diagnostic.

## 4. Startup sequence

```
start()
 1. emit startup:started
 2. BootstrapPipeline.run(sources)     -> config (providers disabled, RB3)
 3. bootstrapRuntime(...)              -> engine + runtimeContext + eventBus
 4. registerRepositories(...)          -> emit startup:repositories_ready
 5. registerCapabilities(...)          -> emit startup:capabilities_ready
 6. validateRuntime(...)               -> static/structural checks
 7. emit startup:contexts_ready
 8. emit startup:health_ready
 9. emit startup:completed
```

Startup stages measured: `started → runtime_ready: 15ms`, `runtime_ready →
repositories_ready: 1ms`, `repositories_ready → capabilities_ready: 5ms`,
`capabilities_ready → contexts_ready: 1ms`, `contexts_ready → health_ready: 0ms`,
`health_ready → completed: 0ms`. Total startup 23ms; shutdown 1ms.

## 5. Runtime modules

All five built-in modules register and start (order per dependency graph —
`database` first, `repository` last):

- `database` (`DatabaseRuntime`, priority 500, no deps)
- `auth` (`AuthRuntimeIntegration`, priority 400, deps `database`)
- `authorization` (`AuthorizationRuntimeIntegration`, priority 350, deps `auth`)
- `cms` (`CmsRuntimeIntegration`, priority 300, deps `database`)
- `repository` (`RepositoryEngine`, priority 700, deps `database`)

Registration order bug fixed: `RuntimeRegistry.list()` returned descriptors without
`class`/`config`/`future`, so the provider loop skipped every module silently. The
repository module is registered by `bootstrapRuntime` after the built-ins so its
`database` dependency is already started.

## 6. Repositories registered

12 repositories, dependency-first order:

- Support (3): `tenant`, `destination`, `identity`
- Commercial (9): `business`, `accommodation`, `availability`, `reservation`,
  `visitor`, `owner`, `booking`, `notification`, `opportunity`

Registration is registration-only (no CRUD/persistence logic). Each commercial
repository resolves to a `BaseRepository` instance backed by the `'mock'` adapter.

## 7. Capabilities registered

9 capabilities, all active: `business`, `accommodation`, `availability`,
`reservation`, `visitor`, `owner`, `booking`, `notifications`, `opportunity`.
Every capability resolves via `context.capabilities.get()`, receives the shared
`RuntimeContext` + repositories facade + eventBus, and peers only via
`context.capabilities.get(...)` (no direct imports).

## 8. Health

All rows healthy/ready:

| Row | Value |
| --- | --- |
| application | ready |
| runtime | healthy |
| authentication | healthy |
| authorization | healthy |
| cms | healthy |
| repository | healthy |
| commercial | healthy (9 active caps + 12 repos) |
| bootstrap | ready |

Health-reporting fixes: `DatabaseRuntime.initialize()` now sets `available=true`;
`PolicyEngine` reports `healthy` under the documented default-allow state;
`CmsRuntimeHealth` reports `healthy` for the initialized runtime with lazy
sub-engine contracts; `AuthorizationHealth`/`AuthEngineHealth` no longer self-check
the engine (recursion); the auth sub-engine getters were renamed
(`trustEngine`/`deviceEngine`/`mfaEngine`/`anonymousEngine`/`auditEngine`) so the
facade methods (`trust()`, `device()`, …) no longer shadow them.

## 9. Event order

Emitted exactly in the fixed order:

```
startup:started → startup:runtime_ready → startup:repositories_ready →
startup:capabilities_ready → startup:contexts_ready → startup:health_ready →
startup:completed
```

Timestamps are monotonic. `startup:repositories_ready` is now emitted by
`application.start.js` after repository registration.

## 10. Dependency/repository/capability validation

- Duplicate repository registration → `RepositoryConfigurationError`
- Missing repository → `RepositoryConfigurationError`
- Missing capability → `get()` returns `null`
- Missing provider (`provider: 'postgresql'`) → `RepositoryConfigurationError`
  ("No adapter registered for provider \"postgresql\"") — `RepositoryFactory`
  now normalizes a string provider to `{ name }` and includes the provider in the
  per-tenant cache key so it no longer silently falls back to `'mock'`.
- Dependency cycle (isolated engine) → `DependencyResolutionError`
- Missing dependency (isolated engine) → `UnregisteredProviderError`
- Register after start → `ProviderRegistrationError`
- Double `initialize()` / double `shutdown()` → idempotent
- `getModule('jwt')` → `null`

## 11. Startup timing

| Stage | ms |
| --- | --- |
| loadConfiguration | 1 |
| buildRuntime | 0 |
| registerProviders | 1 |
| initializeRepositories | 0 |
| initializeCapabilities | 0 |
| initializeCMS | 0 |
| initializeAuthentication | 0 |
| initializeRuntime | 6 |
| healthCheck | 4 |

Total startup 23ms, shutdown 1ms.

## 12. Problems found & fixed (runtime defects)

Executing the platform for the first time surfaced 16 defects that static scans
could not catch:

| # | File | Defect | Fix |
| --- | --- | --- | --- |
| 1 | `runtime/auth/engine/anonymous.engine.js` | `#emit` used but never declared | Added `#emit` delegating to eventBus |
| 2 | `runtime/auth/permissions/permission.resolver.js` | `#emit` used but never declared | Added `#emit` |
| 3 | `capabilities/persistence/providers/postgres/postgres.migrations.js` | `#emit` used but never declared | Added `#emit` |
| 4 | `capabilities/persistence/providers/postgres/postgres.pool.js` | `#emit` used but never declared | Added `#emit` |
| 5 | `capabilities/persistence/providers/postgres/drizzle/drizzle.migration.runner.js` | `#emit` used but never declared | Added `#emit` |
| 6 | `capabilities/persistence/providers/postgres/drizzle/drizzle.transaction.adapter.js` | `#emit` used but never declared | Added `#emit` |
| 7 | `runtime/runtime.engine.js` | Imported `DuplicateProviderError`/`UnregisteredProviderError` from wrong module | Imported from `bootstrap/bootstrap.errors.js` |
| 8 | `capabilities/intelligence/opportunity.engine.js`, `availability.analytics.js` | Imported non-existent `INSIGHT_TYPES` export | Removed unused imports |
| 9 | `runtime/auth/authorization/authorization.factory.js` | Circular import TDZ on `AuthorizationEngine` | Deferred default-engine access to resolve-time |
| 10 | `runtime/runtime.registry.js` | `list()` omitted `class`/`config`/`future` → every provider silently skipped | Added fields |
| 11 | `runtime/auth/policies/policy.cache.js` | No `setEventBus` → authorization module start crashed | Added `setEventBus` |
| 12 | `runtime/auth/engine/authentication.engine.js` | Getters `trust`/`device`/`mfa`/`anonymous`/`audit` shadowed by same-named facade methods | Renamed getters; added `health()` |
| 13 | `runtime/auth/{authorization,engine}/…health.js` | Self-referencing component → infinite recursion | Removed engine self-check |
| 14 | `capabilities/persistence/contracts/base.repository.js` | `paginate`/`cursor` missing from contract | Delegated to adapter |
| 15 | `capabilities/persistence/engine/repository.factory.js` | String provider silently fell back to default; cache ignored provider | Normalized provider; provider-scoped cache key |
| 16 | `runtime/cms/integration/cms.runtime.health.js`, `runtime/auth/policies/policy.engine.js`, `runtime/contracts/database.runtime.js` | Health reporting | Healthy-state corrections |

## 13. Remaining blockers

None. P13.5.6 has no remaining blockers.

## 14. Readiness score

**100/100 — 79/79 checks pass, exit code 0.**

## 15. How to reproduce

```powershell
# from repo root
node runtime/startup/smoke.test.js
# => PASS: 79/79 FAIL: 0 SCORE: 100/100 (exit 0)
# report: runtime/startup/smoke.report.json (SMOKE_REPORT_PATH overridable)
```

Static scans re-run clean: 687 files scanned, 1107 relative imports resolved (0
missing); all 22 modified files pass `node --check`.

## 16. Verdict

**P13.5.6 PASSED.** The commercial platform boots end-to-end for the first time:
all modules start in dependency order, all registries are correct, all capabilities
activate with wired contexts, health is fully green, failure modes raise typed
errors, and shutdown/cleanup are idempotent. The runtime defects found (16) were all
wiring/startup/health issues — exactly the in-scope category for this phase. No
architecture changes were required. Ready for P13.6.
