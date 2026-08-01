# Visitor Capability

## Overview

The Visitor capability represents a pure business customer domain, completely independent of Authentication, Identity, JWT, OAuth, and infrastructure concerns. A Visitor IS NOT Authentication, Identity, JWT, or Session — it represents the business customer and may exist with or without authentication.

## Design Principles

1. **Zero coupling** – No imports from Authentication, Authorization, Business, Reservation, Availability, Accommodation, Payment, or Notification capability files. Communication only via `context.capabilities.get()`.
2. **Zero infrastructure** – No PostgreSQL, Drizzle, WordPress, JWT, OAuth, axios, fetch, or Browser APIs.
3. **Repository abstraction only** – Persistence exclusively through `context.repositories.visitor`.
4. **Multi-tenant** – All operations scoped by `tenantId`.
5. **Multi-destination** – Visitors can have multiple associated destinations.
6. **Provider-independent** – Identity providers are stored as `identityId` + `identityProvider` strings.
7. **Offline-ready** – No real-time dependencies.
8. **Domain separation** – Preferences and profile models are separate domain objects, not mixed into the visitor entity.

## Files

| File | Lines | Purpose |
|------|-------|---------|
| `visitor.status.js` | 60 | 8 statuses + 5 helper functions |
| `visitor.events.js` | 25 | 20 event constants |
| `visitor.errors.js` | 65 | 8 error classes (hierarchy) |
| `visitor.permissions.js` | 15 | 10 permission constants |
| `visitor.schema.js` | 65 | Schema factory with full defaulting |
| `visitor.workflow.js` | 40 | State machine with VALID_TRANSITIONS |
| `visitor.validation.js` | 165 | Validation functions (email, phone, country, language, currency, duplicate, identity, marketing) |
| `visitor.profile.js` | 40 | VisitorProfile model (displayName, avatar, publicProfile, biography, socialLinks, preferences, contact) |
| `visitor.preferences.js` | 40 | VisitorPreferences model (language, currency, notifications, marketing, accessibility, theme, search, privacy, communication) |
| `visitor.statistics.js` | 45 | Pure calculation functions (reservationCount, completedStays, cancellationRate, noShowRate, averageStay, lifetimeValue) |
| `visitor.search.js` | 35 | Search payload generator (15+ fields) |
| `visitor.manager.js` | 460 | Central orchestrator (permission checks, workflow validation, event emission, repository abstraction) |
| `visitor.service.js` | 110 | Thin public API (30 methods) |
| `visitor.capability.js` | 120 | BaseCapability subclass (init, activate, deactivate, destroy, event handlers for search/sync) |

## State Machine

```
                    ┌─────────────┐
                    │  ANONYMOUS  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
              ┌─────│  REGISTERED │─────┐
              │     └──────┬──────┘     │
              │            │            │
       ┌──────▼──────┐    │     ┌──────▼──────┐
       │   INACTIVE  │    │     │  VERIFIED    │
       └──────┬──────┘    │     └──────┬──────┘
              │            │            │
              │     ┌──────▼──────┐     │
              └─────│   ACTIVE    │─────┘
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │     VIP     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  ARCHIVED   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   DELETED   │
                    └─────────────┘
```

Valid transitions:
- ANONYMOUS → REGISTERED
- REGISTERED → VERIFIED, INACTIVE, ARCHIVED, DELETED
- VERIFIED → ACTIVE, INACTIVE, ARCHIVED, DELETED
- ACTIVE → VIP, INACTIVE, ARCHIVED, DELETED
- VIP → ACTIVE, INACTIVE, ARCHIVED, DELETED
- INACTIVE → REGISTERED, VERIFIED, ACTIVE, ARCHIVED, DELETED
- ARCHIVED → INACTIVE, DELETED
- DELETED → (terminal)

## Events (20)

| Event | Trigger |
|-------|---------|
| `visitor:created` | New visitor created |
| `visitor:updated` | Visitor data updated |
| `visitor:deleted` | Visitor soft-deleted |
| `visitor:archived` | Visitor archived |
| `visitor:restored` | Visitor restored from archive |
| `visitor:merged` | Two visitors merged |
| `visitor:verified` | Visitor verified |
| `visitor:activated` | Visitor activated |
| `visitor:deactivated` | Visitor deactivated |
| `visitor:vip_granted` | VIP status granted |
| `visitor:vip_revoked` | VIP status revoked |
| `visitor:blacklisted` | Visitor blacklisted |
| `visitor:removed_from_blacklist` | Visitor removed from blacklist |
| `visitor:profile_updated` | Profile updated |
| `visitor:preferences_updated` | Preferences updated |
| `visitor:statistics_updated` | Statistics calculated |
| `visitor:reservation_linked` | Reservation linked to visitor |
| `visitor:reservation_removed` | Reservation unlinked |
| `visitor:tag_added` | Tag added |
| `visitor:tag_removed` | Tag removed |

## Permissions (10)

| Permission | Description |
|------------|-------------|
| `visitor:create` | Create visitors |
| `visitor:read` | Read visitor data |
| `visitor:update` | Update visitor data |
| `visitor:delete` | Delete visitors |
| `visitor:archive` | Archive/restore visitors |
| `visitor:restore` | Restore archived visitors |
| `visitor:merge` | Merge two visitors |
| `visitor:view_statistics` | View visitor statistics |
| `visitor:update_preferences` | Update visitor preferences |
| `visitor:update_profile` | Update visitor profile |

## Manager API (30+ methods)

### Lifecycle (13)
- `createVisitor` – Create with validation, duplicate check, identity consistency
- `updateVisitor` – Update with partial merge for profile/preferences
- `deleteVisitor` – Soft delete via workflow
- `archiveVisitor` – Archive via workflow
- `restoreVisitor` – Restore to INACTIVE
- `verifyVisitor` – Transition to VERIFIED
- `activateVisitor` – Transition to ACTIVE
- `deactivateVisitor` – Transition to INACTIVE
- `grantVIP` – Transition to VIP
- `revokeVIP` – Transition to ACTIVE
- `blacklistVisitor` – Set blacklist flag with reason
- `removeFromBlacklist` – Clear blacklist flag
- `mergeVisitors` – Merge source into target with data consolidation

### Queries (8)
- `getById` – Single visitor lookup
- `getMany` – Filtered listing
- `findByName` – Search by full name
- `findByEmail` – Search by email (unique)
- `findByPhone` – Search by phone (unique)
- `findByIdentity` – Search by identityId + provider
- `findByReservation` – Search visitors by reservation
- `findByBusiness` – Search visitors by business

### Specialized queries (3)
- `findVIPVisitors` – All VIP status visitors
- `findBlacklisted` – All blacklisted visitors
- `findInactive` – All INACTIVE visitors

### Utilities (4)
- `addTag` – Add tag to visitor
- `removeTag` – Remove tag from visitor
- `calculateStatistics` – Pure calculation from travelHistory
- `updatePreferences` – Partial preferences update
- `updateProfile` – Partial profile update

## Search Payload (15+ fields)

```javascript
{
  id, type: 'visitor', tenant_id,
  full_name, email, phone, city, country, language, currency,
  vip, trust_score, reservation_count, completed_stays,
  last_visit, favorite_destinations, favorite_businesses,
  tags, status, identity_id, identity_provider,
  created_at, updated_at
}
```

## Dependencies

- **BaseCapability** (core) – for capability lifecycle

Zero dependencies on: Authentication, Authorization, Business, Reservation, Availability, Accommodation, Payment, Notification.

## Communication

Access from other capabilities via `context.capabilities.get('visitor')`:
```javascript
const visitor = context.capabilities.get('visitor')
const result = await visitor.service.create(data, identity)
```

The Visitor capability accesses other capabilities only through `context.capabilities.get()` if needed (e.g., linking reservations).
