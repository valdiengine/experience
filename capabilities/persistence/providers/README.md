# Provider Layer

> Future provider implementations for the Repository Engine.
> This directory will be populated in P12.0.4+.

## Structure

```
providers/
├── database/   — Database providers (PostgreSQL, SQLite, Supabase, MongoDB)
├── cache/      — Cache providers (Redis, Memory Cache)
├── search/     — Search providers (PostgreSQL Full Text, Meilisearch, Elasticsearch)
├── storage/    — File storage providers (Local, S3, Cloudflare R2, Azure Blob)
└── queue/      — Queue providers (BullMQ, RabbitMQ, Kafka, In-Memory Queue)
```

## Architecture

```
Repository → RepositoryAdapter → Provider → Database
```

Each provider implements the `RepositoryAdapter` abstract class, translating
standard repository operations into provider-specific calls.

## Relationship with Repository Engine

- Repositories never know about providers.
- The RepositoryFactory resolves the provider from RepositoryContext.
- The RepositoryAdapter bridges repository operations to provider calls.
- Switching providers requires zero repository code changes.

## Future Phases

- P12.0.4 — Provider implementations
- P12.0.5 — ORM integration
- P12.1 — Infrastructure & authentication
