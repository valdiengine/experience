# Business Capability

Manages company registrations (businesses) on the platform. Aggregate root of the commercial domain.

## Architecture

- **Aggregate Root**: Business is the aggregate root of the commercial domain
- **Dependencies**: Tenant, Destination
- **Owns**: Accommodation, Reservations, Availability, CMS pages, Payments, Notifications

## Key Concepts

- A Business belongs to **ONE** Tenant
- A Business has **ONE** Destination (primary location)
- A Business owns **MANY** Accommodations
- Business is NOT WordPress, NOT CMS, NOT a Tenant
- Business MUST NOT know about child entities (Accommodation, Reservation, etc.)
- Business orchestrates child domain logic through **sub-managers**, never direct capability imports

## Status Lifecycle

```
DRAFT → PENDING_REVIEW → PUBLISHED → SUSPENDED → ARCHIVED → DELETED
```

## Files

| File | Purpose |
|------|---------|
| `business.status.js` | Status constants and helpers |
| `business.events.js` | Event names |
| `business.errors.js` | Error classes |
| `business.schema.js` | Data schema |
| `business.workflow.js` | Status transition logic |
| `business.validation.js` | Input validation and business rules |
| `business.permissions.js` | Permission constants |
| `business.media.js` | Media helpers |
| `business.seo.js` | SEO generation with JSON-LD |
| `business.search.js` | Search payload mapping |
| `business.manager.js` | Thin orchestrator (277 lines) |
| `business.service.js` | Public service API |
| `business.capability.js` | Capability registration |
| `README.md` | This file |

## Sub-Managers (`manager/`)

| File | Lines | Responsibility |
|------|-------|----------------|
| `business-accommodation.manager.js` | 413 | All accommodation operations: CRUD, cascade, counts, brand defaults, statistics |
| `business-brand.manager.js` | ~40 | Branding defaults (logo, colors, currency, language, timezone, policies) |
| `business-owner.manager.js` | ~30 | Ownership transfer |
| `business-search.manager.js` | ~50 | Search indexing, sync push, search query |
| `business-statistics.manager.js` | ~30 | KPI retrieval |
| `business-cms.manager.js` | ~35 | CMS content sync, preview refresh |
| `business-availability.manager.js` | ~420 | Availability orchestration: calendar views, block/unblock, reserve/release, seasons, rules, batch ops, copy/duplicate, statistics sync |

## Manager Methods

| Method | Delegates To |
|--------|-------------|
| `createBusiness` | (self) |
| `getById` | (self) |
| `getMany` | (self) |
| `updateBusiness` | (self) |
| `publishBusiness` | (self via #transitionStatus) |
| `suspendBusiness` | (self via #transitionStatus) |
| `archiveBusiness` | (self + cascade to accommodation) |
| `restoreBusiness` | (self + cascade to accommodation) |
| `deleteBusiness` | (self + cascade to accommodation) |
| `verifyBusiness` | (self) |
| `transferBusinessOwner` | business-owner.manager.js |
| `findBySlug` | (self) |
| `findByTenant` | (self) |
| `findByDestination` | (self) |
| `getByStatus` | (self) |
| `getByCategory` | (self) |
| `searchBusinesses` | business-search.manager.js |
| `getSEO` | (self via BusinessSeo) |
| `getMedia` | (self via BusinessMedia) |
| `createAccommodation` | business-accommodation.manager.js |
| `attachAccommodation` | business-accommodation.manager.js |
| `detachAccommodation` | business-accommodation.manager.js |
| `archiveAccommodation` | business-accommodation.manager.js |
| `publishAccommodation` | business-accommodation.manager.js |
| `hideAccommodation` | business-accommodation.manager.js |
| `restoreAccommodation` | business-accommodation.manager.js |
| `deleteAccommodation` | business-accommodation.manager.js |
| `duplicateAccommodation` | business-accommodation.manager.js |
| `countAccommodations` | business-accommodation.manager.js |
| `countPublished` | business-accommodation.manager.js |
| `countDraft` | business-accommodation.manager.js |
| `countArchived` | business-accommodation.manager.js |
| `listAccommodations` | business-accommodation.manager.js |
| `listPublished` | business-accommodation.manager.js |
| `listHidden` | business-accommodation.manager.js |
| `getAccommodationStatistics` | business-accommodation.manager.js |
| `getAccommodationAvailability` | business-availability.manager.js |
| `getAccommodationOccupancy` | business-availability.manager.js |
| `checkAccommodationAvailability` | business-availability.manager.js |
| `getAccommodationCalendarSummary` | business-availability.manager.js |
| `blockAccommodation` | business-availability.manager.js |
| `unblockAccommodation` | business-availability.manager.js |
| `reserveAccommodation` | business-availability.manager.js |
| `releaseReservation` | business-availability.manager.js |
| `applySeason` | business-availability.manager.js |
| `removeSeason` | business-availability.manager.js |
| `applyRule` | business-availability.manager.js |
| `removeRule` | business-availability.manager.js |
| `updateAvailabilityRule` | business-availability.manager.js |
| `createAvailabilityWindow` | business-availability.manager.js |
| `createAvailabilityBlock` | business-availability.manager.js |
| `getBusinessAvailability` | business-availability.manager.js |
| `getBusinessCalendar` | business-availability.manager.js |
| `getBusinessOccupancy` | business-availability.manager.js |
| `blockMany` | business-availability.manager.js |
| `unblockMany` | business-availability.manager.js |
| `copyAvailability` | business-availability.manager.js |
| `duplicateCalendar` | business-availability.manager.js |
| `bulkAvailabilityUpdate` | business-availability.manager.js |
| `recalculateOccupancy` | business-availability.manager.js |
| `syncAvailabilityStatistics` | business-availability.manager.js |
| `refreshBusinessAvailability` | business-availability.manager.js |
| `getDailyCalendar` | business-availability.manager.js |
| `getWeeklyCalendar` | business-availability.manager.js |
| `getMonthlyCalendar` | business-availability.manager.js |
| `getTimeline` | business-availability.manager.js |
| `getOccupancyMap` | business-availability.manager.js |
| `getAvailabilityMatrix` | business-availability.manager.js |
| `getAccommodationAvailabilitySummary` | business-availability.manager.js |
| `getBusinessAvailabilitySummary` | business-availability.manager.js |

## Dependency Rules

- BusinessManager NEVER imports Accommodation capability files
- BusinessAvailabilityManager NEVER imports Availability capability files
- Sub-managers NEVER import each other (circular imports forbidden)
- BusinessManager coordinates all cross-domain operations
- All persistence through `context.repositories.{business,accommodation,availability}`
- All calendar logic delegated to `context.capabilities.get('availability')`
- No PostgreSQL, No Drizzle, No WordPress, No JWT imports
