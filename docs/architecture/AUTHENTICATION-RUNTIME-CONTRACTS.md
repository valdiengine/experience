# Authentication Runtime Contracts

> P12.1.1 — Authentication Runtime Contracts Layer.
> Immutable interfaces that every authentication provider must implement.
> Contracts only. No implementations. No JWT. No OAuth. No provider code.

---

## 1. Purpose

### Why This Layer Exists

The Identity Blueprint (P12.1.0) defined the domain. This layer defines the contracts.

Authentication is the most sensitive infrastructure in any platform. Every authentication provider — JWT, OAuth, Auth0, Clerk, Firebase, Supabase, Keycloak — has different APIs, different data models, different security properties.

Without a contracts layer, each provider would leak its specific API into capabilities. Changing providers would require changing capability code. Security boundaries would blur.

The Authentication Runtime Contracts define the immutable interface that every authentication provider must implement. Capabilities only know `context.runtime.auth.authenticate(...)`. They never know which provider is behind the contract.

### What This Layer Is

- Abstract contracts for every authentication concern
- Lifecycle management (initialize, shutdown, dispose, health, available)
- Feature detection via `supports(feature)`
- Provider independence guarantee

### What This Layer Is Not

- Not JWT implementation
- Not OAuth implementation
- Not a provider
- Not browser code (cookies, localStorage)
- Not database access
- Not business logic
- Not a security policy

---

## 2. Architecture Position

```
Capabilities
    ↓
context.runtime.auth
    ↓
┌──────────────────────────────────────────────────────────────┐
│            Authentication Runtime Contracts                   │
│                                                              │
│  AuthRuntime  SessionRuntime  TokenRuntime  IdentityRuntime  │
│  AuthorizationRuntime  PermissionRuntime  RoleRuntime        │
│  OAuthRuntime  OidcRuntime  ApiKeyRuntime  AnonymousRuntime  │
│  DeviceRuntime  MfaRuntime  TrustRuntime  AuditRuntime       │
│  AuthProviderRuntime                                          │
│                                                              │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────┴───────────────────────────────────┐
│                    Authentication Engine                       │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │ JWT Adapter  │  │OAuth Adapter│  │   Future Providers   │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬───────────┘  │
│         │                │                     │              │
└─────────┼────────────────┼─────────────────────┼──────────────┘
          │                │                     │
          ▼                ▼                     ▼
    Identity Provider  Social Provider    Auth0 / Clerk / Firebase
                                            Supabase / Keycloak
```

### Data Flow

```
Capability: context.runtime.auth.authenticate(token)
    ↓
AuthRuntime.authenticate(token)
    ↓
AuthenticationEngine.route('authenticate', token)
    ↓
JwtAdapter.authenticate(token)  or  OAuthAdapter.authenticate(token)
    ↓
Identity Provider (Auth0 / Firebase / Keycloak / Custom)
```

---

## 3. Runtime Hierarchy

```
BaseRuntimeContract (runtime/contracts/base.runtime.js)
    │
    ├── AuthRuntime              — Core authentication
    ├── SessionRuntime           — Session lifecycle
    ├── TokenRuntime             — Token management
    ├── IdentityRuntime          — Identity CRUD
    ├── AuthorizationRuntime     — Access control
    ├── PermissionRuntime        — Permission management
    ├── RoleRuntime              — Role management
    ├── OAuthRuntime             — OAuth 2.0 flows
    ├── OidcRuntime              — OpenID Connect
    ├── ApiKeyRuntime            — API key management
    ├── AnonymousRuntime         — Anonymous/guest identity
    ├── DeviceRuntime            — Device trust
    ├── MfaRuntime               — Multi-factor authentication
    ├── TrustRuntime             — Trust scoring
    ├── AuditRuntime             — Audit logging
    └── AuthProviderRuntime      — Provider interface
```

---

## 4. Interface Catalog

### AuthRuntime

Core authentication operations.

```js
authenticate(token)         // Validate token → session
logout(session)             // Destroy session
refresh(token)              // Refresh expired token
validate(session)           // Check session validity
revoke(session)             // Force session termination
currentIdentity()           // Get current authenticated identity
currentSession()            // Get current session context
```

### SessionRuntime

Session lifecycle management.

```js
createSession(identityId, options)    // Create new session
destroySession(sessionId)             // Terminate session
restoreSession(token)                 // Restore from persistent token
rotate(sessionId)                     // Rotate session credentials
extend(sessionId, ttl)                // Extend session TTL
list(identityId)                      // List active sessions
terminate(sessionId)                  // Force terminate session
```

### TokenRuntime

Token issuance and validation.

```js
issue(payload, options)     // Issue signed token
validate(token)             // Validate token signature + claims
refresh(token)              // Issue new token from refresh token
revoke(token)               // Revoke token (add to denylist)
decode(token)               // Decode without verification
verify(token, options)      // Verify with specific requirements
```

### IdentityRuntime

Identity data management.

```js
find(query)                 // Search identities
findById(identityId)        // Get by ID
findByEmail(email)          // Get by email
create(attributes)          // Create identity
update(identityId, attrs)   // Update attributes
delete(identityId)          // Soft delete
verify(identityId, method)  // Mark as verified
changeTrust(identityId, delta)  // Adjust trust level
```

### AuthorizationRuntime

Access control evaluation.

```js
authorize(identity, action, resource)      // Full authorization check
can(identity, action, resource)            // Boolean permission check
cannot(identity, action, resource)         // Inverse check
evaluatePolicy(identity, policy)           // Evaluate ABAC policy
evaluateScope(identity, scope)             // Evaluate OAuth scope
```

### PermissionRuntime

Permission assignment.

```js
grant(identityId, permission)    // Grant permission
revoke(identityId, permission)   // Revoke permission
list(identityId)                 // List granted permissions
has(identityId, permission)      // Check permission existence
```

### RoleRuntime

Role assignment and inheritance.

```js
assign(identityId, roleId)       // Assign role
remove(identityId, roleId)       // Remove role
list(identityId)                 // List assigned roles
inherit(roleId)                  // Resolve inherited permissions
```

### OAuthRuntime

OAuth 2.0 protocol flows.

```js
redirect(provider, options)      // Generate authorization redirect URL
callback(code, state, options)   // Handle OAuth callback
exchangeCode(code, options)      // Exchange auth code for tokens
refresh(token)                   // Refresh OAuth tokens
disconnect(provider, identityId) // Disconnect social login
```

### OidcRuntime

OpenID Connect protocol.

```js
discover(provider)               // Discover OIDC configuration
authorize(options)               // Generate OIDC authorization URL
userinfo(accessToken)            // Fetch userinfo endpoint
jwks()                           // Get JWKS keyset
logout(idTokenHint)              // RP-initiated logout
```

### ApiKeyRuntime

API key management.

```js
create(identityId, options)      // Create API key
rotate(keyId)                    // Rotate key secret
revoke(keyId)                    // Revoke key
validate(key)                    // Validate key
list(identityId)                 // List keys
```

### AnonymousRuntime

Anonymous/guest identity handling.

```js
createGuest(fingerprint)         // Create anonymous identity
upgrade(anonymousId, creds)      // Upgrade to registered identity
merge(anonymousId, identityId)   // Merge anonymous data
destroy(anonymousId)             // Remove anonymous identity
```

### DeviceRuntime

Device trust management.

```js
register(identityId, fingerprint)   // Register device
verify(deviceId, challenge)         // Verify device
trust(deviceId, level)              // Set trust level
revoke(deviceId)                    // Revoke device trust
list(identityId)                    // List trusted devices
```

### MfaRuntime

Multi-factor authentication.

```js
enable(identityId, method)       // Enable MFA method
disable(identityId, method)      // Disable MFA method
challenge(identityId, method)    // Generate challenge
verify(identityId, method, code) // Verify challenge response
backupCodes(identityId)          // Generate/view backup codes
```

### TrustRuntime

Trust scoring and evaluation.

```js
calculate(identityId)            // Calculate trust level
increase(identityId, amount, reason)  // Increase trust
decrease(identityId, amount, reason)  // Decrease trust
evaluate(identityId, minLevel)   // Evaluate against minimum
history(identityId)              // Get trust change history
```

### AuditRuntime

Authentication audit logging.

```js
record(event, data)              // Record audit event
query(filters)                   // Query audit log
export(options)                  // Export audit data
purge(before)                    // Purge old records
```

### AuthProviderRuntime

What every authentication provider must expose.

```js
login(credentials)           // Authenticate and return session
logout(session)              // End session
refresh(token)               // Refresh session
userinfo(accessToken)        // Get user profile
jwks()                       // Get public keys
health()                     // Provider health status
supports(feature)            // Feature detection
```

---

## 5. Lifecycle

Every contract inherits from `BaseRuntimeContract` which defines:

```js
async initialize()     // Initialize the contract/provider
async shutdown()       // Graceful shutdown
async dispose()        // Clean up resources
async health()         // Return health status
available()            // Boolean: is the service available?
supports(feature)      // Boolean: does it support this feature?
```

### Startup Order

```
1. AuthProviderRuntime     — Establish provider connection
2. IdentityRuntime         — Load identity store
3. TokenRuntime            — Initialize signing keys
4. SessionRuntime          — Prepare session store
5. AuthorizationRuntime    — Load policies
6. PermissionRuntime       — Load permission definitions
7. RoleRuntime             — Load role hierarchy
8. DeviceRuntime           — Initialize device store
9. TrustRuntime            — Load trust configuration
10. MfaRuntime              — Initialize MFA methods
11. OAuthRuntime            — Configure OAuth providers
12. OidcRuntime             — Discover OIDC providers
13. ApiKeyRuntime           — Prepare key store
14. AnonymousRuntime        — Configure anonymous policies
15. AuditRuntime            — Initialize audit log
16. AuthRuntime             — Core auth (depends on all)
```

### Shutdown Order

Reverse of startup order.

---

## 6. Health Model

```js
{
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline' | 'unknown',
  initialized: true,
  available: true,
  provider: 'auth0',
  timestamp: 1700000000000,
  checks: {
    identity: { status: 'healthy', latency: 5 },
    token: { status: 'healthy', latency: 3 },
    session: { status: 'degraded', latency: 200 },
  }
}
```

---

## 7. Capability Detection

Every contract implements `supports(feature)` for runtime feature detection.

```js
// Capability code — never checks provider directly
if (context.runtime.auth.supports('mfa')) {
  await context.runtime.auth.mfa.challenge(userId, 'totp')
}

if (context.runtime.auth.supports('oauth')) {
  const url = await context.runtime.auth.oauth.redirect('google')
}
```

---

## 8. Future Providers

| Provider | Protocol | Contract |
|----------|----------|----------|
| JWT | RS256/ES256 | TokenRuntime + AuthRuntime |
| Auth0 | OIDC | OidcRuntime + AuthProviderRuntime |
| Clerk | OIDC + Webhooks | OidcRuntime + AuthProviderRuntime |
| Firebase Auth | OIDC + Custom Tokens | OidcRuntime + AuthProviderRuntime |
| Supabase Auth | OIDC + RLS | OidcRuntime + AuthProviderRuntime |
| Keycloak | OIDC + SAML + LDAP | OidcRuntime + AuthProviderRuntime |
| Azure AD | OIDC + SAML | OidcRuntime + AuthProviderRuntime |
| Okta | OIDC + SAML + SCIM | OidcRuntime + AuthProviderRuntime |
| WorkOS | OIDC + Directory Sync | OidcRuntime + AuthProviderRuntime |
| Custom | Any | AuthProviderRuntime |

---

## 9. Future Adapters

| Adapter | Purpose |
|---------|---------|
| JwtAdapter | JWT-based authentication (self-contained tokens) |
| OAuthAdapter | OAuth 2.0 / OIDC social authentication |
| PasskeyAdapter | WebAuthn / FIDO2 passkey authentication |
| LdapAdapter | LDAP / Active Directory enterprise auth |
| SamlAdapter | SAML 2.0 enterprise SSO |
| BiometricAdapter | Platform biometric authentication |
| MagicLinkAdapter | Passwordless email magic link auth |
| SmsAdapter | SMS OTP authentication |
| TotpAdapter | TOTP-based MFA |

---

## 10. Architecture Rules (AC-001 through AC-012)

| Rule | Description |
|------|-------------|
| AC-001 | All authentication contracts must extend `BaseRuntimeContract` |
| AC-002 | Contracts must not import any vendor SDK, JWT library, or OAuth client |
| AC-003 | Contracts must not reference browser APIs (cookies, localStorage, navigator) |
| AC-004 | Contracts must not access databases directly — data flows through Repository Engine |
| AC-005 | Every method must return a value — never throw from the contract interface |
| AC-006 | Every contract must implement `supports(feature)` for capability detection |
| AC-007 | Every contract must implement `initialize()`, `shutdown()`, `dispose()`, `health()`, `available()` |
| AC-008 | Contracts must not contain business logic — only authentication domain operations |
| AC-009 | Contracts must be provider-independent — no provider names in method signatures |
| AC-010 | Contracts must be offline-first — return safe defaults when unavailable |
| AC-011 | Contracts must use the `RuntimeError` hierarchy for errors |
| AC-012 | Contracts must emit events through the EventBus for all auditable operations |

---

## 11. Validation Checklist

- [ ] All contracts extend BaseRuntimeContract
- [ ] All contracts implement initialize(), shutdown(), dispose(), health(), available()
- [ ] All contracts implement supports(feature)
- [ ] No vendor SDK imports in any contract
- [ ] No JWT library imports in any contract
- [ ] No OAuth client imports in any contract
- [ ] No browser API references
- [ ] No database access in contracts
- [ ] No business logic in contracts
- [ ] Methods return null/false defaults (no throws)
- [ ] Provider-independent method signatures
- [ ] Offline-first return values
- [ ] RuntimeError hierarchy used for errors
- [ ] Compatible with EventBus
- [ ] Compatible with Repository Engine
- [ ] Compatible with Platform Runtime
- [ ] Compatible with Identity Blueprint (P12.1.0)
- [ ] Compatible with multi-tenant model
- [ ] Compatible with offline-first requirement
- [ ] Zero vendor lock-in
