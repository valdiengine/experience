# EVENT_CONTRACTS.md

> Official EventBus contracts. Event structure, naming, and patterns.

---

## Event Structure

Every event follows this structure:

```js
{
  type: string,         // Required: event name (domain:entity.action)
  data: object,         // Required: event payload
  timestamp: number,    // Required: Date.now() when emitted
  source?: string,      // Optional: emitting capability name
  tenantId?: string     // Optional: tenant context
}
```

## Naming Convention

Format: `domain:entity.action`

| Pattern | Example | Use Case |
|---------|---------|----------|
| `entity.action` | `memory:created` | Simple entity events |
| `domain.entity.action` | `explorer:leveled_up` | Namespaced events |
| `capability.entity.action` | `governance.place.approved` | Capability-specific |

### Valid Actions

| Action | Meaning |
|--------|---------|
| `created` | New entity created |
| `updated` | Entity updated |
| `deleted` | Entity deleted |
| `confirmed` | Entity confirmed |
| `cancelled` | Entity cancelled |
| `completed` | Entity completed |
| `expired` | Entity expired |
| `failed` | Operation failed |
| `started` | Process started |
| `finished` | Process finished |
| `detected` | Condition detected |
| `resolved` | Condition resolved |
| `earned` | Resource earned |
| `spent` | Resource spent |
| `awarded` | Recognition awarded |
| `flagged` | Content flagged |
| `approved` | Content approved |
| `rejected` | Content rejected |

---

## Event Categories

### Entity Lifecycle
```
entity:created
entity:updated
entity:deleted
```

### State Changes
```
entity:confirmed
entity:cancelled
entity:completed
entity:expired
```

### Discovery
```
entity:detected
entity:discovered
entity:found
```

### Community
```
entity:created
entity:approved
entity:featured
entity:liked
entity:commented
```

### Gamification
```
entity:earned
entity:awarded
entity:leveled_up
entity:completed
```

### Operations
```
entity:started
entity:completed
entity:failed
entity:resolved
```

---

## Event Flow Patterns

### Request-Response
```
Component A → emit('entity:requested')
EventBus → Component B
Component B → emit('entity:received')
EventBus → Component A
```

### Fan-Out
```
Component A → emit('entity:created')
EventBus → Component B (subscriber)
EventBus → Component C (subscriber)
EventBus → Component D (subscriber)
```

### Chain
```
Component A → emit('entity:created')
EventBus → Component B
Component B → emit('entity:processed')
EventBus → Component C
```

---

## Error Events

When an operation fails:

```js
{
  type: 'domain:entity.failed',
  data: {
    entityId: string,
    error: string,
    code: string,
    recoverable: boolean
  },
  timestamp: Date.now(),
  source: 'capability-name'
}
```

---

## Event Catalog

All ~420 events are cataloged in:
- `docs/ai/EVENT_INDEX.md` — Complete event reference
- Each capability's `*.events.js` file — Capability-specific events

## See Also

- [EVENT_FLOW.md](../architecture/EVENT_FLOW.md) — How events propagate
- [INTERNAL_EVENTS.md](./INTERNAL_EVENTS.md) — Internal event catalog
- `docs/ai/EVENT_INDEX.md` — Complete event catalog
