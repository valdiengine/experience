# EVENT_FLOW.md

> How events propagate through the system.

---

## EventBus Architecture

```
┌──────────┐     emit      ┌──────────┐     route     ┌──────────┐
│Component │──────────────>│ EventBus │──────────────>│Component │
│    A     │               │ (Hub)    │               │    B     │
└──────────┘               └──────────┘               └──────────┘
                                  │
                                  │ route
                                  ▼
                           ┌──────────┐
                           │Component │
                           │    C     │
                           └──────────┘
```

## Event Structure

```js
{
  type: 'domain:entity.action',    // Required: event name
  data: { id, ...payload },         // Required: event data
  timestamp: Date.now(),            // Required: when emitted
  source: 'capability-name',        // Optional: who emitted
  tenantId: 'tenant-123'            // Optional: tenant context
}
```

## Event Naming Convention

Format: `domain:entity.action`

| Pattern | Example | Description |
|---------|---------|-------------|
| `entity.action` | `memory:created` | Entity lifecycle |
| `entity.state` | `reservation:confirmed` | State change |
| `domain.entity.action` | `explorer:leveled_up` | Namespaced |
| `capability.entity.action` | `governance.place.approved` | Capability-specific |

## Event Flow Examples

### Reservation Created
```
1. Visitor submits reservation
2. ReservationCapability.emit('reservation:created', data)
3. EventBus routes to subscribers:
   → NotificationCapability: sends confirmation
   → AvailabilityCapability: updates availability
   → AnalyticsCapability: records metric
   → ObservabilityCapability: records metric
```

### Memory Created
```
1. Visitor creates memory
2. CommunityCapability.emit('memory:created', data)
3. EventBus routes to subscribers:
   → ModerationManager: queues for review
   → ReputationManager: awards points
   → AnalyticsCapability: records metric
```

### Species Discovered
```
1. Explorer identifies species
2. ExplorationCapability.emit('explorer:discovered_species', data)
3. EventBus routes to subscribers:
   → IntelligenceCapability: updates patterns
   → PokedexManager: adds entry
   → ReputationManager: awards points
   → AnalyticsCapability: records metric
```

## Subscription Patterns

### Direct Subscription
```js
eventBus.on('memory:created', (data) => {
  this.handleMemoryCreated(data)
})
```

### Wildcard Subscription
```js
eventBus.on('memory:*', (data) => {
  this.handleMemoryEvent(data)
})
```

### Domain Subscription
```js
eventBus.on('explorer:*', (data) => {
  this.handleExplorerEvent(data)
})
```

## Event Lifecycle

```
Component A
    │
    ├── prepare event data
    │
    ├── emit event
    │
    ▼
EventBus
    │
    ├── validate event structure
    │
    ├── find subscribers
    │
    ├── route to each subscriber
    │
    ▼
Component B (subscriber)
    │
    ├── receive event
    │
    ├── process event
    │
    ├── (optionally emit new event)
    │
    ▼
EventBus (again, if new event)
```

## Error Handling

```
Component A emits event
    │
    ▼
EventBus routes to Component B
    │
    ├── Component B processes successfully
    │   └── Done
    │
    └── Component B throws error
        ├── Error logged
        ├── Event not lost (retry logic)
        └── Other subscribers still receive event
```

## Event Ordering

Events are processed in emission order. No parallel processing within a single event.

```
Event 1 emitted → Processed → Complete
Event 2 emitted → Processed → Complete
Event 3 emitted → Processed → Complete
```

If Event 2 triggers Event 4:
```
Event 1 → Complete
Event 2 → Processed → emits Event 4
Event 3 → Complete
Event 4 → Complete
```

## Cross-Capability Event Flow

```
CommunityCapability
    │
    ├── emit('memory:created')
    │
    ▼
EventBus
    │
    ├── route to ExplorationCapability
    │   └── awards points
    │
    ├── route to GovernanceCapability
    │   └── queues moderation
    │
    └── route to ObservabilityCapability
        └── records metric
```

## Event Catalog

All ~420 events are cataloged in:
- `docs/ai/EVENT_INDEX.md` — Complete event reference
- Each capability's `*.events.js` file — Capability-specific events

## See Also

- [CAPABILITY_MAP.md](./CAPABILITY_MAP.md) — Capability relationships
- [DATA_FLOW.md](./DATA_FLOW.md) — How data moves
- `docs/ai/EVENT_INDEX.md` — Complete event catalog
- `docs/api/EVENT_CONTRACTS.md` — Event contracts
