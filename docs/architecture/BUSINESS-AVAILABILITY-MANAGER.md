# Business Availability Manager

> P13.3.1 — Orchestration layer for business-owned accommodation calendar management.
> Pure orchestration. All calendar logic delegated to Availability capability.

---

## Purpose

Bridge the Business capability (aggregate root) with the Availability capability (calendar domain). Provides business-level aggregation, batch operations, statistics sync, and calendar views — while delegating all day-level CRUD, block/unblock, reserve/release, rules, seasons, and calendar calculations to the Availability capability.

---

## Architecture Rule

**BusinessAvailabilityManager MUST NOT import anything from `capabilities/availability/`.**

All communication with the Availability domain uses:
- `context.capabilities.get('availability').service` — public service methods
- `context.capabilities.get('availability').manager` — manager methods (for deleteRule, etc.)
- `context.repositories.availability` — direct availability data queries (for statistics)

---

## Delegation Pattern

```
Business Service
    │
    ▼
Business Manager (orchestrator)
    │
    ▼
BusinessAvailabilityManager
    │
    ├──► context.capabilities.get('availability').service.getCalendar()
    ├──► context.capabilities.get('availability').service.block()
    ├──► context.capabilities.get('availability').service.unblock()
    ├──► context.capabilities.get('availability').service.reserve()
    ├──► context.capabilities.get('availability').service.release()
    ├──► context.capabilities.get('availability').service.getOccupancy()
    ├──► context.capabilities.get('availability').service.checkAvailability()
    ├──► context.capabilities.get('availability').service.createSeason()
    ├──► context.capabilities.get('availability').service.createRule()
    ├──► context.capabilities.get('availability').service.updateRule()
    ├──► context.capabilities.get('availability').service.deleteRule()
    ├──► context.capabilities.get('availability').service.createWindow()
    ├──► context.capabilities.get('availability').service.createBlock()
    ├──► context.capabilities.get('availability').service.getCalendarSummary()
    └──► context.repositories.availability (statistics only)
```

---

## Method Catalog

### Single Accommodation

| Method | Delegates To | Purpose |
|--------|-------------|---------|
| `getAccommodationAvailability` | `availability.service.getCalendar` | Calendar for one accommodation |
| `getAccommodationOccupancy` | `availability.service.getOccupancy` | Occupancy stats for one accommodation |
| `checkAccommodationAvailability` | `availability.service.checkAvailability` | Check if dates are bookable |
| `getAccommodationCalendarSummary` | `availability.service.getCalendarSummary` | Summarized calendar payload |
| `blockAccommodation` | `availability.service.block` | Block date range |
| `unblockAccommodation` | `availability.service.unblock` | Unblock date range |
| `reserveAccommodation` | `availability.service.reserve` | Reserve for a booking |
| `releaseReservation` | `availability.service.release` | Release reservation |

### Rules & Seasons

| Method | Delegates To | Purpose |
|--------|-------------|---------|
| `applySeason` | `availability.service.createSeason` | Apply seasonal period |
| `removeSeason` | `availability.manager.deleteRule` | Remove season |
| `applyRule` | `availability.service.createRule` | Apply booking rule |
| `removeRule` | `availability.service.deleteRule` | Remove booking rule |
| `updateRule` | `availability.service.updateRule` | Update existing rule |
| `createWindow` | `availability.service.createWindow` | Create availability window |
| `createBlock` | `availability.service.createBlock` | Create persistent block record |

### Business-Level Aggregation

| Method | Purpose |
|--------|---------|
| `getBusinessAvailability` | Aggregate calendar across all accommodations |
| `getBusinessCalendar` | Aggregate calendar (same as above, alias for clarity) |
| `getBusinessOccupancy` | Aggregate occupancy across all accommodations |
| `getDailyCalendar` | Single-day business calendar view |
| `getWeeklyCalendar` | 7-day business calendar view |
| `getMonthlyCalendar` | Month business calendar view |
| `getTimeline` | Flat timeline sorted by date |
| `getOccupancyMap` | Occupancy heatmap across accommodations (alias) |
| `getAvailabilityMatrix` | 2D matrix: accommodations × dates → status |
| `getAccommodationSummary` | Calendar + occupancy for one accommodation |
| `getBusinessSummary` | Availability + occupancy for entire business |

### Batch Operations

| Method | Purpose |
|--------|---------|
| `blockMany` | Block same dates across multiple accommodations |
| `unblockMany` | Unblock same dates across multiple accommodations |
| `bulkAvailabilityUpdate` | Apply mixed block/unblock updates in one call |

### Copy & Duplicate

| Method | Purpose |
|--------|---------|
| `copyAvailability` | Copy calendar state from one accommodation to another |
| `duplicateCalendar` | Copy all calendars from source business to target business |

### Statistics & Sync

| Method | Purpose |
|--------|---------|
| `recalculateOccupancy` | Recalculate occupancy rate for next 3 months |
| `syncAvailabilityStatistics` | Sync availability stats to business search/index |
| `refreshBusinessAvailability` | Determine next available date and update status |

---

## Events

All events in `BUSINESS_AVAILABILITY_EVENTS` (defined in `business.events.js`):

| Event | Emitted When |
|-------|-------------|
| `business.availability:calendar_viewed` | Business calendar accessed |
| `business.availability:occupancy_viewed` | Business occupancy accessed |
| `business.availability:availability_viewed` | Business availability accessed |
| `business.availability:day_blocked` | Accommodation day(s) blocked |
| `business.availability:day_unblocked` | Accommodation day(s) unblocked |
| `business.availability:day_reserved` | Accommodation day(s) reserved |
| `business.availability:day_released` | Accommodation day(s) released |
| `business.availability:season_applied` | Season applied to accommodation |
| `business.availability:season_removed` | Season removed from accommodation |
| `business.availability:rule_applied` | Rule applied to accommodation |
| `business.availability:rule_removed` | Rule removed from accommodation |
| `business.availability:calendar_copied` | Calendar copied between accommodations |
| `business.availability:calendar_duplicated` | Calendar duplicated between businesses |
| `business.availability:bulk_updated` | Bulk block/unblock operation executed |
| `business.availability:statistics_synced` | Availability stats synced to index |
| `business.availability:occupancy_recalculated` | Occupancy recalculated |
| `business.availability:availability_refreshed` | Business availability refreshed |
| `business.availability:error` | Availability operation error |

---

## Search Fields

Added to `business.search.js`:

| Field | Type | Purpose |
|-------|------|---------|
| `availability_status` | string/null | Current availability state |
| `occupancy_rate` | number/null | Current occupancy percentage |
| `total_bookable_days` | number | Total days in availability calendar |
| `blocked_days` | number | Days blocked or in maintenance |
| `reserved_days` | number | Days currently reserved |
| `available_days` | number | Days available for booking |
| `total_seasons` | number | Active seasons |
| `active_rules_count` | number | Active booking rules |
| `next_available_date` | string/null | Earliest bookable date |
| `last_availability_sync` | string/null | Last sync timestamp |

---

## Dependency Graph

```
BusinessManager
    │
    ├── BusinessAccommodationManager
    ├── BusinessAvailabilityManager ◄── THIS FILE
    ├── BusinessBrandManager
    ├── BusinessOwnerManager
    ├── BusinessSearchManager
    ├── BusinessStatisticsManager
    └── BusinessCmsManager

BusinessAvailabilityManager
    │
    ├──► context.capabilities.get('availability').service  (no direct imports)
    ├──► context.capabilities.get('availability').manager   (no direct imports)
    ├──► context.repositories.availability                  (stats only)
    ├──► context.repositories.accommodation                 (list accommodations)
    ├──► context.repositories.business                      (business lookup)
    └──► context.eventBus                                   (events)
```

---

## Validation Checklist

- [x] ZERO imports from `capabilities/availability/*`
- [x] All calendar logic delegated to Availability capability
- [x] Orchestration only — no calendar engine duplication
- [x] ZERO infrastructure imports (PostgreSQL, Drizzle, WordPress, JWT)
- [x] Business-level aggregation across all accommodations
- [x] Batch operations (blockMany, unblockMany, bulkAvailabilityUpdate)
- [x] Statistics sync to business search/index
- [x] Copy & duplicate calendar operations
- [x] Calendar views (daily, weekly, monthly, timeline, matrix)
- [x] 17 BUSINESS_AVAILABILITY_EVENTS
- [x] 10 availability search fields
- [x] Wired into BusinessManager and BusinessService
