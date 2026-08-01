# Permission Resolver

> P12.1.5 — Permission resolution layer. Converts roles and scopes into effective permissions.

## Responsibilities

- Resolve effective permissions from roles + direct grants
- Support wildcard and prefix matching
- Deny override (deny always wins)
- Permission inheritance through role hierarchy
- Explain mode for debugging

## Files

| File | Responsibility |
|------|---------------|
| `permission.resolver.js` | Resolve permissions from roles + direct grants. Wildcard/prefix matching. Deny override. |
| `permission.matrix.js` | Role → Permission matrix. Define, query, export. |
| `permission.registry.js` | Grant/revoke/list/has permissions per identity. |
| `permission.events.js` | 4 events. |
