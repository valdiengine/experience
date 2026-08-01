# Persistence Capability

> Refactored P12.0.3.1 — Repository Engine with enterprise-grade folder structure.
> Provider-agnostic. Capability-agnostic. Business-agnostic.

## Folder Structure

```
persistence/
├── adapters/                   — Abstract adapter layer
│   ├── repository.adapter.js   — Abstract persistence adapter (22 stubs)
│   ├── orm.adapter.js          — Abstract ORM adapter (Prisma, Drizzle, Knex, Mongoose)
│   └── query.adapter.js        — Abstract query normalizer
├── contracts/                  — Repository contract classes
│   ├── base.repository.js      — Base class (20-method API, protected guards)
│   ├── read.repository.js      — Read-only extension (aggregate, distinct, projection)
│   ├── write.repository.js     — Write extension (bulkCreate, bulkUpdate, bulkDelete)
│   └── aggregate.repository.js — Aggregate root (save, load, remove)
├── engine/                     — Engine infrastructure
│   ├── repository.engine.js    — Main facade (register, get, health)
│   ├── repository.factory.js   — Instance creation, provider injection, decorators
│   ├── repository.registry.js  — Central registry, dependency validation, health
│   ├── repository.context.js   — Context (tenant, destination, identity, etc.)
│   ├── unit-of-work.js         — Unit of Work (change tracking, commit, rollback)
│   └── transaction.manager.js  — Transaction manager (savepoints, nesting)
├── errors/
│   └── repository.errors.js    — 9 error types (hierarchy)
├── events/
│   └── repository.events.js    — 13 lifecycle events
├── identity/                   — Future identity layer (P12.1)
│   └── README.md
├── mixins/                     — Composable mixins
│   ├── tenant.mixin.js         — Tenant isolation
│   ├── destination.mixin.js    — Destination isolation
│   ├── soft-delete.mixin.js    — Soft delete, restore, archive, purge
│   ├── pagination.mixin.js     — Paginate, cursor
│   ├── search.mixin.js         — Full-text search
│   ├── audit.mixin.js          — Audit fields (createdBy, updatedBy)
│   ├── optimistic-lock.mixin.js— Version/concurrency handling
│   ├── filtering.mixin.js      — Dynamic filter application
│   ├── sorting.mixin.js        — Sort abstraction
│   └── timestamps.mixin.js     — Timestamp management
├── providers/                  — Future provider implementations (P12.0.4+)
│   ├── README.md
│   ├── database/README.md
│   ├── cache/README.md
│   ├── search/README.md
│   ├── storage/README.md
│   └── queue/README.md
├── repositories/               — Entity repositories (27)
│   ├── tenant/tenant.repository.js
│   ├── destination/destination.repository.js
│   ├── business/business.repository.js
│   ├── accommodation/accommodation.repository.js
│   ├── reservation/reservation.repository.js
│   ├── availability/availability.repository.js
│   ├── visitor/visitor.repository.js
│   ├── identity/identity.repository.js
│   ├── community/community.repository.js
│   ├── memory/memory.repository.js
│   ├── story/story.repository.js
│   ├── species/species.repository.js
│   ├── observation/observation.repository.js
│   ├── habitat/habitat.repository.js
│   ├── route/route.repository.js
│   ├── campaign/campaign.repository.js
│   ├── challenge/challenge.repository.js
│   ├── badge/badge.repository.js
│   ├── partner/partner.repository.js
│   ├── notification/notification.repository.js
│   ├── media/media.repository.js
│   ├── analytics/analytics.repository.js
│   ├── audit/audit.repository.js
│   ├── governance/governance.repository.js
│   ├── operations/operations.repository.js
│   ├── subscription/subscription.repository.js
│   └── payment/payment.repository.js
├── repository.capability.js    — Capability entry point
└── README.md                   — This file
```

## Repository API (every repository)

- `findById(id)` — Find by primary key
- `findMany(query)` — Find matching entities
- `findOne(query)` — Find single entity or null
- `findAll()` — All entities
- `exists(query)` — Check existence
- `count(query)` — Count matching
- `create(data)` — Create entity
- `createMany(data[])` — Batch create
- `update(query, data)` — Update matching
- `updateMany(query, data)` — Batch update
- `delete(query)` — Permanently delete
- `softDelete(query)` — Soft delete
- `restore(query)` — Restore soft-deleted
- `archive(query)` — Archive entity
- `upsert(query, data)` — Insert or update
- `paginate(query, page, size)` — Paginated query
- `search(text)` — Full-text search
- `validate(data)` — Validate entity data

## Mixins Extracted (10)

| Mixin | Methods |
|-------|---------|
| TenantIsolationMixin | `#applyTenantFilter`, `#validateTenant` |
| DestinationIsolationMixin | `#applyDestinationFilter`, `#validateDestination` |
| SoftDeleteMixin | `softDelete`, `restore`, `archive`, `purge` |
| PaginationMixin | `paginate`, `cursor` |
| SearchMixin | `search` |
| AuditMixin | `#addAuditFields` |
| OptimisticLockMixin | `#validateVersion`, `#incrementVersion` |
| FilteringMixin | `#applyFilters` |
| SortingMixin | `#applySorting` |
| TimestampsMixin | `#addTimestamps` |

## BaseRepository Size Reduction

| Metric | Before | After |
|--------|--------|-------|
| Lines | 325 | ~200 |
| Methods | 20 | 13 (in base) + 7 (via mixins) |
| Private helpers | 8 (inline) | 0 (extracted to mixins) |
| Mixin coupling | None | 10 composable mixins |

## Quality Rules

- ✓ Multi-tenant isolation
- ✓ Destination isolation
- ✓ Soft delete (25/27 repositories)
- ✓ Audit metadata
- ✓ Optimistic versioning
- ✓ Event emission (13 events)
- ✓ Future caching (cacheable flag)
- ✓ Future pagination
- ✓ Future search abstraction
