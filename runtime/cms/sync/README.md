# CMS Synchronization Engine

> P12.2.4 — Bidirectional synchronization between Valdi Engine CMS Domain and external CMS Providers.
> Provider-independent. WordPress is the first provider (P12.2.3).

## Architecture Position

```
CMS Domain
    ↓
CMS Sync Engine             ← YOU ARE HERE
    ↓
CMS Provider Interface (CmsProviderRuntime)
    ↓
WordPress Provider (P12.2.3) | Ghost | Strapi | Contentful | Sanity
```

## Layer Position

```
Capabilities (via context.runtime.cms.sync)
    ↓
┌──────────────────────────────────────────────────┐
│               CMS Sync Engine                      │
│                                                    │
│  SyncEngine                                        │
│    ├─ SyncRegistry    (providers, strategies)      │
│    ├─ SyncContext     (capability API surface)     │
│    ├─ SyncFactory     (strategy resolution)        │
│    ├─ SyncState       (per-entity sync state)      │
│    ├─ SyncCheckpoint  (resume from checkpoint)     │
│    ├─ SyncHistory     (audit trail)                │
│    │                                                │
│    ├─ Queue           (job queue)                   │
│    ├─ Scheduler       (cron/interval scheduling)   │
│    ├─ Worker          (job execution)               │
│    │                                                │
│    ├─ PullStrategy                                   │
│    ├─ PushStrategy                                   │
│    ├─ BidirectionalStrategy                          │
│    │                                                │
│    ├─ ConflictEngine                                 │
│    │   ├─ ConflictDetector                          │
│    │   ├─ ConflictResolver                          │
│    │   └─ ConflictPolicy                            │
│    │                                                │
│    ├─ RetryEngine                                   │
│    │   └─ RetryPolicy                               │
│    │                                                │
│    ├─ EntityMatcher   (fuzzy entity matching)       │
│    ├─ FieldMapper     (field mapping)               │
│    └─ RelationshipMapper                            │
└──────────────────────┬───────────────────────────┘
                       ↓
               CMS Provider (WordPress, etc.)
```

## Files

| Path | Responsibility |
|------|---------------|
| `sync.engine.js` | Main orchestrator — trigger, status, history, health |
| `sync.context.js` | Capability-facing API surface |
| `sync.registry.js` | Provider, strategy, entity type registry |
| `sync.factory.js` | Strategy instantiation with defaults |
| `jobs/sync.job.js` | Job model with lifecycle |
| `jobs/sync.queue.js` | Priority queue with backpressure |
| `jobs/sync.scheduler.js` | Interval/cron-based scheduling |
| `jobs/sync.worker.js` | Job execution with retry support |
| `strategies/pull.strategy.js` | Pull (CMS → Engine) sync |
| `strategies/push.strategy.js` | Push (Engine → CMS) sync |
| `strategies/bidirectional.strategy.js` | Bidirectional sync |
| `mapping/entity.matcher.js` | Fuzzy entity matching by ID, slug, title |
| `mapping/field.mapper.js` | Field-level mapping with transformations |
| `mapping/relationship.mapper.js` | Relationship extraction and update |
| `conflicts/conflict.engine.js` | Conflict detection + resolution orchestration |
| `conflicts/conflict.detector.js` | Change detection via checksum + timestamp |
| `conflicts/conflict.resolver.js` | Auto-resolve, escalate, manual re-resolve |
| `conflicts/conflict.policy.js` | Entity-specific conflict resolution policies |
| `state/sync.state.js` | Per-entity sync state with status tracking |
| `state/sync.checkpoint.js` | Resume point for interrupted syncs |
| `state/sync.history.js` | Audit trail with filtering |
| `retry/retry.engine.js` | Retry execution with dead letter queue |
| `retry/retry.policy.js` | Exponential backoff, jitter, max attempts |
| `events/sync.events.js` | 20 provider-independent sync events |
| `errors/sync.errors.js` | Sync error hierarchy |

## Sync Modes

| Mode | Direction | Trigger | Use Case |
|------|-----------|---------|----------|
| Pull | CMS → Engine | Scheduled / Webhook | Content updates from WordPress |
| Push | Engine → CMS | Manual / API | Creating content from Engine admin |
| Bidirectional | Both | Scheduled | Full reconciliation |

## Conflict Resolution

| Strategy | Behavior |
|----------|----------|
| LAST_WRITE_WINS | Accept the most recently modified version |
| SOURCE_PRIORITY | Always prefer the source (CMS) |
| TARGET_PRIORITY | Always prefer the target (Engine) |
| FIELD_LEVEL_MERGE | Per-field ownership rules |
| MANUAL_REVIEW | Escalate for human decision |
| CUSTOM_POLICY | Programmable resolver function |

## Default Policies

| Entity | Strategy | Priority |
|--------|----------|----------|
| post | SOURCE_PRIORITY | CMS wins for editorial fields |
| page | SOURCE_PRIORITY | CMS wins for editorial fields |
| seo | FIELD_LEVEL_MERGE | Engine wins for canonical, CMS for editorial |
| media | SOURCE_PRIORITY | CMS is source of truth for files |
| category | LAST_WRITE_WINS | Most recent wins |

## Retry Schedule

| Attempt | Delay |
|---------|-------|
| 1 | 1s |
| 2 | 3s |
| 3 | 9s |
| 4 | 27s |
| 5 | 81s |
| 6+ | 300s (capped) |

## Events

All events use `cms:sync_*` prefix. See `events/sync.events.js` for full list.

## Architecture Rules

| Rule | Description |
|------|-------------|
| SYNC-001 | Sync Engine never knows providers |
| SYNC-002 | Providers never own synchronization state |
| SYNC-003 | All synchronization is event driven |
| SYNC-004 | Conflicts are explicit — never silent overwrites |
| SYNC-005 | Every sync operation is auditable |
| SYNC-006 | Tenant isolation is mandatory |
| SYNC-007 | Offline synchronization must recover |
| SYNC-008 | Business capabilities never manage sync |
| SYNC-009 | Future providers require no Sync Engine changes |
