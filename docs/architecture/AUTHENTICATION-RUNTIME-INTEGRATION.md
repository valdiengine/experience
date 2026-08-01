# Authentication Runtime Integration

> P12.1.3 — Bridges the Authentication Engine with the Platform Runtime.
> Capabilities only know `context.runtime.auth`. Never AuthenticationEngine.

---

## 1. Objective

Connect the Authentication Engine (P12.1.2) with the Platform Runtime (P12.0.5.1) so that every capability can do:

```js
const identity = await context.runtime.auth.login(credentials)
const authorized = await context.runtime.auth.can(identity, 'create', 'reservation')
```

Without knowing anything about AuthenticationEngine, its sub-engines, its contracts, or its future providers.

---

## 2. Layer Position

```
Capabilities
    ↓
RuntimeContext
    │
    ├── context.runtime.database   ─── DatabaseRuntime
    ├── context.runtime.storage    ─── StorageRuntime
    ├── context.runtime.auth       ─── AuthRuntimeContext
    ├── context.runtime.cache      ─── CacheRuntime
    ├── context.runtime.queue      ─── QueueRuntime
    │         ...                      ...
    │
    ↓
┌──────────────────────────────────────────────────────────────┐
│                   Auth Runtime Integration                    │
│                                                              │
│  AuthRuntimeIntegration (registered as 'auth' provider)      │
│    ├─ initialize() / shutdown() / dispose()                  │
│    ├─ health() / available() / supports()                    │
│    ├─ registerProvider() / setContracts()                    │
│    │                                                         │
│    └─ AuthRuntimeContext  ← capabilities see this as `auth`  │
│       AuthRuntimeRegistry  ← internal provider tracking      │
│       AuthRuntimeFactory   ← engine resolution               │
│       AuthRuntimeHealth    ← 11-component health             │
│                                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────┴───────────────────────────────────────┐
│               AuthenticationEngine (P12.1.2)                  │
│                                                              │
│  ├─ SessionEngine         ├─ DeviceEngine                    │
│  ├─ TokenEngine           ├─ MfaEngine                       │
│  ├─ AuthorizationEngine   ├─ AnonymousEngine                 │
│  ├─ PermissionEngine      └─ AuditEngine                     │
│  ├─ RoleEngine                                               │
│  └─ TrustEngine                                              │
│                                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────┴───────────────────────────────────────┐
│           Authentication Runtime Contracts (P12.1.1)         │
│           → Future Providers                                 │
│           → JWT / OAuth / Auth0 / Clerk / Firebase           │
│           → Supabase / Keycloak / Custom                     │
└───────────────────────────────────────────────────────────────┘
```

---

## 3. Startup Sequence

```
1. RuntimeEngine.initialize()
    ├─ Registry.initialize()
    └─ register('auth', AuthRuntimeIntegration, {
           version: '1.0.0',
           category: 'auth',
           dependencies: ['database'],
           priority: 400
       })

2. RuntimeEngine.start()
    ├─ FilesystemRuntime.initialize()
    ├─ StorageRuntime.initialize()
    ├─ DatabaseRuntime.initialize()
    ├─ AuthRuntimeIntegration.initialize()
    │    ├─ AuthRuntimeRegistry.initialize()
    │    ├─ AuthRuntimeRegistry.register('default', { version, provider, features })
    │    ├─ AuthenticationEngine = new (AuthRuntimeFactory.resolve('default'))
    │    ├─ AuthenticationEngine.initialize()
    │    │    ├─ SessionEngine.initialize()
    │    │    ├─ TokenEngine.initialize()
    │    │    ├─ AuthorizationEngine.initialize()
    │    │    ├─ PermissionEngine.initialize()
    │    │    ├─ RoleEngine.initialize()
    │    │    ├─ TrustEngine.initialize()
    │    │    ├─ DeviceEngine.initialize()
    │    │    ├─ MfaEngine.initialize()
    │    │    ├─ AnonymousEngine.initialize()
    │    │    └─ AuditEngine.initialize()
    │    └─ AuthRuntimeContext = new (engine)
    ├─ CacheRuntime.initialize()
    ├─ QueueRuntime.initialize()
    ├─ NotificationsRuntime.initialize()
    ├─ AnalyticsRuntime.initialize()
    ├─ AIRuntime.initialize()
    └─ RuntimeContext.setModule('auth', AuthRuntimeContext)
        → capabilities see context.runtime.auth
```

---

## 4. Shutdown Sequence

Reverse of startup, respecting dependency graph:

```
1. /Capabilities stop using context.runtime.*/
2. AIRuntime.shutdown()
3. AnalyticsRuntime.shutdown()
4. NotificationsRuntime.shutdown()
5. QueueRuntime.shutdown()
6. CacheRuntime.shutdown()
7. AuthRuntimeIntegration.shutdown()
    ├─ AuthenticationEngine.shutdown()
    │    ├─ AuditEngine.shutdown()
    │    ├─ AnonymousEngine.shutdown()
    │    ├─ MfaEngine.shutdown()
    │    ├─ DeviceEngine.shutdown()
    │    ├─ TrustEngine.shutdown()
    │    ├─ RoleEngine.shutdown()
    │    ├─ PermissionEngine.shutdown()
    │    ├─ AuthorizationEngine.shutdown()
    │    ├─ TokenEngine.shutdown()
    │    └─ SessionEngine.shutdown()
    └─ AuthenticationEngine.dispose()
8. DatabaseRuntime.shutdown()
9. StorageRuntime.shutdown()
10. FilesystemRuntime.shutdown()
```

---

## 5. Dependency Graph

```
filesystem
    ↓
storage
    ↓
database
    ↓
auth ───────────────────────────────────────┐
    ↓                                        │
cache  ← depends on: database, auth         │
    ↓                                        │
queue  ← depends on: database, cache        │
    ↓                                        │
mail   ← depends on: queue                  │
    ↓                                        │
notification  ← depends on: queue, mail     │
    ↓                                        │
analytics  ← depends on: database, queue    │
    ↓                                        │
ai  ← depends on: analytics, cache          │
    ↓                                        │
sync  ← depends on: database, storage       │
    ↓                                        │
media  ← depends on: storage, queue         │
    ↓                                        │
payment  ← depends on: database, queue      │
    ↓                                        │
search  ← depends on: database              │
    ↓                                        │
maps  ← depends on: cache                   │
    ↓                                        │
weather  ← depends on: cache                │
    ↓                                        │
Capabilities (via context.runtime.*)  <──────┘
```

---

## 6. Runtime Context Integration

### Registration

During `RuntimeEngine.initialize()`, auth is auto-registered:

```js
engine.register('auth', AuthRuntimeIntegration, {
  version: '1.0.0',
  category: 'auth',
  dependencies: ['database'],
  priority: 400,
})
```

### Context Exposure

`RuntimeContext` uses `setModule('auth', provider)` which automatically creates `context.auth` via a dynamic getter. The existing `get auth()` accessor in `RuntimeContext` provides the type-hinted fallback.

### Capability Usage

```js
// In any capability:
class MyCapability extends BaseCapability {
  async init(context) {
    const auth = context.runtime.auth

    // Authenticate
    const result = await auth.login({ email, password })

    // Authorize
    const canBook = await auth.can(result.identity, 'create', 'reservation')

    // Session
    const session = await auth.validate(result.session)

    // Permissions
    const perms = await auth.permissions(result.identity.id)

    // Trust
    const trustLevel = await auth.trust(result.identity.id)
  }
}
```

### What Capabilities Never See

```js
// NEVER:
import { AuthenticationEngine } from 'runtime/auth/engine'
import { JwtProvider } from 'some-jwt-lib'
const engine = new AuthenticationEngine()
engine.session.doSomething()

// ONLY:
context.runtime.auth.login(credentials)
context.runtime.auth.can(identity, action, resource)
```

---

## 7. Provider Resolution

```
AuthRuntimeFactory
    │
    ├── register(type, EngineClass)
    │   ├── register('default', AuthenticationEngine)
    │   ├── register('jwt', JwtAuthenticationEngine)
    │   ├── register('auth0', Auth0AuthenticationEngine)
    │   └── register('firebase', FirebaseAuthenticationEngine)
    │
    └── resolve(type = 'default', options)
        └── Returns AuthenticationEngine instance
```

Currently only `default` is registered. Future providers are prepared for:

| Type | Engine Class | Status |
|------|-------------|--------|
| default | AuthenticationEngine | ✅ Active |
| jwt | JwtAuthenticationEngine | 🔜 Future |
| auth0 | Auth0AuthenticationEngine | 🔜 Future |
| firebase | FirebaseAuthenticationEngine | 🔜 Future |
| supabase | SupabaseAuthenticationEngine | 🔜 Future |
| keycloak | KeycloakAuthenticationEngine | 🔜 Future |
| clerk | ClerkAuthenticationEngine | 🔜 Future |
| custom | CustomAuthenticationEngine | 🔜 Future |

---

## 8. Health Propagation

```
RuntimeHealth.checkAll()
    │
    ├── FilesystemRuntime.health()
    ├── StorageRuntime.health()
    ├── DatabaseRuntime.health()
    ├── AuthRuntimeIntegration.health()
    │    │
    │    └── AuthRuntimeHealth.checkAll()
    │         │
    │         ├── authentication engine
    │         ├── session engine
    │         ├── token engine
    │         ├── authorization engine
    │         ├── permission engine
    │         ├── role engine
    │         ├── trust engine
    │         ├── device engine
    │         ├── mfa engine
    │         ├── anonymous engine
    │         └── audit engine
    │
    ├── CacheRuntime.health()
    ├── QueueRuntime.health()
    ...
    │
    └── Aggregate → Overall Runtime Health
```

---

## 9. Events (6 integration events)

| Event | Trigger | Payload |
|-------|---------|---------|
| `runtime:auth_registered` | Auth provider registered | `{ provider, version }` |
| `runtime:auth_initialized` | Auth runtime initialized | `{ provider, version }` |
| `runtime:auth_provider_changed` | Active provider switched | `{ from, to, version }` |
| `runtime:auth_health_changed` | Auth health status changed | `{ from, to, components }` |
| `runtime:auth_error` | Auth runtime error | `{ error, component }` |
| `runtime:auth_shutdown` | Auth runtime shutdown | `{ timestamp }` |

---

## 10. Errors (5 types)

```
AuthenticationRuntimeError (base)
├── ProviderUnavailableError        — Auth provider not reachable
├── AuthenticationUnavailableError  — Auth runtime not initialized
├── AuthenticationInitializationError  — Failed to initialize auth
└── AuthenticationConfigurationError   — Invalid auth configuration
```

---

## 11. Future Providers

Adding a new auth provider requires zero changes to capabilities:

```js
// 1. Register the engine type
authRuntimeFactory.register('jwt', JwtAuthenticationEngine)

// 2. Register the provider class
authRuntimeIntegration.registerProvider('jwt', JwtProvider, {
  algorithm: 'RS256',
  publicKey: process.env.JWT_PUBLIC_KEY,
})

// 3. Capabilities continue using context.runtime.auth
//    No changes needed.
```

Supported future providers:
- **JWT** — Stateless token-based authentication
- **OAuth 2.0 / OIDC** — Social login, OpenID Connect
- **Auth0** — Auth0 integration
- **Clerk** — Clerk.com integration
- **Firebase Auth** — Firebase Authentication
- **Supabase Auth** — Supabase Auth
- **Keycloak** — Self-hosted Keycloak
- **Custom** — Any custom provider

---

## 12. Architecture Rules (RTINT-001 through RTINT-010)

| Rule | Description |
|------|-------------|
| RTINT-001 | Capabilities never import AuthenticationEngine |
| RTINT-002 | Capabilities only use `context.runtime.auth` |
| RTINT-003 | AuthRuntimeIntegration is the only bridge between Runtime and AuthenticationEngine |
| RTINT-004 | AuthRuntimeContext exposes exactly the methods capabilities need (login, logout, authenticate, refresh, validate, authorize, can, cannot, permissions, roles, trust, device, mfa, anonymous, audit, currentIdentity, currentSession, currentTenant, available, supports) |
| RTINT-005 | No JWT, OAuth, Firebase, Auth0, Clerk, Supabase, Keycloak imports in the integration layer |
| RTINT-006 | Provider resolution happens via AuthRuntimeFactory — capabilities never know the provider type |
| RTINT-007 | Health is aggregated across all 11 auth engine components |
| RTINT-008 | Multi-tenant ready — engine instances are tenant-isolated via AuthRuntimeFactory |
| RTINT-009 | Offline-first compatible — engine supports offline trust decay |
| RTINT-010 | Provider swap requires zero capability changes |

---

## 13. Validation Checklist

- [ ] `RuntimeEngine.initialize()` auto-registers `AuthRuntimeIntegration` as provider `'auth'`
- [ ] `AuthRuntimeIntegration` has `dependencies: ['database']` for correct startup ordering
- [ ] `RuntimeContext.get auth()` returns the auth module (via `setModule`)
- [ ] Capabilities use `context.runtime.auth.login()` not `new AuthenticationEngine()`
- [ ] Capabilities use `context.runtime.auth.can()` not `authorization.authorize()`
- [ ] `AuthRuntimeContext` wraps `AuthenticationEngine` — no direct exposure
- [ ] `AuthRuntimeFactory.resolve('default')` returns `AuthenticationEngine`
- [ ] `AuthRuntimeFactory.register('jwt', ...)` works for future providers
- [ ] `AuthRuntimeRegistry` tracks version, provider, features, priority, status
- [ ] `AuthRuntimeHealth.checkAll()` checks all 11 auth components
- [ ] `AuthRuntimeIntegration.initialize()` emits `runtime:auth_initialized`
- [ ] `AuthRuntimeIntegration.shutdown()` emits `runtime:auth_shutdown`
- [ ] Errors extend `AuthenticationRuntimeError` hierarchy
- [ ] No JWT, OAuth, vendor imports in any integration file
- [ ] Zero changes required in capabilities
- [ ] Compatible with all 27 registered capabilities
- [ ] Compatible with offline-first architecture
- [ ] Compatible with multi-tenant isolation
