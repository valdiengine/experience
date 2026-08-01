# DATA_FLOW.md

> How information moves through the platform.

---

## Core Data Flow

```
┌──────────┐     ┌────────────┐     ┌──────────┐     ┌────────────┐
│   User   │────>│ Capability │────>│DataManager│────>│  Provider  │
│Interface │     │  Manager   │     │          │     │            │
└──────────┘     └────────────┘     └──────────┘     └────────────┘
                        │                  │                  │
                        │                  │                  │
                        ▼                  ▼                  ▼
                   ┌─────────┐      ┌──────────┐      ┌──────────┐
                   │ EventBus │      │  Cache   │      │Data Source│
                   └─────────┘      └──────────┘      └──────────┘
```

## Data Access Layers

### 1. User Interface
- Renders data from capabilities
- Sends user actions to capability managers
- Never accesses DataManager directly

### 2. Capability Manager
- Orchestrates business logic
- Calls DataManager for data operations
- Emits events for state changes
- Accesses other capabilities via `context.capabilities.get()`

### 3. DataManager
- Central data access point
- Handles: cache, search, filter, validate, normalize
- Scopes queries to current tenant
- Delegates data source communication to Providers

### 4. Provider
- Communicates with external data sources
- Handles: HTTP, WebSocket, local storage
- NO business logic
- NO caching (that's DataManager)
- NO filtering (that's DataManager)

### 5. Data Source
- JSON files (mock)
- REST API (future)
- WordPress CMS (hybrid)
- Database (future)

## Tenant Scoping

Every data query is scoped to the current tenant:

```
DataManager.query('experiences')
  → adds filter: { tenantId: currentTenant.id }
  → Provider executes with tenant filter
  → Results are tenant-isolated
```

Cross-tenant access requires explicit admin context.

## Cache Strategy

```
Request → Check Cache → [HIT] → Return cached data
                ↓ [MISS]
         Check Provider → Fetch from source → Cache result → Return data
```

Cache invalidation:
- Time-based (TTL)
- Event-based (on state change)
- Manual (admin action)

## Search Flow

```
Search Query
    ↓
DataManager.search()
    ↓
Apply Filters (tenant, type, status)
    ↓
Apply Sort (relevance, date, distance)
    ↓
Apply Pagination
    ↓
Return Results
```

## Validation Flow

```
Data Input
    ↓
Schema Validation (Joi/Zod-like)
    ↓
Business Rules Validation
    ↓
Permission Validation
    ↓
Valid Data → Continue
Invalid Data → Error Event
```

## Event-Driven Data Updates

```
Capability A updates data
    ↓
Emits event: domain:entity.updated
    ↓
EventBus routes to subscribers
    ↓
Capability B receives event
    ↓
Capability B updates its own data
    ↓
Capability B emits its own event
```

## Offline Data Flow

```
Online State:
  User Action → DataManager → Provider → Data Source
  Data Source → Provider → DataManager → Cache → UI

Offline State:
  User Action → DataManager → Cache → UI
  Action queued for sync

Reconnection:
  Queued Actions → DataManager → Provider → Data Source
  Background sync resolves conflicts
```

## Data Synchronization (CMS Hybrid)

```
WordPress CMS                    Engine
     │                            │
     ├── REST API ──────────────> CMS Provider
     │                            │
     │   Content changes          │
     │<── Webhook ─────────────── │
     │                            │
     ├── Sync content ──────────> Content Manager
     │                            │
     │                            ├── Normalize
     │                            ├── Cache
     │                            └── Render
```

## See Also

- [EVENT_FLOW.md](./EVENT_FLOW.md) — How events propagate
- [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) — High-level architecture
- `docs/api/DATA_CONTRACTS.md` — Data schemas
