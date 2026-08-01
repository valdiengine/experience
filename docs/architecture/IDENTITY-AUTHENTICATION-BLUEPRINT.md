# Identity & Authentication Blueprint

> P12.1.0 — Complete Identity Domain and Authentication Architecture for Valdi Engine.
> Architecture only. No implementations. No vendor lock-in.

---

## 1. Purpose

### Why Identity Is Independent from Authentication

Identity and Authentication are distinct concerns that are often conflated. This blueprint separates them clearly.

| Concept | Definition |
|---------|------------|
| **Identity** | Who the entity is. Persistent. Unique. Independent of access method. |
| **Authentication** | How the entity proves it is who it claims to be. Temporal. Method-dependent. |
| **Authorization** | What the entity is allowed to do. Policy-driven. Context-dependent. |
| **Session** | A authenticated interaction context. Temporal. Revocable. |
| **Profile** | Public and private attributes of an identity. Editable. |
| **Role** | A named collection of permissions. Assignable. |
| **Permission** | A discrete action allowed on a resource. Atomic. |
| **Credential** | A secret used for authentication. Rotatable. Revocable. |
| **Token** | A signed assertion of authentication. Self-contained. Verifiable. |
| **Device** | A trusted endpoint associated with an identity. Trackable. |
| **Trust** | A measure of confidence in an identity or device. Dynamic. |

### Why This Blueprint Exists

Authentication is the most sensitive infrastructure in any platform. Every capability depends on identity — bookings, payments, community, ecology, governance, intelligence. Without a clear identity model, every new authentication provider leaks into capabilities, creates security holes, and prevents multi-tenant isolation.

This blueprint defines the identity domain **before** any provider is chosen, ensuring:

- Provider independence (JWT, OAuth, Firebase, Auth0, Keycloak all interchangeable)
- Multi-tenant isolation (Platform, Tenant, Destination, Business, Community)
- Offline-first authentication (tourism destinations have unreliable connectivity)
- Audit trail integrity (every identity event is recorded)
- Security boundaries (passwords, tokens, sessions, credentials all separated)

### What This Document Is

A complete architecture specification for identity, authentication, authorization, session management, and security. It defines entities, models, rules, and relationships.

### What This Document Is Not

- Not a JWT implementation guide
- Not a login screen design
- Not a provider comparison
- Not an OAuth specification
- Not a security audit
- Not a compliance document

---

## 2. Identity Domain Model

### Entity Catalog

#### PlatformIdentity
The platform itself. Represents Valdi Engine as an autonomous system.
- **ID:** `platform:{id}`
- **Type:** System
- **Scope:** Global
- **Trust:** Absolute
- **Can:** All system operations, create tenants, manage infrastructure

#### TenantIdentity
A SaaS tenant (business group, reseller, region).
- **ID:** `tenant:{tenantId}`
- **Type:** Organization
- **Scope:** Tenant boundary
- **Trust:** High
- **Can:** Manage own users, configurations, destinations

#### VisitorIdentity
An end-user exploring destinations, making bookings, contributing content.
- **ID:** `visitor:{visitorId}`
- **Type:** Person
- **Scope:** Multi-tenant (can visit multiple destinations)
- **Trust:** Low → Medium (escalates with verification)
- **Can:** Book experiences, create reviews, upload media, join community

#### BusinessIdentity
A business offering services inside a destination.
- **ID:** `business:{businessId}`
- **Type:** Organization
- **Scope:** Destination boundary
- **Trust:** Medium
- **Can:** Manage listings, reservations, availability, payments

#### StaffIdentity
Platform or tenant staff managing operations.
- **ID:** `staff:{staffId}`
- **Type:** Person
- **Scope:** Tenant or Platform
- **Trust:** High
- **Can:** Admin operations, user management, content moderation

#### MunicipalityIdentity
A government or municipal entity overseeing a destination.
- **ID:** `municipality:{id}`
- **Type:** Organization
- **Scope:** Jurisdiction boundary
- **Trust:** High
- **Can:** Governance operations, regulatory compliance, official content

#### ScientificIdentity
A researcher, biologist, or citizen scientist contributing data.
- **ID:** `scientific:{id}`
- **Type:** Person or Organization
- **Scope:** Ecology and conservation
- **Trust:** Medium (verified credentials)
- **Can:** Submit observations, access research data, participate in studies

#### DeveloperIdentity
An API consumer building on the platform.
- **ID:** `developer:{id}`
- **Type:** Person or Organization
- **Scope:** API access
- **Trust:** Medium
- **Can:** Access SDK, API keys, webhook management, app registration

#### SystemIdentity
Internal services and automated processes.
- **ID:** `system:{serviceName}`
- **Type:** Service
- **Scope:** System-wide
- **Trust:** High (verified via internal trust)
- **Can:** Inter-service communication, background jobs, scheduled tasks

#### AnonymousIdentity
An unauthenticated user. Temporary identity until registration.
- **ID:** `anonymous:{fingerprint}`
- **Type:** Unknown
- **Scope:** Session-only
- **Trust:** None
- **Can:** Browse public content, limited operations

#### DeviceIdentity
A trusted device associated with an identity.
- **ID:** `device:{deviceId}`
- **Type:** Hardware/Software
- **Scope:** Per-identity
- **Trust:** Medium (device fingerprint + trust score)
- **Can:** Offline login, push notifications, biometric authentication

### Supporting Entities

#### Credential
A secret or verification method bound to an identity.
```
{
  id: string,
  identityId: string,
  type: 'password' | 'totp' | 'passkey' | 'biometric' | 'oauth' | 'api-key',
  value: string (hashed/encrypted),
  metadata: object,
  rotatedAt: timestamp,
  expiresAt: timestamp | null,
  revokedAt: timestamp | null,
}
```

#### Session
An authenticated interaction context.
```
{
  id: string,
  identityId: string,
  deviceId: string | null,
  type: 'browser' | 'mobile' | 'api' | 'offline',
  status: 'active' | 'expired' | 'revoked' | 'suspended',
  issuedAt: timestamp,
  lastActivityAt: timestamp,
  expiresAt: timestamp,
  metadata: { ip, userAgent, location },
  trustLevel: number,
}
```

#### RefreshToken
A long-lived token used to obtain new access tokens.
```
{
  id: string,
  sessionId: string,
  value: string (hashed),
  family: string (rotation family),
  issuedAt: timestamp,
  expiresAt: timestamp,
  revokedAt: timestamp | null,
  rotationCount: number,
}
```

#### AccessToken
A short-lived token authorizing specific operations.
```
{
  id: string,
  sessionId: string,
  identityId: string,
  scope: string[],
  claims: object,
  issuedAt: timestamp,
  expiresAt: timestamp,
  notBefore: timestamp,
}
```

#### ApiKey
A static key for programmatic access.
```
{
  id: string,
  identityId: string,
  label: string,
  prefix: string (public identifier),
  value: string (hashed),
  scope: string[],
  expiresAt: timestamp | null,
  lastUsedAt: timestamp | null,
  revokedAt: timestamp | null,
}
```

#### Role
A named collection of permissions.
```
{
  id: string,
  name: string,
  scope: 'platform' | 'tenant' | 'destination' | 'business',
  parentRoleId: string | null (inheritance),
  permissions: string[],
  metadata: object,
}
```

#### Permission
A discrete action allowed on a resource.
```
{
  id: string,
  action: string (e.g., 'reservation:create'),
  resource: string (e.g., 'reservation:*'),
  conditions: object | null (ABAC conditions),
}
```

#### Group
A collection of identities with shared role assignments.
```
{
  id: string,
  name: string,
  scope: string,
  identityIds: string[],
  roleIds: string[],
}
```

#### IdentityProvider
An external authentication source.
```
{
  id: string,
  type: 'oauth2' | 'oidc' | 'saml' | 'ldap',
  provider: 'google' | 'apple' | 'github' | 'auth0' | 'keycloak',
  config: object,
  enabled: boolean,
}
```

#### TrustLevel
A numeric measure of identity confidence.
```
{
  identityId: string,
  level: 0-100,
  factors: string[] (verification methods completed),
  expiresAt: timestamp,
  updatedAt: timestamp,
}
```

### Entity Relationships

```
PlatformIdentity
  └── TenantIdentity (1:N)
       ├── VisitorIdentity (1:N)
       ├── BusinessIdentity (1:N)
       ├── StaffIdentity (1:N)
       └── MunicipalityIdentity (1:N)
VisitorIdentity
  ├── DeviceIdentity (1:N)
  ├── Credential (1:N)
  └── TrustLevel (1:1)
BusinessIdentity
  └── StaffIdentity (1:N)
Role
  └── Permission (M:N)
Identity
  ├── Session (1:N)
  ├── RefreshToken (1:N)
  └── ApiKey (1:N)
```

---

## 3. Authentication Model

### Supported Methods

#### Password
- Hashing: bcrypt (cost 12+) or argon2id
- Policy: min 8 chars, complexity optional (entropy-based)
- Rate limit: 5 attempts per minute per identity
- Lockout: 15 min after 10 consecutive failures
- Rotation: recommend every 90 days, enforce after breach
- Recovery: email OTP + security questions / backup codes

#### Magic Link
- Delivery: email
- Expiration: 15 minutes
- Single-use: consumed on first click
- Rate limit: 3 per hour per identity
- Security: signed token, verify email ownership

#### Email OTP
- Length: 6 digits
- Expiration: 5 minutes
- Rate limit: 3 per 10 minutes per identity
- Resend: 30 second cooldown
- Security: time-based, single-use, hashed storage

#### SMS OTP
- Length: 6 digits
- Expiration: 5 minutes
- Rate limit: 2 per 10 minutes per identity
- Security: same as email OTP + carrier verification
- Cost-aware: limited in high-cost regions

#### JWT
- Format: JSON Web Token (standard claims)
- Algorithm: RS256 or ES256 (asymmetric)
- Access token TTL: 15 minutes
- Refresh token TTL: 7 days (browser), 30 days (mobile with remember-me)
- Rotation: refresh token rotates on each use (family tracking)
- Revocation: blacklist on session revoke, short TTL minimizes window

#### OAuth2
- Grant types: authorization_code, client_credentials, refresh_token
- PKCE: required for public clients
- State: required for CSRF protection
- Redirect URI: strict allowlist
- Scope: granular, separated by capability

#### OpenID Connect
- Flow: authorization code flow + ID token
- Claims: standard OIDC claims + custom profile claims
- Userinfo endpoint: for additional identity data
- Logout: RP-initiated logout with ID token hint

#### API Key
- Format: `valdi_` + random prefix (8 chars) + secret (32 chars)
- Storage: bcrypt hash of full key
- Transport: `Authorization: Bearer <key>` or `X-API-Key: <key>`
- Scope: restricted to specific capabilities
- Rate limit: per key, configurable

#### Service Account
- Purpose: inter-service authentication
- Authentication: signed JWT with service private key
- Trust: internal CA or pre-shared trust
- Audit: all service-to-service calls logged

#### Anonymous
- Identity: generated fingerprint (browser + IP + device)
- Persistence: cookie/localStorage
- Capabilities: browse, search, public content
- Upgrade: merge into full identity on registration

#### Offline Login
- Token: signed offline token cached on device
- Trust: decays over time (full access 24h, limited 7d, requires re-auth after 30d)
- Security: device-bound, biometric required for high-risk operations
- Sync: revalidate on connectivity

#### Biometric
- Platform: WebAuthn/Passkeys (platform authenticator)
- Storage: public key stored, private key on device
- Security: hardware-backed (Secure Enclave, TPM)
- Fallback: password or PIN

#### Passkeys
- Standard: WebAuthn + FIDO2
- Sync: iCloud Keychain, Google Password Manager, 1Password
- Cross-device: QR-based cross-device authentication
- Recovery: platform fallback methods

### Future Support
- **SAML 2.0** — Enterprise SSO
- **LDAP / Active Directory** — Enterprise directory integration
- **Smart Cards** — Government/regulated environments
- **Hardware Tokens** — FIDO2 security keys (YubiKey)
- **Zero Trust Authentication** — Continuous verification
- **Step-up Authentication** — Elevate trust for sensitive operations

---

## 4. Authorization Model

### RBAC (Role-Based Access Control)

Roles are assigned to identities. Permissions are assigned to roles.

```
Identity → Role → Permission
```

#### Built-in Roles

| Role | Scope | Inherits |
|------|-------|----------|
| `platform:admin` | Global | — |
| `platform:operator` | Global | — |
| `tenant:admin` | Tenant | — |
| `tenant:operator` | Tenant | tenant:admin |
| `destination:admin` | Destination | — |
| `destination:guide` | Destination | — |
| `business:owner` | Business | — |
| `business:staff` | Business | business:owner |
| `visitor:premium` | Visitor | visitor:basic |
| `visitor:basic` | Visitor | — |
| `scientist:researcher` | Ecology | — |
| `scientist:citsci` | Ecology | — |

### ABAC (Attribute-Based Access Control)

When RBAC is insufficient, ABAC evaluates policies based on:

- **Subject attributes** — identity type, trust level, location
- **Resource attributes** — resource type, sensitivity, owner tenant
- **Environment attributes** — time, network, device trust
- **Action attributes** — operation type, data sensitivity

```
POLICY: Allow reservation:read IF
  subject.tenant = resource.tenant
  AND subject.trust >= 30
  AND environment.time BETWEEN 06:00 AND 22:00
```

### Scopes

Scopes define API-level access boundaries. Used by OAuth2 and API keys.

```
{
  scope: 'reservations:read',
  description: 'Read reservation data',
  risk: 'low',
}
```

Standard scopes by capability:
- `{capability}:read` — Read data
- `{capability}:write` — Create and update
- `{capability}:delete` — Remove data
- `{capability}:admin` — Administrative operations
- `{capability}:*` — All operations

### Claims

Claims are assertions included in tokens. They carry identity and authorization data.

```
{
  sub: 'visitor:v_abc123',
  tenant: 't_xyz789',
  roles: ['visitor:premium'],
  permissions: ['reservation:create', 'reservation:read', 'review:write'],
  trust: 65,
  scopes: ['reservations:read', 'reservations:write'],
}
```

### Permissions

Permissions are atomic. Format: `{domain}:{action}[:{field}]`.

| Action | Domain Examples |
|--------|----------------|
| `create` | reservation, review, media, observation, route |
| `read` | reservation, profile, analytics, audit |
| `update` | listing, profile, availability, pricing |
| `delete` | media, review, content |
| `manage` | users, roles, permissions, tenants |
| `approve` | content, payouts, registration |
| `export` | data, reports, analytics |

### Policies

Policies combine conditions with permissions.

```
{
  id: 'policy:business-hours',
  name: 'Business hours access',
  effect: 'deny',
  actions: ['reservation:create'],
  conditions: {
    all: [
      { fact: 'currentHour', operator: 'lessThan', value: 8 },
      { fact: 'currentHour', operator: 'greaterThan', value: 20 },
    ],
  },
}
```

### Inheritance

```
platform:admin
  └── tenant:admin (for each tenant)
       └── destination:admin (for each destination)
            └── business:owner (for each business)
```

Roles inherit permissions from parent roles. Inheritance is additive.

### Hierarchical Roles

```
Organization Hierarchy:
  Platform
  └── Tenant
       ├── Destination A
       │    ├── Business 1
       │    └── Business 2
       └── Destination B
            └── Business 3

Role Resolution:
  Staff assigned to Tenant inherits access to all Destinations and Businesses
  Staff assigned to Destination A inherits access to Business 1 and Business 2
```

### Delegation

An identity can delegate permissions to another identity temporarily.

```
{
  delegator: 'visitor:v_abc',
  delegate: 'visitor:v_def',
  permissions: ['reservation:create'],
  expiresAt: timestamp,
  reason: 'emergency',
}
```

### Temporary Permissions

Time-bound permission grants for specific operations.

```
{
  identityId: 'visitor:v_abc',
  permissions: ['admin:debug'],
  window: { start: timestamp, end: timestamp },
  maxUses: 3,
}
```

---

## 5. Multi-Tenant Identity

### Identity Belongs To

| Level | Owner | Examples |
|-------|-------|----------|
| **Platform** | Valdi Engine | System services, infrastructure |
| **Tenant** | SaaS customer | Tour operator, DMO, region |
| **Destination** | Territory | National park, city, province |
| **Business** | Service provider | Hotel, guide, restaurant |
| **Community** | User group | Hikers, bird watchers, photographers |

### Isolation Rules

1. Identities at one level cannot access resources at a sibling level without explicit cross-tenant grant
2. Identities inherit access downward (Tenant admin can access all Destinations under that Tenant)
3. Identities cannot inherit access upward (Destination user cannot access Tenant-level data)
4. Cross-tenant access requires explicit trust grant from both tenants
5. Platform-level identity can access all tenants (audit, support, emergency)

### Identity Resolution Order

```
1. PlatformIdentity — highest scope
2. TenantIdentity — scoped to tenant
3. DestinationIdentity — scoped to destination
4. BusinessIdentity — scoped to business
5. VisitorIdentity — scoped to individual
```

### Tenant Context Propagation

Every authenticated request carries tenant context:

```
Request → Auth Middleware → Resolve Identity → Resolve Tenant → Runtime Context
```

The tenant context is available throughout the request lifecycle:

```
context.tenant.id
context.tenant.type  // 'platform' | 'saas' | 'destination' | 'business'
context.tenant.config
context.identity.id
context.identity.type
context.identity.trustLevel
```

---

## 6. Session Model

### Session Types

#### Browser Session
- Storage: HTTP-only secure cookie (session ID) + in-memory token
- TTL: 24 hours (sliding expiration)
- Remember-me: 30 days (persistent cookie)
- Security: CSRF token, SameSite=Strict, Secure flag

#### Mobile Session
- Storage: Secure device storage (Keychain/Keystore)
- TTL: 7 days (refresh token), 15 minutes (access token)
- Remember-me: 30 days
- Security: Device binding, biometric gate

#### Offline Session
- Storage: Encrypted local storage
- TTL: Decays over offline period
- Security: Device-bound, trust decay
- Revalidation: On connectivity restore

#### API Session
- Storage: Stateless (JWT) or Stateful (session store)
- TTL: Per request (short-lived tokens)
- Security: API key + secret, HMAC signing

### Session Properties

#### Remember Me
- On: Extended session TTL (30 days), persistent refresh token
- Off: Session expires on browser close, no persistent storage
- Implementation: Different refresh token TTL + cookie `Max-Age`

#### Device Trust
- First login: Challenge (email OTP / SMS)
- Trusted device: Skip challenge for 30 days
- Trust token: Cryptographically bound to device fingerprint
- Revocation: Clear all trusted devices on password change

#### Session Rotation
- Refresh token rotates on each use
- Old refresh token is invalidated
- Family tracking detects token theft (if old token used after rotation, revoke entire family)

#### Session Expiration
| Session Type | Idle Timeout | Absolute Timeout |
|-------------|--------------|------------------|
| Browser | 24 hours | 7 days |
| Browser (remember-me) | 7 days | 30 days |
| Mobile | 7 days | 30 days |
| Mobile (remember-me) | 30 days | 90 days |
| Offline | 7 days (full) | 30 days (limited) |
| API | — | Per token TTL |

#### Concurrent Sessions
- Default: Unlimited per identity
- Limit: Configurable per tenant (e.g., max 5 sessions)
- Enforcement: Revoke oldest on limit exceeded
- Notification: Alert on new device login

#### Session Revocation
| Trigger | Action |
|---------|--------|
| User logout | Revoke current session |
| Password change | Revoke all sessions except current |
| Admin force logout | Revoke specific sessions |
| Security incident | Revoke all sessions for identity |
| Tenant suspension | Revoke all sessions for tenant |
| Device reported stolen | Revoke sessions on that device |

---

## 7. Offline Authentication

### Cached Credentials
- Storage: Encrypted on-device (AES-256-GCM)
- Data: Identity ID, token hash, trust level, device binding
- Protection: Device PIN/biometric required to access

### Offline Token
- Format: Signed JWT with limited claims
- Issuance: Issued when online, bound to device
- TTL: Configurable (default 7 days full, 30 days limited)

### Expiration
| Period | Trust Level | Allowed Operations |
|--------|-------------|-------------------|
| 0-24h | Full | All authorized operations |
| 1-7d | Medium | Read operations, cached writes |
| 7-30d | Low | Read-only cached data |
| 30d+ | None | Re-authentication required |

### Trust Decay
- Each offline day reduces trust score by 10 points (from 100)
- At trust < 50: require biometric for any write operation
- At trust < 20: read-only access to cached data
- At trust = 0: full re-authentication required

### Conflict Recovery
- Local changes queued during offline period
- On reconnection: push changes, detect conflicts
- Conflict resolution: last-write-wins with manual override option
- Conflicting changes preserved for user review

### Revalidation
- On connectivity restore: validate offline token against server
- If token valid: merge offline changes, sync trust level
- If token revoked: prompt re-authentication, preserve local data
- If token expired: attempt refresh, fall back to login

---

## 8. Security Model

### Password Hashing
- Algorithm: argon2id (preferred) or bcrypt (cost 12+)
- Salt: unique per credential (random 16+ bytes)
- Pepper: application-level secret (separate from database)
- Storage: `algorithm$salt$hash` format

### Encryption
- At rest: AES-256-GCM for sensitive data (credentials, tokens)
- In transit: TLS 1.3 minimum
- Key management: Cloud KMS / Vault / environment variables
- Key rotation: Automatic every 90 days, manual on compromise

### Secret Management
- Secrets never in code, config files, or environment dumps
- Storage: Vault / AWS Secrets Manager / Azure Key Vault / encrypted env
- Rotation: Automatic for service credentials, manual for vendor keys
- Access: Audit-logged, least-privilege IAM

### Replay Prevention
- Nonce: Single-use random value per request
- Timestamp: ±5 minute window for request validity
- JWT jti: Unique JWT ID prevents token replay
- OAuth state: Prevents CSRF on OAuth flows

### Brute Force Protection
- Per-identity: 5 attempts/minute, lockout 15 min at 10 failures
- Per-IP: 20 attempts/minute across all identities
- Per-endpoint: Configurable rate limits per route
- Exponential backoff: Delay increases with consecutive failures
- CAPTCHA: Triggered after 3 failed attempts from same IP

### Rate Limiting
- Global: 1000 requests/minute per API key
- Auth: 10 requests/minute per IP for login endpoints
- Registration: 3 registrations/hour per IP
- Password reset: 3 requests/hour per identity
- Token refresh: 10 requests/minute per session

### CSRF Protection
- Token: Double-submit cookie pattern
- SameSite: Strict for browser sessions
- Origin/Referer: Validate on sensitive endpoints
- Idempotency: GET requests are safe

### XSS Prevention
- Output encoding: Context-aware (HTML, JS, CSS, URL)
- CSP: Strict Content-Security-Policy headers
- HTTPOnly: Cookies inaccessible to JS
- Input sanitization: Server-side only (client is untrusted)

### Timing Attack Protection
- Constant-time comparison for all secrets (crypto.timingSafeEqual)
- Uniform error messages: Do not reveal which field is wrong
- Variable delay: Randomize response timing by ±50ms

### Refresh Token Rotation
- Rotation: New refresh token issued on each refresh
- Invalidation: Previous refresh token invalidated
- Family tracking: All tokens in same family tracked
- Theft detection: If rotated token is reused, revoke entire family

### Token Theft Mitigation
- Short access token TTL (15 minutes)
- Refresh token rotation with family tracking
- Device binding (token bound to device fingerprint)
- IP anomaly detection (new IP requires step-up auth)
- Notification on new device login

### Audit
Every authentication event is logged:

| Event | Data |
|-------|------|
| Login | identity, method, IP, device, timestamp, success |
| Logout | identity, session, timestamp |
| Failed login | identity (if known), IP, method, reason |
| Permission denied | identity, resource, action, reason |
| Role changed | identity, old role, new role, changed by |
| Credential updated | identity, credential type, timestamp |
| Device added | identity, device, method, IP |
| Session revoked | identity, session, reason, revoked by |
| Password reset | identity, method, IP, timestamp |
| Token refresh | identity, session, timestamp, success |

---

## 9. Identity Lifecycle

```
                    ┌──────────────┐
                    │  Anonymous   │
                    └──────┬───────┘
                           │ register
                           ▼
                    ┌──────────────┐
              ┌────►│  Registered  │◄────┐
              │     └──────┬───────┘     │
              │            │ verify      │
              │            ▼             │
              │     ┌──────────────┐     │
              │     │   Verified   │     │ recover
              │     └──────┬───────┘     │
              │            │ build trust │
              │            ▼             │
              │     ┌──────────────┐     │
              │     │   Trusted    │─────┘
              │     └──────┬───────┘
              │            │
              │     ┌──────┴───────┐
              │     │              │
              │     ▼              ▼
              │  ┌────────┐  ┌──────────┐
              │  │Suspended│  │ Disabled │
              │  └────┬───┘  └────┬─────┘
              │       │           │
              │       ▼           ▼
              │  ┌────────┐  ┌──────────┐
              │  │  Deleted│  │ Archived │
              │  └────────┘  └──────────┘
              │
              └── reactivate
```

### Lifecycle States

| State | Description | Auth allowed | Data accessible |
|-------|-------------|-------------|-----------------|
| **Anonymous** | No identity yet | Limited browse | Public only |
| **Registered** | Account created | Full auth | Owned data |
| **Verified** | Email/phone verified | Full auth | Owned + shared |
| **Trusted** | High trust score | Full auth + offline | All authorized |
| **Suspended** | Temporary restriction | Blocked | Read-only own data |
| **Disabled** | Account disabled | Blocked | None |
| **Deleted** | Account removed | Blocked | None (purge pending) |
| **Archived** | Long-term inactivity | Blocked | Restorable |
| **Recovery** | Password reset flow | Temp access | Owned data |

### State Transitions

| From | To | Trigger |
|------|----|---------|
| Anonymous | Registered | Registration |
| Registered | Verified | Email/phone verification |
| Verified | Trusted | Multiple factors, device trust, account age |
| Registered/Verified | Suspended | Policy violation, suspicious activity |
| Suspended | Registered/Verified | Appeal, timeout |
| Any | Disabled | Admin action, legal requirement |
| Disabled | Deleted | User request, purge policy |
| Disabled | Archived | Inactivity period exceeded |
| Archived | Registered | Reactivation |
| Trusted/Verified | Recovery | Password reset |

---

## 10. Audit

### Audit Events

| Event | Category | Data |
|-------|----------|------|
| `auth:login:success` | Authentication | identityId, method, IP, device, session |
| `auth:login:failed` | Authentication | identityId (if known), method, IP, reason |
| `auth:logout` | Authentication | identityId, sessionId |
| `auth:token:refresh` | Authentication | identityId, sessionId, tokenFamily |
| `auth:token:revoked` | Authentication | identityId, tokenId, reason |
| `auth:password:reset` | Authentication | identityId, method, IP |
| `auth:password:changed` | Authentication | identityId, changedBy |
| `auth:device:trusted` | Authentication | identityId, deviceId |
| `auth:device:revoked` | Authentication | identityId, deviceId |
| `auth:mfa:enrolled` | Authentication | identityId, method |
| `auth:mfa:challenged` | Authentication | identityId, method, success |
| `auth:session:created` | Session | identityId, sessionType, device |
| `auth:session:expired` | Session | identityId, sessionId |
| `auth:session:revoked` | Session | identityId, sessionId, revoker |
| `identity:created` | Identity | identityId, type, method |
| `identity:updated` | Identity | identityId, fields |
| `identity:deleted` | Identity | identityId, reason |
| `identity:suspended` | Identity | identityId, reason, by |
| `identity:reactivated` | Identity | identityId, by |
| `role:assigned` | Authorization | identityId, roleId, scope |
| `role:removed` | Authorization | identityId, roleId |
| `permission:granted` | Authorization | roleId, permission, conditions |
| `permission:denied` | Authorization | identityId, resource, action |
| `oauth2:authorized` | OAuth2 | clientId, scope, identityId |
| `oauth2:token:issued` | OAuth2 | clientId, grantType |
| `api:key:created` | API | identityId, keyPrefix |
| `api:key:revoked` | API | identityId, keyPrefix |
| `trust:level:changed` | Trust | identityId, oldLevel, newLevel, reason |

### Audit Storage
- Append-only log
- Tamper-evident (hash chain or cryptographic signing)
- Retention: 1 year active, 5 years archived
- Queryable by identityId, event type, time range

---

## 11. Future Providers

### Identity Standards
| Provider | Type | Protocol |
|----------|------|----------|
| JWT | Token | RS256/ES256 |
| Auth0 | Platform | OIDC + Management API |
| Clerk | Platform | OIDC + Webhooks |
| Firebase Auth | Platform | OIDC + Custom Tokens |
| Supabase Auth | Platform | OIDC + Row Level Security |
| Keycloak | Self-hosted | OIDC + SAML + LDAP |
| Azure AD | Enterprise | OIDC + SAML |
| Okta | Enterprise | OIDC + SAML + SCIM |
| WorkOS | Platform | OIDC + Directory Sync |

### Social Providers
| Provider | Protocol | Scopes |
|----------|----------|--------|
| Google | OIDC | profile, email, openid |
| Apple | OIDC | name, email (private relay) |
| GitHub | OAuth2 | user, email |
| Microsoft | OIDC | profile, email, openid |
| Facebook | OAuth2 | public_profile, email |

### Enterprise Providers
| Provider | Protocol | Use Case |
|----------|----------|----------|
| LDAP | Bind | Enterprise directory |
| Active Directory | LDAP + Kerberos | Windows enterprise |
| SAML 2.0 | SAML | Enterprise SSO |
| OpenID Connect | OIDC | Modern enterprise SSO |

### Custom Provider Interface
```
registerProvider({
  name: 'custom-oauth',
  type: 'oauth2',
  authorize: async (params) => { /* redirect to provider */ },
  callback: async (code) => { /* exchange code for tokens */ },
  refresh: async (refreshToken) => { /* refresh tokens */ },
  revoke: async (accessToken) => { /* revoke tokens */ },
  profile: async (accessToken) => { /* fetch user profile */ },
})
```

---

## 12. Architecture Rules (AUTH-001 through AUTH-015)

| Rule | Description |
|------|-------------|
| AUTH-001 | Capabilities must never authenticate directly. All authentication goes through `context.runtime.auth`. |
| AUTH-002 | Capabilities must never decode, verify, or inspect JWT tokens. Tokens are opaque to capabilities. |
| AUTH-003 | Capabilities must never read, write, or inspect cookies. Session management is the runtime's responsibility. |
| AUTH-004 | Identity is provider-independent. The identity domain model must not change when providers are swapped. |
| AUTH-005 | The provider owns the vendor SDK. No vendor SDK may be imported outside the auth infrastructure provider. |
| AUTH-006 | All authentication events must be audited. Audit is immutable and append-only. |
| AUTH-007 | Multi-tenant identity isolation must be enforced at the authorization level, not the authentication level. |
| AUTH-008 | Offline authentication must be supported by default. Every identity must function without connectivity. |
| AUTH-009 | Trust is dynamic and decays over time. Trust level must be reevaluated on each authentication. |
| AUTH-010 | Passwords must never be stored in plaintext. Only strong adaptive hashing (argon2id/bcrypt) is permitted. |
| AUTH-011 | Refresh tokens must rotate on each use. Old tokens must be invalidated. Token family theft detection required. |
| AUTH-012 | Sessions must support revocation at the identity, device, and session levels. |
| AUTH-013 | Authorization must support both RBAC and ABAC models. Scopes, claims, and policies must be composable. |
| AUTH-014 | Identity lifecycle states must be strictly enforced. Transitions must be audited. |
| AUTH-015 | The auth runtime contract must not change when new authentication methods are added. `supports(method)` enables feature detection. |

---

## 13. Validation Checklist

- [ ] Identity domain is defined independently of any authentication provider
- [ ] All identity entities are documented with attributes and relationships
- [ ] Authentication methods are listed with security properties
- [ ] Authorization model supports RBAC, ABAC, scopes, claims, and policies
- [ ] Multi-tenant identity isolation rules are defined
- [ ] Session types and lifecycle are specified
- [ ] Offline authentication with trust decay is designed
- [ ] Security model covers hashing, encryption, rate limiting, CSRF, XSS, replay, timing
- [ ] Token theft detection via rotation families
- [ ] Identity lifecycle states and transitions are documented
- [ ] Audit events cover all authentication and authorization operations
- [ ] Future providers can be integrated without architecture changes
- [ ] Architecture rules (AUTH-001 to AUTH-015) are immutable
- [ ] Compatible with Platform Runtime (routes through `context.runtime.auth`)
- [ ] Compatible with Repository Engine (identity entities stored via persistence layer)
- [ ] Compatible with EventBus (audit events emitted through event system)
- [ ] Compatible with multi-tenant model
- [ ] Compatible with offline-first requirement
- [ ] Compatible with AI identity types (ScientificIdentity, SystemIdentity)
- [ ] Compatible with SaaS identity types (TenantIdentity, BusinessIdentity)
- [ ] Zero vendor lock-in
- [ ] No implementation decisions made (no JWT, no OAuth, no library choices)
