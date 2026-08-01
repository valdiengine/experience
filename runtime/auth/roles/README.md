# Role Manager

> P12.1.5 — RBAC management layer. Role hierarchy and inheritance.

## Responsibilities

- Define and manage roles
- Role hierarchy with inheritance
- Circular dependency detection
- Assign/remove roles to identities
- Effective roles (assigned + inherited)
- Scoped roles (tenant, destination, temporary)

## Files

| File | Responsibility |
|------|---------------|
| `role.manager.js` | Assign/remove roles, inheritance, effective roles, inherited permissions. |
| `role.registry.js` | Define, resolve, validate roles. Assignment tracking. Circular detection. |
| `built-in.roles.js` | 12 built-in roles: anonymous, visitor, verified, premium, business:owner, guide, moderator, scientist, municipality, platform:admin, system, developer. |
| `role.events.js` | 4 events. |

## Built-in Role Hierarchy

```
platform:admin ──┐
system ──────────┤
developer ───────┤
municipality ────┤
                 ├── visitor:verified ── visitor ── anonymous
moderator ───────┤
scientist ───────┤
guide ───────────┤
business:owner ──┘
    ↓
visitor:premium ── visitor:verified ── visitor ── anonymous
```
