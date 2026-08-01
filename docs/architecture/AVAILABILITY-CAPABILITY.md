# Availability Capability

> P13.3 — Complete Availability domain architecture for calendar management.
> Independent capability. Not part of Business, Accommodation, or Reservation.

---

## Purpose

Determine whether an Accommodation can be booked for a specific period. Owns calendar, blocked dates, availability windows, booking rules, seasons, and reservation locks. Does NOT own reservations, payments, visitors, or businesses.

---

## Aggregate

```
Availability (Aggregate Root)
├── AvailabilityDay       — Single day record (date + status)
├── AvailabilityWindow    — Named date range with state
├── AvailabilityRule      — Composable booking rule
├── AvailabilitySeason    — Seasonal period with multipliers
├── AvailabilityBlock     — Manual or maintenance block
├── AvailabilityException — Override for specific dates
└── (future)
    ├── AvailabilityFeed      — OTA/iCal feed
    ├── AvailabilitySync      — Sync state
    └── AvailabilitySnapshot  — Point-in-time calendar snapshot
```

---

## Status Model

```
AVAILABLE → BLOCKED → RESERVED → PENDING → MAINTENANCE → HIDDEN → ARCHIVED → DELETED
```

| Status | Bookable | Editable | Terminal |
|--------|----------|----------|----------|
| available | yes | yes | no |
| blocked | no | no | no |
| reserved | no | no | no |
| pending | no | yes | no |
| maintenance | no | yes | no |
| hidden | no | yes | no |
| archived | no | no | terminal |
| deleted | no | no | terminal |

---

## Calendar Engine

`availability.calendar.js` — Pure calculations, no persistence.

| Method | Purpose |
|--------|---------|
| `expandRange` | Expand date range to individual dates |
| `mergeRanges` | Merge overlapping/adjacent date ranges |
| `splitRange` | Split range at specified dates |
| `detectOverlap` | Check if two ranges overlap |
| `detectGaps` | Find gaps between sorted ranges |
| `calculateAvailability` | Mark dates as available/blocked given reservations + blocks |
| `calculateOccupancy` | Calculate occupancy percentage |
| `findFreePeriods` | Find contiguous free periods |
| `findBlockedPeriods` | Find contiguous blocked periods |
| `normalize` | Normalize calendar with multiple data sources |

---

## Rules Engine

`availability.rules.js` — Composable, priority-based, no hardcoded business logic.

| Rule Type | Priority | Purpose |
|-----------|----------|---------|
| MIN_STAY | 100 | Minimum nights required |
| MAX_STAY | 100 | Maximum nights allowed |
| ADVANCE_BOOKING | 50 | Max days in advance for booking |
| ARRIVAL_WEEKDAYS | 75 | Allowed check-in weekdays |
| DEPARTURE_WEEKDAYS | 75 | Allowed check-out weekdays |
| BLACKOUT_PERIODS | 200 | Date ranges where booking is blocked |
| MAINTENANCE | 250 | Scheduled maintenance periods |
| MANUAL_OVERRIDE | 300 | Manual overrides (highest priority) |

Each rule implements:
- `evaluate(checkIn, checkOut, context)` → `{ passed, reason }`
- `matchesDate(date, context)` → `boolean`

Rules are sorted by priority descending. All active rules must pass.

---

## Dependency Graph

```
AvailabilityCapability
    │
    ▼
AvailabilityManager
    │
    ├──► context.repositories.availability
    ├──► context.runtime.auth
    ├──► context.eventBus
    ├──► context.runtime.search
    └──► context.runtime.sync
```

**Never imports:**
- Business capability files ✗
- Reservation capability files ✗
- PostgreSQL / Drizzle ✗
- WordPress / JWT ✗
- Any infrastructure provider ✗

---

## Event Flow

```
Availability Manager                External Listeners
─────────────────                   ──────────────────
availability:created     ───►       Search index (+)
availability:updated     ───►       Search index (+)
availability:deleted     ───►       Search remove
availability:archived    ───►       Search remove, Sync push
availability:restored    ───►       Search index (+), Sync push
availability:blocked     ───►       Sync push, (future) OTA/Channel feed
availability:unblocked   ───►       Sync push
availability:reserved    ───►       Sync push, (future) Reservation confirmation
availability:released    ───►       Sync push, (future) Cancellation
availability:rule.*      ───►       (future) Pricing engine
availability:calendar.*  ───►       (future) OTA sync
availability:sync.*      ───►       (future) Channel manager
```

---

## Future Integrations (Extension Points Only)

| Integration | Type | Notes |
|-------------|------|-------|
| Airbnb | OTA | Via BusinessAvailabilityManager |
| Booking.com | OTA | Via BusinessAvailabilityManager |
| Expedia | OTA | Via BusinessAvailabilityManager |
| Vrbo | OTA | Via BusinessAvailabilityManager |
| iCal | Feed | Calendar feed import/export |
| Google Calendar | Sync | Bidirectional sync |
| Channel Manager | Sync | Centralized OTA management |
| Dynamic Pricing | Rules | Price modification based on demand |
| Season Pricing | Seasons | Price multiplier per season |
| Yield Management | Analytics | Optimize occupancy vs price |

---

## Reservation Integration (Future)

```
Reservation Created
    │
    ▼
availability.reserve(accommodationId, checkIn, checkOut, reservationId)
    │
    ▼
availability:reserved event
    │
    ▼
Calendar updated, Search re-indexed

Reservation Cancelled
    │
    ▼
availability.release(accommodationId, checkIn, checkOut)
    │
    ▼
availability:released event
```

Not implemented in this phase. Prepared as extension points.

---

## Architecture Rules

1. Availability never imports Business capability files
2. Availability never imports Reservation capability files
3. Availability never imports PostgreSQL, Drizzle, WordPress, or JWT
4. Availability communicates only through `context` API
5. All calendar calculations are pure and deterministic
6. Rules engine is composable — no hardcoded business logic
7. Repository abstraction only — never SQL/ORM directly
8. Zero infrastructure leakage into domain logic

---

## Validation Checklist

- [x] Independent Availability Capability created
- [x] 14 files in `capabilities/availability/`
- [x] Pure calendar engine (no persistence dependencies)
- [x] Composable rules engine (priority-based evaluation)
- [x] Aggregate root defined (Availability, Day, Window, Rule, Season, Block)
- [x] Status model complete (8 statuses + helpers)
- [x] Events complete (16 events)
- [x] Permissions complete (7 permissions)
- [x] Search payload ready
- [x] Zero infrastructure imports
- [x] Provider-independent
- [x] No Business capability imports
- [x] No Reservation capability imports
- [x] Extension points reserved for OTA/iCal integrations
- [x] Ready for P13.3.1 Business Availability Manager
- [x] Ready for P13.4 Reservation Capability
