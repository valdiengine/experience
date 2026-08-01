# Reservation Capability

> P13.4 — Modernized Reservation domain with full lifecycle, workflow, recovery, timer system, and public API.
> Business-agnostic. Provider-independent. No infrastructure imports.

---

## Purpose

Manage the complete reservation lifecycle from request through completion. Orchestrates booking, availability, communication, and notifications through context capability API. Does NOT own payments, availability, businesses, or accommodations.

---

## Aggregate

```
Reservation (Aggregate Root)
├── id              — Unique identifier
├── tenantId        — Tenant isolation
├── businessId      — Owning business (optional)
├── accommodationId — Booked accommodation (optional)
├── visitorId        — Visitor who booked (optional)
├── resourceId      — Booked resource (generic)
├── status          — Current lifecycle status
├── customer        — Customer information
├── dates           — checkIn / checkOut
├── guests          — Guest count
├── totalPrice      — Computed price
├── currency        — Price currency
├── source          — Booking source
├── channel         — Booking channel
├── confirmationCode
├── notes
├── metadata
└── timestamps      — createdAt, updatedAt, confirmedAt, checkedInAt, checkedOutAt, completedAt, cancelledAt
```

---

## Lifecycle

```
REQUESTED
    │
    ▼
OWNER_PENDING ──────────────────► NO_RESPONSE
    │                                    │
    ▼                                    ▼
OWNER_CONFIRMED ──────► REJECTED
    │
    ▼
PAYMENT_PENDING ──────► EXPIRED
    │
    ▼
CONFIRMED ────────────► CANCELLED
    │
    ├──► CHECKED_IN ──► CANCELLED
    │         │
    │         ▼
    │    CHECKED_OUT ──► COMPLETED
    │
    └──► NO_SHOW

Any active status ────► ARCHIVED
ARCHIVED ─────────────► (previous status, via restore)
```

---

## Statuses

| Status | Terminal | Pre-Arrival | In-House | Post-Departure | Cancellable | Archivable |
|--------|----------|-------------|----------|----------------|-------------|------------|
| requested | no | yes | no | no | yes | yes |
| owner_pending | no | yes | no | no | yes | yes |
| owner_confirmed | no | yes | no | no | yes | yes |
| payment_pending | no | yes | no | no | yes | yes |
| confirmed | no | yes | no | no | yes | yes |
| checked_in | no | no | yes | no | no | yes |
| checked_out | no | no | no | yes | no | yes |
| completed | yes | no | no | yes | no | yes |
| rejected | yes | no | no | no | no | no |
| expired | yes | no | no | no | no | no |
| cancelled | yes | no | no | no | no | no |
| no_show | yes | no | no | no | no | no |
| no_response | yes | no | no | no | no | no |
| archived | yes | no | no | no | no | no |

---

## Workflow

`reservation.workflow.js` — State machine with valid transition matrix.

Preserves existing implementation. Extended with CHECKED_IN, CHECKED_OUT, NO_SHOW, ARCHIVED.

Exports:
- `ReservationWorkflow.canTransition(from, to)` → boolean
- `ReservationWorkflow.transition(reservation, newStatus)` → updated reservation
- `ReservationWorkflow.getValidTransitions(status)` → string[]
- `ReservationWorkflow.getAllStatuses()` → string[]
- `ReservationWorkflow.isTerminal(status)` → boolean
- `ReservationWorkflow.canExpire(status)` → boolean
- `ReservationWorkflow.getExpirationTarget(status)` → string

---

## Timer System

`reservation.timer.js` — Manages lifecycle timers using Scheduler capability.

Preserves existing implementation.

- `startReservationTimer(reservationId, status)` — Start timer for a status
- `stopTimer(reservationId, status)` — Stop/cancel timer
- `checkExpiration()` — Check and expire overdue reservations
- `getActiveTimers()` — List active timers
- `getTimer(reservationId)` — Get timer for reservation

---

## Recovery

`reservation.recovery.js` — Detects and repairs inconsistent reservations.

Preserves existing implementation.

- `scan()` → issues[]
- `repair(issues)` → results[]
- `scanAndRepair()` → { issues, results }
- `recoverPendingReservations()` → { recovered, failed }
- `recoverExpiredReservations()` → { recovered, failed }
- `recoverFailedNotifications()` → { recovered, failed }
- `runAllRecoveries()` → aggregate results

---

## Permission Model

| Permission | Description |
|------------|-------------|
| `reservation:read` | Read reservation data |
| `reservation:create` | Create new reservations |
| `reservation:update` | Update existing reservations |
| `reservation:cancel` | Cancel reservations |
| `reservation:confirm` | Confirm reservations |
| `reservation:reject` | Reject reservations |
| `reservation:archive` | Archive or restore reservations |
| `reservation:restore` | Restore archived reservations |
| `reservation:delete` | Delete reservations |
| `reservation:override` | Override reservation rules |
| `reservation:manage` | Full management of reservations |

---

## Error Hierarchy

All errors extend `ReservationError` (extends `Error`):

| Error | Code | Status | When |
|-------|------|--------|------|
| ReservationError | RESERVATION_ERROR | 500 | Base error |
| ReservationValidationError | VALIDATION_ERROR | 400 | Invalid input data |
| ReservationPermissionError | PERMISSION_DENIED | 403 | Missing permission |
| ReservationNotFoundError | NOT_FOUND | 404 | Reservation not found |
| ReservationConflictError | CONFLICT | 409 | Data conflict |
| ReservationAvailabilityError | AVAILABILITY_CONFLICT | 409 | Dates not available |
| ReservationStateError | INVALID_STATE | 422 | Invalid status transition |
| ReservationPricingError | PRICING_ERROR | 422 | Pricing calculation error |
| ReservationRecoveryError | RECOVERY_FAILED | 500 | Recovery operation failed |
| ReservationTimeoutError | TIMEOUT | 408 | Reservation expired |
| ReservationOrphanError | ORPHAN_RESERVATION | 422 | Orphaned reservation |

---

## Validation Model

`reservation.validation.js` — Pure validation, no persistence, no SQL.

| Function | Purpose |
|----------|---------|
| `validateDateRange` | Check-in/check-out validation |
| `validateGuestCount` | Guest count within limits |
| `validateStatusTransition` | Valid workflow transition |
| `validatePricing` | Price/currency consistency |
| `validateTimezone` | Timezone validation |
| `validateTenantIsolation` | Tenant boundary check |
| `validateFutureLimit` | Max advance booking limit |
| `validateOwnership` | Resource ownership check |
| `validateReservationData` | Full reservation data validation |
| `checkAvailability` | Async availability check via context |
| `checkReservationOverlap` | Async overlap check via repository |
| `validateReservationAgainstContext` | Full context-aware validation |

---

## Events

All 22 events preserved and extended:

| Event | Emitted When |
|-------|-------------|
| reservation:created | Reservation request created |
| reservation:updated | Reservation fields updated |
| reservation:validated | Reservation validated |
| reservation:started | Reservation flow started |
| reservation:submitted | Reservation flow submitted |
| reservation:owner_requested | Owner confirmation requested |
| reservation:owner_confirmed | Owner confirmed |
| reservation:confirmed | Reservation confirmed |
| reservation:checked_in | Guest checked in |
| reservation:checked_out | Guest checked out |
| reservation:completed | Reservation completed |
| reservation:rejected | Reservation rejected |
| reservation:cancelled | Reservation cancelled |
| reservation:expired | Reservation expired |
| reservation:no_show | Guest no-show |
| reservation:archived | Reservation archived |
| reservation:restored | Reservation restored from archive |
| reservation:payment_pending | Payment pending |
| reservation:price_calculated | Price calculated |
| reservation:state_changed | Status changed |
| reservation:timeout_warning | Timer timeout warning |
| reservation:recovered | Recovery action executed |
| reservation:sync_required | Sync needed with external system |

---

## Public API (ReservationService)

| Method | Delegates To | Purpose |
|--------|-------------|---------|
| `createReservation` | manager.createRequest | Create reservation |
| `updateReservation` | manager.updateReservation | Update reservation |
| `cancelReservation` | manager.cancelReservation | Cancel reservation |
| `confirmReservation` | manager.confirmReservation | Confirm reservation |
| `rejectReservation` | manager.rejectReservation | Reject reservation |
| `expireReservation` | manager.expireReservation | Expire reservation |
| `completeReservation` | manager.completeReservation | Complete reservation |
| `archiveReservation` | manager.archiveReservation | Archive reservation |
| `restoreReservation` | manager.restoreReservation | Restore reservation |
| `deleteReservation` | manager.deleteReservation | Delete reservation |
| `findReservation` | manager.getById | Get by ID |
| `findReservations` | manager.getAll / getByStatus | List/filter reservations |
| `findByAccommodation` | manager.getByAccommodation | Filter by accommodation |
| `findByVisitor` | manager.getByVisitor | Filter by visitor |
| `findByBusiness` | manager.getByBusiness | Filter by business |
| `findUpcoming` | manager.getUpcoming | Future confirmed/checked_in |
| `findActive` | manager.getActive | All non-terminal |
| `findCompleted` | manager.getCompleted | Completed only |
| `findCancelled` | manager.getCancelled | Cancelled only |
| `calculateReservationPrice` | manager.calculatePrice | Price calculation |
| `calculateNights` | manager.calculateNights | Night count |
| `calculateGuests` | manager.calculateGuests | Guest count |
| `validateAvailability` | manager.validateCheckAvailability | Availability check |
| `estimateTaxes` | manager.estimateTaxes | Tax estimation |
| `estimateCommission` | manager.estimateCommission | Commission estimation |

---

## Dependency Graph

```
ReservationCapability
    │
    ├── ReservationManager
    │     ├── context.repositories.reservation
    │     ├── context.dataManager
    │     ├── context.runtime.auth
    │     ├── context.eventBus
    │     ├── context.capabilities.get('availability')
    │     └── context.capabilities.get('pricing')
    │
    ├── ReservationService
    │     └── ReservationManager
    │
    ├── ReservationTimer
    │     └── context.capabilities.get('scheduler')
    │
    ├── ReservationRecovery
    │     ├── context.dataManager
    │     ├── context.capabilities.get('availability')
    │     └── context.capabilities.get('communication')
    │
    └── ReservationFlow
          ├── ReservationCalendar (ui/)
          ├── ReservationSelector (ui/)
          ├── ReservationForm (ui/)
          └── ReservationView (ui/)
```

---

## Architecture Rules

1. Reservation NEVER imports Business, Accommodation, or Availability capability files
2. Reservation NEVER imports PostgreSQL, Drizzle, WordPress, or JWT
3. Reservation communicates with other capabilities ONLY through `context.capabilities.get()`
4. All persistence through `context.repositories.reservation` or `context.dataManager`
5. Zero SQL, Zero ORM, Zero PostgreSQL, Zero Drizzle
6. Provider-independent — no provider SDKs
7. All error classes extend ReservationError hierarchy
8. All events preserved — no backward-incompatible changes
9. Workflow preserved — only extended with new statuses
10. Timers preserved — zero changes
11. Recovery preserved — zero changes
12. Validation is pure — no persistence, no side effects

---

## Validation Checklist

- [x] reservation.service.js created (24 public methods)
- [x] reservation.validation.js created (12 validation functions)
- [x] reservation.permissions.js created (11 permissions)
- [x] reservation.errors.js created (11 error classes)
- [x] reservation.search.js created (search payload generation)
- [x] reservation.status.js extended (14 statuses, 7 helpers)
- [x] reservation.workflow.js extended (CHECKED_IN, CHECKED_OUT, NO_SHOW, ARCHIVED)
- [x] reservation.events.js extended (22 events)
- [x] reservation.schema.js extended (businessId, accommodationId, visitorId, pricing fields)
- [x] reservation.manager.js extended (updateReservation, checkIn, checkOut, noShow, archive, restore, delete, query methods, price calculation, availability validation)
- [x] reservation.capability.js extended (ReservationService, search indexing)
- [x] Zero infrastructure imports — verified
- [x] All existing logic preserved — workflow, timers, recovery, flow
- [x] Zero backward-incompatible changes
- [x] Ready for Business Reservation Manager (P13.4.1)
