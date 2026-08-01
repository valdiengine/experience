# Business Reservation Manager

> P13.4.1 — Orchestration layer for business-owned reservation lifecycle management.
> Pure orchestration. All reservation logic delegated to Reservation capability.

---

## Purpose

Bridge the Business capability (aggregate root) with the Reservation capability (booking domain). Provides business-level aggregation, KPI analytics, availability coordination, batch operations, cascade rules, and reservation dashboard — while delegating all lifecycle, workflow, validation, permissions, search indexing, timers, and recovery to the Reservation capability.

---

## Architecture Rule

**BusinessReservationManager MUST NOT import anything from `capabilities/reservation/`.**

All communication with the Reservation domain uses:
- `context.capabilities.get('reservation').service` — public service methods
- `context.capabilities.get('reservation').manager` — manager methods (for checkIn, checkOut, noShow)
- `context.repositories.reservation` — direct reservation queries (for statistics)
- `context.capabilities.get('business').manager` — business coordination (availability)

---

## Delegation Pattern

```
Business Service
    │
    ▼
Business Manager (orchestrator)
    │
    ▼
BusinessReservationManager
    │
    ├──► context.capabilities.get('reservation').service.createReservation()
    ├──► context.capabilities.get('reservation').service.updateReservation()
    ├──► context.capabilities.get('reservation').service.confirmReservation()
    ├──► context.capabilities.get('reservation').service.rejectReservation()
    ├──► context.capabilities.get('reservation').service.cancelReservation()
    ├──► context.capabilities.get('reservation').service.expireReservation()
    ├──► context.capabilities.get('reservation').service.archiveReservation()
    ├──► context.capabilities.get('reservation').service.restoreReservation()
    ├──► context.capabilities.get('reservation').service.deleteReservation()
    ├──► context.capabilities.get('reservation').service.findReservation()
    ├──► context.capabilities.get('reservation').service.findByAccommodation()
    ├──► context.capabilities.get('reservation').service.findByVisitor()
    ├──► context.capabilities.get('reservation').service.findByBusiness()
    ├──► context.capabilities.get('reservation').manager.checkInReservation()
    ├──► context.capabilities.get('reservation').manager.checkOutReservation()
    ├──► context.capabilities.get('reservation').manager.noShowReservation()
    ├──► BusinessAvailabilityManager.reserveAccommodation()     (create → block dates)
    └──► BusinessAvailabilityManager.releaseReservation()       (cancel/expire → release dates)
```

---

## Method Catalog

### Reservation Lifecycle

| Method | Delegates To | Purpose |
|--------|-------------|---------|
| `createReservation` | `reservation.service.createReservation` | Create a new reservation |
| `updateReservation` | `reservation.service.updateReservation` | Update reservation fields |
| `confirmReservation` | `reservation.service.confirmReservation` | Confirm a reservation |
| `rejectReservation` | `reservation.service.rejectReservation` | Reject with reason |
| `cancelReservation` | `reservation.service.cancelReservation` | Cancel + release dates via AvailabilityManager |
| `expireReservation` | `reservation.service.expireReservation` | Expire + release dates via AvailabilityManager |
| `checkIn` | `reservation.manager.checkInReservation` | Guest check-in |
| `checkOut` | `reservation.manager.checkOutReservation` | Guest check-out |
| `noShow` | `reservation.manager.noShowReservation` | Mark as no-show |
| `completeReservation` | `reservation.service.completeReservation` | Mark completed |
| `archiveReservation` | `reservation.service.archiveReservation` | Archive for history |
| `restoreReservation` | `reservation.service.restoreReservation` | Restore from archive |
| `deleteReservation` | `reservation.service.deleteReservation` | Hard-delete |

### Reservation Queries

| Method | Purpose |
|--------|---------|
| `getReservation` | Get by ID with business ownership check |
| `getReservationById` | Alias for getReservation |
| `getReservationByCode` | Find by reservation code or ID |
| `getReservations` | List with optional filter |
| `findByVisitor` | All reservations for a visitor (scoped to business) |
| `findByAccommodation` | All reservations for an accommodation |
| `findByBusiness` | All reservations for the business |
| `findPending` | Pending (requested/owner_pending/owner_confirmed/payment_pending) |
| `findConfirmed` | Confirmed |
| `findCheckedIn` | Checked-in |
| `findCheckedOut` | Checked-out |
| `findCompleted` | Completed |
| `findCancelled` | Cancelled/rejected/expired |
| `findArchived` | Archived |
| `findActive` | Non-terminal statuses |

### Business Aggregation

| Method | Purpose |
|--------|---------|
| `getBusinessReservations` | All reservations for the business |
| `getUpcomingReservations` | Future confirmed/checked-in reservations |
| `getTodayArrivals` | Reservations arriving today |
| `getTodayDepartures` | Reservations departing today |
| `getCurrentGuests` | Currently checked-in guests |
| `getReservationTimeline` | Reservations overlapping a date range |
| `getReservationDashboard` | Snapshot: counts by status, today's arrivals/departures, revenue |

### Analytics

| Method | Purpose |
|--------|---------|
| `calculateOccupancy` | Occupancy rate for a date range |
| `calculateRevenue` | Revenue for a date range |
| `calculateADR` | Average Daily Rate |
| `calculateRevPAR` | Revenue Per Available Room |
| `calculateAverageStay` | Average length of stay (nights) |
| `calculateCancellationRate` | Cancellation percentage |
| `calculateNoShowRate` | No-show percentage |
| `refreshReservationStatistics` | Sync all KPI fields to business index |

### Batch Operations

| Method | Purpose |
|--------|---------|
| `bulkCancel` | Cancel multiple reservations |
| `bulkArchive` | Archive multiple reservations |
| `bulkRestore` | Restore multiple archived reservations |
| `bulkConfirm` | Confirm multiple reservations |
| `bulkDelete` | Delete multiple reservations |

### Synchronization

| Method | Purpose |
|--------|---------|
| `syncReservationStatistics` | Alias for refreshReservationStatistics |
| `refreshBusinessReservations` | Update reservation count and sync timestamp |
| `refreshReservationSearch` | Re-index all business reservations to search engine |

### Price & Availability Coordination

| Method | Delegates To | Purpose |
|--------|-------------|---------|
| `calculateReservationPrice` | `reservation.service.calculateReservationPrice` | Price estimation |
| `validateAvailability` | `reservation.service.validateAvailability` | Date availability check |
| `estimateTaxes` | `reservation.service.estimateTaxes` | Tax estimation |
| `estimateCommission` | `reservation.service.estimateCommission` | Commission estimation |

### Business Rules (Cascade)

| Method | Trigger | Action |
|--------|---------|--------|
| `cascadeArchive` | Business archived | Cancel pending reservations, archive completed/active |
| `cascadeRestore` | Business restored | Restore reservations archived by business |
| `cascadeDelete` | Business deleted | Archive all reservations |

---

## Reservation Flow & Availability Coordination

```
createReservation
    │
    ├── validate business active
    ├── validate accommodation belongs to business
    ├── delegate to reservation.service.createReservation
    └── emit BusinessReservationCreated

cancelReservation / expireReservation
    │
    ├── validate business active + ownership
    ├── delegate to reservation.service.cancelReservation / expireReservation
    ├── delegate to BusinessAvailabilityManager.releaseReservation (release dates)
    └── emit BusinessReservationCancelled / BusinessReservationExpired

archiveReservation
    │
    ├── validate business active + ownership
    ├── delegate to reservation.service.archiveReservation
    └── emit BusinessReservationArchived
```

---

## Events

All events in `BUSINESS_RESERVATION_EVENTS` (defined in `business.events.js`):

| Event | Emitted When |
|-------|-------------|
| `business.reservation:created` | Reservation created for this business |
| `business.reservation:updated` | Reservation updated |
| `business.reservation:confirmed` | Reservation confirmed |
| `business.reservation:rejected` | Reservation rejected |
| `business.reservation:cancelled` | Reservation cancelled |
| `business.reservation:expired` | Reservation expired |
| `business.reservation:checked_in` | Guest checked in |
| `business.reservation:checked_out` | Guest checked out |
| `business.reservation:archived` | Reservation archived |
| `business.reservation:restored` | Reservation restored |
| `business.reservation:deleted` | Reservation deleted |
| `business.reservation:statistics_updated` | Reservation stats synced |
| `business.reservation:dashboard_updated` | Dashboard snapshot updated |
| `business.reservation:revenue_updated` | Revenue recalculated |
| `business.reservation:error` | Reservation operation error |

---

## Search Fields

Added to `business.search.js`:

| Field | Type | Purpose |
|-------|------|---------|
| `reservation_count` | number | Total reservations |
| `active_reservations` | number | Active (non-terminal) reservations |
| `pending_reservations` | number | Pending (requested/owner_pending) |
| `confirmed_reservations` | number | Confirmed count |
| `checked_in` | number | Currently checked-in |
| `checked_out` | number | Checked-out today |
| `completed` | number | Completed count |
| `cancelled` | number | Cancelled/rejected/expired count |
| `occupancy_rate` | number/null | Current occupancy percentage |
| `average_stay` | number/null | Average length of stay |
| `average_daily_rate` | number/null | ADR |
| `revpar` | number/null | RevPAR |
| `next_arrival` | string/null | Next expected arrival |
| `next_departure` | string/null | Next expected departure |
| `today_arrivals` | number/null | Arrivals today |
| `today_departures` | number/null | Departures today |
| `future_revenue` | number | Total confirmed non-terminal revenue |
| `last_reservation_sync` | string/null | Last sync timestamp |

---

## Dependency Graph

```
BusinessManager
    │
    ├── BusinessAccommodationManager
    ├── BusinessAvailabilityManager
    ├── BusinessReservationManager ◄── THIS FILE
    ├── BusinessBrandManager
    ├── BusinessOwnerManager
    ├── BusinessSearchManager
    ├── BusinessStatisticsManager
    └── BusinessCmsManager

BusinessReservationManager
    │
    ├──► context.capabilities.get('reservation').service   (no direct imports)
    ├──► context.capabilities.get('reservation').manager    (checkIn/checkOut/noShow)
    ├──► BusinessAvailabilityManager                        (availability coordination)
    ├──► context.repositories.reservation                   (direct queries)
    ├──► context.repositories.accommodation                 (ownership validation)
    ├──► context.repositories.business                      (business lookup)
    ├──► context.eventBus                                   (events)
    └──► context.runtime.search                             (re-index)
```

---

## Validation Checklist

- [x] ZERO imports from `capabilities/reservation/*`
- [x] All reservation logic delegated to Reservation capability
- [x] Orchestration only — no reservation workflow duplication
- [x] ZERO infrastructure imports (PostgreSQL, Drizzle, WordPress, JWT)
- [x] Business-level aggregation across all reservations
- [x] Availability coordination (reserve/release dates on create/cancel/expire)
- [x] Business rules: cascade archive, restore, delete
- [x] Batch operations (bulkCancel, bulkArchive, bulkRestore, bulkConfirm, bulkDelete)
- [x] Statistics sync to business search/index
- [x] KPI analytics (Occupancy, ADR, RevPAR, Revenue, Stay, Cancellation Rate, No-Show Rate)
- [x] 15 BUSINESS_RESERVATION_EVENTS
- [x] 18 reservation search fields
- [x] Wired into BusinessManager (archive/restore/delete cascade) and BusinessService
