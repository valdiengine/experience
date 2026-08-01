# Scope Manager

> P12.1.5 — Scope namespace layer. Defines action boundaries for authorization.

## Responsibilities

- Define and validate scope namespaces
- Wildcard and prefix matching for scope evaluation
- Parent-child scope hierarchy
- Effective scope calculation from roles + assigned scopes
- Namespace validation

## Files

| File | Responsibility |
|------|---------------|
| `scope.manager.js` | Validate scopes, effective scopes, wildcard/prefix matching. |
| `scope.registry.js` | Define, resolve, list scopes. Parent-child hierarchy. |
| `built-in.scopes.js` | 12 built-in scopes: public, private, verified, premium, business, destination, moderation, science, governance, sandbox, support, admin. |
| `scope.events.js` | 3 events. |

## Scope Namespace Convention

```
{namespace}:{action}:{resource}

Examples:
  reservation:read
  reservation:write
  reservation:*
  business:manage
  destination:publish
  species:verify
  community:moderate
```
