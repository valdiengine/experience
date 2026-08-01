# Auth Runtime Integration

> P12.1.3 — Bridges the Authentication Engine with the Platform Runtime.
> Capabilities only know `context.runtime.auth`. Never AuthenticationEngine.

## Layer Position

```
Capabilities
    ↓
context.runtime.auth
    ↓
┌────────────────────────────────────────────────┐
│           Auth Runtime Integration              │
│                                                 │
│  AuthRuntimeIntegration                         │
│    ├─ initialize() / shutdown() / dispose()     │
│    ├─ health() / available() / supports()       │
│    ├─ registerProvider() / setContracts()       │
│    │                                            │
│    ├─ AuthRuntimeContext ← context.runtime.auth │
│    ├─ AuthRuntimeRegistry (internal)            │
│    ├─ AuthRuntimeFactory (engine resolution)    │
│    └─ AuthRuntimeHealth (component health)      │
└──────────────────────┬─────────────────────────┘
                       │
┌──────────────────────┴─────────────────────────┐
│           Authentication Engine (P12.1.2)       │
│                                                 │
│  AuthenticationEngine                           │
│    ├─ SessionEngine                             │
│    ├─ TokenEngine                               │
│    ├─ AuthorizationEngine                       │
│    ├─ PermissionEngine                          │
│    ├─ RoleEngine                                │
│    ├─ TrustEngine                               │
│    ├─ DeviceEngine                              │
│    ├─ MfaEngine                                 │
│    ├─ AnonymousEngine                           │
│    └─ AuditEngine                               │
└──────────────────────┬─────────────────────────┘
                       │
┌──────────────────────┴─────────────────────────┐
│           Authentication Runtime Contracts      │
│           → Future Providers                    │
│           → JWT / OAuth / Auth0 / Clerk        │
│           → Firebase / Supabase / Keycloak     │
└─────────────────────────────────────────────────┘
```

## Files

| File | Responsibility |
|------|---------------|
| `auth.runtime.integration.js` | Bridge: registers AuthenticationEngine inside Runtime. Entry point for the runtime module. |
| `auth.runtime.context.js` | Exposes `context.runtime.auth`. Wraps AuthenticationEngine. Capabilities only see this. |
| `auth.runtime.registry.js` | Internal registry: version, provider, features, priority, status. |
| `auth.runtime.factory.js` | Resolves which AuthenticationEngine to use. Prepared for JWT/Firebase/etc. |
| `auth.runtime.health.js` | Health aggregation: AuthenticationEngine + all 10 sub-engines. |
| `auth.runtime.events.js` | 6 integration events. |
| `auth.runtime.errors.js` | 5 error types. |

## Usage

```js
// Inside Platform Runtime initialization:
const authIntegration = new AuthRuntimeIntegration(config)
authIntegration.setEventBus(eventBus)
await authIntegration.initialize()

// Register in runtime context:
runtimeContext.setModule('auth', authIntegration.context)

// Capability usage:
const identity = await context.runtime.auth.login({ email, password })
const canBook = await context.runtime.auth.can(identity, 'create', 'reservation')
```

## Rules

1. Capabilities never import AuthenticationEngine
2. Capabilities only use `context.runtime.auth`
3. AuthRuntimeIntegration is the only bridge
4. AuthRuntimeContext exposes exactly what capabilities need
5. No JWT, OAuth, Firebase, Auth0, Clerk, Supabase, Keycloak imports
6. Provider resolution happens via AuthRuntimeFactory
7. All sub-engine health is aggregated
8. Multi-tenant ready
9. Offline-first compatible
10. Future provider swap requires zero capability changes
