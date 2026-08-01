# Accommodation Capability

## Overview

First-class business capability for the Valdi Engine MVP.

Manages the complete lifecycle of accommodation properties: creation, validation, publishing, archiving, media, pricing, SEO, and search indexing.

## Architecture

```
AccommodationCapability (BaseCapability)
  │
  ├── AccommodationService (public API)
  │     └── AccommodationManager (orchestrator)
  │           ├── repositories.accommodation (persistence)
  │           ├── runtime.auth (authorization)
  │           ├── runtime.search (search payload)
  │           ├── runtime.sync (CMS sync)
  │           └── runtime.media (media metadata)
  │
  ├── AccommodationWorkflow (state machine)
  ├── AccommodationValidation (business rules)
  ├── AccommodationPricing (pricing model)
  ├── AccommodationMedia (media metadata)
  ├── AccommodationSearch (search payload)
  └── AccommodationPermissions (permissions)
```

## Status Lifecycle

```
DRAFT ──→ PENDING_REVIEW ──→ PUBLISHED ──→ HIDDEN
  │                              │              │
  │                              ├──→ ARCHIVED ←┘
  │                              │       │
  └──────────────────────────────┘       │
       (from HIDDEN)                     │
                                         └──→ DELETED
```

## Files

| File | Responsibility |
|------|---------------|
| `accommodation.capability.js` | BaseCapability wrapper, event subscriptions, infra integration |
| `accommodation.manager.js` | Business orchestrator, workflow execution |
| `accommodation.service.js` | Public API delegation |
| `accommodation.workflow.js` | Status state machine |
| `accommodation.validation.js` | Input and business rule validation |
| `accommodation.schema.js` | Data structure definition |
| `accommodation.events.js` | Event constants |
| `accommodation.errors.js` | Error hierarchy |
| `accommodation.permissions.js` | Permission constants |
| `accommodation.pricing.js` | Pricing model and calculations |
| `accommodation.media.js` | Media metadata management |
| `accommodation.search.js` | Search index payload generation |
| `accommodation.status.js` | Status constants and helpers |

## Permissions Required

- `accommodation:create`
- `accommodation:update`
- `accommodation:delete`
- `accommodation:publish`
- `accommodation:archive`
- `accommodation:read`

Assigned to `business:owner` role with appropriate scoping.

## Events Emitted

- `accommodation:created`
- `accommodation:updated`
- `accommodation:deleted`
- `accommodation:archived`
- `accommodation:restored`
- `accommodation:published`
- `accommodation:unpublished`
- `accommodation:media.updated`
- `accommodation:price.updated`
- `accommodation:owner.changed`

## Architecture Rules

- **Never** imports PostgreSQL, Drizzle, WordPress, JWT, HTTP, or Browser APIs
- **Never** knows SQL or database implementation details
- Persistence goes through `context.repositories.accommodation`
- Authorization goes through `context.runtime.auth`
- Search goes through `context.runtime.search`
- CMS sync goes through `context.runtime.sync`
- Media uploads go through `context.runtime.media`
