# Authorization Engine

> P12.1.5 — Core orchestration layer for all authorization decisions in Valdi Engine.
> RBAC + ABAC + PBAC + Scope Evaluation.

## Layer Position

```
Capabilities
    ↓
context.runtime.auth.can(action, resource, context)
    ↓
Authentication Runtime Integration
    ↓
AuthorizationEngine
    ├── PolicyEngine
    ├── PermissionResolver
    ├── RoleManager
    ├── ScopeManager
    ├── PolicyCache
    └── AuthorizationAudit
    ↓
Decision: { allowed: true/false, reason, policy }
```

## Principle

Capabilities never evaluate permissions directly. Never compare roles. Never check `permissions.includes()`.
They only ask: `context.runtime.auth.can(action, resource, context)`.

## Files

| File | Responsibility |
|------|---------------|
| `authorization.engine.js` | Main orchestrator. Exposes can, cannot, authorize, evaluate, evaluateMany, explain, health. |
| `authorization.context.js` | Evaluation context: identity, tenant, destination, business, time, offline, trust, device. |
| `authorization.registry.js` | Module registration and tracking. |
| `authorization.factory.js` | Engine resolution. Prepared for future OPA/Casbin/OpenFGA. |
| `authorization.health.js` | Health across all sub-modules. |
| `authorization.events.js` | 10 events. |
| `authorization.errors.js` | 8 error types. |

## Sub-modules

| Module | Location | Responsibility |
|--------|----------|---------------|
| Policy Engine | `../policies/` | RBAC + ABAC + PBAC evaluation |
| Permission Resolver | `../permissions/` | Role/permission resolution |
| Role Manager | `../roles/` | Role hierarchy and inheritance |
| Scope Manager | `../scopes/` | Scope namespaces |
| Authorization Audit | `../audit/` | Decision recording |
