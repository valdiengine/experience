# Database Providers

> Purpose: Physical data persistence providers.

## Future Responsibilities

- Connection pooling and management
- Query execution and result normalization
- Transaction management (begin, commit, rollback)
- Migration support
- Schema management
- Replica set / read replica support

## Expected Implementations

| Provider | Status | Notes |
|----------|--------|-------|
| PostgreSQL | Future (P12.0.4) | Primary database. Row-level multi-tenant. |
| SQLite | Future (P12.0.4) | Offline/local-first. WAL mode. |
| Supabase | Future (P12.1) | Managed PostgreSQL + Auth + Realtime. |
| MongoDB | Future (P12.1+) | Document store for flexible schemas. |

## Integration with Repository Engine

Each database provider implements `RepositoryAdapter`. The adapter translates
query objects into provider-specific queries (SQL, MongoDB aggregation, etc.).

## Relationship with P12.0.4 and P12.0.5

- P12.0.4: Implement first database provider (PostgreSQL adapter)
- P12.0.5: ORM integration (Prisma, Drizzle, Knex, Mongoose adapters)
