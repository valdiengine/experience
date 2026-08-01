# Identity Dependency Audit

> P12.1.7 — Dependency graph validation for the complete identity & authorization stack.

## Dependency Graph

```
capabilities/
  ↓ (context.runtime.auth only — verified: NO direct auth imports)
runtime.context.js ───→ runtime.auth ───→ AuthRuntimeContext
                                              ↓
auth.runtime.integration.js ───→ AuthenticationEngine
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
           AuthenticationEngine             AuthorizationEngine
           (session/token/trust/           (policy/permission/role/
            device/mfa/anonymous)            scope/audit)
                                              ↓
                              ┌───────────────┼───────────────┐
                              ↓               ↓               ↓
                        PolicyEngine    PermissionResolver  RoleManager
                        (RBAC+ABAC+     (wildcard/           (hierarchy/
                         PBAC)           deny-override)       inheritance)
                              ↓               ↓               ↓
                        PolicyCache     PermissionMatrix   ScopeManager
                        (TTL 5K)         (role→perm.)       (namespaces)
```

## Allowed Dependency Direction

```
Capabilities ← NEVER imports auth/authz modules
    ↓
Runtime Context (context.runtime.auth)
    ↓
Runtime Integration (AuthRuntimeIntegration, AuthorizationRuntimeIntegration)
    ↓
Engine Layer (AuthenticationEngine, AuthorizationEngine)
    ↓
Modules (PolicyEngine, PermissionResolver, RoleManager, ScopeManager)
```

## Violations Found

### Violation 1: Capability-defined RoleManager classes shadow Auth RoleManager

**Severity:** Low

**Files:**
- `capabilities/admin/users/role.manager.js` — exports `RoleManager` class
- `capabilities/governance/roles/role.manager.js` — exports `RoleManager` class

**Issue:** These are internal capability-defined role managers for business-level user management (admin panel roles, governance roles). They are NOT the auth-stack `RoleManager` from `runtime/auth/roles/role.manager.js`. However, the name collision is confusing.

**Verdict:** False positive — these predate the auth stack and manage business-level role assignments within capabilities, not auth-level RBAC. They import and use their own internal classes, not auth stack modules.

### Violation 2: External npm dependencies in persistence provider

**Severity:** Low (properly contained)

**Files:**
- `capabilities/persistence/providers/postgres/drizzle/drizzle.client.js` — `require('drizzle-orm/node-postgres')`, `require('drizzle-orm/pg-core')`
- `capabilities/persistence/providers/postgres/postgres.pool.js` — `require('pg-pool')`

**Issue:** These are the only external npm dependencies in the entire capabilities directory. They are properly isolated within the persistence provider subsystem (`providers/postgres/`) and are not imported by any auth module.

**Verdict:** Acceptable — the persistence subsystem is designed to encapsulate database-specific dependencies. No capability imports these directly.

### Violation 3: Error hierarchy not unified under RuntimeError

**Severity:** HIGH

**Files:**
- `runtime/auth/integration/auth.runtime.errors.js` — extends `Error` instead of `RuntimeError`
- `runtime/auth/authorization/authorization.errors.js` — extends `Error` instead of `RuntimeError`
- `runtime/auth/engine/auth.engine.errors.js` — extends `Error` instead of `RuntimeError`
- `runtime/auth/providers/jwt/jwt.errors.js` — extends `Error` instead of `RuntimeError`

**Issue:** 4 of 5 auth error files do not extend `RuntimeError`. The only correct one is `authorization.runtime.errors.js`. This breaks polymorphic catch behavior.

**Correction:** All 4 files need to be updated to extend `RuntimeError` (or an appropriate middleware like `AuthenticationEngineError`).

### Violation 4: Duplicate error class names across modules

**Severity:** Medium

**Files:**
- `runtime/auth/engine/auth.engine.errors.js` — exports `AuthorizationError`, `PermissionDeniedError`
- `runtime/auth/authorization/authorization.errors.js` — exports `AuthorizationError`, `PermissionDeniedError`

**Issue:** Two different classes with the same name, different inheritance chains. The engine versions extend `AuthenticationEngineError`, the authorization versions extend `AuthorizationError`. This causes confusion and potential bugs if both are imported in the same scope.

**Correction:** Rename engine variants to avoid collision (e.g., `EngineAuthorizationError`, `EnginePermissionDeniedError`).

### Violation 5: Event prefix inversion between integration layers

**Severity:** Medium

**Files:**
- `runtime/auth/integration/auth.runtime.events.js` — uses `runtime:auth_*` prefix
- `runtime/auth/integration/authorization/authorization.runtime.events.js` — uses `authorization:runtime_*` prefix

**Issue:** Inconsistent prefix ordering. The auth integration places `runtime` first (`runtime:auth_registered`), while authorization integration places the domain first (`authorization:runtime_initialized`).

**Correction:** Align to `auth:runtime_*` to match the `authorization:runtime_*` pattern (domain first).

### Violation 6: Missing policy events file

**Severity:** Low

**File:** `runtime/auth/policies/policy.events.js` — does not exist

**Issue:** The policies directory has 7 functional files but no dedicated events file. Policy-related events (`policy_registered`, `policy_cache_hit`, `policy_cache_miss`) are defined in `authorization/authorization.events.js` instead.

**Correction:** Create `policies/policy.events.js` with policy-specific events.

### Violation 7: Database module not registered in RuntimeEngine

**Severity:** Low

**File:** `runtime/runtime.engine.js`

**Issue:** `AuthRuntimeIntegration` declares `dependencies: ['database']`, but `database` is never registered inside `RuntimeEngine.initialize()`. It must be registered externally by the application bootstrap.

**Verdict:** Design choice — the engine is provider-agnostic and does not know which database provider will be used. The application layer must register it. Documented as expected behavior.

## Final Dependency Status

| Check | Result |
|-------|--------|
| Capabilities import JWT/auth/authz | ✅ PASS — zero violations |
| Auth modules import capabilities | ✅ PASS — zero reverse imports |
| Engine imports providers directly | ✅ PASS — via factory/contract pattern |
| Circular dependencies | ✅ PASS — none detected |
| Error hierarchy unified | ❌ FAIL — 4 files need correction |
| Event prefix consistency | ❌ FAIL — 1 file needs correction |
| Event file completeness | ❌ FAIL — 1 file missing |
| Error name uniqueness | ❌ FAIL — 2 classes duplicated |
| External npm isolation | ✅ PASS — contained in persistence |
