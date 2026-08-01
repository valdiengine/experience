# JWT Provider

> P12.1.4 — First real authentication provider for Valdi Engine.
> Reference implementation for all future providers (OAuth, Auth0, Clerk, Firebase, Supabase, Keycloak).

## Architecture

```
Capabilities
    ↓
context.runtime.auth
    ↓
Authentication Runtime Integration (P12.1.3)
    ↓
Authentication Engine (P12.1.2)
    ↓
JwtProvider (P12.1.4)
    ↓
┌──────────────────────────────────────────────┐
│              JwtProvider                      │
│                                               │
│  ├── JwtAccessService    — Access tokens      │
│  ├── JwtRefreshService   — Refresh tokens     │
│  ├── SessionManager      — Session lifecycle  │
│  ├── JwtCookieService    — Cookie strategy    │
│  ├── JwtHeaderService    — Header strategy    │
│  ├── JwtClaimsMapper     — Claims mapping     │
│  ├── JwtKeyManager       — Key management     │
│  ├── DeviceManager       — Device trust       │
│  └── IdentityCache       — Identity caching   │
│                                               │
└──────────────────────────────────────────────┘
    ↓
jsonwebtoken / crypto
```

## Files

| File | Responsibility |
|------|---------------|
| `jwt.provider.js` | Main provider — implements AuthProviderRuntime. Entry point for all auth operations. |
| `jwt.access.service.js` | Short-lived access tokens (default 15 min). Sign, verify, decode, rotate, revoke. |
| `jwt.refresh.service.js` | Long-lived refresh tokens with token families, rotation, reuse detection. |
| `session.manager.js` | Session lifecycle: create, restore, extend, revoke, concurrent limits, idle timeout. |
| `jwt.cookie.service.js` | HttpOnly, Secure, SameSite, domain, tenant isolation, rotation. |
| `jwt.header.service.js` | Authorization Bearer, Api-Key, Tenant, Destination, Locale, Timezone, Correlation-Id. |
| `jwt.claims.mapper.js` | Identity → JWT claims and JWT claims → Identity. Roles, permissions, scopes, tenant. |
| `jwt.key.manager.js` | HS256, HS512, RS256, key rotation, multiple active keys, kid, JWKS. |
| `device.manager.js` | Device ID, fingerprint, trust score, remember device, offline trust. |
| `identity.cache.js` | In-memory cache for identity, permissions, roles, trust. TTL, max entries. |
| `jwt.events.js` | 12 events: login, logout, refresh, revoked, session, device, rotation, reuse. |
| `jwt.errors.js` | 10 error types: expired, signature, malformed, revoked, reuse, session, permission, device, configuration. |

## Integration

```js
// Register with AuthenticationEngine:
const jwtProvider = new JwtProvider({ algorithm: 'RS256' })
await jwtProvider.initialize()
authEngine.registerProvider('default', jwtProvider)

// Or via runtime integration:
authRuntimeIntegration.registerProvider('default', JwtProvider, { algorithm: 'HS256' })
```

## Flow

### Login
1. Credentials arrive at `context.runtime.auth.login(credentials)`
2. `AuthenticationEngine.login()` resolves 'default' provider
3. `JwtProvider.login()` creates session, issues refresh + access tokens
4. Returns identity, session, device, tokens, cookies

### Authenticate (every request)
1. Token arrives via `Authorization: Bearer <token>` or cookie
2. `JwtProvider.authenticate()` verifies signature, expiry, checks revocation
3. Returns verified identity + session context

### Refresh
1. Refresh token sent to `context.runtime.auth.refresh(token)`
2. JwtProvider verifies refresh token family, rotates old one
3. Detects reuse → revokes entire family
4. Issues new refresh + access pair

## Security Rules

1. Access tokens are stateless — no server-side storage
2. Refresh tokens use families with rotation — never reused
3. Reuse detection revokes the entire token family
4. Session limits enforce max concurrent sessions per identity
5. Device trust scores determine MFA or step-up requirements
6. Identity cache has configurable TTL and max entries
7. Cookies are HttpOnly, Secure, SameSite
8. Keys support rotation with multiple active keys
9. All operations emit events for audit
10. No capability ever reads, verifies, or decodes a JWT

## Limitations (P12.1.4)

- No real user database (credentials are passed through)
- No OAuth / social login
- No external key provider (JWKS endpoint local only)
- No persistent session storage (in-memory only)
- No encryption at rest for refresh tokens
- No rate limiting (handled by platform layer)
- No email verification
- No password reset flow
