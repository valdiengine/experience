# Accommodation Capability

> **Phase:** P13.0 — Accommodation Capability (MVP Foundation)
> **Status:** Implemented
> **Version:** 1.0.0

---

## Purpose

The Accommodation Capability is the first real business capability of the Valdi Engine MVP. It provides the complete lifecycle management of accommodation properties — from creation through publishing, archiving, and deletion — without ever touching SQL, ORMs, or database providers directly.

This capability serves as the **reference implementation** for all future business capabilities (Reservation, Owner, Experience, Business, Species, Community, Routes, etc.).

---

## Responsibilities

| Responsibility | Delegated To |
|---|---|
| Creation | Manager -> Repository |
| Update | Manager -> Repository |
| Publish / Unpublish | Manager -> Workflow -> Repository |
| Archive / Restore | Manager -> Workflow -> Repository |
| Delete | Manager -> Workflow -> Repository |
| Validation | Validation -> Schema |
| Media metadata | Media model |
| Pricing model | Pricing model |
| SEO metadata | Schema (nested object) |
| Owner relation | Repository dependency (businessId) |
| Destination relation | Repository dependency (destinationId) |
| Slug generation | Manager (unique per tenant) |
| Status transitions | Workflow (state machine) |
| Featured / Visibility | Manager -> Repository |
| Search index payload | Search model -> Runtime Search |
| CMS sync payload | Capability -> Runtime Sync |

---

## Lifecycle

### Status Flow

```
                        ┌──────────────────────────────────┐
                        │             DRAFT                │
                        └──────────┬──────────┬────────────┘
                                   │          │
                                   ▼          ▼
                        ┌──────────────────┐  │
                        │  PENDING_REVIEW  │  │
                        └────────┬─────────┘  │
                                 │            │
                          ┌──────▼──────┐     │
                          │  PUBLISHED  │     │
                          └──┬──────┬───┘     │
                             │      │         │
                      ┌──────▼┐  ┌──▼──────┐  │
                      │ HIDDEN│  │ ARCHIVED│  │
                      └──┬────┘  └──┬──────┘  │
                         │         │         │
                         │    ┌────▼────┐    │
                         │    │ DELETED │    │
                         │    └─────────┘    │
                         └───────────────────┘
                            (from HIDDEN -> DRAFT)
```

### Valid Transitions

| From | To |
|---|---|
| DRAFT | PENDING_REVIEW, ARCHIVED, DELETED |
| PENDING_REVIEW | DRAFT, PUBLISHED, ARCHIVED, DELETED |
| PUBLISHED | HIDDEN, ARCHIVED |
| HIDDEN | PUBLISHED, DRAFT, ARCHIVED, DELETED |
| ARCHIVED | DRAFT, PUBLISHED, DELETED |
| DELETED | (terminal) |

---

## Repository Flow

```
AccommodationManager
  │
  ├── context.repositories.accommodation.findById(id)
  ├── context.repositories.accommodation.findOne(filter)
  ├── context.repositories.accommodation.findMany(filter)
  ├── context.repositories.accommodation.create(data)
  ├── context.repositories.accommodation.update(filter, data)
  ├── context.repositories.accommodation.delete(filter)
  └── context.repositories.accommodation.exists(filter)
```

The repository is accessed exclusively through `context.repositories.accommodation`. The underlying implementation (PostgreSQL, SQLite, in-memory) is never known or referenced by the capability.

---

## Runtime Flow

```
AccommodationCapability
  │
  ├── context.runtime.auth.authorize(identity, permission, resource)
  │     └── AuthorizationEngine -> PermissionResolver -> PolicyEngine
  │
  ├── context.runtime.search.index('accommodation', payload)
  │     └── SearchRuntime -> SearchProvider
  │
  ├── context.runtime.sync.push('accommodation', payload)
  │     └── SyncEngine -> CmsProvider
  │
  └── context.runtime.media (for upload delegation)
        └── MediaRuntime -> MediaProvider
```

---

## Events

| Event | Trigger | Payload |
|---|---|---|
| `accommodation:created` | Manager.createAccommodation() | `{ accommodation, identity }` |
| `accommodation:updated` | Manager.updateAccommodation() | `{ accommodation, identity, changes }` |
| `accommodation:published` | Manager.publishAccommodation() | `{ accommodation, identity }` |
| `accommodation:unpublished` | Manager.unpublishAccommodation() | `{ accommodation, identity }` |
| `accommodation:archived` | Manager.archiveAccommodation() | `{ accommodation, identity }` |
| `accommodation:restored` | Manager.restoreAccommodation() | `{ accommodation, identity }` |
| `accommodation:deleted` | Manager.deleteAccommodation() | `{ accommodation, identity }` |
| `accommodation:media.updated` | Manager (via update with media) | `{ accommodation, identity }` |
| `accommodation:price.updated` | Manager (via update with pricing) | `{ accommodation, identity }` |
| `accommodation:owner.changed` | Manager (via update with businessId) | `{ accommodation, identity }` |

Events are emitted through `context.eventBus.emit()`. The capability subscribes to its own events to trigger search indexing and CMS sync side-effects.

---

## Permissions

| Permission | Required Action | Grant To |
|---|---|---|
| `accommodation:create` | createAccommodation | business:owner, platform:admin |
| `accommodation:update` | updateAccommodation | business:owner, platform:admin |
| `accommodation:delete` | deleteAccommodation | business:owner, platform:admin |
| `accommodation:publish` | publishAccommodation, unpublishAccommodation | business:owner, platform:admin |
| `accommodation:archive` | archiveAccommodation, restoreAccommodation | business:owner, platform:admin |
| `accommodation:read` | getById, getMany | visitor, business:owner, platform:admin |

Permissions are enforced via `context.runtime.auth.authorize()` which delegates to the `AuthorizationEngine`.

---

## Validation Rules

### Schema Validation

| Field | Type | Required | Constraints |
|---|---|---|---|
| tenantId | string | yes | — |
| destinationId | string | yes | — |
| businessId | string | yes | — |
| title | string | yes | — |
| description | string | yes | — |
| capacity | number | yes | min: 1 |
| slug | string | no | auto-generated, unique per tenant |
| coordinates.lat | number | no | -90 to 90 |
| coordinates.lng | number | no | -180 to 180 |
| status | string | no | system-managed |
| checkInTime | string | no | — |
| checkOutTime | string | no | — |
| cancellationPolicy | string | no | — |
| featured | boolean | no | default: false |
| pricing | object | no | includes basePrice, currency, taxes, etc. |
| media | array | no | array of media metadata objects |
| amenities | array | no | — |
| seo | object | no | includes title, description, keywords, ogImage |
| metadata | object | no | flexible metadata |

### Business Rules

- Slug must be unique within a tenant
- Slug format: lowercase letters, numbers, and hyphens only
- Capacity must be >= 1
- Coordinates must be valid lat/lng ranges
- Update only allowed for editable statuses (DRAFT, PENDING_REVIEW, HIDDEN)
- Status transitions must follow the valid transition matrix

---

## Error Hierarchy

```
AccommodationError (base)
  ├── AccommodationValidationError (400)
  ├── AccommodationPermissionError (403)
  ├── AccommodationNotFoundError (404)
  ├── AccommodationConflictError (409)
  └── AccommodationStateError (422)
```

All errors extend `AccommodationError` with a `code` and `statusCode` for consistent error handling across HTTP and internal consumers.

---

## Architecture Rules

### Allowed Dependencies

- Repository Engine (`context.repositories.accommodation`)
- Runtime (`context.runtime.*`)
- Authorization Engine (`context.runtime.auth`)
- CMS Sync Runtime (`context.runtime.sync`)
- Search Runtime (`context.runtime.search`)
- Media Runtime (`context.runtime.media`)
- EventBus (`context.eventBus`)

### Forbidden Dependencies

| Technology | Reason |
|---|---|
| PostgreSQL | Capability never knows the database |
| Drizzle | Capability never knows the ORM |
| WordPress | Capability never calls WordPress directly |
| JWT | Capability never handles authentication tokens |
| HTTP | Capability never makes network calls |
| Browser APIs | Capability is framework-agnostic |

### Key Principles

1. **Capabilities never import infrastructure.** No SQL, no ORM, no providers, no HTTP clients.
2. **Capabilities own business logic.** All domain rules live in the capability.
3. **All persistence goes through repositories.** `context.repositories.{entity}` is the only data access path.
4. **All authorization goes through runtime.** `context.runtime.auth` is the only auth path.
5. **Side effects are event-driven.** The capability emits events; infrastructure subscribes.
6. **No redesign.** Use existing BaseCapability, BaseRepository, RuntimeContext, EventBus patterns.

---

## Repository Contract

The existing `AccommodationRepository` extends `BaseRepository`:

| Property | Value |
|---|---|
| entityName | `accommodation` |
| version | `1.0.0` |
| dependencies | `['tenant', 'destination', 'business']` |
| cacheable | true |
| searchable | true |
| softDeletable | true |

Available methods (from `BaseRepository`): `findById`, `findMany`, `findOne`, `findAll`, `exists`, `count`, `create`, `createMany`, `update`, `updateMany`, `delete`, `upsert`.

---

## Future Extensions

| Extension | When | Notes |
|---|---|---|
| AccommodationUnit management | Post-MVP | Multiple units per accommodation (rooms, cabins) |
| AccommodationCalendar | Post-MVP | Per-unit availability calendar |
| AccommodationPricing tiers | Post-MVP | Seasonal pricing, dynamic pricing, promotions |
| AccommodationAmenity management | Post-MVP | Structured amenities with search support |
| Bulk operations | Post-MVP | Import/export, batch status changes |
| Version history | Post-MVP | Track changes over time |
| Review/rating integration | Post-MVP | Connect to community review system |
| Accommodation bundles | Post-MVP | Package deals with experiences |

---

## Validation Checklist

- [x] Never imports PostgreSQL, Drizzle, WordPress, JWT, HTTP, Browser APIs
- [x] Uses `context.repositories.accommodation` for all persistence
- [x] Uses `context.runtime.auth` for all authorization
- [x] Uses `context.eventBus` for all events
- [x] Uses `context.runtime.search` for search payload generation
- [x] Uses `context.runtime.sync` for CMS sync payload generation
- [x] Uses `context.runtime.media` for media delegation
- [x] Extends `BaseCapability` following existing patterns
- [x] Defines 10 events following the `domain:action` naming convention
- [x] Defines 6 statuses with valid transition matrix
- [x] Defines 5 error types with HTTP status codes
- [x] Defines 6 permissions for RBAC enforcement
- [x] Follows the same architectural style as ReservationCapability
- [x] No business logic duplication between layers
- [x] State machine has explicit valid transitions with guard
- [x] Authorization checked before all mutations
- [x] Slug uniqueness enforced at domain level
- [x] Event emission after successful persistence
- [x] Search and CMS sync triggered via event handlers
