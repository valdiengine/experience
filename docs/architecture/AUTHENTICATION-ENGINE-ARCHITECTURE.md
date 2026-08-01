# Authentication Engine Architecture

> P12.1.2 — Complete Authentication Engine for Valdi Engine.
> The orchestration layer that coordinates every authentication contract.
> No JWT. No OAuth. No providers. No browser APIs. No databases.

---

## 1. Purpose

### Why the Authentication Engine Exists

The Authentication Runtime Contracts (P12.1.1) defined interfaces. The Identity Blueprint (P12.1.0) defined the domain. But neither provides orchestration.

The Authentication Engine is the coordinator that:

- Combines session, token, authorization, permission, role, trust, device, MFA, anonymous, and audit into a single entry point
- Exposes a unified API through `context.runtime.auth`
- Delegates to runtime contracts without knowing which provider is behind them
- Manages lifecycle of all authentication sub-engines
- Aggregates health across all authentication components
- Emits events for every authentication operation

### What This Layer Is

- The only authentication entry point for capabilities
- An orchestration layer that delegates to contracts
- A lifecycle manager for all authentication sub-systems
- A health aggregator
- An audit coordinator

### What This Layer Is Not

- Not a JWT implementation
- Not an OAuth implementation
- Not a provider
- Not browser code (cookies, localStorage)
- Not database access
- Not business logic

---

## 2. Architecture Position

```
Capabilities
    ↓
context.runtime.auth
    ↓
┌──────────────────────────────────────────────────────────────┐
│                    Authentication Engine                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   AuthenticationEngine                   │  │
│  │  login  logout  authenticate  refresh  validate         │  │
│  │  authorize  can  cannot  permissions  roles             │  │
│  │  trust  device  mfa  anonymous  audit                   │  │
│  └──────┬──────┬──────┬──────┬──────┬──────┬──────┬───────┘  │
│         │      │      │      │      │      │      │          │
│  ┌──────┴┐ ┌───┴───┐ ┌┴─────┐ ┌┴─────┐ ┌┴─────┐ ┌┴────────┐ │
│  │Session│ │Token  │ │Authz │ │Perm  │ │Role  │ │Trust    │ │
│  └───────┘ └───────┘ └──────┘ └──────┘ └──────┘ └─────────┘ │
│  ┌──────┐ ┌──────┐ ┌────────┐ ┌───────┐ ┌───────┐          │
│  │Device│ │MFA   │ │Anon    │ │Audit  │ │Health │          │
│  └──────┘ └──────┘ └────────┘ └───────┘ └───────┘          │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────┴───────────────────────────────────┐
│              Authentication Runtime Contracts (P12.1.1)       │
│                                                              │
│  Session    Token    Authz    Perm    Role    Trust           │
│  Device     MFA      Anon     Audit   Provider               │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────┴───────────────────────────────────┐
│              Authentication Provider                          │
│                                                              │
│  JWT Adapter | OAuth Adapter | Auth0 | Clerk | Firebase      │
└───────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Capability: context.runtime.auth.login({ email, password })
    ↓
AuthenticationEngine.login(credentials)
    ↓
AuthProviderRuntime.login(credentials)
    ↓
AuthProvider (JWT / Auth0 / Firebase / Custom)
    ↓
Returns { identity, session, context }
    ↓
AuthenticationEngine emits auth:login event
    ↓
AuditEngine records login event
```

---

## 3. Engine Structure

### Public API (AuthenticationEngine)

| Method | Delegates To | Description |
|--------|-------------|-------------|
| `login(credentials)` | AuthProvider | Authenticate and return session |
| `logout(session)` | SessionEngine | Destroy session |
| `authenticate(token)` | AuthProvider | Validate token |
| `refresh(token)` | TokenEngine | Refresh expired token |
| `validate(session)` | SessionEngine | Check session validity |
| `currentIdentity(context)` | — | Get current identity |
| `currentSession(context)` | — | Get current session |
| `currentTenant(context)` | — | Get current tenant |
| `authorize(identity, action, resource)` | AuthorizationEngine | Check authorization |
| `can(identity, action, resource)` | AuthorizationEngine | Boolean permission check |
| `cannot(identity, action, resource)` | AuthorizationEngine | Inverse check |
| `permissions(identityId)` | PermissionEngine | List permissions |
| `roles(identityId)` | RoleEngine | List roles |
| `trust(identityId)` | TrustEngine | Calculate trust |
| `device(identityId)` | DeviceEngine | List devices |
| `mfa(identityId)` | MfaEngine | MFA operations |
| `anonymous(fingerprint)` | AnonymousEngine | Create guest |
| `audit(filters)` | AuditEngine | Query audit log |
| `healthCheck()` | AuthEngineHealth | Aggregate health |
| `available()` | — | Engine availability |
| `supports(feature)` | — | Feature detection |

### Internal Engines

#### SessionEngine

| Method | Delegates To |
|--------|-------------|
| `create(identityId, options)` | SessionRuntime.createSession |
| `destroy(sessionId)` | SessionRuntime.destroySession |
| `restore(token)` | SessionRuntime.restoreSession |
| `rotate(sessionId)` | SessionRuntime.rotate |
| `extend(sessionId, ttl)` | SessionRuntime.extend |
| `list(identityId)` | SessionRuntime.list |
| `terminate(sessionId)` | SessionRuntime.terminate |

#### TokenEngine

| Method | Delegates To |
|--------|-------------|
| `issue(payload, options)` | TokenRuntime.issue |
| `validate(token)` | TokenRuntime.validate |
| `refresh(token)` | TokenRuntime.refresh |
| `revoke(token)` | TokenRuntime.revoke |
| `decode(token)` | TokenRuntime.decode |
| `verify(token, options)` | TokenRuntime.verify |

#### AuthorizationEngine

| Method | Delegates To |
|--------|-------------|
| `authorize(identity, action, resource)` | AuthorizationRuntime.authorize |
| `can(identity, action, resource)` | AuthorizationRuntime.can |
| `cannot(identity, action, resource)` | AuthorizationRuntime.cannot |
| `evaluatePolicy(identity, policy)` | AuthorizationRuntime.evaluatePolicy |
| `evaluateScope(identity, scope)` | AuthorizationRuntime.evaluateScope |

#### PermissionEngine

| Method | Delegates To |
|--------|-------------|
| `grant(identityId, permission)` | PermissionRuntime.grant |
| `revoke(identityId, permission)` | PermissionRuntime.revoke |
| `list(identityId)` | PermissionRuntime.list |
| `has(identityId, permission)` | PermissionRuntime.has |

#### RoleEngine

| Method | Delegates To |
|--------|-------------|
| `assign(identityId, roleId)` | RoleRuntime.assign |
| `remove(identityId, roleId)` | RoleRuntime.remove |
| `list(identityId)` | RoleRuntime.list |
| `inherit(roleId)` | RoleRuntime.inherit |

#### TrustEngine

| Method | Delegates To |
|--------|-------------|
| `calculate(identityId)` | TrustRuntime.calculate |
| `increase(identityId, amount, reason)` | TrustRuntime.increase |
| `decrease(identityId, amount, reason)` | TrustRuntime.decrease |
| `evaluate(identityId, minLevel)` | TrustRuntime.evaluate |
| `history(identityId)` | TrustRuntime.history |

#### DeviceEngine

| Method | Delegates To |
|--------|-------------|
| `register(identityId, fingerprint)` | DeviceRuntime.register |
| `verify(deviceId, challenge)` | DeviceRuntime.verify |
| `trust(deviceId, level)` | DeviceRuntime.trust |
| `revoke(deviceId)` | DeviceRuntime.revoke |
| `list(identityId)` | DeviceRuntime.list |

#### MfaEngine

| Method | Delegates To |
|--------|-------------|
| `enable(identityId, method)` | MfaRuntime.enable |
| `disable(identityId, method)` | MfaRuntime.disable |
| `challenge(identityId, method)` | MfaRuntime.challenge |
| `verify(identityId, method, code)` | MfaRuntime.verify |
| `backupCodes(identityId)` | MfaRuntime.backupCodes |

#### AnonymousEngine

| Method | Delegates To |
|--------|-------------|
| `createGuest(fingerprint)` | AnonymousRuntime.createGuest |
| `upgrade(anonymousId, credentials)` | AnonymousRuntime.upgrade |
| `merge(anonymousId, identityId)` | AnonymousRuntime.merge |
| `destroy(anonymousId)` | AnonymousRuntime.destroy |

#### AuditEngine

| Method | Delegates To |
|--------|-------------|
| `record(event, data)` | AuditRuntime.record |
| `query(filters)` | AuditRuntime.query |
| `export(options)` | AuditRuntime.export |
| `purge(before)` | AuditRuntime.purge |

---

## 4. Infrastructure

### AuthEngineContext

Carries the authentication context for the current request.

```
{
  identity: { id, type, trustLevel },
  tenant: { id, type },
  destination: { id },
  session: { id, type, status },
  permissions: ['reservation:create', ...],
  roles: ['visitor:premium', ...],
  trust: { level: 65, factors: [...] },
  device: { id, trusted: true },
  provider: 'default',
  logger: console,
  eventBus: EventBus,
  runtime: RuntimeContext,
  repositories: { identity, session, ... },
}
```

### AuthEngineRegistry

| Method | Description |
|--------|-------------|
| `register(name, provider)` | Register auth provider |
| `resolve(name)` | Resolve provider by name |
| `remove(name)` | Remove provider |
| `validate(name)` | Validate provider implements required methods |
| `list()` | List registered providers |
| `health()` | Health across all providers |
| `supports(name, feature)` | Feature detection |

### AuthEngineFactory

| Method | Description |
|--------|-------------|
| `create(name, options)` | Create provider instance |
| `resolve(name, context)` | Create + cache + tenant isolation |
| `dispose(name, context)` | Dispose cached instance |
| `disposeAll()` | Dispose all instances |

### AuthEngineHealth

| Method | Description |
|--------|-------------|
| `checkComponent(name, component)` | Health for one component |
| `checkAll(engine)` | Aggregate health across all |
| `startAutoCheck(engine, interval)` | Periodic health checks |
| `stopAutoCheck()` | Stop periodic checks |

---

## 5. Lifecycle

### Startup Order

```
1. AuthEngineRegistry.initialize()
2. SessionEngine.initialize()
3. TokenEngine.initialize()
4. AuthorizationEngine.initialize()
5. PermissionEngine.initialize()
6. RoleEngine.initialize()
7. TrustEngine.initialize()
8. DeviceEngine.initialize()
9. MfaEngine.initialize()
10. AnonymousEngine.initialize()
11. AuditEngine.initialize()
12. AuthenticationEngine.initialize() — marks ready
```

### Shutdown Order

Reverse of startup order.

### State Machine

```
created → initializing → initialized → starting → started
    → stopping → stopped → disposed
    → failed (any step)
```

---

## 6. Events (18 events)

| Event | Trigger |
|-------|---------|
| `auth:login` | Successful login |
| `auth:logout` | Logout |
| `auth:authenticated` | Token authenticated |
| `auth:unauthorized` | Authorization denied |
| `auth:permission_granted` | Permission granted |
| `auth:permission_revoked` | Permission revoked |
| `auth:role_assigned` | Role assigned |
| `auth:role_removed` | Role removed |
| `auth:session_started` | Session created |
| `auth:session_restored` | Session restored from token |
| `auth:session_expired` | Session expired |
| `auth:session_revoked` | Session revoked |
| `auth:trust_changed` | Trust level changed |
| `auth:mfa_enabled` | MFA method enabled |
| `auth:mfa_disabled` | MFA method disabled |
| `auth:anonymous_created` | Anonymous guest created |
| `auth:anonymous_upgraded` | Anonymous upgraded to registered |
| `auth:error` | Authentication error |

---

## 7. Errors (12 types)

```
AuthenticationEngineError (base)
├── AuthorizationError
├── PermissionDeniedError
├── RoleError
├── SessionError
├── TokenError
├── TrustError
├── DeviceError
├── MFAError
├── AnonymousError
├── AuditError
└── ProviderUnavailableError
```

---

## 8. Future Providers

The engine supports any provider via `registerProvider(name, ProviderClass, config)`:

```js
authEngine.registerProvider('jwt', JwtProvider, { algorithm: 'RS256' })
authEngine.registerProvider('auth0', Auth0Provider, { domain: '...', clientId: '...' })
authEngine.registerProvider('firebase', FirebaseProvider, { projectId: '...' })
```

Providers are injected via `setContracts()` which connects each engine to its corresponding runtime contract:

```js
authEngine.setContracts({
  session: sessionContract,
  token: tokenContract,
  authorization: authorizationContract,
  permission: permissionContract,
  role: roleContract,
  trust: trustContract,
  device: deviceContract,
  mfa: mfaContract,
  anonymous: anonymousContract,
  audit: auditContract,
})
```

---

## 9. Architecture Rules (AUTHENG-001 through AUTHENG-012)

| Rule | Description |
|------|-------------|
| AUTHENG-001 | Capabilities never authenticate directly |
| AUTHENG-002 | Capabilities only use `context.runtime.auth` |
| AUTHENG-003 | Engine never imports JWT libraries |
| AUTHENG-004 | Engine never imports OAuth SDKs |
| AUTHENG-005 | Engine never imports browser APIs |
| AUTHENG-006 | Engine never imports providers |
| AUTHENG-007 | Engine only talks to Runtime Contracts |
| AUTHENG-008 | Providers remain replaceable |
| AUTHENG-009 | Offline authentication supported |
| AUTHENG-010 | Multi-tenant isolation mandatory |
| AUTHENG-011 | Destination isolation mandatory |
| AUTHENG-012 | Provider independent |

---

## 10. Validation Checklist

- [ ] AuthenticationEngine is the only authentication entry point for capabilities
- [ ] All public methods delegate to runtime contracts (no direct implementation)
- [ ] No JWT libraries imported
- [ ] No OAuth SDKs imported
- [ ] No browser APIs referenced (cookies, localStorage, navigator)
- [ ] No provider implementations imported
- [ ] No database access
- [ ] No business logic
- [ ] All sub-engines implement initialize(), shutdown(), dispose(), health(), available()
- [ ] All sub-engines implement supports(feature)
- [ ] Events emitted for all auditable operations
- [ ] Errors extend AuthenticationEngineError hierarchy
- [ ] Registry supports provider registration and resolution
- [ ] Factory supports caching and tenant isolation
- [ ] Engine supports setContracts() for provider injection
- [ ] Health aggregates across all components
- [ ] Compatible with Identity Blueprint (P12.1.0)
- [ ] Compatible with Authentication Runtime Contracts (P12.1.1)
- [ ] Compatible with Platform Runtime
- [ ] Compatible with Repository Engine
- [ ] Compatible with EventBus
- [ ] Compatible with multi-tenant model
- [ ] Compatible with offline-first requirement
- [ ] Zero vendor lock-in
