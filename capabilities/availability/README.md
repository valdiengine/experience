# Availability Capability

Determines whether an Accommodation can be booked for a specific period.

## Architecture

- **Independent Capability**: Availability is NOT part of Business, Accommodation, or Reservation
- **Dependencies**: accommodation
- **Aggregate Root**: Availability
- **Children**: AvailabilityDay, AvailabilityWindow, AvailabilityRule, AvailabilitySeason, AvailabilityBlock

## Key Concepts

- Availability owns calendar, blocked dates, windows, seasons, rules, manual blocks, maintenance, reservation locks
- Availability NEVER owns reservations, payments, visitors, or businesses
- All calendar calculations are pure — no persistence in calendar engine
- Rules engine is composable — no hardcoded business logic
- Reservation integration happens through events, not direct calls

## Status Lifecycle

```
AVAILABLE → BLOCKED → RESERVED → PENDING → MAINTENANCE → HIDDEN → ARCHIVED → DELETED
```

## Files

| File | Purpose |
|------|---------|
| `availability.status.js` | Status constants and helpers |
| `availability.events.js` | Event names |
| `availability.errors.js` | Error classes |
| `availability.schema.js` | Data schemas (Availability, Window, Rule, Season, Block) |
| `availability.workflow.js` | Status transition state machine |
| `availability.validation.js` | Input validation |
| `availability.permissions.js` | Permission constants |
| `availability.rules.js` | Composable rules engine (min stay, max stay, blackout, etc.) |
| `availability.calendar.js` | Pure calendar calculations (expand, merge, split, detect, normalize) |
| `availability.search.js` | Search payload mapping |
| `availability.manager.js` | Orchestrator |
| `availability.service.js` | Public service API |
| `availability.capability.js` | Capability registration |
| `README.md` | This file |

## Rules Engine

Composable rules with priority-based evaluation:

- `MinStayRule` — Minimum nights required
- `MaxStayRule` — Maximum nights allowed
- `AdvanceBookingRule` — How far in advance bookings are accepted
- `ArrivalWeekdaysRule` — Which weekdays check-in is allowed
- `DepartureWeekdaysRule` — Which weekdays check-out is allowed
- `BlackoutPeriodsRule` — Date ranges where booking is blocked
- `MaintenanceRule` — Date ranges where maintenance is scheduled
- `OverrideRule` — Manual overrides with highest priority

## Manager Methods

| Method | Description |
|--------|-------------|
| `createDay` | Create a single day record |
| `getById` | Find by ID |
| `getMany` | List with filter |
| `updateDay` | Update day record |
| `archiveDay` | Archive a record |
| `restoreDay` | Restore from archived |
| `deleteDay` | Soft delete |
| `block` | Block a date range |
| `unblock` | Unblock a date range |
| `reserve` | Mark dates as reserved (from reservation) |
| `release` | Release reserved dates |
| `getCalendar` | Get calendar for a date range |
| `checkAvailability` | Check if a date range is available |
| `getOccupancy` | Calculate occupancy percentage |
| `getCalendarSummary` | Aggregated calendar summary |
| `createWindow` | Create an availability window |
| `createRule` | Add a booking rule |
| `updateRule` | Update a rule |
| `deleteRule` | Remove a rule |
| `createSeason` | Create a seasonal period |
| `createBlock` | Create a manual block |
