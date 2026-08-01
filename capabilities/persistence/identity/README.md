# Identity Layer

> Future authentication and authorization architecture.
> Foundation for P12.1 Authentication.

## Purpose

The Identity layer manages all aspects of identity in the Valdi Engine platform:
- Who users are (Authentication)
- What users can do (Authorization)
- How sessions are managed (Session Management)
- How third-party identity works (OAuth, Federation)

## Future Architecture

```
identity/
├── README.md
├── authentication/     — Authentication providers
├── authorization/      — Authorization providers (RBAC, ABAC)
├── session/            — Session management
├── oauth/              — OAuth 2.0 / OIDC providers
├── jwt/                — JWT providers
├── api-key/            — API key management
└── federation/         — Identity federation (SSO, SAML)
```

## Expected Implementations

| Component | Providers | Phase |
|-----------|-----------|-------|
| Authentication | Local (email/password), OAuth (Google, Facebook), Magic Link | P12.1 |
| Authorization | RBAC (Role-Based), ABAC (Attribute-Based), Permission Registry | P12.1 |
| Session | JWT Session, Cookie Session, Redis Session | P12.1 |
| OAuth | Google, Facebook, Apple, GitHub | P12.1 |
| JWT | Access Token, Refresh Token, Service Token | P12.1 |
| API Key | Key Generation, Key Validation, Rate Limiting | P12.1 |
| Federation | SAML, OpenID Connect, LDAP | P12.2+ |

## Integration with Repository Engine

The Identity layer provides the `identity` object in `RepositoryContext`.
Every repository operation is automatically scoped to the authenticated
identity's tenant and permissions.

## Relationship with P12.1

P12.1 will implement the first authentication and authorization providers,
connecting them to the Repository Engine through RepositoryContext.
