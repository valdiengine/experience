# Business Visitor Manager

> P13.5.1 — Orchestration layer for business-owned visitor lifecycle management.
> Pure orchestration. All visitor logic delegated to Visitor capability.

---

## Purpose

Bridge the Business capability (aggregate root) with the Visitor capability (business customer domain). Provides business-level aggregation, visitor analytics, reservation coordination, batch operations, cascade rules, and search sync — while delegating all lifecycle, workflow, validation, permissions, profile/preferences, statistics, and merge logic to the Visitor capability.

Business owns the **commercial relationship** with visitors. Visitor remains responsible for visitor business logic.

---

## Architecture Rule

**BusinessVisitorManager MUST NOT import anything from `capabilities/visitor/` or `capabilities/reservation/`.**

All communication with the Visitor and Reservation domains uses:
- `context.capabilities.get('visitor').service` — public service methods
- `context.capabilities.get('visitor').manager` — manager methods (when service delegation is insufficient)
- `context.capabilities.get('reservation').service` — reservation update for attach/detach
- `context.repositories.visitor` — direct visitor queries (relationship bookkeeping)
- `context.repositories.business` — business lookup + statistics sync
- `context.capabilities.get('business').manager` — business coordination (reservation manager)

---

## Aggregate Boundaries

```
Visitor capability (pure domain)
    - visitor.status / visitor.workflow        → owns state transitions
    - visitor.validation                       → owns validation rules
    - visitor.profile / visitor.preferences    → separate domain objects
    - visitor.statistics                       → pure calculations
    - visitor.permissions                      → 10 visitor permissions
    - visitor.manager                          → all lifecycle logic
    - visitor.events                           → 20 visitor events

BusinessVisitorManager (orchestration only)
    - business ownership checks
    - business↔visitor relationship (reservations + favoriteBusinesses)
    - business-level aggregation, analytics, batch, export, cascade
```

---

## Delegation Pattern

```
Business Service
    │
    ▼
Business Manager (orchestrator)
    │
    ▼
BusinessVisitorManager
    │
    ├──► context.capabilities.get('visitor').service.create()
    ├──► context.capabilities.get('visitor').service.update()
    ├──► context.capabilities.get('visitor').service.archive()
    ├──► context.capabilities.get('visitor').service.restore()
    ├──► context.capabilities.get('visitor').service.delete()
    ├──► context.capabilities.get('visitor').service.merge()
    ├──► context.capabilities.get('visitor').service.verify()
    ├──► context.capabilities.get('visitor').service.activate()
    ├──► context.capabilities.get('visitor').service.deactivate()
    ├──► context.capabilities.get('visitor').service.grantVIP()
    ├──► context.capabilities.get('visitor').service.revokeVIP()
    ├──► context.capabilities.get('visitor').service.blacklist()
    ├──► context.capabilities.get('visitor').service.removeFromBlacklist()
    ├──► context.capabilities.get('visitor').service.updateProfile()
    ├──► context.capabilities.get('visitor').service.updatePreferences()
    ├──► context.capabilities.get('visitor').service.addTag() / removeTag()
    ├──► context.capabilities.get('visitor').service.findByEmail() / findByPhone()
    ├──► context.capabilities.get('visitor').service.calculateStatistics()
    ├──► context.repositories.visitor                       (relationship bookkeeping)
    ├──► context.repositories.business                      (statistics sync)
    ├──► BusinessReservationManager.findByVisitor()         (visitor reservations)
    └──► context.capabilities.get('reservation').service.updateReservation()  (attach/detach)
```

---

## Method Catalog

### Visitor Lifecycle

| Method | Delegates To | Purpose |
|--------|-------------|---------|
| `createVisitor` | `visitor.service.create` | Create a new visitor + link to business |
| `updateVisitor` | `visitor.service.update` | Update visitor fields |
| `archiveVisitor` | `visitor.service.archive` | Archive a visitor |
| `restoreVisitor` | `visitor.service.restore` | Restore an archived visitor |
| `deleteVisitor` | `visitor.service.delete` | Delete a visitor |
| `mergeVisitors` | `visitor.service.merge` | Merge source into target visitor |
| `activateVisitor` | `visitor.service.activate` | Activate a visitor |
| `deactivateVisitor` | `visitor.service.deactivate` | Deactivate a visitor |
| `verifyVisitor` | `visitor.service.verify` | Verify a visitor identity |
| `grantVip` | `visitor.service.grantVIP` | Grant VIP status |
| `revokeVip` | `visitor.service.revokeVIP` | Revoke VIP status |
| `blacklistVisitor` | `visitor.service.blacklist` | Blacklist with reason |
| `unblacklistVisitor` | `visitor.service.removeFromBlacklist` | Remove from blacklist |
| `updateVisitorProfile` | `visitor.service.updateProfile` | Update visitor profile |
| `updateVisitorPreferences` | `visitor.service.updatePreferences` | Update visitor preferences |
| `updateVisitorTags` | `visitor.service.addTag` / `removeTag` | Sync tag set (diff-based) |

### Visitor Queries

| Method | Purpose |
|--------|---------|
| `getVisitor` | Get by ID with business ownership check |
| `findVisitor` | Alias for getVisitor |
| `findVisitorByEmail` | Find by email, scoped to business |
| `findVisitorByPhone` | Find by phone, scoped to business |
| `findVisitors` | Filter by status / tags / segment |
| `listVisitors` | Alias for findVisitors |
| `searchVisitors` | Local text search over business visitors |
| `visitorExists` | Boolean existence check |
| `countVisitors` | Total business visitors |
| `getBusinessVisitors` | All visitors with a commercial relationship to the business |

### Reservation Coordination

| Method | Purpose |
|--------|---------|
| `attachReservation` | Link a reservation to a visitor (sets `visitorId` on reservation) |
| `detachReservation` | Unlink a reservation from a visitor (clears `visitorId`) |
| `getVisitorReservations` | All reservations for the visitor (scoped to business) |
| `getReservationHistory` | Full reservation history, sorted by check-in |
| `getCurrentReservation` | Active confirmed/checked-in reservation |
| `getUpcomingReservations` | Future confirmed/checked-in reservations |
| `getPastReservations` | Completed/cancelled/no-show/rejected/expired |
| `calculateLifetimeValue` | Sum of `totalPrice` for completed reservations |
| `calculateAverageStay` | Average nights per completed stay |
| `calculateCancellationRate` | Cancelled/rejected/expired percentage |
| `calculateNoShowRate` | No-show percentage |

### Analytics

| Method | Purpose |
|--------|---------|
| `getVisitorStatistics` | Per-visitor statistics via `visitor.service.calculateStatistics` |
| `calculateBusinessVisitorMetrics` | Business-level visitor KPIs (counts, rates, top/last visitor, tags, languages, countries) |
| `refreshVisitorStatistics` | Compute metrics and sync all visitor fields to business index |
| `syncVisitorStatistics` | Alias for refreshVisitorStatistics |
| `calculateVisitorSegments` | Segment counts (new, first_time, returning, vip, inactive, blacklisted, archived, deleted) |
| `calculateTopVisitors` | Top visitors by lifetime value |
| `calculateReturningVisitors` | Visitors with 2+ reservations |
| `calculateVipVisitors` | Visitors with VIP status |

### Batch Operations

| Method | Purpose |
|--------|---------|
| `archiveManyVisitors` | Archive multiple visitors |
| `restoreManyVisitors` | Restore multiple archived visitors |
| `deleteManyVisitors` | Delete multiple visitors |
| `mergeManyVisitors` | Merge all visitor IDs into the first |
| `tagManyVisitors` | Add a tag to multiple visitors |
| `exportVisitors` | Export visitor data (CSV-ready array) |

### Search Integration

| Method | Purpose |
|--------|---------|
| `refreshVisitorSearch` | Re-index all business visitors to the search engine |

### Business Rules (Cascade)

| Method | Trigger | Action |
|--------|---------|--------|
| `cascadeArchive` | Business archived | Archive all non-archived/deleted visitors |
| `cascadeRestore` | Business restored | Restore visitors archived by the business |
| `cascadeDelete` | Business deleted | Archive all non-archived/deleted visitors |

---

## Reservation Coordination Flow

```
attachReservation
    │
    ├── validate business active
    ├── assert visitor belongs to business
    ├── assert reservation belongs to business (via BusinessReservationManager)
    ├── reject if reservation linked to a different visitor
    ├── delegate reservation.service.updateReservation({ visitorId })
    ├── link businessId into visitor.travelHistory.favoriteBusinesses
    └── emit BusinessVisitorReservationAttached

detachReservation
    │
    ├── validate business active + ownership
    ├── delegate reservation.service.updateReservation({ visitorId: null })
    └── emit BusinessVisitorReservationDetached
```

---

## Events

All events in `BUSINESS_VISITOR_EVENTS` (defined in `business.events.js`):

| Event | Emitted When |
|-------|-------------|
| `business.visitor:created` | Visitor created for this business |
| `business.visitor:updated` | Visitor updated |
| `business.visitor:archived` | Visitor archived |
| `business.visitor:restored` | Visitor restored |
| `business.visitor:deleted` | Visitor deleted |
| `business.visitor:merged` | Visitors merged |
| `business.visitor:activated` | Visitor activated |
| `business.visitor:deactivated` | Visitor deactivated |
| `business.visitor:verified` | Visitor verified |
| `business.visitor:blacklisted` | Visitor blacklisted |
| `business.visitor:unblacklisted` | Visitor removed from blacklist |
| `business.visitor:vip_granted` | VIP granted |
| `business.visitor:vip_revoked` | VIP revoked |
| `business.visitor:profile_updated` | Visitor profile updated |
| `business.visitor:preferences_updated` | Visitor preferences updated |
| `business.visitor:tags_updated` | Visitor tags updated |
| `business.visitor:statistics_updated` | Business visitor statistics synced |
| `business.visitor:search_updated` | Visitor search index refreshed |
| `business.visitor:reservation_attached` | Reservation linked to visitor |
| `business.visitor:reservation_detached` | Reservation unlinked from visitor |
| `business.visitor:error` | Visitor operation error |

---

## Search Fields

Added to `business.search.js`:

| Field | Type | Purpose |
|-------|------|---------|
| `visitor_count` | number | Total business visitors |
| `active_visitors` | number | Active/VIP visitors |
| `vip_visitors` | number | VIP visitors |
| `verified_visitors` | number | Verified visitors |
| `blacklisted_visitors` | number | Blacklisted visitors |
| `average_lifetime_value` | number/null | Average visitor lifetime value |
| `average_stay` | number/null | Average stay in nights |
| `repeat_rate` | number/null | Returning visitor percentage |
| `cancellation_rate` | number/null | Business-wide cancellation rate |
| `no_show_rate` | number/null | Business-wide no-show rate |
| `top_visitor` | object/null | Highest-value visitor |
| `last_visitor` | object/null | Most recently updated visitor |
| `visitor_tags` | array | All visitor tags (distinct) |
| `visitor_languages` | array | Visitor languages (distinct) |
| `visitor_countries` | array | Visitor countries (distinct) |
| `visitor_segments` | object | Segment counts |
| `last_visitor_sync` | string/null | Last visitor sync timestamp |

---

## Dependency Graph

```
BusinessManager
    │
    ├── BusinessAccommodationManager
    ├── BusinessAvailabilityManager
    ├── BusinessReservationManager
    ├── BusinessVisitorManager ◄── THIS FILE
    ├── BusinessBrandManager
    ├── BusinessOwnerManager
    ├── BusinessSearchManager
    ├── BusinessStatisticsManager
    └── BusinessCmsManager

BusinessVisitorManager
    │
    ├──► context.capabilities.get('visitor').service    (no direct imports)
    ├──► context.capabilities.get('reservation').service (attach/detach only)
    ├──► BusinessReservationManager                      (visitor reservations)
    ├──► context.repositories.visitor                    (relationship bookkeeping)
    ├──► context.repositories.business                   (business lookup + stats sync)
    ├──► context.eventBus                                (events)
    └──► context.runtime.search                          (re-index)
```

---

## Validation Checklist

- [x] ZERO imports from `capabilities/visitor/*`
- [x] ZERO imports from `capabilities/reservation/*`
- [x] All visitor logic delegated to Visitor capability
- [x] Orchestration only — no visitor workflow/validation/statistics duplication
- [x] ZERO infrastructure imports (PostgreSQL, Drizzle, WordPress, JWT, HTTP, SQL, ORM)
- [x] Business-level aggregation across all visitors
- [x] Reservation coordination (attach/detach via reservation service)
- [x] Business rules: cascade archive, restore, delete
- [x] Batch operations (archive/restore/delete/merge/tag/export)
- [x] Visitor statistics sync to business search/index
- [x] Visitor analytics (metrics, segments, top, returning, VIP)
- [x] 21 BUSINESS_VISITOR_EVENTS
- [x] 17 visitor search fields
- [x] Wired into BusinessManager (archive/restore/delete cascade) and BusinessService
- [x] BusinessManager remains a thin orchestrator (delegates all visitor operations)
- [x] Backward compatibility preserved (no existing public API changed)
