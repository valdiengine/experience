# ORM Adapter Layer

> P12.0.4 — The abstraction layer between Repository Engine and future ORM implementations.
> No ORM implementation. Abstract only.

## Layer Position

```
Capabilities
    ↓
Repositories
    ↓
Repository Engine
    ↓
RepositoryAdapter
    ↓
┌────────────────────────────────┐
│       ORM Adapter Layer        │ ← YOU ARE HERE
├────────────────────────────────┤
│  OrmAdapter (abstract)         │
│  OrmEntityMapper               │
│  OrmQueryMapper                │
│  OrmTransactionBridge          │
│  OrmSchemaMapper               │
│  OrmFactory                    │
│  OrmRegistry                   │
└────────────────────────────────┘
    ↓
Database Provider (P12.0.5+)
    ↓
Database
```

## Files

| File | Responsibility | Stubs |
|------|---------------|-------|
| `orm.adapter.js` | Abstract ORM contract — 22 abstract methods | 22 |
| `orm.entity.mapper.js` | Domain ↔ Persistence ↔ ORM model translation | 12 methods |
| `orm.query.mapper.js` | Repository queries → ORM query format | 5 public, 10 private |
| `orm.transaction.bridge.js` | UnitOfWork ↔ ORM transaction bridging | 9 methods |
| `orm.schema.mapper.js` | Database blueprint → ORM schema metadata | 6 public methods |
| `orm.errors.js` | 10 ORM-specific error types | 10 classes |
| `orm.events.js` | 22 ORM lifecycle events | 22 event constants |
| `orm.factory.js` | Dynamic ORM adapter creation | 10 methods |
| `orm.registry.js` | ORM implementation registry | 12 methods |

## OrmAdapter (Abstract)

22 abstract methods mirroring RepositoryAdapter:

| Method | Signature |
|--------|-----------|
| `initialize` | `() → Promise<void>` |
| `destroy` | `() → Promise<void>` |
| `ping` | `() → Promise<boolean>` |
| `find` | `(query, options) → Promise<Entity[]>` |
| `findOne` | `(query, options) → Promise<Entity\|null>` |
| `findById` | `(id, options) → Promise<Entity\|null>` |
| `findAll` | `(options) → Promise<Entity[]>` |
| `count` | `(query) → Promise<number>` |
| `exists` | `(query) → Promise<boolean>` |
| `create` | `(data, options) → Promise<Entity>` |
| `createMany` | `(data, options) → Promise<Entity[]>` |
| `update` | `(query, data, options) → Promise<Entity>` |
| `updateMany` | `(query, data, options) → Promise<number>` |
| `delete` | `(query, options) → Promise<boolean>` |
| `softDelete` | `(query, options) → Promise<boolean>` |
| `restore` | `(query, options) → Promise<boolean>` |
| `upsert` | `(query, data, options) → Promise<Entity>` |
| `paginate` | `(query, page, size, options) → Promise<Page>` |
| `search` | `(text, options) → Promise<Entity[]>` |
| `aggregate` | `(pipeline, options) → Promise<any[]>` |
| `distinct` | `(field, query) → Promise<any[]>` |
| `bulkCreate` | `(data, options) → Promise<Entity[]>` |
| `bulkUpdate` | `(query, data, options) → Promise<number>` |
| `bulkDelete` | `(query, options) → Promise<number>` |
| `projection` | `(query, fields, options) → Promise<Partial<Entity>[]>` |
| `toEntity` | `(raw) → Entity` |
| `fromEntity` | `(entity) → PersistenceModel` |

## Entity Mapping Flow

```
Domain Entity (capabilities)
    ↓
OrmEntityMapper.toOrm(entity)
    ↓
OrmAdapter.create(data, options)
    ↓
Database Provider
    ↓
OrmAdapter.findOne(query)
    ↓
OrmEntityMapper.fromOrm(record)
    ↓
Domain Entity (capabilities)
```

## Query Mapping Flow

```
Repository Query  { filters: { status: 'active' }, sort: { name: 'asc' }, page: 1, size: 20 }
    ↓
OrmQueryMapper.toOrmQuery(repositoryQuery)
    ↓
ORM Query  { where: { status: 'active' }, orderBy: { name: 'asc' }, skip: 0, take: 20 }
    ↓
OrmAdapter.find(ormQuery)
```

## Transaction Bridging Flow

```
UnitOfWork.commit()
    ↓
OrmTransactionBridge.commit(bridge)
    ├── unitOfWork.commit()  → validate, order, execute
    └── ormSession.commitTransaction()
    ↓
UnitOfWork.rollback()
    ↓
OrmTransactionBridge.rollback(bridge)
    ├── unitOfWork.rollback()
    └── ormSession.rollbackTransaction()
```

## Error Hierarchy

```
OrmError (base)
├── OrmMappingError
├── OrmQueryError
├── OrmSchemaError
├── OrmTransactionError
├── OrmConnectionError
├── OrmConfigurationError
├── OrmValidationError
├── OrmNotImplementedError
└── OrmProviderError
```

## Events (22)

| Event | Fires When |
|-------|------------|
| `orm:adapter_registered` | Adapter class registered in factory |
| `orm:adapter_initialized` | Adapter instance created and initialized |
| `orm:adapter_destroyed` | Adapter instance destroyed |
| `orm:adapter_error` | Adapter encounters an error |
| `orm:transaction_started` | ORM transaction started via bridge |
| `orm:transaction_committed` | ORM transaction committed |
| `orm:transaction_rolled_back` | ORM transaction rolled back |
| `orm:transaction_savepoint_created` | Savepoint created |
| `orm:transaction_savepoint_released` | Savepoint released |
| `orm:transaction_savepoint_rolled_back` | Savepoint rolled back |
| `orm:query_executed` | Query executed successfully |
| `orm:query_failed` | Query execution failed |
| `orm:mapping_failed` | Entity or query mapping failed |
| `orm:mapping_registered` | Entity mapping registered |
| `orm:connection_established` | Database connection established |
| `orm:connection_failed` | Database connection failed |
| `orm:connection_closed` | Database connection closed |
| `orm:schema_sync_started` | Schema synchronization started |
| `orm:schema_sync_completed` | Schema synchronization completed |
| `orm:schema_sync_failed` | Schema synchronization failed |
| `orm:provider_registered` | ORM provider registered in factory |
| `orm:provider_resolved` | Provider resolved for entity |
| `orm:provider_error` | Provider encountered an error |

## Future ORM Compatibility

Prepared for (not implemented):

| ORM | Dialects | Key Capabilities |
|-----|----------|-----------------|
| Drizzle ORM | PostgreSQL, MySQL, SQLite, Turso | TypeScript-first, lightweight, DDL push |
| Prisma | PostgreSQL, MySQL, SQLite, MongoDB, CockroachDB | Schema-driven, migrations, relation queries |
| Knex | PostgreSQL, MySQL, SQLite, MSSQL, Oracle | Query builder, migration tooling |
| Mongoose | MongoDB | Schema modeling, validation, middleware |
| Supabase ORM | PostgreSQL (Supabase) | Real-time, RLS, edge functions |
| SQLite ORM | SQLite (better-sqlite3, Bun) | Embedded, zero-config, local-first |

## Layer Rules

1. **ORM never knows business rules** — no domain logic in ORM layer
2. **Repositories never know ORM** — all ORM interaction is through OrmAdapter
3. **Providers never know capabilities** — database provider is below ORM layer
4. **Entity mapper is the only bridge** — domain entities never leak into ORM space
5. **Query mapper is stateless** — call with query, get ORM query, no side effects
6. **Transaction bridge adapts** — TransactionManager continues to own transaction lifecycle
7. **Factory creates, Registry tracks** — separation of construction and metadata
