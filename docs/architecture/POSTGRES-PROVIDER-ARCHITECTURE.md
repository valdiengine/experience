# PostgreSQL Provider Architecture

> P12.0.5 — First production persistence provider for Valdi Engine.
> Implements RepositoryAdapter via Drizzle ORM. No capability knows PostgreSQL or Drizzle exist.

---

## 1. Purpose

### Why the PostgreSQL Provider Exists

All previous persistence phases (P12.0.0–P12.0.4) built abstractions — contracts, repositories, ORM adapters. P12.0.5 implements the **first real persistence provider** that connects to a database.

The PostgreSQL Provider is the concrete implementation that:

- Opens connections to PostgreSQL
- Manages connection pooling
- Executes queries through Drizzle ORM
- Handles transactions, savepoints, retry
- Runs migrations
- Reports health
- Fires lifecycle events

Everything above this layer (capabilities, repositories, engine, ORM contracts) remains completely unchanged. The provider is swappable — PostgreSQL could be replaced by SQLite, Supabase, or any other database by implementing a new provider against the same contracts.

### What It Is Not

- Not a capability
- Not a repository
- Not an ORM contract
- Not business logic
- Not authentication
- Not an HTTP server

---

## 2. Layer Placement

### Architecture Position

```
Capabilities                — Business logic, domain operations
    ↓
Repository Engine (P12.0.3) — Repository resolution, lifecycle, UnitOfWork
    ↓
RepositoryAdapter           — Abstract persistence operations
    ↓
OrmAdapter (P12.0.4)        — Abstract ORM contract (22 methods)
    ↓
┌──────────────────────────────────────────────────────────────┐
│           PostgreSQL Provider (P12.0.5) — THIS PHASE          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐      │
│  │            PostgresProvider                         │      │
│  │  Connection │ Pool │ Health │ Lifecycle │ Migrations │      │
│  └──────────────────────────┬─────────────────────────┘      │
│                             │                                 │
│  ┌──────────────────────────┴─────────────────────────┐      │
│  │            DrizzleProvider                           │      │
│  │  Client │ SchemaLoader │ QueryBuilder │ TxAdapter    │      │
│  │  RepositoryAdapter │ MigrationRunner │ Health        │      │
│  └──────────────────────────┬─────────────────────────┘      │
│                             │                                 │
│  ┌──────────────────────────┴─────────────────────────┐      │
│  │            Drizzle ORM (SQL generation)             │      │
│  └──────────────────────────┬─────────────────────────┘      │
│                             │                                 │
│  ┌──────────────────────────┴─────────────────────────┐      │
│  │            node-postgres (pg / pg-pool)             │      │
│  └──────────────────────────┬─────────────────────────┘      │
│                             │                                 │
└─────────────────────────────┼─────────────────────────────────┘
                              │
                              ▼
                       PostgreSQL
```

### Data Flow

```
Capability: context.repositories.reservation.find({ status: 'confirmed' })
    ↓
BaseRepository#findMany → RepositoryAdapter#find
    ↓
OrmAdapter#find → DrizzleRepositoryAdapter#find
    ↓
DrizzleQueryBuilder → parameterized SQL
    ↓
DrizzleClient → pg client → PostgreSQL
    ↓
Result rows → DrizzleRepositoryAdapter → BaseRepository → Capability
```

---

## 3. Directory Structure

```
providers/postgres/
├── README.md                    — Provider documentation
├── postgres.provider.js         — Provider facade
├── postgres.config.js           — Configuration (env vars, SSL, pool, retry, health)
├── postgres.connection.js       — Lazy connection with retry/backoff
├── postgres.pool.js             — Connection pooling with pg-pool
├── postgres.health.js           — Health checks + auto-check interval
├── postgres.lifecycle.js        — Startup/shutdown/restart
├── postgres.migrations.js       — Migration runner + tracking table
├── postgres.errors.js           — 9 error types
├── postgres.events.js           — 8 lifecycle events
│
└── drizzle/
    ├── README.md                — Drizzle documentation
    ├── drizzle.provider.js      — Drizzle provider facade
    ├── drizzle.client.js        — Drizzle ORM client (or fallback)
    ├── drizzle.connection.js    — Connection via Drizzle
    ├── drizzle.schema.loader.js — Schema → Drizzle table definitions
    ├── drizzle.repository.adapter.js — Implements OrmAdapter
    ├── drizzle.transaction.adapter.js — Transaction management
    ├── drizzle.query.builder.js — Parameterized SQL builder
    ├── drizzle.migration.runner.js — Migration execution
    ├── drizzle.health.js        — Drizzle health checks
    ├── drizzle.errors.js        — 5 error types
    └── drizzle.events.js        — 8 events
```

---

## 4. Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_HOST` | `localhost` | Database host |
| `POSTGRES_PORT` | `5432` | Database port |
| `POSTGRES_DATABASE` | `valdi` | Database name |
| `POSTGRES_USER` | `postgres` | Database user |
| `POSTGRES_PASSWORD` | `""` | Database password |
| `POSTGRES_SSL` | `disable` | SSL mode (disable, require, prefer) |

### Programmatic Configuration

```js
const config = {
  host: 'localhost',
  port: 5432,
  database: 'valdi',
  user: 'postgres',
  password: 'secret',
  ssl: 'prefer',
  pool: {
    min: 2,
    max: 10,
    acquireTimeout: 30000,
    idleTimeout: 600000,
  },
  timeout: {
    query: 30000,
    connection: 10000,
  },
  retry: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    factor: 2,
    jitter: 0.1,
  },
  health: {
    interval: 30000,
    unhealthyThreshold: 3,
    recoveryThreshold: 2,
  },
  lazy: true,
  schema: 'public',
}
```

### SSL Configuration

| Mode | Description | rejectUnauthorized |
|------|-------------|-------------------|
| `disable` | No SSL | — |
| `require` | SSL required, certificate verified | `true` |
| `prefer` | SSL preferred, certificate optional | `false` |
| Custom object | Full SSL config via pg | As configured |

---

## 5. Lifecycle

### Startup Sequence

```
PostgresProvider.initialize()
    ↓
PostgresConfig(config)
    ↓ validate()
    ↓
PostgresPool.initialize()
    ↓ createPool()
    ↓ warmup() [if lazy=false]
    ↓ emit(POSTGRES_POOL_READY)
    ↓
PostgresConnection.initialize()
    ↓ connect() [if lazy=false] or deferred
    ↓ emit(POSTGRES_CONNECTED)
    ↓
PostgresHealth.startAutoCheck()
    ↓
DrizzleProvider.initialize()
    ↓
DrizzleClient.initialize()
    ↓ load drizzle-orm module or fallback
    ↓
DrizzleSchemaLoader.load()
    ↓ build tables from registered schemas
    ↓
DrizzleHealth.initialize()
    ↓ emit(DRIZZLE_INITIALIZED)
```

### Shutdown Sequence

```
PostgresProvider.destroy()
    ↓
DrizzleHealth.destroy()
DrizzleClient.destroy()
    ↓
PostgresLifecycle.shutdown()
    ↓ stop auto health checks
    ↓
PostgresConnection.disconnect()
    ↓ release client
    ↓ emit(POSTGRES_DISCONNECTED)
    ↓
PostgresPool.destroy()
    ↓ close all connections
```

---

## 6. Connection

### Lazy Connection

Connections are not established at provider initialization unless `lazy: false`. The first database operation triggers:

```
connect()
    ↓ acquire client from pool
    ↓ set session parameters (statement_timeout, lock_timeout, search_path)
    ↓ mark connected
    ↓ return client
```

### Retry with Backoff

On connection failure:

```
attempt 1: connect → failed → wait 1000ms (±jitter)
attempt 2: connect → failed → wait 2000ms (±jitter)
attempt 3: connect → failed → wait 4000ms (±jitter)
attempt 4: connect → failed → wait 8000ms (±jitter)
attempt 5: connect → failed → throw PostgresConnectionError
```

Jitter: ±10% of delay (randomized)

### Timeouts

| Timeout | Default | Applies To |
|---------|---------|------------|
| `connection` | 10,000ms | Pool acquire |
| `query` | 30,000ms | Statement execution |
| `statement` | 30,000ms | Individual statement |
| `lock` | 1,000ms | Lock acquisition |

---

## 7. Pool

### Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `min` | 2 | Minimum idle connections |
| `max` | 10 | Maximum total connections |
| `acquireTimeout` | 30,000ms | Max wait for connection |
| `idleTimeout` | 600,000ms | Max idle time before close |
| `reapInterval` | 1,000ms | Idle connection reaper interval |
| `createTimeout` | 30,000ms | Max time to create connection |
| `destroyTimeout` | 5,000ms | Max time to destroy connection |
| `maxQueue` | 50 | Max queued acquire requests |

### Warmup

If `lazy: false`, the pool warms up by acquiring and releasing up to 2 connections immediately.

### Stats

Available via `pool.stats`:

```js
{ created: 5, acquired: 100, released: 95, destroyed: 0, failed: 1 }
```

---

## 8. Health

### Auto Health Check

When enabled, runs periodically at the configured `health.interval` (default 30s).

### Health States

| State | Condition |
|-------|-----------|
| `healthy` | Ping succeeds |
| `unhealthy` | Ping fails |
| `degraded` | Pool utilization near max |
| `unknown` | Not yet checked |

### Consecutive Failure Tracking

```
3 consecutive failures → mark unhealthy
2 consecutive successes → mark healthy
```

### Health Result

```js
{
  status: 'healthy',
  timestamp: 1700000000000,
  connected: true,
  database: 'valdi',
  host: 'localhost',
  latency: 5,
  pool: {
    status: 'healthy',
    totalConnections: 3,
    activeConnections: 1,
    idleConnections: 2,
    waitingClients: 0,
    utilization: 0.1,
  }
}
```

---

## 9. Transactions

### Integration with TransactionManager

```
TransactionManager.begin()
    ↓
OrmTransactionBridge.begin(unitOfWork, drizzleSession)
    ↓
DrizzleTransactionAdapter.begin()
    ↓ client.query('BEGIN')
    ↓ client.query('SET TRANSACTION ISOLATION LEVEL ...')
    ↓
UnitOfWork tracks changes
    ↓
TransactionManager.commit()
    ↓
DrizzleTransactionAdapter.commit(tx)
    ↓ unitOfWork.commit()
    ↓ client.query('COMMIT')
    ↓
TransactionManager.rollback()
    ↓
DrizzleTransactionAdapter.rollback(tx, reason)
    ↓ unitOfWork.rollback()
    ↓ client.query('ROLLBACK')
```

### Savepoints

```
DrizzleTransactionAdapter.savepoint(tx, 'point1')
    ↓ client.query('SAVEPOINT "point1"')
    ↓
DrizzleTransactionAdapter.rollbackToSavepoint(tx, 'point1')
    ↓ client.query('ROLLBACK TO SAVEPOINT "point1"')
    ↓
DrizzleTransactionAdapter.releaseSavepoint(tx, 'point1')
    ↓ client.query('RELEASE SAVEPOINT "point1"')
```

### Retry Strategy

Automatic retry on:
- Deadlock detection
- Serialization failures
- Timeout errors

Exponential backoff: `100ms → 200ms → 400ms`

---

## 10. Drizzle Integration

### Drizzle Provider

`DrizzleProvider` wraps `PostgresProvider` and provides:

- `DrizzleRepositoryAdapter` — implements `OrmAdapter` with 22 SQL methods
- `DrizzleQueryBuilder` — generates parameterized SQL
- `DrizzleTransactionAdapter` — handles BEGIN/COMMIT/ROLLBACK/SAVEPOINT
- `DrizzleSchemaLoader` — loads entity schemas into Drizzle table definitions
- `DrizzleMigrationRunner` — runs migrations via Drizzle
- `DrizzleHealth` — health checks for the Drizzle layer

### Query Building

`DrizzleQueryBuilder` generates parameterized SQL:

```js
// Repository query
{ status: 'confirmed', date: { gte: '2026-01-01' } }

// Generated SQL
SELECT * FROM "reservations" WHERE "status" = $1 AND "date" >= $2
// params: ['confirmed', '2026-01-01']
```

### Adapter Methods

`DrizzleRepositoryAdapter` implements all 22 OrmAdapter methods:

- `find` — SELECT with filters
- `findById` — SELECT by primary key
- `create` — INSERT with RETURNING
- `update` — UPDATE with WHERE and RETURNING
- `delete` — DELETE with WHERE
- `softDelete` — UPDATE deletedAt
- `paginate` — SELECT with LIMIT/OFFSET + COUNT
- `search` — ILIKE on configurable fields
- `aggregate` — Aggregation pipeline
- `projection` — SELECT specific fields

---

## 11. Error Hierarchy

### Postgres Errors

```
PostgresError (base)
├── PostgresConnectionError    — Connection failure
├── PostgresPoolError          — Pool acquire/release failure
├── PostgresMigrationError     — Migration failure
├── PostgresConfigurationError — Config validation failure
├── PostgresSSLConfigurationError — SSL configuration error
├── PostgresProviderUnavailableError — Provider unavailable
├── PostgresTimeoutError       — Query/connection timeout
└── PostgresRetryExceededError — Retry limit exceeded
```

### Drizzle Errors

```
DrizzleError (base)
├── DrizzleConnectionError     — Connection failure
├── DrizzleQueryError          — Query execution failure
├── DrizzleTransactionError    — Transaction lifecycle failure
├── DrizzleMigrationError      — Migration failure
└── DrizzleSchemaError         — Schema definition error
```

---

## 12. Events

### Postgres Events (8)

| Event | Fires When |
|-------|------------|
| `postgres:connected` | Connection established |
| `postgres:disconnected` | Connection closed |
| `postgres:retry` | Connection retry attempt |
| `postgres:health_changed` | Health status changes |
| `postgres:pool_ready` | Pool initialized |
| `postgres:migration_started` | Migration batch started |
| `postgres:migration_completed` | Migration batch completed |
| `postgres:error` | Any provider error |

### Drizzle Events (8)

| Event | Fires When |
|-------|------------|
| `drizzle:initialized` | Drizzle provider initialized |
| `drizzle:query_executed` | Query executed (includes transactions, migrations) |
| `drizzle:transaction_started` | Transaction started |
| `drizzle:transaction_committed` | Transaction committed |
| `drizzle:transaction_rolled_back` | Transaction rolled back |
| `drizzle:migration_started` | Migration started |
| `drizzle:migration_completed` | Migration completed |
| `drizzle:error` | Drizzle error |

---

## 13. Failure Recovery

| Failure | Recovery |
|---------|----------|
| Connection lost | Auto-retry with backoff (5 attempts) |
| Pool exhausted | Queue up to 50 waiters, timeout after 30s |
| Deadlock | Retry with exponential backoff (3 attempts) |
| Serialization failure | Retry with exponential backoff (3 attempts) |
| Health check failure | Consecutive failure tracking, emit event |
| Provider unavailable | Return degraded health, emit event |

---

## 14. Future Evolution

| Feature | Phase | Description |
|---------|-------|-------------|
| Read replicas | P12.x | Separate pool for read queries |
| Sharding | P12.x | Horizontal sharding by tenant/destination |
| Multi-region | P12.x | Regional connection pools |
| Connection encryption | P12.x | TLS mutual auth |
| Secrets manager | P12.x | AWS Secrets Manager / Vault integration |
| Circuit breaker | P12.x | Automatic provider disable on repeated failure |
| Connection pooling metrics | P12.x | Prometheus metrics export |

---

## 15. Architecture Rules

| Rule | Description |
|------|-------------|
| PG-001 | PostgreSQL must never be imported outside `providers/postgres/` |
| PG-002 | Drizzle ORM must never be imported outside `providers/postgres/drizzle/` |
| PG-003 | `PostgresProvider` registers via `OrmFactory.registerProvider('postgresql', PostgresProvider)` |
| PG-004 | All provider errors must extend `PostgresError` or `DrizzleError` |
| PG-005 | All provider events must use `postgres:` or `drizzle:` prefix |
| PG-006 | Provider must never contain business logic |
| PG-007 | Provider must never import from capabilities/, engine/, or contracts/ |
| PG-008 | All SQL queries must be parameterized (no string interpolation) |
| PG-009 | Connection must be lazy by default |
| PG-010 | Pool must be configurable without code changes (env vars) |
| PG-011 | Provider must be replaceable by another database provider without capability changes |
| PG-012 | `PostgresProvider` and `DrizzleProvider` implement `getModel(entityName)` for OrmFactory compatibility |

---

## 16. Validation Checklist

| Check | Status |
|-------|--------|
| Capabilities import only `context.repositories.*` | ✅ No change |
| Repositories use only RepositoryAdapter | ✅ No change |
| RepositoryAdapter delegates to OrmAdapter | ✅ No change |
| OrmAdapter implemented by DrizzleRepositoryAdapter | ✅ Concrete |
| No PostgreSQL imports outside provider | ✅ Enforced |
| No Drizzle imports outside drizzle/ | ✅ Enforced |
| All queries parameterized | ✅ DrizzleQueryBuilder |
| Transactions wired to TransactionManager | ✅ Via OrmTransactionBridge |
| Health checks operational | ✅ Auto-check interval |
| Configuration from env vars | ✅ PostgresConfig |
| Connection lazy by default | ✅ Lazy: true |
| Retry with backoff | ✅ Exponential + jitter |
| Graceful shutdown | ✅ Lifecycle.shutdown() |
| All errors typed | ✅ 9 + 5 error types |
| All events defined | ✅ 8 + 8 events |
| Migration runner | ✅ Tracking table + checksum |
