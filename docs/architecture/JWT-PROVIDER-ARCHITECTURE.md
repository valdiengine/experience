# JWT Provider Architecture

> P12.1.4 — First real authentication provider for Valdi Engine.
> Reference implementation for all future providers.

---

## 1. Purpose

Implement the first concrete authentication provider using JWT. This is the reference implementation that every future provider (OAuth, Auth0, Clerk, Firebase, Supabase, Keycloak) must follow. Capabilities remain completely agnostic — they continue using `context.runtime.auth` without knowing JWT exists.

---

## 2. Layer Position

```
Capabilities
    ↓
context.runtime.auth.login(credentials)
context.runtime.auth.authenticate(token)
context.runtime.auth.can(identity, action, resource)
    ↓
┌───────────────────────────────────────────────────────────┐
│           Authentication Runtime Integration (P12.1.3)    │
│           AuthRuntimeContext → delegates to engine         │
└──────────────────────┬────────────────────────────────────┘
                       │
┌──────────────────────┴────────────────────────────────────┐
│              Authentication Engine (P12.1.2)               │
│              resolves 'default' provider                   │
└──────────────────────┬────────────────────────────────────┘
                       │
┌──────────────────────┴────────────────────────────────────┐
│                    JwtProvider (P12.1.4)                   │
│                                                           │
│  login()  logout()  refresh()  authenticate()             │
│  userinfo()  jwks()  health()  supports()                 │
│                                                           │
│  ┌────────────────────────────────────────────────────┐   │
│  │  JwtAccessService     — sign/verify/rotate access   │   │
│  │  JwtRefreshService    — families/rotation/reuse     │   │
│  │  SessionManager       — create/restore/revoke       │   │
│  │  JwtCookieService     — HttpOnly/Secure/SameSite    │   │
│  │  JwtHeaderService     — Bearer/Api-Key/Tenant       │   │
│  │  JwtClaimsMapper      — Identity ⇄ Claims           │   │
│  │  JwtKeyManager        — HS256/RS256/rotation        │   │
│  │  DeviceManager        — fingerprint/trust/offline   │   │
│  │  IdentityCache        — in-memory TTL cache         │   │
│  └────────────────────────────────────────────────────┘   │
└──────────────────────┬────────────────────────────────────┘
                       │
┌──────────────────────┴────────────────────────────────────┐
│  jsonwebtoken  │  crypto  │  HTTP Cookies / Headers       │
└───────────────────────────────────────────────────────────┘
```

---

## 3. Directory Structure

```
runtime/auth/providers/jwt/
├── jwt.provider.js          # Main provider (AuthProviderRuntime impl)
├── jwt.access.service.js    # Access token (short-lived, stateless)
├── jwt.refresh.service.js   # Refresh token (families, rotation, reuse)
├── session.manager.js       # Session lifecycle
├── jwt.cookie.service.js    # Cookie strategy (HttpOnly, Secure, SameSite)
├── jwt.header.service.js    # Header strategy (Bearer, Api-Key, Tenant)
├── jwt.claims.mapper.js     # Identity ↔ JWT claims mapping
├── jwt.key.manager.js       # Key management (HS256, HS512, RS256)
├── device.manager.js        # Device fingerprint, trust, offline
├── identity.cache.js        # In-memory identity cache
├── jwt.events.js            # 12 events
├── jwt.errors.js            # 10 error types
└── README.md                # Documentation
```

---

## 4. Authentication Flow

### Login

```
Capability: context.runtime.auth.login({ identityId, permissions, roles, deviceFingerprint, ip, userAgent })

1. JwtProvider.login()
2. DeviceManager.register()      → device (known/new)
3. SessionManager.create()       → session
4. JwtRefreshService.issue()     → refresh token (family-based)
5. JwtAccessService.issue()      → access token (stateless JWT)
6. IdentityCache.set()           → cache identity, permissions, roles
7. JwtCookieService.createXxx()  → cookie headers
8. Emit: JWT_LOGIN, JWT_SESSION_CREATED, JWT_DEVICE_TRUSTED
9. Return: { identity, session, device, permissions, roles, trust, tenant, tokens, cookies }
```

### Authenticate (per-request)

```
Capability: N/A (platform interceptor)

1. Extract token from: Authorization header or Cookie
2. JwtProvider.authenticate(token)
3. JwtAccessService.verify(token)
   a. Check revocation set
   b. Verify signature via JwtKeyManager
   c. Check expiry
   d. Decode → claims
4. JwtClaimsMapper.toIdentity(claims) → identity + session + device
5. Return: { authenticated: true, identity, session, device }
```

### Refresh

```
Capability: context.runtime.auth.refresh(refreshToken)

1. JwtProvider.refresh(refreshToken)
2. JwtRefreshService.verify(refreshToken)
   a. Hash token, find in family
   b. Check revoked/rotated/expired
   c. If reused → revoke entire family → throw JwtReuseDetectedError
3. JwtRefreshService.rotate() → new refresh token (old marked rotated)
4. SessionManager.restore() + extend()
5. JwtAccessService.issue()  → new access token
6. Emit: JWT_TOKEN_ROTATED, JWT_REFRESH
7. Return: { identity, session, tokens, cookies }
```

---

## 5. Access Tokens

| Property | Value |
|----------|-------|
| Format | JWT (JSON Web Token) |
| Default TTL | 900 seconds (15 minutes) |
| Storage | Stateless (no server-side storage) |
| Revocation | In-memory set (capped at 10,000 entries) |
| Algorithm | Configurable: HS256, HS512, RS256 |
| Signed by | JwtKeyManager (active key, identified by `kid`) |

### Claims

```json
{
  "sub": "identity:{id}",
  "iss": "valdi-engine",
  "aud": "valdi-platform",
  "iat": 1719000000,
  "exp": 1719000900,
  "jti": "a1b2c3d4e5f6g7h8i9j0k1l2",
  "kid": "key-1",
  "email": "user@example.com",
  "name": "User Name",
  "tid": "tenant-123",
  "ten": "My Destination",
  "dst": "dest-456",
  "sid": "session-789",
  "did": "device-012",
  "roles": ["visitor:premium"],
  "permissions": ["reservation:create", "review:write"],
  "trl": 65,
  "amr": ["password"],
  "locale": "es-CL"
}
```

---

## 6. Refresh Tokens

| Property | Value |
|----------|-------|
| Format | Opaque (random bytes, base64url) |
| Default TTL | 604800 seconds (7 days) |
| Storage | In-memory (hashed) |
| Rotation | Every refresh — old token marked as rotated |
| Reuse Detection | If rotated token is reused → revoke entire family |
| Families | Group of refresh tokens per identity+device |

### Token Family Model

```
Family: {familyId}
  ├── Token 1 (active)
  ├── Token 2 (active) — after rotation of Token 1
  └── Token 3 (active) — after rotation of Token 2

If Token 1 is reused after rotation:
  → Entire family revoked
  → User must re-authenticate
```

---

## 7. Session Model

| Property | Value |
|----------|-------|
| ID | Random hex (32 bytes) |
| Storage | In-memory |
| Status | active, expired, revoked |
| Default Timeout | 1800 seconds (30 min) |
| Idle Timeout | 900 seconds (15 min) |
| Remember Me TTL | 2592000 seconds (30 days) |
| Max Concurrent | 10 per identity (configurable) |

### Lifecycle

```
create() → active
    ↓
restore() → touch lastActivity
    ↓
extend() → push expiresAt
    ↓
touch() → check idle timeout → active or expired
    ↓
revoke() → revoked
    ↓
cleanup() → remove expired/revoked
```

---

## 8. Cookie Strategy

| Property | Access Token | Refresh Token |
|----------|-------------|---------------|
| Name | `valdi_token` | `valdi_refresh` |
| HttpOnly | ✅ | ✅ |
| Secure | ✅ | ✅ |
| SameSite | `lax` | `strict` |
| Path | `/` | `/auth/refresh` |
| Max-Age | 900s | 604800s |

### Tenant Isolation

Cookies can be scoped to a tenant subdomain via config:

```js
{ domain: '.destination.valdi.app' }  // subdomain support
{ domain: 'tenant-123.valdi.app' }    // tenant-specific
```

---

## 9. Header Strategy

| Header | Example | Purpose |
|--------|---------|---------|
| `Authorization: Bearer <token>` | `Bearer eyJ...` | Primary auth |
| `X-Api-Key` | `api_key_abc123` | API key auth |
| `X-Tenant-Id` | `tenant-123` | Tenant resolution |
| `X-Destination-Id` | `dest-456` | Destination resolution |
| `X-Locale` | `es-CL` | Locale preference |
| `X-Timezone` | `America/Santiago` | Timezone |
| `X-Correlation-Id` | `req_abc123` | Request tracing |

---

## 10. Claims Model

### Identity → JWT Claims

```
Identity {
  id, email, name,
  tenant: { id, name },
  destination: { id },
  roles: [],
  permissions: [],
  scopes: [],
  locale,
  trustLevel,
  authMethod
}
    ↓ JwtClaimsMapper.toClaims(identity, options)
JWT Claims {
  sub, iss, aud, iat, exp, jti,
  email, name,
  tid, ten, dst,
  sid, did,
  roles, permissions, scopes,
  trl, amr, locale
}
```

### JWT Claims → Identity

```
JWT Claims { sub, email, name, tid, ten, dst, sid, did, roles, permissions, trl, amr }
    ↓ JwtClaimsMapper.toIdentity(claims)
{
  identity: { id, email, name, tenant, destination, roles, permissions, trustLevel, authMethod },
  session: { id },
  device: { id },
  jti, issuedAt, expiresAt
}
```

---

## 11. Key Management

| Algorithm | Type | Use |
|-----------|------|-----|
| HS256 | Symmetric | Default — single secret |
| HS512 | Symmetric | Higher security |
| RS256 | Asymmetric | Production — public/private key pair |

### Rotation

```js
keyManager.rotate()
// → new key generated, added as active
// → old key remains active for verification until expiry
// → next rotation marks oldest as inactive
```

### JWKS

```js
provider.jwks()
// → { keys: [{ kid, alg, kty, n, e, use }] }
// → Future: expose via /.well-known/jwks.json
```

### Active Keys

- Max 3 concurrent active keys (configurable)
- Oldest key deactivated on rotation when limit reached
- Each key has a unique `kid` (Key ID) in JWT header

---

## 12. Device Trust

| Concept | Implementation |
|---------|---------------|
| Device ID | Random hex (16 bytes) |
| Fingerprint | SHA-256 hash of browser/device fingerprint |
| Trust Score | 0–100 (configured externally) |
| Trusted Threshold | Score >= 70 |
| Trust Expiry | 30 days (configurable) |
| Known Device | Previously seen fingerprint+identity |
| Unknown Device | First-time fingerprint for this identity |
| Offline Trust | Marked device trusted even when offline |

### Flow

```
1. Login with fingerprint
2. DeviceManager.register(identityId, fingerprint)
   → If known: update lastSeen
   → If new: create device, emit JWT_DEVICE_TRUSTED
3. Subsequent requests include deviceId
4. DeviceManager.verify(deviceId) checks trust
5. Low trust → step-up auth (MFA) — future
```

---

## 13. Security Rules

| Rule | Description |
|------|-------------|
| JWT-SEC-001 | Access tokens are never stored server-side |
| JWT-SEC-002 | Refresh tokens are hashed (SHA-256) before storage |
| JWT-SEC-003 | Refresh tokens are never reused — rotation on every refresh |
| JWT-SEC-004 | Reuse detection revokes the entire token family |
| JWT-SEC-005 | Session idle timeout = 15 min (configurable) |
| JWT-SEC-006 | Max 10 concurrent sessions per identity |
| JWT-SEC-007 | Cookies are always HttpOnly + Secure + SameSite |
| JWT-SEC-008 | Tenant isolation via cookie domain scoping |
| JWT-SEC-009 | Key rotation supports multiple active keys |
| JWT-SEC-010 | All auth operations emit audit events |
| JWT-SEC-011 | Identity cache has bounded size (10K entries) with TTL |
| JWT-SEC-012 | JWT is never imported outside `runtime/auth/providers/jwt/` |

---

## 14. Future Evolution

| Feature | Phase |
|---------|-------|
| Persistent session storage (database) | P12.1.5 |
| Real user database / identity store | P12.1.5 |
| OAuth 2.0 / OIDC provider | P12.2 |
| Auth0 integration | P12.2 |
| Clerk integration | P12.2 |
| Firebase Auth integration | P12.2 |
| Supabase Auth integration | P12.2 |
| Keycloak integration | P12.2 |
| JWKS endpoint (`/.well-known/jwks.json`) | P12.3 |
| External key provider (AWS KMS, Vault) | P12.3 |
| Encryption at rest for refresh tokens | P12.3 |
| Rate limiting per identity | P12.4 |
| Email verification flow | P12.4 |
| Password reset flow | P12.4 |

---

## 15. Validation Checklist

- [ ] `JwtProvider` implements all AuthProviderRuntime methods: login, logout, refresh, userinfo, jwks, health, supports
- [ ] `JwtProvider` never imports business logic
- [ ] `JwtProvider` never imports UI code
- [ ] `JwtAccessService` signs and verifies tokens via `jsonwebtoken`
- [ ] `JwtRefreshService` implements token families with rotation
- [ ] `JwtRefreshService` detects reuse and revokes entire family
- [ ] `SessionManager` enforces max concurrent sessions
- [ ] `SessionManager` enforces idle timeout
- [ ] `JwtCookieService` generates HttpOnly + Secure + SameSite cookies
- [ ] `JwtHeaderService` extracts Bearer token, Api-Key, Tenant, Destination, Locale
- [ ] `JwtClaimsMapper` maps Identity → JWT claims and back
- [ ] `JwtKeyManager` supports HS256, HS512, RS256
- [ ] `JwtKeyManager` supports key rotation with `kid`
- [ ] `DeviceManager` supports fingerprint, trust, offline trust
- [ ] `IdentityCache` has TTL and max entries
- [ ] All errors extend `JwtError` hierarchy (10 types)
- [ ] All events follow `jwt:*` naming (12 events)
- [ ] No capability imports JWT — always uses `context.runtime.auth`
- [ ] Compatible with Authentication Engine (P12.1.2)
- [ ] Compatible with Runtime Integration (P12.1.3)
- [ ] Compatible with Platform Runtime (P12.0.5.1)
- [ ] Capabilities require zero changes
