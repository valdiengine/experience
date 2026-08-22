# OWNER-SESSION-1 — FINAL REPORT

> **Milestone:** Persistent Owner Identity with PostgreSQL
> **Status:** COMPLETE — PHYSICAL CERTIFICATION VERIFIED
> **Date:** 2026-08-22
> **Environment:** Staging (Neon PostgreSQL, sa-east-1)

---

## Executive Summary

OWNER-SESSION-1 established persistent PostgreSQL-backed Owner identity and application grant storage, replacing the legacy in-memory STAGING_OWNER_* runtime variables. The physical staging environment was provisioned, certified, and the runtime was cut over without service interruption.

**Key boundary:** Authenticated Owner sessions remain in-process/in-memory. This is the primary scope for OWNER-SESSION-2 (Persistent Sessions).

---

## Architecture

### What is Persistent (PostgreSQL/Neon)

| Entity | Storage | Verified |
|--------|---------|----------|
| Owner identity (email, name, status) | `public.users` | Yes |
| Password hash (scrypt N=32768, r=8, p=1) | `public.users.password_hash` | Yes |
| Application grants | `public.owner_application_grants` | Yes |

### What is Still In-Memory

| Entity | Storage | Scope |
|--------|---------|-------|
| Authenticated Owner sessions | Process heap | Per Passenger worker |
| Session tokens | In-memory Map | Per Passenger worker |

---

## Physical Certification Evidence

### Database Infrastructure

| Check | Result | Evidence |
|-------|--------|----------|
| Neon PostgreSQL connectivity | VERIFIED | Staging resolved `ep-xxx-123456.sa-east-1.aws.neon.tech:5432` |
| Migration 0006 executed | VERIFIED | `0006_owner_identity_grants` applied |
| `users` table created | VERIFIED | Schema matches identity domain contract |
| `owner_application_grants` table created | VERIFIED | Schema supports role-based application access |
| Persistent Owner identity created | VERIFIED | `rodrigomedina@valdi.app` / `Rodrik` |
| Persistent application grant created | VERIFIED | `valdi.app/albasie` with `owner` role |

### Runtime Cutover

| Check | Result | Evidence |
|-------|--------|----------|
| Legacy STAGING_OWNER_* removed | VERIFIED | Spawned worker shows NOT_SET for all four |
| TURISTIC_ENV=staging verified | VERIFIED | New worker has SET for all PostgreSQL vars |
| PostgreSQL env vars verified SET | VERIFIED | HOST, PORT, DB, USER, PASSWORD all SET |
| DATABASE_SSL verified SET | VERIFIED | New worker confirms SET |
| Passenger worker respawned | VERIFIED | New worker inspected post-restart |
| Startup no crash | VERIFIED | stderr size: 36549 before, 36549 after |

### Functional Certification

| Check | Result | Evidence |
|-------|--------|----------|
| Physical /owner login | VERIFIED | Login succeeded with PostgreSQL identity |
| Mi Negocio loaded | VERIFIED | Business portal functional |
| Contenido loaded | VERIFIED | Content management functional |
| Albasie filesystem persistence | VERIFIED | Existing data intact |

---

## HTTP Boundary Incident & Fix

### Incident

During physical certification, navigating to `Contenido` triggered:

```
Error: Invalid status code: draft
```

`draft` is a domain status, not an HTTP status code. The `sendJson` method was passing domain status codes directly to `res.status()` without validation.

### Fix Applied

**File:** `web/owner/owner.api.js`

```javascript
function isValidHttpStatus(code) {
  return typeof code === 'number' && code >= 100 && code <= 599;
}

function sendJson(res, statusCode, data) {
  const safeStatus = isValidHttpStatus(statusCode) ? statusCode : 500;
  // ... safeStatus used for res.status(safeStatus)
}
```

### Verification

| Check | Result |
|-------|--------|
| Fix deployed | Yes |
| Passenger restarted | Yes |
| Navigation flow reproduced | Yes |
| stderr size unchanged (36549) | VERIFIED — No new crash logged |
| Regression test | PASS |

---

## Implementation Files

| File | SHA256 | Purpose |
|------|--------|---------|
| `web/owner/owner.api.js` | `CE4A870071633626518E1C906C0FAEF63A1B3C238C521F41D7E12E3795BE6180` | HTTP boundary, sendJson hardening |
| `web/web.server.js` | `B4C17F202551F23CE8A5A2F4E23F6C4CA7880AA18CAFAE50FE43820F9275D204` | Bootstrap removal |
| `web/owner/owner.auth.js` | `CEB7E94ADF16521947E90E619CD3EE5B41D1E2706A3F897E72A5D9D997B02236` | PostgreSQL authenticateOwner |
| `web/owner/owner.middleware.js` | `EB00267BA11290DDFC2F099830C932828691FDD8ED020674480C9FC3E3F4363F` | Auth/authz separation |
| `web/owner/services/owner-authorization.service.js` | `A202E279E07F8C64F74484C5DBDDD7DD29FE58E458964A3E23F5623163E31902` | Grant-based authorization |

### Bootstrap CLIs

| File | Purpose | Env Guard |
|------|---------|-----------|
| `web/owner/bootstrap/owner-staging-bootstrap.js` | Initial owner provisioning | TURISTIC_ENV=staging |
| `web/owner/bootstrap/owner-staging-update.js` | Identity update | TURISTIC_ENV=staging |

---

## Security Contract

### Authentication
- Password hash: Node crypto.scrypt (N=32768, r=8, p=1, keyLength=64)
- No Argon2 (GLIBC 2.28 incompatibility on CloudLinux)
- Authentication: `authenticateOwner(email, password)` → Owner record or null

### Authorization
- Grant-based: `owner_application_grants` table
- Roles: `owner`, `admin`
- Application isolation: Owners can only access their granted applications

### Auth/AuthZ Separation
- Authentication failure: `req.authorizationError` set, 401 returned
- Authorization failure: `req.authorizationError` set, 403 returned
- `req.owner` preserved on authorization failure for downstream error handling

---

## Environment Configuration

### Neon PostgreSQL (Staging)

```
POSTGRES_HOST=ep-xxx-123456.sa-east-1.aws.neon.tech
POSTGRES_PORT=5432
POSTGRES_DB=stagingdb
POSTGRES_USER=staginguser
POSTGRES_PASSWORD=<secret>
DATABASE_SSL=true
```

### TURISTIC_ENV=staging

Controls PostgreSQL configuration loading. When set, environment loader requires explicit PostgreSQL env vars without fallbacks.

### NODE_ENV (Historical)

- Runtime components still use NODE_ENV
- environment.loader.js searches .env files by NODE_ENV
- Historical stderr: `[Environment] No .env files found for environment: production`
- **Not changed** — this is technical debt for OWNER-SESSION-3

---

## Test Evidence

| Suite | Passed | Failed |
|-------|--------|--------|
| `owner-session-1.test.js` | 70 | 0 |
| `owner-stage-2-e2e.test.js` | 20 | 0 |
| `owner-stage-1-1-wiring.test.js` | 12 | 0 |
| **Total** | **102** | **0** |

---

## Technical Debt

| Item | Description | Owner |
|------|-------------|-------|
| Sessions in-memory | Authenticated sessions survive only within single Passenger worker | OWNER-SESSION-2 |
| NODE_ENV / TURISTIC_ENV split | Dual environment variable systems; .env search behavior inconsistent | OWNER-SESSION-3 |
| GLIBC 2.28 | Prevents Argon2; scrypt is fallback | Future (kernel update) |

---

## Non-Goals (Out of Scope)

- Session persistence (OWNER-SESSION-2)
- Production database migration (staging only)
- Neon execution from developer machines ( Passenger/production only)
- Bootstrap via Passenger startup (explicit CLI only)

---

## Rollback Reference

To revert OWNER-SESSION-1 runtime changes:

1. Remove TURISTIC_ENV from Passenger environment
2. Restore STAGING_OWNER_EMAIL, STAGING_OWNER_PASSWORD, STAGING_OWNER_NAME, STAGING_OWNER_APPLICATION_ID
3. Restart Passenger workers
4. Identity data in Neon remains — can be re-provisioned via `owner-staging-bootstrap.js`

---

## OWNER-SESSION-2 Handoff

**Primary boundary for OWNER-SESSION-2:**

PostgreSQL now owns:
- Owner identity ✓
- Password hash ✓
- Application grants ✓

Still in-process/in-memory:
- Authenticated sessions
- Session tokens

**OWNER-SESSION-2 objective:** Persistent sessions via PostgreSQL session storage, surviving Passenger worker restarts and supporting multi-process/multi-worker deployments.

---

## Documentation Traceability

| Document | Status |
|----------|--------|
| `docs/owner/OWNER_SESSION_1_FINAL_REPORT.md` | This file |
| `docs/ai/CURRENT_STATE.md` | Updated with OWNER-SESSION-1 completion |
| `docs/roadmap/CHANGELOG.md` | Entry added |
| `ROADMAP.md` | OWNER-SESSION status updated |
| Git history | Does not yet reflect OWNER-SESSION-1 commits |

**Note:** Git history having only 10 commits is a valid observation. Repository history does not currently provide a complete commit-by-commit record of OWNER-SESSION-1. This documentation closeout is the authoritative record for this milestone.
