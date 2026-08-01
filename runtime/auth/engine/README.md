# Authentication Engine

> P12.1.2 — Complete Authentication Engine for Valdi Engine.
> The orchestration layer that coordinates every authentication contract.
> No JWT. No OAuth. No providers. No browser APIs. No databases.

## Layer Position

```
context.runtime.auth
    ↓
Authentication Engine    ← YOU ARE HERE
    ↓
Authentication Runtime Contracts (P12.1.1)
    ↓
Authentication Provider (JWT, OAuth, Auth0, Clerk, Firebase, ...)
```

## Public API

| Method | Delegates To | Description |
|--------|-------------|-------------|
| `login(credentials)` | AuthProvider | Authenticate and return session + context |
| `logout(session)` | SessionEngine | Destroy session |
| `authenticate(token)` | AuthProvider | Validate token and return identity |
| `refresh(token)` | TokenEngine | Refresh expired token |
| `validate(session)` | SessionEngine | Check session validity |
| `currentIdentity(context)` | — | Get current identity from context |
| `currentSession(context)` | — | Get current session from context |
| `currentTenant(context)` | — | Get current tenant from context |
| `authorize(identity, action, resource)` | AuthorizationEngine | Check authorization |
| `can(identity, action, resource)` | AuthorizationEngine | Boolean permission check |
| `cannot(identity, action, resource)` | AuthorizationEngine | Inverse check |
| `permissions(identityId)` | PermissionEngine | List permissions |
| `roles(identityId)` | RoleEngine | List roles |
| `trust(identityId)` | TrustEngine | Calculate trust score |
| `device(identityId)` | DeviceEngine | List trusted devices |
| `mfa(identityId)` | MfaEngine | MFA operations |
| `anonymous(fingerprint)` | AnonymousEngine | Create guest identity |
| `audit(filters)` | AuditEngine | Query audit log |
| `healthCheck()` | AuthEngineHealth | Aggregate health check |
| `available()` | — | Engine availability |
| `supports(feature)` | — | Feature detection |

## Internal Engines

| Engine | Responsibility |
|--------|---------------|
| SessionEngine | Session lifecycle, restore, rotation, expiration, remember me |
| TokenEngine | Token issuance, validation, refresh, revocation |
| AuthorizationEngine | RBAC, ABAC, scopes, claims, policies |
| PermissionEngine | Grant, revoke, list, check permissions |
| RoleEngine | Assign, remove, hierarchy, inheritance |
| TrustEngine | Trust score, increase, decrease, decay |
| DeviceEngine | Device registration, verification, trust |
| MfaEngine | MFA enable, disable, challenge, verify |
| AnonymousEngine | Guest identity, upgrade, merge |
| AuditEngine | Audit record, query, export, purge |

## Infrastructure

| File | Responsibility |
|------|---------------|
| `auth.engine.registry.js` | Provider registration and resolution |
| `auth.engine.factory.js` | Provider instantiation with caching |
| `auth.engine.context.js` | Auth context (identity, tenant, session, permissions) |
| `auth.engine.health.js` | Aggregated health across all components |
| `auth.engine.events.js` | 18 auth events |
| `auth.engine.errors.js` | 12 error types |

## Rules

1. Capabilities never authenticate directly
2. Capabilities only use `context.runtime.auth`
3. Engine never imports JWT libraries
4. Engine never imports OAuth SDKs
5. Engine never imports browser APIs
6. Engine never imports providers
7. Engine only talks to Runtime Contracts
8. Providers remain replaceable
9. Offline authentication supported
10. Multi-tenant isolation mandatory
11. Destination isolation mandatory
12. Provider independent
