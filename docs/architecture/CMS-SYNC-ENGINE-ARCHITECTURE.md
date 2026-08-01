# CMS Sync Engine Architecture

> P12.2.4 — Bidirectional synchronization engine for the CMS Domain.
> Provider-independent. Orchestrates sync between Valdi Engine and external CMS providers.

## Architecture Position

```
Capabilities (via context.runtime.cms.sync)
    ↓
┌──────────────────────────────────────────────────┐
│               CMS Sync Engine                      │
│                                                    │
│  SyncEngine — Orchestrator                         │
│    ├─ PullStrategy     CMS → Engine               │
│    ├─ PushStrategy     Engine → CMS               │
│    ├─ BidirectionalStrategy  Both                  │
│    │                                                │
│    ├─ ConflictEngine     Detection + Resolution    │
│    ├─ RetryEngine        Retry + Dead Letter       │
│    │                                                │
│    ├─ SyncQueue          Job queue                 │
│    ├─ SyncWorker         Job executor              │
│    ├─ SyncScheduler      Scheduled syncs           │
│    │                                                │
│    ├─ SyncState          Entity sync status        │
│    ├─ SyncCheckpoint     Resume point              │
│    └─ SyncHistory        Audit trail               │
└──────────────────────┬───────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────┐
│           CMS Provider Interface                   │
│  (CmsProviderRuntime — content, media, seo, sync)  │
└──────────────────────┬───────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────┐
│           WordPress Provider (P12.2.3)             │
│           Ghost | Strapi | Contentful | Sanity     │
└──────────────────────────────────────────────────┘
```

## Lifecycle

### Pull Flow

```
1. Trigger received (webhook, schedule, manual)
2. SyncEngine creates SyncJob
3. SyncJob enqueued in SyncQueue
4. SyncWorker picks up job
5. PullStrategy.execute(provider, entityType, options)
   a. Provider.syncPull() → raw items from CMS
   b. FieldMapper.mapToEngine() → engine entities
   c. ConflictEngine.checkAndResolve() per entity
   d. Return resolved results
6. SyncState updated per entity
7. SyncCheckpoint saved
8. SyncHistory recorded
9. SyncJob completed
10. Event emitted: cms:sync_completed
```

### Push Flow

```
1. Capability creates/updates content via context.runtime.cms
2. SyncEngine creates SyncJob (push direction)
3. SyncWorker executes PushStrategy
4. PushStrategy.execute(provider, entityType, items)
   a. FieldMapper.mapToProvider() → provider format
   b. Provider.syncPush() → provider creates/updates
   c. Return results
5. SyncState marked synced with external ID
6. SyncHistory recorded
```

### Bidirectional Flow

```
1. Scheduled or manual trigger
2. SyncJob created with 'bidirectional' direction
3. BidirectionalStrategy.execute()
   a. Pull → get CMS items
   b. Push → send local items not in pull results
   c. Conflict resolution on overlap
4. Results merged and returned
```

## Conflict Model

### Detection

Conflicts are detected when both source (CMS) and target (Engine) have modified the same entity since the last sync point. Detection uses:

1. **Timestamp comparison** — `updatedAt` field
2. **Checksum comparison** — MD5 of relevant fields
3. **Field-level diff** — which fields changed on each side

### Resolution Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `LAST_WRITE_WINS` | Accept latest timestamp | Low-risk entities (categories) |
| `SOURCE_PRIORITY` | CMS always wins | Editorial content (posts, pages) |
| `TARGET_PRIORITY` | Engine always wins | Canonical data (SEO canonical URL) |
| `FIELD_LEVEL_MERGE` | Per-field ownership | SEO metadata |
| `MANUAL_REVIEW` | Escalate | Critical conflicts |
| `CUSTOM_POLICY` | Programmable | Complex business rules |

### Policy by Entity

```js
// Post: CMS wins for editorial fields, Engine wins for slug/status
{
  strategy: 'SOURCE_PRIORITY',
  fieldRules: {
    title: 'source',       // CMS editorial title
    content: 'source',     // CMS content body
    slug: 'target',        // Engine canonical URL
    status: 'target',      // Engine status control
  }
}

// SEO: Per-field ownership
{
  strategy: 'FIELD_LEVEL_MERGE',
  fieldRules: {
    title: 'target',          // Engine canonical
    description: 'target',     // Engine canonical
    canonicalUrl: 'source',    // CMS editorial
    ogTitle: 'source',         // CMS social
    noIndex: 'target',         // Engine business rule
    keywords: 'merge',         // Combine both
  }
}
```

## Retry Model

### Schedule

| Attempt | Base Delay | With Jitter (±10%) |
|---------|-----------|-------------------|
| 1 | 1,000ms | 900–1,100ms |
| 2 | 3,000ms | 2,700–3,300ms |
| 3 | 9,000ms | 8,100–9,900ms |
| 4 | 27,000ms | 24,300–29,700ms |
| 5 | 81,000ms | 72,900–89,100ms |
| 6+ | 300,000ms (capped) | 270,000–330,000ms |

### Retryable Errors

| Error Category | Retryable | Example |
|---------------|-----------|---------|
| connection | ✅ | Network failure |
| timeout | ✅ | Request timed out |
| rate_limit | ✅ | 429 Too Many Requests |
| provider_unavailable | ✅ | CMS provider down |
| authentication | ❌ | Invalid credentials |
| mapping | ❌ | Entity mapping failure |
| validation | ❌ | Invalid data |
| not_found | ❌ | Entity does not exist |

### Dead Letter Queue

After 5 failed attempts, jobs enter the dead letter queue. They remain there until:
- Manually retried via `retry(jobId)`
- Cleared via `clearDeadLetter(key)`
- Expired (TTL-based cleanup)

## Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `cms:sync_started` | `{ entityType, direction }` | Sync begins |
| `cms:sync_completed` | `{ entityType, direction, count }` | Sync completes |
| `cms:sync_failed` | `{ entityType, direction, error }` | Sync fails |
| `cms:sync_cancelled` | `{ jobId, reason }` | Sync cancelled |
| `cms:sync_conflict_detected` | `{ entityType, entityId, fields }` | Conflict found |
| `cms:sync_conflict_resolved` | `{ entityType, entityId, strategy }` | Conflict resolved |
| `cms:sync_conflict_escalated` | `{ conflictId, reason }` | Escalated to manual |
| `cms:sync_retry` | `{ key, attempt, delay }` | Retry attempt |
| `cms:sync_retry_exhausted` | `{ key, attempts }` | Max retries reached |
| `cms:sync_checkpoint_created` | `{ entityType, provider }` | Checkpoint saved |
| `cms:sync_queue_backpressure` | `{ queueName, size }` | Queue full |
| `cms:sync_queue_drained` | `{ timestamp }` | Queue cleared |

## Security

### Tenant Isolation

- Every sync job carries `tenantId` and `destinationId`
- SyncState is partitioned by entity type and tenant
- SyncHistory filters by tenant
- Providers are instantiated per-tenant with tenant-scoped credentials
- Never allow cross-tenant data access

### Audit Trail

Every sync operation records:
- **WHO**: system, user, provider
- **WHAT**: entity, operation, changes
- **WHEN**: timestamp
- **WHY**: manual, automatic, webhook, schedule

## Offline Strategy

- **Queued sync**: jobs persist in queue when CMS is unavailable
- **Checkpoint recovery**: interrupted syncs resume from last checkpoint
- **Stale content**: served from cache when CMS is offline
- **Retry with backoff**: automatic retry when connectivity returns

## Architecture Rules

```js
SYNC-001: Sync Engine never knows providers
  // No provider-specific code outside provider directories
  // No WordPress, Ghost, Strapi imports in sync engine

SYNC-002: Providers never own synchronization state
  // State, checkpoints, history live in Sync Engine
  // Providers are stateless — they only do I/O

SYNC-003: All synchronization is event driven
  // Every sync lifecycle event emits an event
  // Capabilities observe events, never poll

SYNC-004: Conflicts are explicit
  // No silent overwrites
  // Every conflict is detected, recorded, and resolved

SYNC-005: Every sync operation is auditable
  // SyncHistory records every operation
  // Audit trail includes who, what, when, why

SYNC-006: Tenant isolation is mandatory
  // Every sync job is tenant-scoped
  // Cross-tenant sync is prohibited

SYNC-007: Offline synchronization must recover
  // Checkpoints enable resume
  // Retry engine handles connectivity loss

SYNC-008: Business capabilities never manage sync
  // Capabilities use context.runtime.cms
  // Sync is an infrastructure concern

SYNC-009: Future providers require no Sync Engine changes
  // Sync Engine is provider-independent
  // New providers implement CmsProviderRuntime
```

## Validation Checklist

- [x] WordPress code untouched
- [x] Provider independent — no WordPress imports in sync engine
- [x] Bidirectional sync supported — pull, push, bidirectional strategies
- [x] Conflict resolution exists — 6 strategies, per-entity policies
- [x] Retry system exists — exponential backoff, dead letter queue
- [x] Events created — 20 provider-independent sync events
- [x] Multi-tenant safe — tenant-scoped jobs and state
- [x] Offline ready — checkpoints, retry, queue
- [x] No capability coupling — Sync Engine is infrastructure
