# PostgreSQL Provider

> P12.0.5 — First production persistence provider for Valdi Engine.
> Implements RepositoryAdapter via Drizzle ORM.

## Layer Position

```
Repository Engine → RepositoryAdapter → OrmAdapter → DrizzleAdapter → Drizzle ORM → node-postgres → PostgreSQL
```

## Files

| File | Responsibility |
|------|---------------|
| `postgres.provider.js` | Provider facade — registers with OrmFactory, manages lifecycle |
| `postgres.config.js` | Configuration with env var support, SSL, pool sizing, retry, health |
| `postgres.connection.js` | Lazy connection with retry, backoff, timeout, graceful disconnect |
| `postgres.pool.js` | Connection pooling via pg-pool with stats, warmup, health |
| `postgres.health.js` | Health checks with auto-check, consecutive failure tracking |
| `postgres.lifecycle.js` | Startup/shutdown/restart lifecycle management |
| `postgres.migrations.js` | Migration runner with tracking table, checksum, rollback |
| `postgres.errors.js` | 9 error types |
| `postgres.events.js` | 8 lifecycle events |

## Drizzle

See `drizzle/` for the Drizzle ORM implementation.

## Architecture Rules

1. Never import PostgreSQL outside this provider
2. Never import Drizzle outside `drizzle/`
3. Capabilities never know PostgreSQL exists
4. Repositories never know PostgreSQL exists
5. `PostgresProvider` registers with `OrmFactory.registerProvider('postgresql', PostgresProvider)`
6. All errors extend `PostgresError`
7. All events use `postgres:` prefix
