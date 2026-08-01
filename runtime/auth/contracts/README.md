# Authentication Runtime Contracts

> P12.1.1 — Authentication Runtime Contracts Layer.
> Immutable interfaces that every authentication provider must implement.
> Contracts only. No implementations. No JWT. No OAuth. No provider code.

## Layer Position

```
context.runtime.auth
    ↓
Authentication Runtime Contracts    ← YOU ARE HERE
    ↓
Authentication Engine
    ↓
JWT Adapter | OAuth Adapter | Future Providers
    ↓
Identity Provider (Auth0, Clerk, Firebase, Keycloak, etc.)
```

## Contracts

| File | Responsibility |
|------|---------------|
| `auth.runtime.js` | Core authentication — authenticate, logout, refresh, validate, revoke |
| `session.runtime.js` | Session lifecycle — create, destroy, restore, rotate, extend, terminate |
| `token.runtime.js` | Token management — issue, validate, refresh, revoke, decode, verify |
| `identity.runtime.js` | Identity CRUD — find, create, update, delete, verify, changeTrust |
| `authorization.runtime.js` | Access control — authorize, can, cannot, evaluatePolicy, evaluateScope |
| `permission.runtime.js` | Permission management — grant, revoke, list, has |
| `role.runtime.js` | Role management — assign, remove, list, inherit |
| `oauth.runtime.js` | OAuth 2.0 flows — redirect, callback, exchangeCode, refresh, disconnect |
| `oidc.runtime.js` | OpenID Connect — discover, authorize, userinfo, jwks, logout |
| `api-key.runtime.js` | API key management — create, rotate, revoke, validate, list |
| `anonymous.runtime.js` | Anonymous/guest identity — createGuest, upgrade, merge, destroy |
| `device.runtime.js` | Device trust — register, verify, trust, revoke, list |
| `mfa.runtime.js` | Multi-factor authentication — enable, disable, challenge, verify, backupCodes |
| `trust.runtime.js` | Trust scoring — calculate, increase, decrease, evaluate, history |
| `audit.runtime.js` | Audit logging — record, query, export, purge |
| `auth-provider.runtime.js` | Provider interface — login, logout, refresh, userinfo, jwks |

## Rules

1. All contracts are abstract — no implementation
2. No JWT decoding/encoding in contracts
3. No OAuth URLs in contracts
4. No browser APIs (cookies, localStorage) in contracts
5. No vendor SDK imports in contracts
6. Every contract implements initialize(), shutdown(), dispose(), health(), available()
7. Every contract implements supports(feature) for capability detection
8. Contracts are provider-independent
9. Contracts are offline-first
10. All errors extend RuntimeError hierarchy from runtime.errors.js
