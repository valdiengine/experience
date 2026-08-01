# Startup — Runtime Entry & Wiring (P13.5.5)

The **single, mandatory, deterministic, idempotent** entry point for the Commercial
Aggregate (Business · Accommodation · Availability · Reservation · Visitor · Owner ·
Booking · Notification · Opportunity).

## Entry point

```js
import { start, cleanup } from './application.start.js'

const bundle = await start({
  tenant: { id: 'commercial', name: 'Commercial', slug: 'commercial' },
  configuration: { /* per-capability config */ },
})

await bundle.cleanup() // or cleanup(bundle)
```

`start()` returns a bundle with `engine`, `runtimeContext`, `eventBus`,
`repositoryRuntime`, `authenticationRuntime`, `cmsRuntime`, `capabilityRegistry`,
`capabilityContext`, `validation`, `pipeline`, `config` and `tenant`.

## Files

| File | Responsibility |
| --- | --- |
| `application.start.js` | Single mandatory entry; orchestrates pipeline → runtime → repositories → capabilities → validation |
| `runtime.bootstrap.js` | Builds/boots the RuntimeEngine, RuntimeContext, EventBus, RepositoryRuntime, AuthenticationRuntime, CMSRuntime |
| `repository.bootstrap.js` | Registers the 9 commercial repositories + 3 support repositories (tenant, destination, identity) |
| `capability.bootstrap.js` | Registers/initializes/activates the 9 commercial capabilities; builds the lazy repositories facade |
| `runtime.validation.js` | Static/structural validation of the assembled bundle |
| `startup.events.js` | `STARTUP_EVENTS` + `createStartupEvent()` |
| `startup.errors.js` | `StartupError` + per-stage errors |

## Guarantees

- **Only entry**: RuntimeEngine, BootstrapPipeline, RepositoryEngine, AuthenticationRuntime,
  CMSRuntime and the Capability Registry are only instantiated here.
- **Wiring only**: no business logic, no persistence logic, no provider implementation.
  Repositories are metadata-only classes; `MockRepositoryAdapter` satisfies the adapter
  contract only; `OpportunityCapability` only wraps the existing `OpportunityEngine`.
- **Deterministic order**: `startup:started → runtime_ready → repositories_ready →
  capabilities_ready → contexts_ready → health_ready → completed` (or `failed`).
- **Idempotent**: repeated `start()` calls return the same bundle shape; `cleanup()`
  deactivates/destroys capabilities, shuts down the engine and clears the bus.

## Constraints (RB3)

The BootstrapPipeline runs with providers **disabled** (`FEATURE_DATABASE/AUTH/CMS/
REPOSITORIES = false`). Its `registerProviders` step would otherwise re-register
`'database'` and collide with the built-in RuntimeEngine module. The wiring engine
boots on the interface-only `'mock'` repository adapter.

## Wiring rules

- Capabilities never import each other; communication only via
  `context.capabilities.get(...)`.
- No infrastructure imports inside capabilities.
- `context.repositories` is a delegation wrapper over the booted RepositoryRuntime
  (lazy per-entity method proxies; fail-open when a repository is unavailable).
