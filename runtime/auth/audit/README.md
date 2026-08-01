# Authorization Audit

> P12.1.5 — Authorization decision tracking for all allow/deny operations.

## Responsibilities

- Record every authorization decision
- Query decisions by identity, action, resource, time, result
- Export and purge audit records
- Track policy cache hits/misses
- Provide statistics

## Files

| File | Responsibility |
|------|---------------|
| `authorization.audit.js` | Record, query, export, purge, stats. 50K max records. |
| `audit.events.js` | 3 events. |
