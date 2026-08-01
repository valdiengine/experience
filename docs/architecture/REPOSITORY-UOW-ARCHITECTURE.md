# Repository & Unit of Work Architecture

> P12.0.2 — Persistence orchestration layer between Persistence Contracts (P12.0.1) and future Repository implementations.
> Provider-agnostic. Capability-agnostic. Business-agnostic.

---

## 1. Purpose

### Why Repository Exists

The Repository pattern mediates between domain logic and data mapping. In Valdi Engine, repositories provide:

- **Collection-like access** to domain objects — capabilities ask for `repository.find(query)` not `provider.query(sql)`
- **Persistence ignorance** — capabilities never know if data lives in PostgreSQL, SQLite, IndexedDB, Redis, or a REST API
- **Consistency boundaries** — aggregate roots guarantee invariant protection
- **Testability** — repositories are replaced by mocks in unit tests without touching providers

### Why Unit of Work Exists

Unit of Work (UoW) tracks changes to objects during a business transaction and flushes them atomically. It provides:

- **Atomic commits** — all changes succeed or all roll back
- **Change tracking** — objects modified, added, or deleted within a scope
- **Ordered writes** — insert parents before children, avoid FK violations
- **Batched writes** — multiple changes coalesced into single provider operations

### Why Capabilities Never Talk to SQL

SQL is a provider implementation detail. A capability that writes `SELECT * FROM reservations` is:

- **Tied to one provider** — cannot switch from PostgreSQL to SQLite without rewrites
- **Untestable in isolation** — requires a real database in unit tests
- **Brittle under schema change** — column renames break capability code
- **Violates layer isolation** — capability should express *what*, not *how*

Capabilities issue queries through repository contracts (defined in PERSISTENCE-CONTRACTS.md). Repositories translate those contracts into provider operations. Providers execute against the physical database.

---

## 2. Repository Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────┐
│                    Capability                        │
│  context.repositories.reservation.find({...})       │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│              RepositoryContext                       │
│  tenant, destination, transaction, identity,         │
│  permissions, locale, timezone, provider, cache,     │
│  logger, eventBus, unitOfWork                        │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│           RepositoryRegistry                         │
│  lookup → resolve → validate → return               │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│            RepositoryFactory                         │
│  resolve config → inject provider → apply decorators│
│  → build adapter → return repository                │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│            BaseRepository                            │
│  find, findOne, create, update, delete, count,       │
│  exists, paginate, aggregate                        │
├──────────────────┬──────────────────────────────────┤
│  ReadRepository  │  WriteRepository                  │
│  find, findOne   │  create, update, delete           │
│  count, exists   │  bulkCreate, bulkUpdate           │
│  paginate        │  bulkDelete                       │
├──────────────────┴──────────────────────────────────┤
│              AggregateRepository                     │
│  save (aggregate root), load, remove                │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│            RepositoryAdapter                         │
│  translate repository operations → provider ops      │
│  Pure abstraction. No SQL. No ORM.                  │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│               Provider                               │
│  Physical data source (JSON, SQL, REST, etc.)        │
└─────────────────────────────────────────────────────┘
```

### BaseRepository

Abstract foundation for all repositories. Defines the common query interface that every domain-specific repository inherits.

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `find` | `(query, options?) → Promise<Entity[]>` | Find entities matching query |
| `findOne` | `(query, options?) → Promise<Entity\|null>` | Find single entity |
| `findById` | `(id, options?) → Promise<Entity\|null>` | Find by primary identifier |
| `create` | `(data, options?) → Promise<Entity>` | Create new entity |
| `update` | `(query, data, options?) → Promise<Entity>` | Update matching entity |
| `delete` | `(query, options?) → Promise<boolean>` | Delete matching entity |
| `count` | `(query?) → Promise<number>` | Count matching entities |
| `exists` | `(query) → Promise<boolean>` | Check if entity exists |
| `paginate` | `(query, page, size) → Promise<Page<Entity>>` | Paginated query |

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `entityName` | `string` | Domain entity name (e.g. 'reservation') |
| `adapter` | `RepositoryAdapter` | Provider communication bridge |
| `context` | `RepositoryContext` | Current execution context |

### ReadRepository

Optimized for read-only access patterns. Used when capabilities only need query capability without write intent.

**Additional methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `aggregate` | `(pipeline, options?) → Promise<any[]>` | Aggregation pipeline |
| `distinct` | `(field, query?) → Promise<any[]>` | Distinct values |
| `search` | `(text, options?) → Promise<Entity[]>` | Full-text search |
| `projection` | `(query, fields) → Promise<Partial<Entity>[]>` | Select specific fields |

### WriteRepository

Optimized for write-intensive operations. Separated from ReadRepository to allow different scaling strategies (read replicas vs. write masters).

**Additional methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `bulkCreate` | `(data[]) → Promise<Entity[]>` | Batch create |
| `bulkUpdate` | `(query, data) → Promise<number>` | Batch update (returns count) |
| `bulkDelete` | `(query) → Promise<number>` | Batch delete (returns count) |
| `upsert` | `(query, data) → Promise<Entity>` | Insert or update |

### AggregateRepository

Manages aggregate roots and their consistency boundaries. Ensures child entities are loaded/saved with the root.

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `save` | `(aggregateRoot, options?) → Promise<void>` | Save aggregate and children |
| `load` | `(id, options?) → Promise<AggregateRoot\|null>` | Load aggregate with children |
| `remove` | `(id, options?) → Promise<boolean>` | Remove aggregate and children |
| `exists` | `(id) → Promise<boolean>` | Check aggregate exists |

### RepositoryFactory

Creates repository instances with proper configuration, provider injection, and decoration. See Section 5.

### RepositoryRegistry

Central registry for all repository types. Provides lookup, lifecycle management, and health status. See Section 6.

### RepositoryContext

Scoped context passed to every repository operation. Contains tenant, transaction, identity, and environmental data. See Section 4.

### RepositoryAdapter

Translates repository operations into provider-specific calls. Pure abstraction layer. See Section 9.

### RepositoryMetadata

Immutable descriptor for each repository type:

```js
{
  entityName: 'reservation',
  version: '1.0.0',
  dependencies: ['business', 'customer'],
  provider: 'postgresql',
  adapter: 'sql',
  readOnly: false,
  aggregate: false,
  cacheable: true,
  searchable: true
}
```

### RepositoryConfiguration

Resolved configuration for a repository instance:

```js
{
  entityName: 'reservation',
  providerName: 'postgresql',
  collection: 'reservations',
  cacheTTL: 300000,
  timeout: 5000,
  retryAttempts: 3,
  retryDelay: 1000,
  readPreference: 'primary',
  writeConcern: 'majority'
}
```

---

## 3. Repository Lifecycle

### Construction

```
RepositoryFactory.create('reservation', context)
  → resolve configuration (RepositoryConfiguration)
  → resolve provider from context
  → resolve adapter from provider
  → apply decorators (cache, retry, audit, timestamps)
  → build RepositoryAdapter instance
  → construct BaseRepository (or domain-specific)
  → return repository instance
```

Repository instances are constructed lazily on first request. The factory caches the constructed type but not the instance (instances carry context-scoped state).

### Registration

Repository types are registered in the RepositoryRegistry at bootstrap time:

```
RepositoryRegistry.register('reservation', {
  class: ReservationRepository,
  metadata: { entityName: 'reservation', version: '1.0.0', ... },
  config: { cacheTTL: 300000, ... }
})
```

Registration happens during P12.0.3 (entity repository implementation phase). The registry validates:

- No duplicate entity names
- Required metadata fields present
- Class conforms to BaseRepository interface
- Dependencies reference registered repositories

### Initialization

On first lookup, the registry:

1. Calls `RepositoryFactory.create()` to construct the instance
2. Injects `RepositoryContext` with current tenant, identity, transaction
3. Calls `repository.initialize()` for async setup (connection validation, schema checks)
4. Marks repository as `initialized`

### Injection

Repositories are injected into capabilities through `RepositoryContext`:

```js
// Capability receives context with:
context.repositories.reservation.find({...})
context.repositories.customer.findOne({...})
context.repositories.business.findById(id)
```

The `repositories` object on context is a dynamic proxy that lazily resolves and caches repository instances for the request scope.

### Usage

Capabilities use repositories through the standard interface:

```js
// Read
const reservations = await context.repositories.reservation.find({ status: 'confirmed' })

// Write (within a Unit of Work)
const uow = context.unitOfWork
const reservation = await context.repositories.reservation.create(data, { unitOfWork: uow })
await uow.commit()

// Aggregate
const business = await context.repositories.business.load(businessId)
business.addReservation(reservation)
await context.repositories.business.save(business, { unitOfWork: uow })
```

### Disposal

When a request completes (or tenant context changes), repositories are disposed:

1. Flush any pending Unit of Work
2. `repository.destroy()` — release connections, clear caches
3. Remove from context scope
4. RepositoryRegistry marks instance as `disposed`

Disposal does NOT remove the type registration — only the scoped instance.

---

## 4. Repository Context

`RepositoryContext` is the ambient container for all repository operations. Every repository method receives context implicitly through the repository instance.

### Context Properties

| Property | Type | Source | Description |
|----------|------|--------|-------------|
| `tenant` | `string` | Request/Identity | Current tenant identifier |
| `destination` | `string\|null` | Request | Current destination scope (null = admin) |
| `identity` | `Identity` | Auth provider | Current user identity (id, roles, permissions) |
| `permissions` | `Permissions` | Identity | Resolved permission set for current operation |
| `locale` | `string` | Request/Identity | Current locale (e.g. 'es-CL') |
| `timezone` | `string` | Tenant config | Current timezone (e.g. 'America/Santiago') |
| `provider` | `Provider` | Bootstrap | Resolved data provider for this context |
| `cache` | `CacheManager` | Engine | Request-scoped cache |
| `logger` | `Logger` | Engine | Structured logger |
| `eventBus` | `EventBus` | Engine | Platform event bus |
| `unitOfWork` | `UnitOfWork\|null` | Transaction | Active unit of work (null outside transaction) |
| `transaction` | `Transaction\|null` | Transaction | Active transaction handle (null outside transaction) |

### Context Lifecycle

```
Request arrives
  → ContextFactory.create(request)
    → resolve tenant
    → resolve identity / permissions
    → resolve locale / timezone
    → resolve provider
    → create cache scope
    → initialize logger context
    → return RepositoryContext
  → Pass to capabilities → repository operations
  → ContextFactory.destroy(context)
    → flush unit of work
    → clear cache
    → release provider connections
```

### Context Scoping Rules

- **Request scope** — created per incoming request, destroyed after response
- **Tenant scope** — context identifies tenant; provider is resolved per tenant
- **Transaction scope** — unitOfWork is set when a transaction begins, cleared on commit/rollback
- **Identity scope** — permissions are resolved from identity; changes propagate through context

### Capabilities Access Repositories Only Through RepositoryContext

```js
// ✅ Correct
context.repositories.reservation.find({...})

// ❌ Wrong — bypassing context
ReservationRepository.find({...})

// ❌ Wrong — direct provider access
context.provider.query('SELECT * FROM reservations')
```

This rule ensures that every repository operation is scoped to the correct tenant, identity, and transaction.

---

## 5. Repository Factory

The `RepositoryFactory` is responsible for constructing repository instances with all required dependencies.

### Responsibilities

| Responsibility | Description |
|----------------|-------------|
| **Provider injection** | Resolve the correct provider from context and inject into repository adapter |
| **Configuration resolution** | Merge default configuration with tenant-specific overrides |
| **Decorator application** | Wrap repository with cross-cutting concerns (cache, retry, audit, timestamps) |
| **Adapter selection** | Select and build the correct adapter based on provider type |
| **Instance caching** | Cache constructed instances within a context scope |
| **Lazy construction** | Repository types are built only when first requested |

### Instantiation Flow

```
RepositoryFactory.create(entityName, context)
  ↓
1. Validate entityName is registered
  ↓
2. Load metadata and configuration from Registry
  ↓
3. Resolve provider from context (tenant-specific)
  ↓
4. Select adapter type based on provider (SQL, REST, GraphQL, etc.)
  ↓
5. Build adapter instance with provider reference
  ↓
6. Apply decorator chain (in order):
   a. CacheDecorator (if cacheable)
   b. RetryDecorator (if retry configured)
   c. AuditDecorator (if auditable)
   d. TimestampsDecorator (if timestamps enabled)
  ↓
7. Construct repository class with adapter, context, config
  ↓
8. Call repository.initialize() for async setup
  ↓
9. Return initialized repository instance
```

### Decorator Chain

Decorators wrap repository methods transparently:

```js
// CacheDecorator
find(query) → check cache → miss → delegate → store in cache → return

// RetryDecorator
update(query, data) → attempt → failure → retry (up to N) → return or throw

// AuditDecorator
create(data) → delegate → log audit event → return

// TimestampsDecorator
create(data) → add createdAt/updatedAt → delegate → return
```

Decorators are order-dependent. The factory applies them in the correct sequence.

### Provider Injection

The factory resolves the provider through a multi-step lookup:

1. Check `context.provider` (explicit override)
2. Check tenant configuration (`tenant.config.persistence.provider`)
3. Check entity-specific configuration
4. Fall back to default provider (postgresql)

The resolved provider is passed to the adapter constructor.

### Factory Configuration

```js
{
  defaultProvider: 'postgresql',
  defaultCacheTTL: 300000,
  defaultRetryAttempts: 3,
  decorators: {
    cache: true,
    retry: true,
    audit: true,
    timestamps: true
  },
  adapters: {
    postgresql: PostgreSQLAdapter,
    sqlite: SQLiteAdapter,
    indexeddb: IndexedDBAdapter,
    redis: RedisAdapter,
    rest: RESTAdapter,
    graphql: GraphQLAdapter
  }
}
```

---

## 6. Repository Registry

The `RepositoryRegistry` is the central registry for all repository types. It lives at the engine level (not tenant-scoped) and knows about every available repository.

### Responsibilities

| Responsibility | Description |
|----------------|-------------|
| **Registration** | Register repository types with metadata and configuration |
| **Lookup** | Resolve repository instances by entity name |
| **Versioning** | Track repository versions for compatibility checks |
| **Metadata** | Store and expose repository metadata |
| **Dependency validation** | Verify all dependencies are registered |
| **Lazy loading** | Construct repository instances on first access |
| **Health status** | Report health status for each repository |

### Registry API

```js
// Registration
RepositoryRegistry.register(entityName, descriptor)

// Lookup (returns repository instance for context)
RepositoryRegistry.get(entityName, context) → Repository

// Check registration
RepositoryRegistry.isRegistered(entityName) → boolean

// List registered
RepositoryRegistry.list() → RepositoryMetadata[]

// Get metadata
RepositoryRegistry.metadata(entityName) → RepositoryMetadata

// Health check
RepositoryRegistry.health() → { entityName: 'up'|'down'|'degraded' }[]
```

### Registration Descriptor

```js
{
  class: ReservationRepository,        // Repository class (extends BaseRepository)
  metadata: {
    entityName: 'reservation',
    version: '1.0.0',
    dependencies: ['business', 'customer'],
    provider: 'postgresql',
    readOnly: false,
    aggregate: false,
    cacheable: true,
    searchable: true
  },
  config: {
    collection: 'reservations',
    cacheTTL: 300000,
    timeout: 5000,
    retryAttempts: 3,
    retryDelay: 1000
  }
}
```

### Validation on Registration

The registry validates every registration:

| Check | Rule |
|-------|------|
| Name uniqueness | No two repositories share the same entityName |
| Required fields | entityName, version, class must be present |
| Class interface | Class must implement BaseRepository methods |
| Dependency existence | All dependencies must be already registered or registered in same batch |
| Version format | Version must follow semver |

### Lazy Loading

Repository instances are NOT created at registration time. They are constructed lazily:

1. First call to `get(entityName, context)` triggers factory creation
2. Subsequent calls with same context return the cached instance
3. Different context → different instance (tenant-isolated)
4. Context disposal → instance marked for garbage collection

### Health Status

The registry checks each repository's health:

```js
RepositoryRegistry.health() → [
  { entityName: 'reservation', status: 'up', latency: 5 },
  { entityName: 'business', status: 'up', latency: 3 },
  { entityName: 'customer', status: 'degraded', latency: 2000 },
  { entityName: 'unavailable-provider', status: 'down', error: 'Connection refused' }
]
```

Health checks run:

- On registry initialization
- Periodically (configurable interval)
- On explicit request (admin health endpoint)

---

## 7. Unit of Work

The `UnitOfWork` (UoW) tracks changes to domain objects and commits them atomically.

### Lifecycle

```
begin()
  ↓
  register new/updated/deleted objects
  ↓
commit() or rollback()
  ↓
clear()
  ↓
dispose()
```

### API

| Method | Signature | Description |
|--------|-----------|-------------|
| `begin` | `() → void` | Start a new unit of work |
| `commit` | `() → Promise<void>` | Commit all tracked changes atomically |
| `rollback` | `() → Promise<void>` | Discard all tracked changes |
| `flush` | `() → Promise<void>` | Execute pending writes without ending UoW |
| `clear` | `() → void` | Clear tracked objects without ending UoW |
| `dispose` | `() → void` | Release resources |

### Change Tracking

The UoW tracks three categories:

```js
{
  new: Map<entityName, Entity[]>,
  dirty: Map<entityName, Entity[]>,
  deleted: Map<entityName, Entity[]>
}
```

Objects are registered automatically when repository operations are performed within a UoW scope:

```js
const uow = context.unitOfWork
const reservation = await context.repositories.reservation.create(data, { unitOfWork: uow })
// → reservation is registered in uow.new['reservation']

reservation.status = 'confirmed'
await context.repositories.reservation.update({ id: reservation.id }, reservation, { unitOfWork: uow })
// → reservation is moved to uow.dirty['reservation']

await context.repositories.reservation.delete({ id: reservation.id }, { unitOfWork: uow })
// → reservation is moved to uow.deleted['reservation']
```

### Commit Flow

```
commit()
  ↓
1. Validate → check all objects for invariants
  ↓
2. Order → topological sort by dependency (FK-safe)
  ↓
3. Execute → ordered writes in batches
  ↓
4. Verify → check write results, detect conflicts
  ↓
5. Emit events → on committed entities
  ↓
6. Clear → empty tracked changes
  ↓
return
```

### Rollback Flow

```
rollback()
  ↓
1. Discard → clear all tracked changes
  ↓
2. Reverse → if provider supports rollback, call it
  ↓
3. Emit events → on rolled-back changes
  ↓
4. Clear → empty tracked changes
  ↓
return
```

### Ownership

The UoW is owned by the transaction scope. It is created when a transaction begins and destroyed when the transaction ends.

```
TransactionManager.begin()
  → creates UnitOfWork instance
  → associates with RepositoryContext
  → returns { transaction, unitOfWork }

TransactionManager.commit()
  → calls unitOfWork.commit()
  → then calls provider commit
  → destroys unitOfWork

TransactionManager.rollback()
  → calls unitOfWork.rollback()
  → then calls provider rollback
  → destroys unitOfWork
```

### Nesting Rules

| Scenario | Behavior |
|----------|----------|
| Begin UoW inside active UoW | Parent UoW absorbs child operations. Child commit is no-op. Child rollback marks parent for rollback. |
| Commit child UoW | Child's changes are visible to parent but NOT committed to provider until parent commits. |
| Rollback child UoW | Marks parent for rollback. Parent commit becomes rollback. |
| Nested depth limit | Maximum 3 levels (configurable). Exceeding throws NestingLimitExceeded. |

```js
const parent = context.unitOfWork
const child = parent.begin()   // nested scope
// ... operations within child scope
await child.commit()           // merges into parent, no provider write
// ... more operations in parent scope
await parent.commit()          // single atomic provider write
```

---

## 8. Transaction Manager

The `TransactionManager` controls database transaction boundaries independent of the Unit of Work.

### Responsibilities

| Responsibility | Description |
|----------------|-------------|
| **Transaction scope** | begin, commit, rollback lifecycle |
| **Nested transactions** | savepoint-based nesting |
| **Savepoints** | Partial rollback within a transaction |
| **Rollback** | Explicit rollback with error context |
| **Timeouts** | Maximum duration per transaction |
| **Retry strategy** | Automatic retry on serialization failures |
| **Deadlock strategy** | Deadlock detection and resolution |
| **Future distributed** | Prepare phase for 2PC / Saga support |

### API

```js
// Begin transaction
const tx = await transactionManager.begin({
  timeout: 30000,
  isolationLevel: 'read_committed',
  retryAttempts: 3
})

// Commit
await transactionManager.commit(tx)

// Rollback
await transactionManager.rollback(tx, reason)

// Savepoint
const sp = await transactionManager.savepoint(tx, 'point1')
await transactionManager.rollbackToSavepoint(tx, sp)
await transactionManager.releaseSavepoint(tx, sp)

// Status
transactionManager.status(tx) → 'active'|'idle'|'failed'|'committed'|'rolled_back'
```

### Transaction Scope

The transaction scope determines which repositories participate:

| Scope | Behavior |
|-------|----------|
| `single` | Only the specified repository participates |
| `broadcast` | All write operations within context participate |
| `named` | Only repositories with matching transaction group name |

### Isolation Levels

| Level | Description | Provider Support |
|-------|-------------|------------------|
| `read_uncommitted` | Lowest isolation, dirty reads possible | PostgreSQL: no, MySQL: yes |
| `read_committed` | Default. Prevents dirty reads. | PostgreSQL: yes, MySQL: yes |
| `repeatable_read` | Prevents non-repeatable reads | PostgreSQL: yes, MySQL: yes |
| `serializable` | Highest isolation, full serialization | PostgreSQL: yes, MySQL: yes |
| `snapshot` | Snapshot isolation (MVCC) | PostgreSQL: yes, SQL Server: yes |

### Nested Transactions (Savepoints)

```js
const outer = await transactionManager.begin()
try {
  // ... operations
  const inner = await transactionManager.savepoint(outer, 'step1')
  try {
    // ... operations that might fail
    await transactionManager.releaseSavepoint(outer, inner)
  } catch (err) {
    await transactionManager.rollbackToSavepoint(outer, inner)
    // outer transaction continues
  }
  await transactionManager.commit(outer)
} catch (err) {
  await transactionManager.rollback(outer)
}
```

### Retry Strategy

```js
{
  enabled: true,
  maxAttempts: 3,
  baseDelay: 100,           // ms
  maxDelay: 2000,           // ms
  backoffFactor: 2,         // exponential
  retryableErrors: [
    'serialization_failure',
    'deadlock_detected',
    'connection_timeout'
  ]
}
```

### Deadlock Strategy

| Condition | Action |
|-----------|--------|
| Deadlock detected | Rollback victim transaction. Retry after backoff. |
| Repeated deadlock | Escalate to admin alert. Do not retry. |
| Cross-partition deadlock | Log and report. Manual resolution required. |

### Future Distributed Transactions

The TransactionManager architecture supports future distributed transactions:

```js
// Prepare phase (2PC)
const tx = await transactionManager.begin({ distributed: true })
await transactionManager.prepare(tx)   // prepare on all participants
await transactionManager.commit(tx)    // commit on all participants

// Saga compensation
const saga = await transactionManager.beginSaga(steps)
await saga.execute()
await saga.compensate()  // rollback in reverse order
```

---

## 9. Repository Adapter

The `RepositoryAdapter` is the bridge between repository operations and provider operations. It is a pure abstraction layer — no SQL, no ORM knowledge.

### Purpose

- Translate `find({ status: 'confirmed' })` → provider-specific query format
- Translate `create(data)` → provider-specific insert format
- Normalize provider results → canonical entity format
- Handle provider-specific error types → standardized errors
- Abstract pagination, sorting, field selection

### Adapter Interface

```js
class RepositoryAdapter {
  constructor(provider, config) {}

  // CRUD
  async find(query, options) → Entity[]
  async findOne(query, options) → Entity|null
  async findById(id, options) → Entity|null
  async create(data, options) → Entity
  async update(query, data, options) → Entity
  async delete(query, options) → boolean

  // Batch
  async bulkCreate(data[], options) → Entity[]
  async bulkUpdate(query, data, options) → number
  async bulkDelete(query, options) → number

  // Aggregation
  async count(query) → number
  async exists(query) → boolean
  async aggregate(pipeline, options) → any[]
  async distinct(field, query) → any[]

  // Search
  async search(text, options) → Entity[]

  // Transaction
  async beginTransaction(options) → TransactionHandle
  async commitTransaction(handle) → void
  async rollbackTransaction(handle) → void

  // Health
  async ping() → boolean
  async health() → { status, latency }
}
```

### Translation Layer

Each provider type has its own adapter implementation:

```js
// SQL Adapter (PostgreSQL, SQLite, MySQL)
// Translates: find({ status: 'confirmed', date: { $gte: '2025-01-01' } })
// To: SELECT * FROM reservations WHERE status = $1 AND date >= $2

// REST Adapter
// Translates: find({ status: 'confirmed' })
// To: GET /api/reservations?status=confirmed

// GraphQL Adapter
// Translates: find({ status: 'confirmed' }, { fields: ['id', 'status'] })
// To: query { reservations(where: { status: "confirmed" }) { id status } }

// IndexedDB Adapter
// Translates: find({ status: 'confirmed' })
// To: db.transaction('reservations').objectStore('reservations').index('status').getAll('confirmed')

// Redis Adapter
// Translates: find({ status: 'confirmed' })
// To: SCAN 0 MATCH reservations:confirmed:* ...
```

### Query Object Format

The adapter receives standardized query objects (defined in PERSISTENCE-CONTRACTS.md):

```js
{
  filters: { status: 'confirmed', date: { $gte: '2025-01-01' } },
  sort: { createdAt: -1 },
  fields: ['id', 'status', 'date'],
  limit: 50,
  offset: 0,
  include: ['business', 'customer']  // relationships to eager-load
}
```

### Result Normalization

All adapters return results in canonical format:

```js
// Single entity
{
  id: 'uuid',
  status: 'confirmed',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z'
}

// Collection
[{ ... }, { ... }]

// Paginated
{
  data: [{ ... }, { ... }],
  total: 150,
  page: 1,
  size: 50,
  totalPages: 3
}
```

---

## 10. Aggregate Support

### Aggregate Root

An Aggregate Root is the entry point for a consistency boundary. In Valdi Engine:

```
Business (Aggregate Root)
├── Locations (child entities)
├── OperatingHours (value objects)
├── Media (child entities)
└── Services (child entities)

Reservation (Aggregate Root)
├── Items (child entities)
├── Payments (child entities)
└── CommunicationLog (child entities)

Destination (Aggregate Root)
├── Localities (child entities)
├── Places (child entities)
├── Routes (child entities)
└── Stories (child entities)
```

### AggregateRepository

The `AggregateRepository` ensures aggregate consistency:

```js
// Load aggregate with all children
const business = await context.repositories.business.load(businessId)
// business.locations → loaded
// business.services → loaded

// Modify within aggregate boundary
business.addService(newService)
business.updateLocation(locationId, newData)

// Save entire aggregate atomically
await context.repositories.business.save(business, { unitOfWork: uow })
// → saves business root + new service + updated location in single transaction
```

### Child Entities

Children are only accessible through their aggregate root:

```js
// ✅ Correct
const business = await context.repositories.business.load(id)
const services = business.services

// ❌ Wrong — direct child access bypassing aggregate boundary
const services = await context.repositories.service.find({ businessId: id })
```

### Consistency Boundaries

| Rule | Description |
|------|-------------|
| Invariant enforcement | Aggregate root validates all invariants before save |
| Child identity | Children are identified within aggregate scope (local ID + aggregate FK) |
| Cascade operations | Deleting root deletes all children |
| Reference only | Other aggregates reference by ID, never hold direct reference |
| Transactional | Aggregate save/delete is always atomic |

### Cascade Operations

| Operation | Effect on children |
|-----------|-------------------|
| `save(root)` | All new/updated children are persisted; deleted children are removed |
| `load(id)` | All children are loaded with the root (configurable eager/lazy) |
| `remove(id)` | Root and all children are deleted |

### Domain Invariants

Domain invariants are enforced at the aggregate level, not in repositories:

```js
class Business extends AggregateRoot {
  addService(service) {
    // INVARIANT: Business must have at least one location before adding services
    if (this.locations.length === 0) {
      throw new DomainInvariantError('Business must have at least one location')
    }
    this.services.push(service)
  }
}
```

Repositories do NOT enforce business rules — they enforce data integrity (uniqueness, required fields, referential constraints).

---

## 11. Error Strategy

### Error Hierarchy

```
RepositoryError (base)
├── ConcurrencyError        — Optimistic lock failure, version conflict
├── TransactionError        — Transaction commit/rollback failure
├── NotFoundError           — Entity not found
├── DuplicateError          — Unique constraint violation
├── ValidationError         — Data validation failure (schema level)
├── ProviderUnavailableError — Provider connection lost
├── ConflictError           — Business rule violation (non-technical)
├── TimeoutError            — Operation exceeded timeout
├── PermissionsError        — Insufficient permissions
└── QueryError              — Malformed or invalid query
```

### Error Context

Every error includes structured context:

```js
{
  name: 'NotFoundError',
  message: 'Reservation with id abc-123 not found',
  entityName: 'reservation',
  entityId: 'abc-123',
  repository: 'ReservationRepository',
  operation: 'findById',
  context: {
    tenant: 'tenant-xyz',
    identity: 'user-456'
  },
  timestamp: '2025-01-01T00:00:00Z',
  cause: null  // original error if wrapped
}
```

### Error Handling Rules

| Rule | Behavior |
|------|----------|
| NotFoundError | Returns null from findOne/findById. Throws from update/delete. |
| DuplicateError | Throws on create/upsert. Caller checks exists() first. |
| ConcurrencyError | Triggers retry if retry strategy enabled. Otherwise throws. |
| TransactionError | Automatic rollback. Logs full context. |
| ProviderUnavailableError | Health monitoring alerted. Circuit breaker opens. |
| ValidationError | Returns validation details. Never retried. |
| PermissionsError | Logs security event. Never retried. |

### Error Propagation

```
ProviderError
  → Adapter translates to RepositoryError
    → Repository may wrap with context
      → UnitOfWork collects errors
        → Capability handles or propagates
          → Business service decides retry / compensate / fail
```

Repositories never swallow errors. They always translate and propagate.

---

## 12. Dependency Rules

### Strict Dependency Chain

```
Capabilities
    ↓
Repository (domain-specific interface)
    ↓
Persistence Contract (PERSISTENCE-CONTRACTS.md)
    ↓
Provider (physical data source)
    ↓
Database (actual storage)
```

### Rules

| Rule | Description |
|------|-------------|
| **Never inverted** | Capabilities never import providers. Providers never import capabilities. |
| **Repositories never know capabilities** | A repository does not know which capability is calling it. It serves any caller. |
| **Capabilities never know providers** | Capabilities call `context.repositories.find()` — they have no reference to provider, adapter, or database. |
| **Providers never know business rules** | Providers execute data operations. They do not validate business invariants. |
| **Persistence Contracts are the shared language** | Both repositories and providers reference PERSISTENCE-CONTRACTS.md contracts. Neither imports the other's code. |
| **RepositoryContext owns scope** | Tenant, identity, transaction, and permissions are resolved in context, not in repository logic. |
| **UnitOfWork owns transactions** | The UoW manages change tracking and commit ordering. Repositories do not call commit/rollback directly. |
| **TransactionManager owns commits** | Only TransactionManager calls provider.begin/commit/rollback. Repositories participate through UoW. |

### What Belongs Where

| Concern | Belongs In |
|---------|------------|
| Business rules | Capability / Aggregate Root |
| Data validation (schema) | Persistence Contract |
| Query construction | Repository Adapter |
| Connection management | Provider |
| Change tracking | Unit of Work |
| Transaction boundaries | Transaction Manager |
| Caching | Repository Decorator (CacheDecorator) |
| Retry logic | Repository Decorator (RetryDecorator) |
| Audit logging | Repository Decorator (AuditDecorator) |
| Permission checks | RepositoryContext → resolved before repository call |

---

## 13. Architecture Rules

### Immutable Rules

| ID | Rule | Rationale |
|----|------|-----------|
| REP-001 | Repositories never import capability modules | Circular dependency prevention |
| REP-002 | Capabilities never import repository classes (only use context.repositories) | Decoupling |
| REP-003 | Repository adapters contain zero business logic | Adapters translate, they do not decide |
| REP-004 | Unit of Work must be created by TransactionManager, never by capabilities | Ownership clarity |
| REP-005 | Every repository operation must be traceable to a tenant | Multi-tenant isolation |
| REP-006 | Repository instances are scoped to RepositoryContext | Tenant isolation, request isolation |
| REP-007 | Repository types are registered once at bootstrap | Registration is a platform concern |
| REP-008 | No repository method may call another repository directly | Use Unit of Work for cross-repository coordination |
| REP-009 | Aggregate children are only accessible through their root | Consistency boundary enforcement |
| REP-010 | All repository errors must be instances of RepositoryError (or subclass) | Error handling consistency |
| REP-011 | RepositoryDecorator chain order is fixed: Cache → Retry → Audit → Timestamps | Predictable behavior |
| REP-012 | RepositoryFactory is the only way to create repository instances | Construction consistency |
| REP-013 | Unit of Work nesting is limited to 3 levels | Prevent runaway nesting |
| REP-014 | TransactionManager isolation level defaults to read_committed | Safety first, performance opt-in |

### Layer Violations (Never Allowed)

```js
// ❌ Capability calling provider directly
context.provider.query('SELECT * FROM reservations')

// ❌ Capability importing repository class
import { ReservationRepository } from '../repositories/reservation.repository.js'

// ❌ Repository importing capability
import { reservationEvents } from '../../capabilities/reservation/reservation.events.js'

// ❌ Adapter containing business logic
if (reservation.status === 'confirmed') { /* business rule */ }

// ❌ Repository calling another repository directly
const business = await this.otherRepositories.business.findById(id)

// ❌ Capability managing transaction directly
await provider.beginTransaction()
```

---

## 14. Future Integration

This architecture is designed to support any provider type without changing capabilities, repositories, or contracts.

### PostgreSQL

| Aspect | Integration |
|--------|-------------|
| Adapter | `PostgreSQLAdapter` translates query objects to parameterized SQL |
| Provider | `PostgreSQLProvider` manages connection pool, prepared statements |
| Transaction | Native PostgreSQL transactions via `BEGIN/COMMIT/ROLLBACK` |
| Search | Full-text search via `tsvector` mapped through adapter |
| Offline | Not natively offline; requires sync layer |

### SQLite

| Aspect | Integration |
|--------|-------------|
| Adapter | `SQLiteAdapter` (same interface as PostgreSQL, different SQL dialect) |
| Provider | `SQLiteProvider` manages single-file database, WAL mode |
| Transaction | Native SQLite transactions |
| Offline | First-class offline support — database is a local file |
| Sync | Change tracking for sync to remote PostgreSQL |

### IndexedDB

| Aspect | Integration |
|--------|-------------|
| Adapter | `IndexedDBAdapter` translates query objects to IDB operations |
| Provider | `IndexedDBProvider` manages database open, object stores, indexes |
| Transaction | IDB transactions (auto-committed on microtask) |
| Offline | Native browser offline storage |
| Sync | Background sync with remote provider |

### Redis

| Aspect | Integration |
|--------|-------------|
| Adapter | `RedisAdapter` maps find → key patterns, create → SET/HSET |
| Provider | `RedisProvider` manages connection pool, cluster support |
| Transaction | Redis MULTI/EXEC for atomic batches |
| Use case | Cache, session store, rate limiting, real-time counters |
| Limitations | No complex queries, no joins, no full-text search |

### Supabase

| Aspect | Integration |
|--------|-------------|
| Adapter | `SupabaseAdapter` builds on REST or PostgreSQL adapter |
| Provider | `SupabaseProvider` uses Supabase JS client or direct REST |
| Auth | Identity provider integration with Supabase Auth |
| Realtime | WebSocket subscriptions for live updates |
| Storage | File storage provider for media |

### Firebase

| Aspect | Integration |
|--------|-------------|
| Adapter | `FirestoreAdapter` translates query objects to Firestore queries |
| Provider | `FirebaseProvider` manages Firebase Admin SDK |
| Auth | Identity provider integration with Firebase Auth |
| Realtime | Firestore onSnapshot for live updates |
| Offline | Firestore native offline persistence |

### MongoDB

| Aspect | Integration |
|--------|-------------|
| Adapter | `MongoDBAdapter` translates query objects to MongoDB queries (native match) |
| Provider | `MongoDBProvider` manages connection pool, replica sets |
| Transaction | MongoDB transactions (replica sets required) |
| Search | MongoDB Atlas Search for full-text |
| Aggregation | Native aggregation pipeline support |

### REST API

| Aspect | Integration |
|--------|-------------|
| Adapter | `RESTAdapter` translates query objects to URL parameters + request body |
| Provider | `RESTProvider` manages HTTP client, auth headers, rate limiting |
| Transaction | Not natively supported; use saga pattern |
| Caching | HTTP cache headers via CacheDecorator |

### GraphQL

| Aspect | Integration |
|--------|-------------|
| Adapter | `GraphQLAdapter` translates query objects to GraphQL queries |
| Provider | `GraphQLProvider` manages Apollo/URQL client, fragments |
| Batching | Automatic query batching via DataLoader |
| Caching | Normalized cache via CacheDecorator |

### gRPC

| Aspect | Integration |
|--------|-------------|
| Adapter | `GRPCAdapter` maps repository operations to protobuf messages |
| Provider | `GRPCProvider` manages gRPC client, channels, streaming |
| Performance | Binary protocol, HTTP/2 multiplexing |
| Use case | Inter-service communication, microservices |

### Object Storage

| Aspect | Integration |
|--------|-------------|
| Adapter | `StorageAdapter` maps media operations to storage provider |
| Provider | `S3Provider`, `GCSProvider`, `BlobProvider` |
| Operations | upload, download, delete, list, getSignedUrl |
| Integration | Media entities reference storage keys via repository |

### Switching Providers

To switch a repository from one provider to another:

1. Register new provider in provider manager
2. Update `RepositoryConfiguration.providerName` for the entity
3. Factory resolves the new adapter automatically
4. No capability code changes required

This is the fundamental guarantee of the Repository + Adapter architecture.

---

## 15. Validation Checklist

### Provider Agnostic

| Check | Criterion |
|-------|-----------|
| ✓ | No SQL strings in any repository or capability |
| ✓ | No provider-specific types referenced outside adapters |
| ✓ | Adapter interface is identical across all provider types |
| ✓ | RepositoryFactory selects adapter based on configuration, not hardcoded types |
| ✓ | Error translation in adapter maps provider errors to standard RepositoryErrors |

### Offline Compatible

| Check | Criterion |
|-------|-----------|
| ✓ | Repositories return Promises (async-ready for IndexedDB, SQLite) |
| ✓ | UnitOfWork supports partial commits for sync scenarios |
| ✓ | Change tracking provides diff for sync reconciliation |
| ✓ | RepositoryMetadata includes `cacheable` flag for offline-first entities |
| ✓ | NotFoundError distinguishes between "not in offline cache" and "does not exist" |

### Multi-Tenant

| Check | Criterion |
|-------|-----------|
| ✓ | RepositoryContext includes `tenant` property |
| ✓ | All queries include tenant filter (injected by adapter, not repository) |
| ✓ | Provider resolution is tenant-aware (different databases per tenant or row-level) |
| ✓ | Repository instances are scoped to context (tenant-isolated) |
| ✓ | Registry health reports per-tenant status |

### Multi-Destination

| Check | Criterion |
|-------|-----------|
| ✓ | RepositoryContext includes `destination` property |
| ✓ | Destination-scoped queries filter by destination automatically |
| ✓ | Cross-destination queries require explicit override |
| ✓ | Aggregate roots respect destination boundaries |

### Event-Driven

| Check | Criterion |
|-------|-----------|
| ✓ | Repository write operations emit events through context.eventBus |
| ✓ | UnitOfWork.commit() emits batch commit event |
| ✓ | UnitOfWork.rollback() emits rollback event |
| ✓ | Repository events include full entity snapshot |
| ✓ | AuditDecorator emits audit events without capability involvement |

### Transaction Ready

| Check | Criterion |
|-------|-----------|
| ✓ | TransactionManager provides begin/commit/rollback |
| ✓ | UnitOfWork integrates with TransactionManager |
| ✓ | Savepoints supported for nested transactions |
| ✓ | Retry strategy handles serialization failures |
| ✓ | Deadlock detection and automatic rollback of victim |
| ✓ | Timeout enforcement prevents long-running transactions |

### Scalable

| Check | Criterion |
|-------|-----------|
| ✓ | Read/Write repository separation allows read replica scaling |
| ✓ | RepositoryFactory supports connection pooling through provider |
| ✓ | CacheDecorator reduces redundant provider calls |
| ✓ | Bulk operations reduce round trips |
| ✓ | Pagination prevents unbounded result sets |
| ✓ | Lazy repository construction reduces memory at boot |

### Future Proof

| Check | Criterion |
|-------|-----------|
| ✓ | RepositoryAdapter interface is provider-agnostic |
| ✓ | Distributed transaction preparation hooks exist |
| ✓ | Saga compensation pattern is supported |
| ✓ | New providers require only: adapter + provider class, zero repository changes |
| ✓ | RepositoryDecorator pattern allows adding concerns without modifying repositories |
| ✓ | Aggregates provide clear boundaries for future event sourcing |
| ✓ | Registry versioning supports migration paths |

---

> **Next:** P12.0.3 — Entity Repository Implementation (domain-specific repository classes for all 25 entities defined in DATABASE-BLUEPRINT.md)
