# OWNER-SESSION-2 — FINAL REPORT

**Status:** COMPLETE
**Physical Staging Certification:** PASS
**Date:** 2026-08-24

---

## Objective

Replace in-memory Map-based Owner session storage with persistent PostgreSQL storage, enabling session survival across Passenger/Node worker restarts and multi-process deployments.

---

## Previous Boundary (OWNER-SESSION-1)

OWNER-SESSION-1 established persistent PostgreSQL owner identity and application grants:
- `public.users` — owner email, name, scrypt password hash
- `owner_application_grants` — application grants with role/permissions array

**Remaining boundary:** Authenticated Owner sessions were stored in a process-local JavaScript Map. Sessions did NOT survive Passenger worker restarts. Multi-process deployments could not share session state.

---

## Architecture Delivered

### Persistent Session Model

```
PostgreSQL owner_sessions table:
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
  application_id  TEXT NOT NULL
  token_hash      TEXT NOT NULL UNIQUE
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked'))
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  expires_at      TIMESTAMPTZ NOT NULL
  revoked_at      TIMESTAMPTZ
```

### Token Security Model

| Concept | Detail |
|---------|--------|
| Raw token | `sess_` + 43 base64url characters (256-bit CSPRNG) |
| Entropy source | `crypto.randomBytes(32)` |
| Stored | SHA256(rawToken) — 64 hex characters |
| DB id | PostgreSQL `gen_random_uuid()` — internal only |
| Client | Raw token returned as Bearer credential ONCE at login |

**Security properties:**
- Raw token NEVER stored in PostgreSQL
- Raw token NEVER logged
- Raw token NEVER embedded in HTML or URLs
- Raw token NEVER printed to console
- Token hash used for equality comparison (PostgreSQL performs the check)

---

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS owner_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id  TEXT NOT NULL,
  token_hash      TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'revoked')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ
);

CREATE INDEX idx_owner_sessions_user_id ON owner_sessions(user_id);
CREATE INDEX idx_owner_sessions_expires ON owner_sessions(expires_at) WHERE status = 'active';
```

**Indexes:**
- `idx_owner_sessions_user_id` — for `revokeAllSessionsForUser()` and session counting
- `idx_owner_sessions_expires` (partial, active only) — for `cleanupExpiredSessions()`
- `UNIQUE token_hash` — provides unique index for session lookup

**No redundant token_hash index.**

---

## Authentication Flow

```
credentials
  → authenticateOwner()
  → PostgreSQL user lookup + scrypt verify
  → PostgreSQL grant resolution (1 active grant required)
  → generateSecureSessionId() — sess_ + 43 base64url
  → hashSessionToken() — SHA256 → 64 hex chars
  → sessionRepo.createSession({ userId, applicationId, tokenHash, expiresAt })
  → PostgreSQL generates UUID for id
  → return { session: { id: rawToken, ownerId, ownerEmail, ownerName, applicationId, role, permissions, expiresAt } }
```

---

## Session Validation Flow

```
raw Bearer token
  → validateSession(sessionId)
  → isValidTokenFormat() — sess_ prefix, 47 chars
  → hashSessionToken() — SHA256
  → sessionRepo.findSessionByTokenHash() — WHERE token_hash = hash AND status = 'active' AND expires_at > NOW()
  → returns { id, ownerId, applicationId, expiresAt, createdAt } or null
```

Then middleware calls:
```
getSessionOwner(sessionId)
  → validateSession()
  → identityService.getUserById(ownerId)
  → returns { id, email, name, applicationId }

authorizeRequest({ userId, applicationId })
  → PostgreSQL owner_application_grants revalidation
  → returns { authorized, grant: { role, permissions } }
```

**Authorization is NOT loaded from session state.** Every request revalidates against current grants.

---

## Authorization Boundary

```
Session validates identity (who is this owner)
Grant resolution validates authorization (what can this owner do)

These are SEPARATE operations.

Changes to grants are immediately effective on the next request.
Revoked grants cannot be hidden behind stale session permissions.
```

---

## Identity Loading Contract

`getSessionOwner()` loads identity from `users` table, NOT from the session row:

```javascript
// Session row: { id, user_id, application_id, token_hash, status, expires_at, created_at, revoked_at }
// NO email, NO name, NO role, NO permissions

// getSessionOwner():
const user = await identityService.getUserById(session.ownerId)
return { id: user.id, email: user.email, name: user.name, applicationId: session.applicationId }
// Role/permissions come from authorizeRequest() via owner_application_grants
```

---

## Password Change Revocation

`updateStagingOwnerIdentity()` atomically revokes all sessions:

```javascript
transaction(async (client) => {
  BEGIN
  → validate user/grant
  → hash new password
  → updateUserIdentity({ id, email, passwordHash, name }, client)
  → sessionRepo.revokeAllSessionsForUser(userId, client)
  COMMIT
  // If any step fails: ROLLBACK
})
```

All sessions for the user are revoked server-side before the transaction commits.

---

## Failure Semantics

| Condition | HTTP Status |
|-----------|-------------|
| Invalid token format | 401 Unauthorized |
| Unknown token | 401 Unauthorized |
| Expired token | 401 Unauthorized |
| Revoked token | 401 Unauthorized |
| PostgreSQL unavailable (session ops) | 503 Service Unavailable |
| PostgreSQL unavailable (authorization) | 503 Service Unavailable |
| Logout DB failure | 503 Service Unavailable |
| Session extend DB failure | 503 Service Unavailable |

**Infrastructure failures MUST NOT silently become 401.** OWNER-SESSION-2 is FAIL-CLOSED.

---

## Browser Session Continuity

### Root Cause

`owner-portal.html` originally used `let currentToken = null`. Token existed only in JavaScript page memory. F5/reload destroyed the variable, even though the PostgreSQL `owner_sessions` row remained active.

### Solution

```javascript
const OWNER_SESSION_TOKEN_KEY = 'turistic_owner_session_token'
let currentToken = sessionStorage.getItem(OWNER_SESSION_TOKEN_KEY) || null

// Login
currentToken = data.session.id
sessionStorage.setItem(OWNER_SESSION_TOKEN_KEY, currentToken)

// Page load
// → token restored from sessionStorage
// → GET /api/v1/owner/me with Bearer
// → 200 → dashboard, 401 → clear storage + showLogin

// Logout (success)
// → DELETE /api/v1/owner/logout
// → sessionStorage.removeItem()
// → currentToken = null
```

**Storage choice: sessionStorage (NOT localStorage)**
- Survives reload/navigation in same tab
- Cleared when tab or private browsing session closes
- Limits long-term browser exposure vs localStorage

**XSS note:** sessionStorage does NOT protect against XSS. XSS prevention is a separate browser/application security concern.

---

## Physical Staging Certification

### Migration 0007 Execution

```
Migration 0007 physically executed on Neon PostgreSQL staging.
Result: OWNER_SESSION_2_MIGRATION_0007_OK
```

### Schema Verification

```
users: PRESENT
owner_application_grants: PRESENT
owner_sessions: PRESENT

owner_sessions columns verified:
  id, user_id, application_id, token_hash, status, created_at, expires_at, revoked_at

Constraints verified:
  PRIMARY KEY (id) ✓
  FOREIGN KEY (user_id → users.id ON DELETE CASCADE) ✓
  UNIQUE (token_hash) ✓
  CHECK (status IN ('active', 'revoked')) ✓

Indexes verified:
  idx_owner_sessions_user_id ✓
  idx_owner_sessions_expires (partial, active) ✓
  UNIQUE token_hash provides its own index ✓

No last_seen_at, user_agent_hash, ip_hash, raw token column ✓
```

### Real Session Row Verification

```
SESSION_ID_UUID: YES
TOKEN_HASH_LENGTH: 64
STATUS: active
NOT_EXPIRED: true
APPLICATION_ID: valdi.app/albasie

Result: OWNER_SESSION_2_ROW_VERIFY_PASS
```

---

## Staging-Discovered UUID Defect

### Problem

Initial `authenticateOwner()` passed `id: rawToken` to `createSession()`. But `owner_sessions.id` is `UUID PRIMARY KEY DEFAULT gen_random_uuid()`. A `sess_...` string cannot be inserted into a UUID column.

### Discovery

Physical staging test failed on first session creation attempt.

### Correction

```javascript
// BEFORE (broken):
createSession({ id: rawToken, userId, applicationId, tokenHash, expiresAt })

// AFTER (fixed):
createSession({ userId, applicationId, tokenHash, expiresAt })

// PostgreSQL generates UUID internally.
```

```sql
-- BEFORE (broken):
INSERT INTO owner_sessions (id, user_id, ...) VALUES ($1, $2, ...) -- $1 = sess_...

-- AFTER (fixed):
INSERT INTO owner_sessions (user_id, application_id, token_hash, expires_at)
VALUES ($1, $2, $3, $4)
RETURNING *
-- PostgreSQL generates id via gen_random_uuid()
```

This defect demonstrates why physical staging certification was necessary.

---

## Runtime Restart Persistence Proof

After initial physical certification, subsequent tests demonstrated:

1. Browser holds raw Bearer token in sessionStorage
2. Passenger/Node worker restarts
3. New runtime process starts
4. Same Bearer token sent in Authorization header
5. PostgreSQL session lookup succeeds
6. Owner remains authenticated

**OWNER-SESSION-2 achieves multi-process session persistence.**

---

## Test Evidence

| Test Suite | Pass | Fail |
|------------|------|------|
| owner-session-1.test.js | 70 | 0 |
| owner-session-2.test.js | 72 | 0 |
| web/owner-1.test.js | 40 | 0 |
| web/owner-stage-1-1-wiring.test.js | 12 | 0 |
| web/owner-stage-2-e2e.test.js | 20 | 0 |
| **Total** | **214** | **0** |

---

## Security Properties

| Property | Status |
|----------|--------|
| Token generated with CSPRNG | YES — crypto.randomBytes(32) |
| 256-bit entropy | YES |
| Raw token returned to client once | YES |
| Raw token NEVER stored in PostgreSQL | YES |
| SHA256 hash stored server-side | YES |
| Token hash used for DB equality | YES — PostgreSQL performs comparison |
| Session id is PostgreSQL UUID | YES — internal, never exposed |
| Bearer token in Authorization header | YES |
| Infrastructure failures → 503 | YES |
| Invalid credentials → 401 | YES |
| Password change revokes all sessions | YES — atomic transaction |
| Authorization revalidated per request | YES — not from stale session |
| sessionStorage (not localStorage) | YES — tab-scoped, cleared on close |
| Raw token in console/logs | NO |
| Raw token in HTML/URL | NO |

---

## Files Created

| File | Purpose |
|------|---------|
| `database/migrations/0007_owner_sessions/index.js` | Session schema migration |
| `web/owner/repositories/owner-session.repository.js` | PostgreSQL session repository |
| `web/owner/token/owner-session-token.module.js` | CSPRNG token generation + SHA256 |
| `owner-session-2.test.js` | Session contract tests (72 tests) |
| `docs/owner/OWNER_SESSION_2_FINAL_REPORT.md` | This report |

---

## Files Modified

| File | Purpose |
|------|---------|
| `web/owner/owner.auth.js` | PostgreSQL session management, async validateSession/getSessionOwner |
| `web/owner/owner.middleware.js` | Async session validation, INFRASTRUCTURE_UNAVAILABLE propagation |
| `web/owner/owner.api.js` | Async logout/extend with 503 handling |
| `web/owner/services/owner-identity.service.js` | Password-change atomic session revocation |
| `web/owner-1.test.js` | Async validateSession calls (signature change from sync to async) |
| `web/owner/owner-portal.html` | sessionStorage persistence for reload continuity |

---

## Out-of-Scope Items

The following are NOT part of OWNER-SESSION-2:

- `last_seen_at` — future tracking concern
- `user_agent_hash` — future tracking concern
- `ip_hash` — future tracking concern
- Session count limit (10-session limit) — no product/security justification
- Redis session storage — PostgreSQL is sufficient
- HTTP-only cookie transport — Bearer token in Authorization header is acceptable
- Session refresh token rotation — not specified in requirements
- `last_seen_at` updates — not specified in requirements

---

## Remaining Boundaries

Per existing roadmap documentation:

- **OWNER-SESSION-3** — TBD (from existing roadmap documentation)
- Multi-tab session synchronization — browser tab A logout does not invalidate tab B sessionStorage
- Session monitoring/listing — no owner-facing "active sessions" UI

---

## Final Certification

**OWNER-SESSION-2 is COMPLETE.**

All deliverables delivered:
- Persistent PostgreSQL sessions via `owner_sessions`
- Secure hashed Bearer credentials (SHA256, CSPRNG)
- UUID/raw-token separation (PostgreSQL generates id, raw token to client)
- Session persistence across runtime/Passenger restarts
- Authorization preserved via per-request grant revalidation
- Password-change atomic session revocation
- Browser sessionStorage continuity (reload/navigation survival)
- HTTP 503 for infrastructure failures, 401 for auth failures
- Physical staging certification passed
- 214 tests passing, 0 failures

**Recommended commit message:**
```
feat(owner): complete OWNER-SESSION-2 persistent sessions
```

---

## References

- OWNER-SESSION-1 Final Report: `docs/owner/OWNER_SESSION_1_FINAL_REPORT.md`
- Migration 0007: `database/migrations/0007_owner_sessions/index.js`
- Session Repository: `web/owner/repositories/owner-session.repository.js`
- Token Module: `web/owner/token/owner-session-token.module.js`
- Auth Module: `web/owner/owner.auth.js`
- CHANGELOG: `docs/roadmap/CHANGELOG.md`
- CURRENT_STATE: `docs/ai/CURRENT_STATE.md`
- ROADMAP: `ROADMAP.md`
