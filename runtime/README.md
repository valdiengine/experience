# Platform Runtime

> P12.0.5.1 — Platform Runtime Architecture.
> P12.1.3 — Authentication Runtime Integration.
> The single gateway between the platform and every infrastructure service.

## Layer Position

```
Capabilities
    ↓
Repository Engine
    ↓
Platform Runtime    ← YOU ARE HERE
    ↓
Infrastructure Contracts
    ↓
Infrastructure Providers
    ↓
External Services
```

## Principle

Capabilities never know:
- PostgreSQL, Drizzle, JWT, OAuth, Redis, S3, Stripe, OpenAI, Mapbox, etc.

Capabilities only know:
- `context.runtime.database`
- `context.runtime.auth`
- `context.runtime.storage`
- `context.runtime.media`
- `context.runtime.payment`
- `context.runtime.mail`
- `context.runtime.search`
- `context.runtime.ai`
- `context.runtime.cache`
- `context.runtime.queue`
- `context.runtime.maps`
- `context.runtime.weather`

## Core Files

| File | Responsibility |
|------|---------------|
| `runtime.engine.js` | Main entry point — lifecycle, module management |
| `runtime.context.js` | Context object injected into capabilities |
| `runtime.registry.js` | Provider registration and resolution |
| `runtime.factory.js` | Provider instantiation and caching |
| `runtime.lifecycle.js` | Startup/shutdown ordering |
| `runtime.health.js` | Aggregate health across all modules |
| `runtime.events.js` | Event definitions (7 events) |
| `runtime.errors.js` | Error hierarchy (6 types) |

## Auth Integration

See `auth/integration/` for the Authentication Runtime Integration (P12.1.3):
- `auth.runtime.integration.js` — Bridge: registers AuthenticationEngine inside Runtime
- `auth.runtime.context.js` — Exposes `context.runtime.auth` to capabilities
- `auth.runtime.registry.js` — Internal registry: version, provider, features, priority, status
- `auth.runtime.factory.js` — Resolves which AuthenticationEngine to use
- `auth.runtime.health.js` — Health aggregation across all 11 auth components
- `auth.runtime.events.js` — 6 integration events
- `auth.runtime.errors.js` — 5 error types

The auth integration is auto-registered during `RuntimeEngine.initialize()` with `dependencies: ['database']`.

## Startup Order

```
Filesystem
    ↓
Storage
    ↓
Database (required by auth)
    ↓
Authentication
    ↓
Cache
    ↓
Queue
    ↓
Notifications
    ↓
Analytics
    ↓
AI
    ↓
Capabilities (via context.runtime.*)
```

## Contracts

See `contracts/` for runtime interface definitions:
- database, auth, storage, cache, queue, mail, notification
- payment, media, search, ai, sync, analytics, maps, weather
- filesystem

## Architecture Rules

1. Capabilities never import providers, SDKs, or vendors
2. Capabilities only use `context.runtime`
3. Runtime never owns business logic
4. Runtime only orchestrates infrastructure
5. Providers remain replaceable
6. Infrastructure remains modular
7. Everything remains multi-tenant
8. Everything remains offline-first
