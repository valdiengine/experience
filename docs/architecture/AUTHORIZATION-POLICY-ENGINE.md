# Authorization & Policy Engine

> P12.1.5 — Complete authorization platform for Valdi Engine.
> RBAC + ABAC + PBAC + Scope Evaluation + Runtime Context + Audit.

---

## 1. Purpose

Implement the single authorization authority for the entire Valdi Engine. Every decision about whether an identity can perform an action on a resource passes through this engine. Capabilities never evaluate permissions directly — they ask `context.runtime.auth.can(action, resource, context)` and receive a yes/no answer with explanation.

---

## 2. Authorization Philosophy

1. **Centralized Decisions** — All authorization flows through one engine
2. **Capabilities Never Decide** — `if (user.role === 'admin')` is forbidden
3. **Multiple Models** — RBAC for roles, ABAC for attributes, PBAC for policies
4. **Deny Overrides** — A single deny policy always wins over any allow
5. **Explainable** — Every decision can be explained (why allowed, why denied)
6. **Cacheable** — Decisions are cached with TTL for performance
7. **Auditable** — Every decision is recorded with identity, action, resource, reason
8. **Provider Agnostic** — Works the same with JWT, Auth0, Clerk, Firebase, Supabase, Keycloak

---

## 3. Layer Position

```
Capabilities
    ↓
context.runtime.auth.can(action, resource, context)
context.runtime.auth.cannot(action, resource, context)
context.runtime.auth.authorize(action, resource, context)
    ↓
Authentication Runtime Integration (P12.1.3)
    ↓
┌──────────────────────────────────────────────────────────────────┐
│                    AuthorizationEngine                           │
│                                                                  │
│  can()  cannot()  authorize()  evaluate()  evaluateMany()       │
│  explain()  health()                                             │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Policies │  │Permission│  │  Roles   │  │    Scopes      │  │
│  │  Engine  │  │ Resolver │  │ Manager  │  │   Manager      │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │ Policy Cache │  │  Audit       │  │  Authorization   │      │
│  │  (decisions) │  │  Recorder    │  │  Context Builder  │      │
│  └──────────────┘  └──────────────┘  └──────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
    ↓
Decision: { allowed: true/false, reason: string, policy: string }
```

---

## 4. Directory Structure

```
runtime/auth/
├── authorization/           Core orchestration (8 files)
│   ├── authorization.engine.js
│   ├── authorization.context.js
│   ├── authorization.registry.js
│   ├── authorization.factory.js
│   ├── authorization.health.js
│   ├── authorization.events.js
│   ├── authorization.errors.js
│   └── README.md
│
├── policies/                Policy evaluation (7 files)
│   ├── policy.engine.js
│   ├── policy.registry.js
│   ├── policy.context.js
│   ├── policy.compiler.js
│   ├── policy.cache.js
│   ├── built-in.policies.js
│   └── README.md
│
├── permissions/             Permission resolution (5 files)
│   ├── permission.resolver.js
│   ├── permission.matrix.js
│   ├── permission.registry.js
│   ├── permission.events.js
│   └── README.md
│
├── roles/                   RBAC management (5 files)
│   ├── role.manager.js
│   ├── role.registry.js
│   ├── built-in.roles.js
│   ├── role.events.js
│   └── README.md
│
├── scopes/                  Scope namespace (5 files)
│   ├── scope.manager.js
│   ├── scope.registry.js
│   ├── built-in.scopes.js
│   ├── scope.events.js
│   └── README.md
│
└── audit/                   Decision tracking (3 files)
    ├── authorization.audit.js
    ├── audit.events.js
    └── README.md
```

---

## 5. RBAC (Role-Based Access Control)

### Role Hierarchy

```
platform:admin ──────────────────────────────────────────┐
system ──────────────────────────────────────────────────┤
developer ───────────────────────────────────────────────┤
municipality ────────────────────────────────────────────┤
                                                         ├── visitor:verified ── visitor ── anonymous
business:owner ──────────────────────────────────────────┤
guide ───────────────────────────────────────────────────┤
moderator ───────────────────────────────────────────────┤
scientist ───────────────────────────────────────────────┤
visitor:premium ── visitor:verified ── visitor ── anonymous
```

### Built-in Roles (12)

| Role | Type | Inherits | Key Permissions |
|------|------|----------|-----------------|
| anonymous | system | — | content:read, destination:read |
| visitor | system | anonymous | profile:read/write, reservation:create |
| visitor:verified | system | visitor | review:write, community:write |
| visitor:premium | system | visitor:verified | content:exclusive, support:priority |
| business:owner | tenant | visitor:verified | business:manage, reservation:manage |
| guide | destination | visitor:verified | experience:create/manage, route:create |
| moderator | destination | visitor:verified | community:moderate, review:moderate |
| scientist | destination | visitor:verified | species:record/verify, observation:manage |
| municipality | destination | — | destination:manage, governance:manage |
| platform:admin | system | — | * (full access) |
| system | system | — | * (internal operations) |
| developer | system | visitor | *:read, sandbox:* |

### Inheritance Resolution

```
RoleManager.getEffectiveRoles(identityId)
  → assigned roles + all inherited roles (up to 10 levels)
  → circular dependency detection
```

---

## 6. ABAC (Attribute-Based Access Control)

### Supported Attributes

| Attribute | Source | Example |
|-----------|--------|---------|
| identity.id | Token/Provider | `identity-123` |
| identity.email | Token/Provider | `user@example.com` |
| tenant.id | Context | `tenant-456` |
| destination.id | Context | `dest-789` |
| device.trusted | DeviceManager | `true` / `false` |
| trustLevel | TrustEngine | `65` |
| currentTime | System | `2026-07-28T10:30:00Z` |
| offline | System | `true` / `false` |
| locale | Header | `es-CL` |

### Condition Operators

| Operator | Description |
|----------|-------------|
| `eq` | Equals |
| `neq` | Not equals |
| `in` | In array |
| `nin` | Not in array |
| `gt` / `gte` | Greater than / greater or equal |
| `lt` / `lte` | Less than / less or equal |
| `exists` | Attribute exists |
| `not_exists` | Attribute does not exist |
| `contains` | String contains |
| `startsWith` | String starts with |
| `between` | Value between two numbers |
| `trust_gte` | Trust level >= value |
| `time_between` | Current time between HHMM values |
| `day_of_week` | Current day is in list |

### Example ABAC Policy

```js
{
  name: 'offline-read-access',
  effect: 'allow',
  actions: ['*:read'],
  conditions: [
    { field: 'offline', operator: 'eq', value: true },
    { field: 'trustLevel', operator: 'gte', value: 50 },
  ],
  reason: 'offline_read_trusted',
}
```

---

## 7. Policy Engine

### Evaluation Flow

```
1. Receive: identity, action, resource, context
2. Build PolicyContext (identity, action, resource, time, trust, device, tenant, destination)
3. Load policies from PolicyRegistry (sorted by priority desc)
4. Filter by action match (exact, wildcard, prefix)
5. Filter by condition evaluation (RBAC roles check, ABAC attribute checks)
6. Evaluate:
   - If deny policy matches → DENY (deny overrides)
   - If allow policy matches → ALLOW
   - If no policy matches → default allow (configurable)
7. Return: { allowed, reason, policy }
```

### Built-in Policies (6)

| Policy | Effect | Priority | Description |
|--------|--------|----------|-------------|
| deny-by-default | deny | 0 | Default deny all |
| allow-own-profile | allow | 100 | Read own profile |
| trusted-device-access | allow | 90 | Basic actions from trusted devices |
| offline-read-access | allow | 80 | Read when offline if trust >= 50 |
| time-restricted-write | deny | 50 | Deny writes outside business hours |
| admin-full-access | allow | 200 | Admin has full access |

### Policy DSL (Future)

```
policy offline-read-access
  effect allow
  action *:read
  condition offline eq true
  condition trustLevel gte 50
```

---

## 8. Permission Resolution

### Resolution Order

```
1. Collect roles from identity
2. For each role, collect direct permissions
3. For each role, collect inherited permissions (up the hierarchy)
4. Collect direct permission grants for this identity
5. Merge all permissions (deny wins if configured)
6. Match permissions against action using:
   - Exact match
   - Wildcard (*)
   - Prefix match (reservation:* matches reservation:read)
7. Return: { denied: true/false, reason, permission }
```

---

## 9. Scope Evaluation

### Built-in Scopes (12)

public, private, verified, premium, business, destination, moderation, science, governance, sandbox, support, admin

### Scope Convention

```
{namespace}:{action}:{resource}
  reservation:read
  reservation:write
  business:manage
  destination:publish
  species:verify
```

### Scope Matching

- Exact: `reservation:read` === `reservation:read`
- Wildcard: `reservation:*` matches `reservation:read`, `reservation:write`
- Namespace prefix: `reservation` matches `reservation:read`

---

## 10. Runtime Context

Every authorization evaluation receives a rich context:

```js
{
  identity: { id, email, roles, permissions, trustLevel },
  tenant: { id, name },
  destination: { id },
  business: { id },
  currentTime: Date,
  offline: boolean,
  trustLevel: number,
  device: { id, trusted },
  locale: string,
  timezone: string,
  scopes: [],
  permissions: [],
  roles: [],
  capabilities: [],
}
```

---

## 11. Offline Authorization

The engine supports offline decisions:

1. Device trust is evaluated locally
2. Cached decisions from PolicyCache are used when online was available
3. Built-in offline policies (`offline-read-access`) enable reads when trust >= 50
4. Write operations are denied offline by default
5. Audit records are queued for sync when back online (future)

---

## 12. Audit

Every authorization decision is recorded:

```js
{
  id: 'aud_abc123',
  identityId: 'identity-456',
  action: 'reservation:create',
  resource: 'reservation:789',
  allowed: false,
  reason: 'outside_business_hours',
  policy: 'time-restricted-write',
  cached: false,
  timestamp: '2026-07-28T10:30:00Z',
}
```

### Audit Features

- Query by identity, action, resource, allowed, time range
- Export all records
- Purge records before a date
- 50K max records (configurable)

---

## 13. Future Policy DSL

```yaml
policy: reservation-write
  description: "Allow business owners to manage their own reservations"
  effect: allow
  priority: 100
  actions:
    - reservation:create
    - reservation:update
    - reservation:cancel
  roles:
    - business:owner
  conditions:
    - field: tenant.id
      operator: eq
      value: "{identity.tenant.id}"
```

Supported by the compiler. Full DSL implementation in a future phase.

---

## 14. Future GUI Policy Builder

The architecture supports a visual policy builder (future):

```
Drag & Drop Interface
  ├── Policy Name
  ├── Effect: [Allow] [Deny]
  ├── Actions: [select from registry]
  ├── Roles: [select from registry]
  ├── Conditions: [attribute] [operator] [value]
  │   ├── AND / OR
  │   └── Nested groups
  └── Priority: slider 0-100
```

The PolicyCompiler converts GUI output to evaluable policies.

---

## 15. Future Provider Compatibility

The Policy layer is provider independent. Future integrations connect only through `policies/`:

| Provider | Connection Point | Status |
|----------|-----------------|--------|
| Open Policy Agent (OPA) | `policies/` | 🔜 Future |
| Cedar Policy Language | `policies/` | 🔜 Future |
| Casbin | `policies/` | 🔜 Future |
| OpenFGA | `policies/` | 🔜 Future |
| Custom Valdi Policy DSL | `policies/` | 🔜 Future |
| Visual Policy Builder | `policies/` | 🔜 Future |

---

## 16. Architecture Rules (AUTHZ-001 through AUTHZ-012)

| Rule | Description |
|------|-------------|
| AUTHZ-001 | Capabilities never evaluate permissions directly |
| AUTHZ-002 | Never compare roles manually (`if user.role === 'admin'`) |
| AUTHZ-003 | Never import JWT in authorization layer |
| AUTHZ-004 | Never import auth providers in authorization layer |
| AUTHZ-005 | All decisions pass through AuthorizationEngine |
| AUTHZ-006 | Policy Engine never knows about HTTP |
| AUTHZ-007 | Policy Engine never knows about WordPress |
| AUTHZ-008 | Policy Engine never knows about PostgreSQL |
| AUTHZ-009 | Offline authorization must work without network |
| AUTHZ-010 | Policy Cache never modifies decisions (read-only) |
| AUTHZ-011 | Deny always has priority over Allow |
| AUTHZ-012 | Policies are declarative (not imperative) |

## Module Ownership Rules

| Rule | Description |
|------|-------------|
| AUTHZ-ARCH-001 | Authorization must remain modular |
| AUTHZ-ARCH-002 | AuthorizationEngine must never contain role logic |
| AUTHZ-ARCH-003 | AuthorizationEngine must never contain policy rules |
| AUTHZ-ARCH-004 | Capabilities must never access roles, permissions or policies directly |
| AUTHZ-ARCH-005 | All authorization requests pass through `context.runtime.auth` |
| AUTHZ-ARCH-006 | No vendor authorization libraries leak into capabilities |
| AUTHZ-ARCH-007 | Policy providers must be replaceable |
| AUTHZ-ARCH-008 | Every module must be independently testable |
| AUTHZ-ARCH-009 | Every module must expose health information |
| AUTHZ-ARCH-010 | Every module must maintain its own documentation |

## Dependency Rules

```
authorization → policies → permissions → roles → scopes

Allowed:
  authorization → policies
  policies → permissions
  permissions → roles
  roles → scopes

Forbidden:
  roles → authorization
  policies → authorization
  permissions → engine
  scopes → providers
```

---

## 17. Validation Checklist

- [ ] AuthorizationEngine coordinates all sub-modules (no business logic inside)
- [ ] `can()`, `cannot()`, `authorize()`, `evaluate()`, `evaluateMany()`, `explain()` all work
- [ ] RBAC: 12 built-in roles with inheritance hierarchy
- [ ] ABAC: 14 condition operators supported
- [ ] Policy Engine: deny-override, scope matching, condition evaluation
- [ ] 6 built-in policies registered
- [ ] 12 built-in scopes registered
- [ ] Permission Resolver: wildcard, prefix matching, deny override, inheritance
- [ ] Role Manager: assign, remove, inheritance, circular detection, effective roles
- [ ] Scope Manager: validate, effective scopes, wildcard/prefix
- [ ] Audit: record, query, export, purge, stats
- [ ] Policy Cache: TTL, max entries, hit/miss tracking
- [ ] Policy Compiler: JSON + DSL support, validation
- [ ] No capability imports authorization internals
- [ ] All errors extend AuthorizationError hierarchy (8 types)
- [ ] All events follow `authorization:*` / `permission:*` / `role:*` / `scope:*` / `audit:*` naming
- [ ] Every sub-module exposes health()
- [ ] No business logic in authorization layer
- [ ] No WordPress dependencies
- [ ] No PostgreSQL dependencies
- [ ] Compatible with Authentication Engine (P12.1.2)
- [ ] Compatible with Runtime Integration (P12.1.3)
- [ ] Compatible with JWT Provider (P12.1.4)
- [ ] Capabilities require zero changes
