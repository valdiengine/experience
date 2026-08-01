# Search Providers

> Purpose: Full-text search and indexing layer.

## Future Responsibilities

- Full-text search across entities
- Index management
- Search ranking and relevance
- Faceted search
- Typo tolerance
- Language-aware search

## Expected Implementations

| Provider | Status | Notes |
|----------|--------|-------|
| PostgreSQL Full Text | Future (P12.0.4+) | Built-in tsvector/tsquery. No additional infra. |
| Meilisearch | Future (P12.1+) | Lightweight, fast, typo-tolerant. Self-hosted. |
| Elasticsearch | Future (P12.1+) | Enterprise search. Full ecosystem. |

## Integration with Repository Engine

Search providers are called when repositories use the `search()` method.
The `searchable` flag on repository metadata determines availability.
