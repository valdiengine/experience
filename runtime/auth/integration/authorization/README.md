# Authorization Runtime Integration

> P12.1.6 — Bridges the Authorization & Policy Engine (P12.1.5) with the Platform Runtime.
> Capabilities only know `context.runtime.auth.can()`. Never AuthorizationEngine.

## Layer Position

```
Capabilities
    ↓
context.runtime.auth
    ↓
┌────────────────────────────────────────────────┐
│           Auth Runtime Integration               │
│    (authenticate / logout / refresh / session)   │
└──────────────────────┬─────────────────────────┘
                       ↓
┌────────────────────────────────────────────────┐
│      Authorization Runtime Integration (THIS)   │
│                                                 │
│  AuthorizationRuntimeIntegration                │
│    ├─ initialize() / shutdown() / dispose()     │
│    ├─ health() / available() / supports()       │
│    │                                            │
│    ├─ AuthorizationRuntimeContext               │
│    │   ├─ can() / cannot() / authorize()        │
│    │   ├─ explain()                             │
│    │   ├─ hasPermission() / hasRole()           │
│    │   └─ hasScope()                            │
│    │                                            │
│    ├─ AuthorizationRuntimeRegistry              │
│    ├─ AuthorizationRuntimeFactory               │
│    └─ AuthorizationRuntimeHealth                │
└──────────────────────┬─────────────────────────┘
                       ↓
┌────────────────────────────────────────────────┐
│        Authorization & Policy Engine (P12.1.5)  │
│                                                 │
│  AuthorizationEngine                            │
│    ├─ Policy Engine (RBAC + ABAC + PBAC)        │
│    ├─ Permission Resolver                       │
│    ├─ Role Manager                              │
│    ├─ Scope Manager                             │
│    └─ Authorization Audit                       │
└─────────────────────────────────────────────────┘
```

## Files

| File | Responsibility |
|------|---------------|
| `authorization.runtime.integration.js` | Bridge: registers AuthorizationEngine inside Runtime. Entry point for the authorization runtime module. |
| `authorization.runtime.context.js` | Exposes authorization methods. AuthRuntimeContext delegates can/cannot/authorize/explain to this. |
| `authorization.runtime.registry.js` | Internal tracking: engine version, provider, features, status. |
| `authorization.runtime.factory.js` | Resolves which AuthorizationEngine to use. Prepared for OPA/Cedar/Casbin/OpenFGA. |
| `authorization.runtime.health.js` | Health aggregation: AuthorizationEngine + all 6 sub-modules. |
| `authorization.runtime.events.js` | 8 integration events. |
| `authorization.runtime.errors.js` | 5 error types extending RuntimeError. |

## Wiring

In `RuntimeEngine.start()`, after all modules initialize:

```js
const authModule = this.getModule('auth')
const authzModule = this.getModule('authorization')
if (authModule && authzModule) {
  authModule.setAuthorizationContext(authzModule.context)
}
```

This allows `context.runtime.auth.can()` to transparently delegate to the AuthorizationEngine.

## Rules

1. Capabilities never import AuthorizationEngine
2. Capabilities only use `context.runtime.auth.can()`
3. AuthorizationRuntimeIntegration is the only bridge
4. AuthorizationRuntimeContext exposes exactly what capabilities need
5. No JWT, HTTP, database or vendor imports
6. Provider resolution happens via AuthorizationRuntimeFactory
7. All sub-module health is aggregated
8. Multi-tenant ready
9. Future provider swap requires zero capability changes
10. Authorization lifecycle follows Platform Runtime lifecycle
