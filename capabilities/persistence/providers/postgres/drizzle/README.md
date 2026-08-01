# Drizzle ORM Implementation

> Drizzle ORM — the first ORM implementation for Valdi Engine.
> Translates OrmAdapter operations into Drizzle ORM queries against PostgreSQL.

## Layer Position

```
OrmAdapter (abstract)
    ↓
DrizzleRepositoryAdapter (implements OrmAdapter)
    ↓
Drizzle ORM (SQL generation)
    ↓
node-postgres (pg)
    ↓
PostgreSQL
```

## Files

| File | Responsibility |
|------|---------------|
| `drizzle.provider.js` | Drizzle provider facade — creates adapters, manages lifecycle |
| `drizzle.client.js` | Drizzle ORM client initialization (or fallback pg-compatible client) |
| `drizzle.connection.js` | Connection management through Drizzle |
| `drizzle.schema.loader.js` | Loads entity schema definitions into Drizzle table definitions |
| `drizzle.repository.adapter.js` | Implements OrmAdapter — 22 methods mapping to SQL queries |
| `drizzle.transaction.adapter.js` | Transaction management — BEGIN/COMMIT/ROLLBACK/SAVEPOINT |
| `drizzle.query.builder.js` | SQL query builder with parameterized queries |
| `drizzle.migration.runner.js` | Migration runner using Drizzle's migration infrastructure |
| `drizzle.health.js` | Health checks for Drizzle/Postgres |
| `drizzle.errors.js` | 5 Drizzle-specific error types |
| `drizzle.events.js` | 8 Drizzle lifecycle events |

## Registration

```js
const postgresProvider = new PostgresProvider(config)
await postgresProvider.initialize()

const drizzleProvider = new DrizzleProvider(postgresProvider, { eventBus })
await drizzleProvider.initialize()

// Register entity schemas
drizzleProvider.registerSchema('reservation', {
  tableName: 'reservations',
  columns: [ ... ],
})

// Register in OrmFactory
ormFactory.registerProvider('drizzle', drizzleProvider)
ormFactory.registerAdapter('reservation', DrizzleRepositoryAdapter)
```

## Architecture Rules

1. Never import drizzle-orm outside this directory
2. Never import pg or pg-pool outside postgres/
3. DrizzleProvider only talks to PostgresProvider
4. All queries are parameterized (no SQL injection)
5. All errors extend DrizzleError
6. All events use `drizzle:` prefix
