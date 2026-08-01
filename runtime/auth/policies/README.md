# Policy Engine

> P12.1.5 — Policy evaluation layer for RBAC, ABAC, and PBAC.

## Responsibilities

- Evaluate policies against identity + action + resource + context
- Support RBAC (role-based) and ABAC (attribute-based) policies
- Deny-override: deny policies always win
- Time-based conditions, trust-level conditions, device-trust conditions
- Offline authorization support
- Explain mode for debugging decisions

## Files

| File | Responsibility |
|------|---------------|
| `policy.engine.js` | Policy evaluation. RBAC + ABAC + conditions. Explain mode. |
| `policy.registry.js` | Register, resolve, list policies by type/effect/action. |
| `policy.context.js` | Evaluation context: identity, action, resource, time, offline, trust. |
| `policy.compiler.js` | Compile JSON/DSL policies into evaluable form. Prepared for YAML, GUI. |
| `policy.cache.js` | Decision cache with TTL. Cache hit/miss events. |
| `built-in.policies.js` | 6 built-in policies: deny-by-default, own profile, trusted device, offline read, time-restricted write, admin full access. |

## Condition Operators

eq, neq, in, nin, gt, gte, lt, lte, exists, not_exists, contains, startsWith, between, trust_gte, time_between, day_of_week

## Usage

```js
policyEngine.registerPolicy({
  name: 'allow-reservation-write',
  effect: 'allow',
  priority: 100,
  actions: ['reservation:write'],
  roles: ['business:owner'],
  conditions: [
    { field: 'tenant.id', operator: 'eq', value: '{identity.tenant.id}' },
  ],
})

const result = await policyEngine.evaluate(identity, 'reservation:write', 'reservation:123', context)
// { allowed: true, reason: 'allowed_by_policy', policy: 'allow-reservation-write' }
```
