# Business Capability Architecture

## Overview

The Business capability manages company registrations (businesses) inside the platform. It is the **aggregate root** of the commercial domain and the parent entity for Accommodation, Reservations, Availability, CMS, and Payments.

## Position in the Domain

```
Tenant
 └── Business (aggregate root)
      ├── Accommodation
      ├── Reservation
      ├── Availability
      ├── CMS Pages
      ├── Payments
      └── Notifications
```

## Design Rules

- Business belongs to **ONE** Tenant
- Business has **ONE** Destination (primary location)
- Business is **NOT** WordPress, NOT CMS, NOT a Tenant
- Business **MUST NOT** know about Accommodation, Reservation, Availability, Payments, or Notifications
- Those capabilities depend on Business, **not the inverse**

## Dependencies

| Dependency | Direction | Reason |
|-----------|-----------|--------|
| Tenant | Business → Tenant | Scoping and ownership |
| Destination | Business → Destination | Primary market/geo |

## Lifecycle

```
DRAFT ──→ PENDING_REVIEW ──→ PUBLISHED
  ↑              │                │
  │              ↓                ↓
  │           SUSPENDED       ARCHIVED
  │              │                │
  └──────────────┴────────────────┘
                   │
                   ↓
                DELETED (soft, terminal)
```

## Entity Fields

| Field | Type | Required |
|-------|------|----------|
| id | string | system |
| tenantId | string | yes |
| destinationId | string | yes |
| name | string | yes |
| legalName | string | no |
| slug | string | auto |
| category | string | yes |
| subcategory | string | no |
| description | string | yes |
| status | string | default: draft |
| contactEmail | string | yes |
| contactPhone | string | no |
| website | string | no |
| socialNetworks | object | no |
| logo | string | no |
| coverImage | string | no |
| address | string | no |
| coordinates | {lat,lng} | no |
| city | string | no |
| timezone | string | no |
| language | string | no |
| currency | string | no |
| openingHours | object | no |
| verificationStatus | string | no |
| visibility | string | no |
| metadata | object | no |
| seo | object | no |
| createdAt | string | system |
| updatedAt | string | system |
| publishedAt | string | system |

## Manager Methods

### Lifecycle
- `create(data)` → create with DRAFT status
- `update(id, data, identity)` → update editable fields
- `publish(id)` → DRAFT/PENDING_REVIEW → PUBLISHED
- `suspend(id)` → PUBLISHED → SUSPENDED
- `archive(id)` → any → ARCHIVED
- `restore(id)` → ARCHIVED → DRAFT or PUBLISHED
- `softDelete(id)` → any → DELETED (terminal)

### Query
- `findById(id)` → single
- `findBySlug(slug)` → single
- `findByTenant(tenantId)` → list
- `findByDestination(destinationId)` → list
- `findByOwner(ownerId)` → list
- `getByStatus(status)` → list
- `getByCategory(category)` → list
- `search(query)` → search results
- `count(filter)` → number
- `exists(filter)` → boolean

### Domain
- `verify(id)` → mark verified
- `transferOwner(id, newOwnerId)` → change owner
- `getSEO(id)` → structured SEO data
- `getMedia(id)` → media items

## Status Rules

| From | To |
|------|----|
| DRAFT | PENDING_REVIEW, ARCHIVED, DELETED |
| PENDING_REVIEW | DRAFT, PUBLISHED, SUSPENDED, ARCHIVED, DELETED |
| PUBLISHED | SUSPENDED, ARCHIVED |
| SUSPENDED | DRAFT, PUBLISHED, ARCHIVED, DELETED |
| ARCHIVED | DRAFT, PUBLISHED, DELETED |
| DELETED | (terminal) |

## File Mapping

```
capabilities/business/
├── business.status.js       # Status constants
├── business.events.js       # Event names
├── business.errors.js       # Error classes
├── business.schema.js       # Data schema
├── business.workflow.js     # Status transitions
├── business.validation.js   # Business rules
├── business.permissions.js  # Permission constants
├── business.media.js        # Media helpers
├── business.seo.js          # SEO generator
├── business.search.js       # Search payload
├── business.manager.js      # Orchestrator
├── business.service.js      # Public service
├── business.capability.js   # Registration
└── README.md                # Quick reference
```

## Events

| Event | Trigger |
|-------|---------|
| business:created | Business created |
| business:updated | Business updated |
| business:published | Business published |
| business:unpublished | Business suspended |
| business:archived | Business archived |
| business:restored | Business restored |
| business:deleted | Business soft deleted |
| business:owner_changed | Ownership transferred |
| business:verified | Business verified |
| business:error | Error occurred |

## Permissions

| Permission | Scope |
|-----------|-------|
| business:create | Create businesses |
| business:update | Update businesses |
| business:delete | Delete businesses |
| business:publish | Publish/unpublish |
| business:archive | Archive/restore |
| business:transfer | Transfer ownership |
| business:verify | Verify businesses |
| business:read | Read businesses |
| business:manage | Full management |
