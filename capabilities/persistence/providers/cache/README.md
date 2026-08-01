# Cache Providers

> Purpose: In-memory and distributed caching layer.

## Future Responsibilities

- Key-value storage
- TTL management
- Cache invalidation
- Distributed cache coordination
- Cache warming strategies

## Expected Implementations

| Provider | Status | Notes |
|----------|--------|-------|
| Redis | Future (P12.0.4+) | Distributed cache, session store, rate limiting. |
| Memory Cache | Future (P12.0.4+) | In-process cache for single-node deployments. |

## Integration with Repository Engine

Cache providers integrate through the CacheDecorator in the factory decorator
pipeline. Repositories with `cacheable: true` automatically get caching.
