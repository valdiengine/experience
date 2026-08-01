## Reservation Capability

> P13.4 — Modernized. Full lifecycle, workflow, service, validation, errors, permissions, search.

Production Reservation Layer — orchestrates the full reservation lifecycle. Business-agnostic.

### Structure

```
reservation/
├── reservation.capability.js   — Capability registration + search indexing
├── reservation.manager.js      — Central orchestration (all logic)
├── reservation.service.js      — Public API (delegates to manager)
├── reservation.workflow.js     — State machine (14 statuses)
├── reservation.validation.js   — Pure validation (no persistence)
├── reservation.permissions.js  — Permission constants (11)
├── reservation.errors.js       — Error hierarchy (11 classes)
├── reservation.search.js       — Search payload generation
├── reservation.schema.js       — Data schemas
├── reservation.events.js       — Event definitions (22)
├── reservation.status.js       — Status constants + helpers (14 statuses)
├── reservation.flow.js         — UI flow orchestrator
├── reservation.timer.js        — Lifecycle timers
├── reservation.recovery.js     — Recovery system
├── reservation.config.js       — Timeout configuration
├── ui/                         — UI sub-modules (calendar, selector, form, view)
└── README.md
```

### Lifecycle

```
REQUESTED → OWNER_PENDING → OWNER_CONFIRMED → PAYMENT_PENDING
  → CONFIRMED → CHECKED_IN → CHECKED_OUT → COMPLETED

Alternative:
→ REJECTED / EXPIRED / CANCELLED / NO_SHOW / NO_RESPONSE / ARCHIVED
```

### Public API (24 methods)

- `createReservation`, `updateReservation`, `cancelReservation`
- `confirmReservation`, `rejectReservation`, `expireReservation`
- `completeReservation`, `archiveReservation`, `restoreReservation`
- `deleteReservation`, `findReservation`, `findReservations`
- `findByAccommodation`, `findByVisitor`, `findByBusiness`
- `findUpcoming`, `findActive`, `findCompleted`, `findCancelled`
- `calculateReservationPrice`, `calculateNights`, `calculateGuests`
- `validateAvailability`, `estimateTaxes`, `estimateCommission`

### Architecture Rules

- ZERO infrastructure imports (PostgreSQL, Drizzle, WordPress, JWT)
- ZERO SQL, ZERO ORM
- Communicates with capabilities ONLY via `context.capabilities.get()`
- All persistence through `context.repositories.reservation` / `context.dataManager`
- Workflow, timers, recovery preserved — no backward-incompatible changes
