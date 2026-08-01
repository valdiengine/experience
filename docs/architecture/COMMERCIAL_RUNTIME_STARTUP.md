# Commercial Runtime Startup — P13.5.5

Status: **IMPLEMENTED** (static-verified; runtime execution pending — see RB6)

The **single, mandatory, deterministic, idempotent** entry point for the Commercial
Aggregate. `runtime/startup/application.start.js` is the only module allowed to
instantiate the `RuntimeEngine`, `BootstrapPipeline`, `RepositoryEngine`,
`AuthenticationRuntime`, `CMSRuntime` and the `CapabilityRegistry`.

## Scope

**Wiring only.** No business logic, no persistence logic, no provider implementation.
All missing pieces are architectural placeholders per the Missing Components Policy:

| Artifact | Type | Contents |
| --- | --- | --- |
| `capabilities/opportunity/opportunity.capability.js` | Capability | Thin wrapper over the existing `OpportunityEngine`; delegates `findOpportunities`/`findAll` |
| `capabilities/persistence/repositories/owner/owner.repository.js` | Repository | Metadata-only `BaseRepository` subclass |
| `capabilities/persistence/repositories/booking/booking.repository.js` | Repository | Metadata-only `BaseRepository` subclass |
| `capabilities/persistence/repositories/opportunity/opportunity.repository.js` | Repository | Metadata-only `BaseRepository` subclass |
| `capabilities/persistence/adapters/mock/mock.repository.adapter.js` | Adapter | Interface-only adapter satisfying the RepositoryAdapter contract |
| `capabilities/core/register.js` | Registry | `VisitorCapability` + `OpportunityCapability` registered (new entries) |

`OpportunityCapability` has static `id = 'opportunity'`, `dependencies = []`, and wraps
`capabilities/intelligence/opportunity.engine.js`. The three repository placeholders
declare only static metadata (`entityName`, `version`, `dependencies`, `readOnly`,
`aggregate`, `cacheable`, `searchable`, `softDeletable`). The mock adapter implements
all 23 contract methods with empty/interface-conforming results.

## Startup sequence

```
start()
 1. BootstrapPipeline.run(sources)        -> config (providers DISABLED, RB3)
 2. bootstrapRuntime(...)                 -> engine + runtimeContext + eventBus + repositoryRuntime
                                            + authenticationRuntime + cmsRuntime
 3. registerRepositories(...)             -> 12 repositories (3 support + 9 commercial)
 4. registerCapabilities(...)             -> 9 capabilities registered/initialized/activated
 5. validateRuntime(...)                  -> static/structural validation
 6. emit contexts_ready, health_ready, completed
```

Startup events (fixed order): `startup:started → runtime_ready → repositories_ready →
capabilities_ready → contexts_ready → health_ready → completed` (or `failed`).

## RB3 — Pipeline providers disabled

`BootstrapPipeline.#registerProviders` registers `engine.register('database', null, …)`
when `FEATURE_DATABASE` is enabled, colliding with the built-in RuntimeEngine
`'database'` module (DuplicateProviderError). `application.start.js` therefore pins
`FEATURE_DATABASE/AUTH/CMS/REPOSITORIES` (and all future slots) to `false`. The
pipeline runs as a deterministic configuration loader + boot diagnostic; the wiring
engine boots on the interface-only `'mock'` repository adapter via
`bootstrapRuntime`.

## Wiring rules

- Capabilities never import each other; communication only via
  `context.capabilities.get(...)`.
- No infrastructure imports inside capabilities.
- `context.repositories` is a lazy delegation wrapper (Proxy) over the booted
  `RepositoryEngine`; per-entity method proxies resolve the repository once and
  fail open when a repository/adapter is unavailable.
- Repository registration order is dependency-first (support repositories →
  aggregate) so inline dependency validation after `RepositoryEngine.initialize()`
  succeeds.
- `context.runtime` is the shared `RuntimeContext` (`database`, `auth`, `cms`,
  `repository`, and future slots `search`/`sync` return `null`).

## Repositories registered

Support (3): `tenant`, `destination`, `identity` — required by declared dependencies.
Commercial (9): `business`, `accommodation`, `availability`, `reservation`, `visitor`,
`owner`, `booking`, `notification`, `opportunity`.

## Capabilities registered

`business`, `accommodation`, `availability`, `reservation`, `visitor`, `owner`,
`booking`, `notifications`, `opportunity`.

## Verification

Static import scan: **647/647** files in `capabilities/` + `runtime/` resolve.
Bracket balance: balanced across all new/modified files.
Runtime execution is **pending** (RB6 — no JS runtime installed in this environment);
the runtime bundle shape is validated structurally by `runtime.validation.js` on boot.

## Out of scope / open

- RB6: runtime execution not verified (no JS runtime available).
- RB8: H4 availability cascade.
- Production providers (PostgreSQL/Drizzle), auth provider (JWT), and future module
  slots (`search`, `sync`, `storage`, `mail`, `queue`, `payment`, …) are not
  registered — declared but unimplemented, surfaced as validation warnings.
