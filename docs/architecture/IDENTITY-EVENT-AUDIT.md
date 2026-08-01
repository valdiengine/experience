# Identity Event Audit

> P12.1.7 — EventBus audit for all identity & authorization events.

## Event Files Found

| # | File | Prefix | Events Count |
|---|------|--------|-------------|
| 1 | `runtime/auth/integration/auth.runtime.events.js` | `runtime:auth_*` | 6 |
| 2 | `runtime/auth/integration/authorization/authorization.runtime.events.js` | `authorization:runtime_*` | 8 |
| 3 | `runtime/auth/engine/auth.engine.events.js` | `auth:*` | 18 |
| 4 | `runtime/auth/providers/jwt/jwt.events.js` | `jwt:*` | 12 |
| 5 | `runtime/auth/authorization/authorization.events.js` | `authorization:*` | 10 |
| 6 | `runtime/auth/permissions/permission.events.js` | `permission:*` | 4 |
| 7 | `runtime/auth/roles/role.events.js` | `role:*` | 4 |
| 8 | `runtime/auth/scopes/scope.events.js` | `scope:*` | 3 |
| 9 | `runtime/auth/audit/audit.events.js` | `audit:*` | 3 |
| — | `runtime/auth/policies/policy.events.js` | **MISSING** | 0 |

**Total: 67 events across 9 files (1 missing)**

## Naming Convention Audit

All 67 event strings follow: `domain:action_description`

| Check | Result |
|-------|--------|
| Lowercase with colons | ✅ 67/67 (100%) |
| UPPER_SNAKE_CASE constants | ✅ 67/67 (100%) |
| `_EVENTS` suffix on exported objects | ✅ 9/9 (100%) |
| `create*Event` factory function | ✅ 9/9 (100%) |
| Consistent payload envelope `{event, timestamp, source, payload}` | ✅ 9/9 (100%) |

## Violation: Prefix Inversion

**File:** `runtime/auth/integration/auth.runtime.events.js`

**Current:** `runtime:auth_registered`, `runtime:auth_initialized`, etc.

**Expected:** `auth:runtime_registered`, `auth:runtime_initialized`, etc. (to match `authorization:runtime_*` pattern)

**Impact:** Low — consumers subscribing to `runtime:auth_*` would need to update subscriptions. No current consumers (zero capabilities use auth runtime directly).

## Violation: Missing policy events file

**File:** `runtime/auth/policies/policy.events.js` — does not exist

**Impact:** Low — policy-related events are emitted through `authorization/authorization.events.js`. The missing file is a completeness gap, not a functional one.

**Recommended events to add:**

```js
POLICY_EVALUATED: 'policy:evaluated',
POLICY_EVALUATION_SKIPPED: 'policy:evaluation_skipped',
POLICY_COMPILED: 'policy:compiled',
POLICY_COMPILE_ERROR: 'policy:compile_error',
POLICY_REGISTERED: 'policy:registered',
POLICY_UNREGISTERED: 'policy:unregistered',
```

## Design Concern: Semantic Overlap

Multiple event files define semantically overlapping events for the same concept:

| Concept | engine/ | authorization/ | Domain-specific |
|---------|---------|----------------|-----------------|
| Role assigned | `auth:role_assigned` | `authorization:role_assigned` | `role:assigned` |
| Role removed | `auth:role_removed` | `authorization:role_removed` | `role:removed` |
| Permission granted | `auth:permission_granted` | `authorization:permission_granted` | `permission:granted` |
| Permission revoked | `auth:permission_revoked` | `authorization:permission_revoked` | `permission:revoked` |
| Scope evaluated | — | `authorization:scope_evaluated` | `scope:evaluated` |

This is by design — each layer re-emits events under its own namespace so subscribers can filter by layer. Not a bug.

## Event Inventory by Domain

### Authentication Events (auth:*)

```
auth:login
auth:logout
auth:authenticated
auth:unauthorized
auth:permission_granted
auth:permission_revoked
auth:role_assigned
auth:role_removed
auth:session_started
auth:session_restored
auth:session_expired
auth:session_revoked
auth:trust_changed
auth:mfa_enabled
auth:mfa_disabled
auth:anonymous_created
auth:anonymous_upgraded
auth:error
```

### JWT Provider Events (jwt:*)

```
jwt:login
jwt:logout
jwt:refresh
jwt:revoked
jwt:session_created
jwt:session_restored
jwt:session_expired
jwt:device_trusted
jwt:device_revoked
jwt:token_rotated
jwt:token_reused
jwt:auth_failure
```

### Authorization Events (authorization:*)

```
authorization:allowed
authorization:denied
authorization:policy_registered
authorization:role_assigned
authorization:role_removed
authorization:permission_granted
authorization:permission_revoked
authorization:scope_evaluated
authorization:policy_cache_hit
authorization:policy_cache_miss
```

### Permission Events (permission:*)

```
permission:granted
permission:revoked
permission:resolved
permission:denied
```

### Role Events (role:*)

```
role:defined
role:assigned
role:removed
role:inheritance_changed
```

### Scope Events (scope:*)

```
scope:defined
scope:validated
scope:evaluated
```

### Audit Events (audit:*)

```
audit:recorded
audit:exported
audit:purged
```

### Auth Runtime Integration Events (runtime:auth_*)

```
runtime:auth_registered
runtime:auth_initialized
runtime:auth_provider_changed
runtime:auth_health_changed
runtime:auth_error
runtime:auth_shutdown
```

### Authorization Runtime Integration Events (authorization:runtime_*)

```
authorization:runtime_registered
authorization:runtime_initialized
authorization:runtime_started
authorization:runtime_ready
authorization:decision_requested
authorization:decision_completed
authorization:runtime_error
authorization:runtime_shutdown
```

## Event Bus Compliance

| Check | Result |
|-------|--------|
| All events lowercase colon-separated | ✅ |
| All events have unique string | ✅ |
| All files export `create*Event` factory | ✅ |
| All factories produce `{event, timestamp, source, payload}` | ✅ |
| No orphan consumers (no capabilities consume auth events yet) | ✅ (no consumers yet) |
| Naming convention consistent across files | ❌ 1 file inverted (`auth.runtime.events.js`) |
| All directories have events file | ❌ 1 missing (`policies/`) |

## Event Health Score

| Metric | Score |
|--------|-------|
| Naming consistency | 85/100 |
| File completeness | 90/100 |
| Payload consistency | 100/100 |
| Factory pattern | 100/100 |
| Domain coverage | 95/100 |

**Overall Event Score: 94/100**
