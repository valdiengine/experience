# Authorization Runtime Integration

> P12.1.6 — Bridges the Authorization & Policy Engine with the Platform Runtime.
> Capabilities only consume `context.runtime.auth.can()`.

## 1. Purpose

Connect the Authorization & Policy Engine (P12.1.5) to the Platform Runtime (P12.0.5.1) so that capabilities can ask authorization questions through `context.runtime.auth` without knowing about authorization internals.

## 2. Architecture Position

```
Capabilities
    ↓
context.runtime.auth
    ↓
┌───────────────────────────────────────────────────┐
│            Auth Runtime Integration                  │
│    (P12.1.3: authenticate, logout, refresh, etc.)    │
└───────────────────────┬───────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────┐
│       Authorization Runtime Integration (THIS)      │
│                                                     │
│  AuthorizationRuntimeIntegration                    │
│    ├─ initialize() / shutdown() / dispose()         │
│    ├─ health() / available() / supports()           │
│    │                                                │
│    ├─ AuthorizationRuntimeContext                   │
│    │   ├─ can() / cannot() / authorize()            │
│    │   ├─ explain()                                 │
│    │   ├─ hasPermission() / hasRole() / hasScope()  │
│    │   ├─ getAuthorizationContext()                 │
│    │   ├─ getTenantContext()                        │
│    │   └─ getDestinationContext()                   │
│    │                                                │
│    ├─ AuthorizationRuntimeRegistry                  │
│    ├─ AuthorizationRuntimeFactory                   │
│    └─ AuthorizationRuntimeHealth                    │
└───────────────────────┬───────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────┐
│        Authorization & Policy Engine (P12.1.5)      │
│                                                     │
│  AuthorizationEngine                                │
│    ├─ Policy Engine (RBAC + ABAC + PBAC)            │
│    ├─ Permission Resolver (wildcards, deny-override)│
│    ├─ Role Manager (12 built-in roles, inheritance) │
│    ├─ Scope Manager (12 built-in scopes)            │
│    └─ Authorization Audit (record, query, export)   │
└─────────────────────────────────────────────────────┘
```

## 3. Runtime Integration Flow

```
RuntimeEngine.start()
    │
    ├─ 1. AuthRuntimeIntegration.initialize()
    │       → AuthenticationEngine initialized
    │       → AuthRuntimeContext created
    │
    ├─ 2. AuthorizationRuntimeIntegration.initialize()
    │       → AuthorizationEngine initialized
    │       → AuthorizationRuntimeContext created
    │
    └─ 3. Wire: auth.context ← authorization.context
            → AuthRuntimeContext.setAuthorizationContext(authzCtx)
            → context.runtime.auth.can() delegates to AuthorizationEngine
```

## 4. Context API

### Authentication (from P12.1.3)

| Method | Description |
|--------|-------------|
| `login(credentials)` | Authenticate and get session |
| `logout(session)` | End session |
| `refresh(token)` | Rotate tokens |
| `authenticate(token)` | Verify and decode token |
| `currentIdentity(context)` | Resolve current identity |
| `currentSession(context)` | Resolve current session |

### Authorization (via AuthorizationRuntimeContext)

| Method | Description |
|--------|-------------|
| `can(identity, action, resource, options)` | Check if action is allowed → boolean |
| `cannot(identity, action, resource, options)` | Inverse of can → boolean |
| `authorize(identity, action, resource, options)` | Authorize or throw PermissionDeniedError |
| `explain(identity, action, resource, options)` | Full decision trail (permission + policy) |

### Permission Helpers

| Method | Description |
|--------|-------------|
| `hasPermission(identity, permission, options)` | Check specific permission grant |
| `hasRole(identity, role, options)` | Check role assignment |
| `hasScope(context, scope, options)` | Check scope validity |

### Context Helpers

| Method | Description |
|--------|-------------|
| `getAuthorizationContext()` | Engine metadata (version, provider, features) |
| `getTenantContext(tenantId)` | Tenant isolation context |
| `getDestinationContext(destinationId)` | Destination isolation context |

### Usage Example

```js
const identity = await context.runtime.auth.authenticate(token)

const canBook = await context.runtime.auth.can(
  identity,
  'reservation:create',
  'reservation:*',
  { tenant: tenantId, destination: destinationId }
)

if (canBook) {
  const decision = await context.runtime.auth.authorize(
    identity,
    'reservation:create',
    `reservation:${bookingId}`
  )
}

const explanation = await context.runtime.auth.explain(
  identity,
  'reservation:cancel',
  `reservation:${bookingId}`
)
```

## 5. Lifecycle

### Startup Order

```
1. Database          — persistence provider
2. Auth              — AuthenticationEngine
3. Authorization     — AuthorizationEngine (depends on auth)
4. Capabilities      — business capabilities
```

### Shutdown Order

```
1. Capabilities      — business capabilities
2. Authorization     — AuthorizationEngine
3. Auth              — AuthenticationEngine
4. Database          — persistence provider
```

### State Transitions

```
registered → initializing → initialized → starting → started → running
    ↓                                                        ↓
    └──→ failed                                              └──→ stopping → stopped → disposed
```

## 6. Health Model

### Aggregate Health

```
AuthorizationRuntimeHealth.checkAll()
    │
    ├─ authorization-engine
    ├─ policy-engine
    ├─ permission-resolver
    ├─ role-manager
    ├─ scope-manager
    ├─ authorization-audit
    └─ policy-cache
```

### Health States

| State | Meaning |
|-------|---------|
| `healthy` | All components operational |
| `degraded` | Some components degraded (e.g. cache unavailable) |
| `failed` | Critical component unavailable |
| `unavailable` | Engine not initialized |

### Health Response

```json
{
  "status": "healthy",
  "components": [
    { "name": "authorization-engine", "status": "healthy" },
    { "name": "policy-engine", "status": "healthy" },
    { "name": "permission-resolver", "status": "healthy" },
    { "name": "role-manager", "status": "healthy" },
    { "name": "scope-manager", "status": "healthy" },
    { "name": "authorization-audit", "status": "healthy" },
    { "name": "policy-cache", "status": "healthy" }
  ],
  "timestamp": 1700000000000
}
```

## 7. Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `authorization:runtime_registered` | `{ name, version }` | Module registered in runtime |
| `authorization:runtime_initialized` | `{ provider, version }` | AuthorizationEngine initialized |
| `authorization:runtime_started` | `{ timestamp }` | Runtime lifecycle started |
| `authorization:runtime_ready` | `{ features }` | Authorization fully operational |
| `authorization:decision_requested` | `{ identityId, action, resource }` | Capability calls can() |
| `authorization:decision_completed` | `{ identityId, action, resource, allowed }` | Decision returned |
| `authorization:runtime_error` | `{ error }` | Runtime error |
| `authorization:runtime_shutdown` | `{ timestamp }` | Module shutting down |

## 8. Errors

| Error | Cause |
|-------|-------|
| `AuthorizationRuntimeError` | Base error |
| `AuthorizationRuntimeUnavailableError` | Authorization not available |
| `AuthorizationRuntimeConfigurationError` | Invalid configuration |
| `AuthorizationRuntimeInitializationError` | Engine failed to initialize |
| `AuthorizationRuntimeProviderError` | Provider resolution failure |

All errors extend `RuntimeError`.

## 9. Dependency Graph

```
RuntimeEngine
    ├── AuthRuntimeIntegration ───→ AuthenticationEngine
    │       └── AuthRuntimeContext
    │               ├── authenticate / logout / refresh
    │               └── can / cannot / authorize / explain ───→ │
    │                                                            ↓
    └── AuthorizationRuntimeIntegration ───→ AuthorizationEngine
            └── AuthorizationRuntimeContext
                    ├── PolicyEngine
                    ├── PermissionResolver
                    ├── RoleManager
                    ├── ScopeManager
                    └── AuthorizationAudit
```

### Module Dependencies

| Module | Depends On |
|--------|------------|
| `auth` | `database` |
| `authorization` | `auth` |
| Capabilities | `auth` (for authentication + authorization) |

## 10. Security Rules

| Rule | Description |
|------|-------------|
| AUTHINT-001 | Capabilities never import AuthorizationEngine |
| AUTHINT-002 | Capabilities never access policies directly |
| AUTHINT-003 | Capabilities never access roles directly |
| AUTHINT-004 | All authorization requests pass through `context.runtime.auth` |
| AUTHINT-005 | Runtime integration contains no business logic |
| AUTHINT-006 | Authorization remains provider independent |
| AUTHINT-007 | Authorization lifecycle follows Platform Runtime lifecycle |
| AUTHINT-008 | Authorization health participates in global runtime health |
| AUTHINT-009 | Authorization events use EventBus only |
| AUTHINT-010 | No JWT, HTTP, database or vendor imports in authorization runtime |
| AUTHINT-011 | AuthRuntimeContext delegates to AuthorizationRuntimeContext, never bypasses |
| AUTHINT-012 | Wiring between auth and authorization happens only in RuntimeEngine.start() |

## 11. Multi-Tenant Behavior

- Authorization context receives `tenant.id` and `destination.id` from capability calls
- Permission evaluation includes tenant/destination in cache key
- Role manager supports tenant-scoped roles
- Scope manager validates against tenant hierarchy
- Audit records include tenant and destination IDs
- Health checks are tenant-agnostic

## 12. Future Providers

The `AuthorizationRuntimeFactory` is prepared for provider swap:

| Provider | Class | Notes |
|----------|-------|-------|
| Valdi Policy Engine (default) | `AuthorizationEngine` | Full RBAC + ABAC + PBAC |
| OPA (Open Policy Agent) | `OpaAuthorizationEngine` | External policy evaluation |
| Cedar (AWS) | `CedarAuthorizationEngine` | Cedar policy language |
| Casbin | `CasbinAuthorizationEngine` | Casbin access control |
| OpenFGA | `OpenfgaAuthorizationEngine` | ReBAC (relationship-based) |
| Custom | Any | Implement AuthProviderRuntime interface |

Provider swap requires zero capability changes.

## 13. Validation Checklist

- [x] Authentication Runtime works unchanged
- [x] Authorization Engine remains independent
- [x] Capabilities only use `context.runtime.auth`
- [x] No JWT logic added to authorization integration
- [x] No provider coupling
- [x] No database coupling
- [x] Multi-tenant isolation preserved
- [x] EventBus integration complete
- [x] Runtime lifecycle integrated
- [x] Health checks available
- [x] AuthRuntimeContext delegates to AuthorizationRuntimeContext
- [x] Wiring occurs in RuntimeEngine.start() only
