# ORM Adapter Architecture

> P12.0.4 — The abstraction layer between the Repository Engine and future ORM implementations.
> No ORM implementation. No SQL. No database connection. Abstract only.

---

## 1. Purpose

### Why the ORM Adapter Exists

The Repository Engine (P12.0.3) communicates with data sources through `RepositoryAdapter` — a thin abstract interface. Below this interface, future ORM implementations (Drizzle, Prisma, Knex, Mongoose, Supabase, SQLite) will need a common contract that the engine can depend on without knowing which ORM is in use.

The ORM Adapter Layer provides this contract. It is the **translation layer** between:

```
Repository Engine (P12.0.3)
    ↓  RepositoryAdapter interface
ORM Adapter Layer (P12.0.4) ← YOU ARE HERE
    ↓  OrmAdapter interface
Database Provider (P12.0.5+)
    ↓
Database
```

### What It Is Not

- Not an ORM implementation
- Not a query builder
- Not a database connection
- Not a migration tool
- Not a schema definition language

It is **pure abstraction** — interfaces, mapping rules, translation logic, and error contracts that every future ORM implementation must satisfy.

### Design Goals

1. **Repository Engine never knows ORM** — The engine talks to `RepositoryAdapter`, which delegates to `OrmAdapter`. No ORM concept leaks upward.
2. **OrmAdapter never knows business rules** — The adapter translates data and queries. Domain logic lives in capabilities.
3. **Entity mapping is bidirectional** — Domain entities become persistence models, persistence models become ORM records, and back.
4. **Query mapping preserves intent** — Repository query semantics (filters, sort, paginate, search, aggregate) survive the translation to ORM-native queries.
5. **Transactions bridge cleanly** — `UnitOfWork` (engine-level) operations map to ORM transaction operations without leaking transaction management upward.
6. **Schema mapping enables auto-migration** — The DATABASE-BLUEPRINT.md entity definitions can produce ORM schema metadata for future migration tooling.

---

## 2. Architecture Position

### Layer Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Capabilities                           │
│  context.repositories.reservation.find({...})            │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                 Repository Engine                         │
│  RepositoryRegistry → RepositoryFactory → BaseRepository  │
│                                                           │
│  BaseRepository delegates to RepositoryAdapter            │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                 RepositoryAdapter                        │
│  Abstract: find, create, update, delete, paginate, ...   │
│  Concrete: delegates to OrmAdapter                       │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│               ORM Adapter Layer                          │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ OrmAdapter   │  │ EntityMapper │  │ QueryMapper  │   │
│  │ (abstract)   │  │ (bidirect)   │  │ (translation)│   │
│  └──────┬───────┘  └──────────────┘  └──────────────┘   │
│         │                                                 │
│  ┌──────┴───────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ TxBridge     │  │ SchemaMapper │  │  Factory     │   │
│  │ (UoW↔ORM)    │  │ (blueprint)  │  │ (dynamic)    │   │
│  └──────────────┘  └──────────────┘  └──────┬───────┘   │
│                                              │            │
│  ┌──────────────┐  ┌──────────────┐          │            │
│  │  Registry    │  │    Errors    │          │            │
│  │ (metadata)   │  │ (hierarchy)  │          │            │
│  └──────────────┘  └──────────────┘          │            │
│                                              │            │
└─────────────────────┬────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              Database Provider (P12.0.5+)                │
│  DrizzleAdapter, PrismaAdapter, KnexAdapter, ...         │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                     Database                              │
│  PostgreSQL, SQLite, MySQL, MongoDB, Supabase, ...        │
└─────────────────────────────────────────────────────────┘
```

### Data Flow: Read

```
Capability: context.repositories.reservation.findMany({ status: 'confirmed' })
    ↓
BaseRepository#findMany(query)
    → _buildQuery(query) → adds tenant/destination/soft-delete filters
    → this.#adapter.find(query, options)
    ↓
RepositoryAdapter#find(query, options)
    → this.ormAdapter.find(query, options)
    ↓
OrmAdapter#find(query, options)
    → OrmQueryMapper.toOrmQuery(query)
    → ormModel.findMany(ormQuery)
    ↓
Database Provider executes query
    ↓
Result rows returned to OrmAdapter
    → OrmEntityMapper.fromOrm(entityName, row)
    → Domain entity returned
    ↓
RepositoryAdapter returns entity
    ↓
BaseRepository returns entity
    ↓
Capability receives entity
```

### Data Flow: Write

```
Capability: context.repositories.reservation.create(data)
    ↓
BaseRepository#create(data, options)
    → this.#adapter.create(data, options)
    ↓
RepositoryAdapter#create(data, options)
    → this.ormAdapter.create(data, options)
    ↓
OrmAdapter#create(data, options)
    → OrmEntityMapper.toOrm(entityName, data)
    → ormModel.create(ormData)
    ↓
Database Provider inserts row
    ↓
Result returned to OrmAdapter
    → OrmEntityMapper.fromOrm(entityName, row)
    → Domain entity returned
    ↓
... back up the chain
```

### Transaction Flow

```
Capability begins transaction through TransactionManager:
    engine.beginTransaction({ isolationLevel: 'read_committed' })
    ↓
TransactionManager.begin()
    → creates UnitOfWork
    → returns { transaction, unitOfWork }
    ↓
OrmTransactionBridge.begin(unitOfWork, ormSession)
    → unitOfWork tracks changes
    → ormSession.beginTransaction()
    ↓
Capability performs operations within UoW scope
    ↓
UnitOfWork.commit()
    → OrmTransactionBridge.commit(bridge)
        → unitOfWork.commit()  → validate, order, execute
        → ormSession.commitTransaction()
    ↓
Or on error:
    OrmTransactionBridge.rollback(bridge, reason)
        → unitOfWork.rollback()
        → ormSession.rollbackTransaction()
```

---

## 3. Component Reference

### 3.1 OrmAdapter (Abstract)

File: `capabilities/persistence/adapters/orm/orm.adapter.js`

The abstract base class for all ORM adapters. Every future ORM implementation extends this class and implements its 22 abstract methods.

**Constructor:** `(model, config)` — receives the ORM model class and configuration.

**Key methods:**

| Category | Methods |
|----------|---------|
| Lifecycle | `initialize()`, `destroy()`, `ping()` |
| Read | `find()`, `findOne()`, `findById()`, `findAll()`, `count()`, `exists()` |
| Write | `create()`, `createMany()`, `update()`, `updateMany()`, `delete()`, `softDelete()`, `restore()`, `upsert()` |
| Query | `paginate()`, `search()`, `aggregate()`, `distinct()`, `projection()` |
| Batch | `bulkCreate()`, `bulkUpdate()`, `bulkDelete()` |
| Mapping | `toEntity()`, `fromEntity()` |

### 3.2 OrmEntityMapper

File: `capabilities/persistence/adapters/orm/orm.entity.mapper.js`

Bidirectional mapper between domain entities and persistence/ORM models.

**Responsibilities:**
- Register entity-to-table mappings
- Map value objects to persistence fields
- Flatten embedded objects into columns (with prefix support)
- Map relation foreign keys
- Handle enums, timestamps, version fields, tenant/destination isolation fields
- Batch mapping for bulk operations

**Concepts:**
- `field.source` — domain entity field name
- `field.target` — persistence/ORM field name
- `valueObjects` — value object serialization/deserialization
- `embedded` — embedded object flattening/extraction
- `relations` — relation foreign key mapping

### 3.3 OrmQueryMapper

File: `capabilities/persistence/adapters/orm/orm.query.mapper.js`

Translates repository query objects into ORM-specific query objects.

**Supported operators:**

| Operator | ORM Mapping |
|----------|-------------|
| `eq` | `=` |
| `ne` | `!=` |
| `gt`, `gte`, `lt`, `lte` | `>`, `>=`, `<`, `<=` |
| `in`, `notIn` | `in`, `notIn` |
| `contains`, `notContains` | `contains`, `notContains` |
| `startsWith`, `endsWith` | `startsWith`, `endsWith` |
| `between` | `gte` + `lte` |
| `like`, `ilike` | `like`, `ilike` |
| `isNull`, `isNotNull` | `isNull`, `isNotNull` |
| `and`, `or`, `not` | `AND`, `OR`, `NOT` |

**Supported query features:**
- Filters (simple, nested, logical)
- Sorting (single field, multi-field, direction)
- Pagination (offset-based, cursor-based)
- Projections (field selection)
- Includes/relations (eager loading)
- Full-text search (with configurable search fields)
- Aggregation pipeline mapping

### 3.4 OrmTransactionBridge

File: `capabilities/persistence/adapters/orm/orm.transaction.bridge.js`

Bridges the Repository Engine's `UnitOfWork` with ORM-specific transaction management.

**Bridging logic:**

| Engine Operation | ORM Operation |
|-----------------|---------------|
| `TransactionManager.begin()` | `ormSession.beginTransaction()` |
| `TransactionManager.commit()` | `uow.commit()` → `ormSession.commitTransaction()` |
| `TransactionManager.rollback()` | `uow.rollback()` → `ormSession.rollbackTransaction()` |
| `TransactionManager.savepoint()` | `uow.begin()` → `ormSession.savepoint()` |
| `TransactionManager.rollbackToSavepoint()` | `uow.rollback()` → `ormSession.rollbackToSavepoint()` |
| `TransactionManager.releaseSavepoint()` | `uow.dispose()` → `ormSession.releaseSavepoint()` |

**Retry strategy:** Automatic retry with exponential backoff on serialization failures and deadlocks (configurable attempts/delay).

### 3.5 OrmSchemaMapper

File: `capabilities/persistence/adapters/orm/orm.schema.mapper.js`

Maps the DATABASE-BLUEPRINT.md entity definitions to ORM schema metadata for future migration tooling.

**Capabilities:**
- Register entity schema with columns, indexes, constraints
- Generate CREATE TABLE metadata from entity schema
- Generate ALTER TABLE metadata (column diff)
- Extract validation rules from schema definitions
- Produce migration metadata for future migration generators

### 3.6 OrmFactory

File: `capabilities/persistence/adapters/orm/orm.factory.js`

Dynamically creates ORM adapter instances based on registered providers and adapters.

**Construction flow:**
1. `OrmFactory.create('reservation', context)`
2. Look up registered adapter class for 'reservation'
3. Resolve provider from context (or default)
4. Get ORM model from provider class
5. Construct adapter instance with model + config
6. Apply decorators (cache, retry, audit)
7. Initialize adapter
8. Return instance (cached per tenant)

### 3.7 OrmRegistry

File: `capabilities/persistence/adapters/orm/orm.registry.js`

Maintains metadata about available ORM implementations.

**Information per ORM:**
- Name, version
- Adapter class, provider class
- Supported dialects (postgresql, sqlite, mysql, mongodb)
- Capabilities (transactions, migrations, replication, etc.)
- Options and metadata

### 3.8 Orm Errors

File: `capabilities/persistence/adapters/orm/orm.errors.js`

10 error types:

| Error | When |
|-------|------|
| `OrmError` | Base — generic ORM error |
| `OrmMappingError` | Entity or query mapping failure |
| `OrmQueryError` | Invalid query construction |
| `OrmSchemaError` | Schema mapping or validation failure |
| `OrmTransactionError` | Transaction lifecycle failure |
| `OrmConnectionError` | Connection establishment or loss |
| `OrmConfigurationError` | Misconfiguration |
| `OrmValidationError` | Data validation failure |
| `OrmNotImplementedError` | Abstract method not implemented |
| `OrmProviderError` | Provider resolution failure |

### 3.9 Orm Events

File: `capabilities/persistence/adapters/orm/orm.events.js`

22 lifecycle events for observability and cross-capability communication. See the README in the ORM adapters directory for the full event table.

---

## 4. Future ORM Implementations

Designed for (not implemented):

### Drizzle ORM

- **Dialects:** PostgreSQL, MySQL, SQLite, Turso
- **Adapter pattern:** Extends `OrmAdapter`, uses Drizzle's relational query builder
- **Mapping:** `OrmEntityMapper` already maps to Drizzle-friendly column types
- **Transactions:** Drizzle's `db.transaction()` wrapped by `OrmTransactionBridge`
- **Migrations:** `OrmSchemaMapper.prepareCreateTable()` → Drizzle push/`drizzle-kit`

### Prisma

- **Dialects:** PostgreSQL, MySQL, SQLite, MongoDB, CockroachDB
- **Adapter pattern:** Extends `OrmAdapter`, uses Prisma Client
- **Mapping:** `OrmEntityMapper` maps domain entities to Prisma model shapes
- **Transactions:** Prisma's interactive transactions wrapped by `OrmTransactionBridge`
- **Migrations:** `OrmSchemaMapper` → Prisma schema DSL → `prisma migrate`

### Knex

- **Dialects:** PostgreSQL, MySQL, SQLite, MSSQL, Oracle
- **Adapter pattern:** Extends `OrmAdapter`, uses Knex query builder
- **Mapping:** Direct column mapping via `OrmEntityMapper`
- **Transactions:** Knex transactional scope wrapped by `OrmTransactionBridge`
- **Migrations:** Knex migration API from `OrmSchemaMapper`

### Mongoose

- **Dialects:** MongoDB
- **Adapter pattern:** Extends `OrmAdapter`, uses Mongoose models
- **Mapping:** Schema → Mongoose Schema definition
- **Transactions:** Mongoose sessions wrapped by `OrmTransactionBridge`
- **Migrations:** Change streams and schema versioning

### Supabase ORM

- **Dialects:** PostgreSQL (Supabase)
- **Adapter pattern:** Extends `OrmAdapter`, uses Supabase JS client
- **Mapping:** Table mapping via `OrmEntityMapper`
- **Transactions:** Supabase RPC-based transactions
- **Migrations:** Supabase migration CLI

### SQLite ORM (better-sqlite3 / Bun)

- **Dialects:** SQLite
- **Adapter pattern:** Extends `OrmAdapter`, uses better-sqlite3 or Bun SQLite
- **Mapping:** Direct column mapping
- **Transactions:** SQLite transactions wrapped by `OrmTransactionBridge`
- **Migrations:** Schema version table + incremental migrations

---

## 5. Migration Strategy

### Adding an ORM Implementation

```
P12.0.5: Implement first Database Provider
    → providers/(provider-name)/(provider-name).provider.js
    → extends OrmAdapter
    → registers in OrmRegistry
    → registers in RepositoryFactory
```

1. Create provider directory under `providers/`
2. Extend `OrmAdapter` with concrete implementations
3. Register entity mappings in `OrmEntityMapper`
4. Register query mappings in `OrmQueryMapper`
5. Wire `OrmTransactionBridge` with ORM's transaction API
6. Register provider in `OrmRegistry`
7. Register provider class in `OrmFactory`
8. Test against Repository Engine (no capability changes)

### Switching ORM

1. Implement new ORM provider class
2. Register it in the ORM Registry
3. Update provider configuration in tenant/engine config
4. No capability code changes
5. No repository code changes

---

## 6. Architecture Rules

| Rule | Description |
|------|-------------|
| ORM-001 | OrmAdapter must never import from capabilities/, engine/, or contracts/ |
| ORM-002 | OrmAdapter methods must be async — all persistence is asynchronous |
| ORM-003 | Entity mapper is the only component that knows both domain and persistence shapes |
| ORM-004 | Query mapper must be stateless — same input always produces same output |
| ORM-005 | Transaction bridge must never hold business logic — only transaction translation |
| ORM-006 | No ORM adapter may call another ORM adapter directly |
| ORM-007 | Events emitted by ORM layer must use `orm:` prefix |
| ORM-008 | Errors thrown by ORM layer must extend `OrmError` |
| ORM-009 | Factory must cache adapter instances per tenant |
| ORM-010 | Registry must be read-only after initialization |

---

## 7. File Reference

| File | Path |
|------|------|
| OrmAdapter | `capabilities/persistence/adapters/orm/orm.adapter.js` |
| OrmEntityMapper | `capabilities/persistence/adapters/orm/orm.entity.mapper.js` |
| OrmQueryMapper | `capabilities/persistence/adapters/orm/orm.query.mapper.js` |
| OrmTransactionBridge | `capabilities/persistence/adapters/orm/orm.transaction.bridge.js` |
| OrmSchemaMapper | `capabilities/persistence/adapters/orm/orm.schema.mapper.js` |
| OrmFactory | `capabilities/persistence/adapters/orm/orm.factory.js` |
| OrmRegistry | `capabilities/persistence/adapters/orm/orm.registry.js` |
| OrmErrors | `capabilities/persistence/adapters/orm/orm.errors.js` |
| OrmEvents | `capabilities/persistence/adapters/orm/orm.events.js` |
| README | `capabilities/persistence/adapters/orm/README.md` |
| Architecture | `docs/architecture/ORM-ADAPTER-ARCHITECTURE.md` |
