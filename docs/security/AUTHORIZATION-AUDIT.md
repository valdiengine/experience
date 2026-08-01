# Authorization Audit

> P12.1.7 — Complete audit of authorization: RBAC, ABAC, scopes, permissions, and decision audit trail.

## RBAC Audit

### Built-in Role Hierarchy

```
anonymous
  └── visitor
       └── visitor:verified
            └── visitor:premium
                 ├── business:owner
                 ├── guide
                 ├── moderator
                 ├── scientist
                 └── municipality
                      └── platform:admin
                           ├── system
                           └── developer
```

| Check | Result | Details |
|-------|--------|---------|
| Role inheritance | ✅ Implemented | Effective roles computed via inheritance chain |
| Circular detection | ✅ Implemented | Detected during role definition and assignment |
| Role assignment provenance | ✅ Implemented | Who assigned, when, and why tracked |
| Built-in role immutability | ✅ Implemented | Built-in roles cannot be modified or deleted |

### Role Operations

| Operation | Status | Description |
|-----------|--------|-------------|
| `assign(identityId, role)` | ✅ | Assign role with optional expiry |
| `remove(identityId, role)` | ✅ | Remove role assignment |
| `hasRole(identityId, role)` | ✅ | Check direct or inherited role |
| `effectiveRoles(identityId)` | ✅ | Resolve full inheritance chain |
| `listAssignments(role)` | ✅ | List all identities with this role |
| `validate(role)` | ✅ | Validate role exists and is not circular |

## ABAC Audit

### Condition Operators

| Operator | Status | Type | Example |
|----------|--------|------|---------|
| `eq` | ✅ | Comparison | `{eq: {role: "admin"}}` |
| `neq` | ✅ | Comparison | `{neq: {status: "banned"}}` |
| `in` | ✅ | Set membership | `{in: {department: ["sales", "support"]}}` |
| `nin` | ✅ | Set exclusion | `{nin: {blockedRegions: ["EU"]}}` |
| `gt` | ✅ | Numeric | `{gt: {trustLevel: 80}}` |
| `gte` | ✅ | Numeric | `{gte: {score: 50}}` |
| `lt` | ✅ | Numeric | `{lt: {failedAttempts: 3}}` |
| `lte` | ✅ | Numeric | `{lte: {concurrentSessions: 5}}` |
| `exists` | ✅ | Existence | `{exists: "email"}` |
| `not_exists` | ✅ | Existence | `{not_exists: "bannedUntil"}` |
| `contains` | ✅ | String | `{contains: {email: "@valdi"}}` |
| `startsWith` | ✅ | String | `{startsWith: {tenantId: "tenant_"}}` |
| `between` | ✅ | Range | `{between: {age: [18, 65]}}` |
| `trust_gte` | ✅ | Trust | `{trust_gte: 70}` |
| `time_between` | ✅ | Time | `{time_between: ["09:00", "17:00"]}` |
| `day_of_week` | ✅ | Time | `{day_of_week: ["Mon", "Tue", "Wed", "Thu", "Fri"]}` |

### Built-in Policies

| Policy | Type | Effect |
|--------|------|--------|
| `deny-by-default` | RBAC | Deny all actions unless explicitly allowed |
| `allow-own-profile` | ABAC | Allow identity to manage own profile |
| `trusted-device-access` | ABAC | Allow actions from trusted devices |
| `offline-read-access` | ABAC | Allow read access when offline |
| `time-restricted-write` | ABAC | Restrict write operations to business hours |
| `admin-full-access` | RBAC | Full access for admin roles |

## Permission Audit

### Permission Model

| Feature | Status | Details |
|---------|--------|---------|
| Wildcard matching | ✅ | `reservation:*` matches all reservation actions |
| Prefix matching | ✅ | `reservation:create` matches resource prefix |
| Deny override | ✅ | Explicit deny overrides any allow |
| Inheritance | ✅ | Parent permissions flow to child roles |
| Evaluation order | ✅ | Specific → wildcard, deny → allow |

### Permission Resolution

```
PermissionResolver.resolve(identity, action, resource, ctx)
  │
  ├─ 1. Check explicit denies → if denied, return DENIED
  ├─ 2. Collect effective permissions (roles + inheritance)
  ├─ 3. Wildcard match action against granted permissions
  ├─ 4. Check scope validity
  ├─ 5. Check RBAC policies
  ├─ 6. Check ABAC policies (condition evaluation)
  └─ 7. Return ALLOWED or DENIED with reason
```

## Scopes Audit

### Built-in Scopes

| Scope | Level | Description |
|-------|-------|-------------|
| `public` | L0 | Public read-only access |
| `private` | L1 | Private profile access |
| `verified` | L2 | Verified identity access |
| `premium` | L3 | Premium subscriber access |
| `business` | L4 | Business operations access |
| `destination` | L5 | Destination management |
| `moderation` | L6 | Content moderation |
| `science` | L7 | Scientific data access |
| `governance` | L8 | Platform governance |
| `sandbox` | L9 | Developer sandbox |
| `support` | L10 | Customer support |
| `admin` | L11 | Full platform admin |

### Scope Features

| Feature | Status | Details |
|---------|--------|---------|
| Wildcard scopes | ✅ | `admin:*` matches all admin sub-scopes |
| Prefix matching | ✅ | `destination:read` matches prefix |
| Parent-child hierarchy | ✅ | `admin > support > governance` |
| Scope validation | ✅ | Validates scope exists and is accessible |

## Decision Audit Trail

### Audit Record Schema

| Field | Always Present | Description |
|-------|--------------|-------------|
| `identityId` | ✅ | WHO requested |
| `action` | ✅ | WHAT action |
| `resource` | ✅ | ON WHICH resource |
| `allowed` | ✅ | Decision result |
| `reason` | ✅ | WHY allowed/denied |
| `policy` | ✅ if allowed | Which policy matched |
| `context` | ✅ | Evaluation context snapshot |
| `evaluatedAt` | ✅ | ISO timestamp |
| `cached` | ✅ if cached | Whether from cache |

### Audit Operations

| Operation | Status | Details |
|-----------|--------|---------|
| `record(decision)` | ✅ | Write decision to audit store |
| `query(filters)` | ✅ | Filter by identity, action, resource, time range, result |
| `export(filters)` | ✅ | Export decisions to JSON/CSV |
| `purge(before)` | ✅ | Remove records older than date |
| `stats()` | ✅ | Decision statistics (total, allowed, denied, by action) |
| Max records | ✅ 50,000 | Configurable ceiling |

## Auditability Check

Every authorization decision can answer:

| Question | Available | Source |
|----------|-----------|--------|
| WHO requested? | ✅ | `identityId` in audit record |
| WHAT action? | ✅ | `action` in audit record |
| ON WHICH resource? | ✅ | `resource` in audit record |
| WHY allowed/denied? | ✅ | `reason` + `policy` in audit record |
| WHEN evaluated? | ✅ | `evaluatedAt` timestamp |
| FROM cache? | ✅ | `cached` flag |

## Violations Found

### Violation 1: No policy dry-run mode

**Severity:** Low

**Issue:** There is no way to test "what would happen if policy X were applied" without actually evaluating it. This makes policy debugging harder.

**Verdict:** Documentation gap — add policy simulation to future roadmap.

### Violation 2: No permission diff/history

**Severity:** Low

**Issue:** Permission grants and revocations are captured as events but there is no "permission change history" for a specific identity. Auditors cannot easily see what permissions a user had at a specific point in time.

**Verdict:** Feature gap — acceptable for current phase.

## Authorization Score

| Domain | Score | Notes |
|--------|-------|-------|
| RBAC | 95/100 | Full hierarchy, inheritance, circular detection |
| ABAC | 90/100 | 14 operators, 6 built-in policies |
| Permissions | 95/100 | Wildcards, deny override, proper resolution order |
| Scopes | 90/100 | Full hierarchy, 12 built-in scopes |
| Audit Trail | 90/100 | Full record, query, export, purge |
| Explainability | 85/100 | Explain provides permission + policy trails |

**Overall Authorization Score: 91/100**
