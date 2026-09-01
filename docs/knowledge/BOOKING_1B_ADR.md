# BOOKING-1B — Reservation Domain Architecture Decision Record

> **Status:** Active
> **Owner:** Architecture Review
> **Date:** 2026-09-01
> **Supersedes:** BOOKING-1 (design options analysis)
> **Next:** BOOKING-2 (Migration & Implementation Plan)

---

## Purpose

This ADR records the Owner-approved architectural decisions for the Reservation Domain. It establishes the canonical model, cardinality rules, temporal semantics, availability semantics, lifecycle states, and integration patterns.

This is the binding reference for all implementation work under BOOKING-2.

---

## Decision 1 — Generic Core with Vertical Adapters

**Date:** 2026-09-01
**Status:** Active

**Context:**
The platform must support multiple verticals (accommodation, rentals, experiences, services, events) without embedding vertical-specific logic in core reservation infrastructure. The existing `reservations` table has `accommodationId NOT NULL`, which couples the core to accommodation.

**Decision:**
Reservation architecture is:
- **Generic Reservation Core** — owns universal reservation semantics
- **Vertical Adapters** — own vertical-specific availability, fulfillment, operational actions, and compatibility behavior

Generic core does NOT expose a mandatory `bookableTargetType` discriminator. The BookableTarget resolution strategy belongs to BOOKING-2.

**Alternatives Considered:**
1. **Accommodation-first with extension columns** — Add nullable columns for other verticals.
2. **Separate tables per vertical** — `reservations_accommodation`, `reservations_rentals`, etc.
3. **Single generic table with JSONB payload** — Store vertical-specific data as JSONB.

**Why They Were Rejected:**
1. Extension columns create a sparse, unmaintainable schema.
2. Separate tables prevent cross-vertical bookings and share no logic.
3. JSONB payload loses queryability and schema validation.

**Consequences:**
- Core reservation logic is reusable across all verticals.
- Each vertical has an adapter that owns its specific semantics.
- New verticals can be added by implementing a new adapter.

**References:**
- `capabilities/reservation/` — Generic BookingManager with `items[]` array
- `capabilities/booking/` — Existing generic BookingManager

---

## Decision 2 — BookableTarget

**Date:** 2026-09-01
**Status:** Active

**Context:**
The domain model uses both "BookableTarget" and "Resource" to describe bookable entities. The existing infrastructure has `availability` and `reservations` tables using `accommodationId` as the primary reference.

**Decision:**
BookableTarget is the canonical conceptual contract:

> "Something against which Turistic OS can query availability and commit a reservation."

BookableTarget is NOT automatically a database table. It may resolve to different underlying entities by vertical:

- accommodation unit/type
- vehicle
- tour departure
- dive session
- attraction slot
- future bookable entities

The physical BookableTarget resolution strategy (table, FK mapping, polymorphic mega-table, discriminator columns) belongs to BOOKING-2.

**Alternatives Considered:**
1. **Mandatory `bookable_targets` table** — All bookable entities must be registered in a central table.
2. **Resource as primary** — Resource replaces BookableTarget as the canonical entity.
3. **No canonical entity** — Each vertical manages its own entity identity.

**Why They Were Rejected:**
1. A mandatory central table creates an extra join for every availability and reservation query.
2. Resource is too generic and conflates "bookable thing" with "capacity unit."
3. No canonical entity leads to identity fragmentation across verticals.

**Consequences:**
- BookableTarget semantics are preserved without forcing a specific persistence model.
- Vertical adapters decide how to map conceptual BookableTarget to physical schema.
- Identity continuity is maintained even if the underlying table changes.

**References:**
- BOOKING-1A Semantic Analysis
- `capabilities/availability/` — availability.manager.js

---

## Decision 3 — Resource is Optional

**Date:** 2026-09-01
**Status:** Active

**Context:**
Some bookable entities require capacity tracking. Others are inherently singular or self-limiting.

**Decision:**
Resource is OPTIONAL in the generic core. Resource represents a physical or operational fulfillment entity:

- vehicle
- room
- boat
- instructor
- equipment

A Resource may itself be the commercial BookableTarget when the customer contract depends on that specific Resource. Example: a specific rental vehicle.

Resource is NOT merely a capacity subdivision. A passenger books a navigation departure and not necessarily a specific boat.

resourceId must NOT become a renamed accommodationId.

**Alternatives Considered:**
1. **Resource is mandatory** — Every BookableTarget must have at least one Resource.
2. **Resource is forbidden** — Capacity is always on BookableTarget directly.
3. **Two-tier model** — Resource for capacity tracking, BookableTarget for display only.

**Why They Were Rejected:**
1. Forces Resource onto entities that have no meaningful capacity subdivision.
2. Loses the ability to track per-unit capacity for complex bookables.
3. Unnecessary complexity for most verticals.

**Consequences:**
- Simple verticals (experiences, events) skip Resource entirely.
- Complex verticals (accommodation, rentals) use Resource for capacity management.
- The model adapts to vertical needs without forcing a single pattern.

**References:**
- BOOKING-1A Semantic Analysis

---

## Decision 4 — Offering is Optional

**Date:** 2026-09-01
**Status:** Active

**Context:**
Offering is a valid domain concept representing "what the business sells."

**Decision:**
Offering is OPTIONAL at the Reservation Core boundary. Reservation Core must NOT depend on Offering.

Examples of Offering:
- Balmaceda & Serrano Navigation
- Introductory Dive
- Vehicle Rental
- Accommodation product/type

Offering is distinct from Resource. A business may sell (Offering) vehicles (Resource) without the Reservation Core requiring Offering.

DO NOT require an Offering database table in BOOKING-1B.

**References:**
- BOOKING-1A Semantic Analysis

---

## Decision 5 — Reservation Cardinality

**Date:** 2026-09-01
**Status:** Active

**Context:**
A reservation may book multiple bookable entities (e.g., villa + kayak + guided tour). The existing `reservations` table is accommodation-centric with a single reference.

**Decision:**
TARGET CONTRACT: Reservation contains 1..n ReservationLines.

A simple reservation has exactly one ReservationLine. A complex reservation may have multiple ReservationLines.

Each ReservationLine conceptually contains:
- BookableTarget reference
- temporal commitment
- quantity
- pricing snapshot / commercial value where applicable
- metadata where applicable

Legacy current reservations may be adapted as one ReservationLine during migration.

DO NOT decide here whether reservation_lines becomes a table. That belongs to BOOKING-2.

**Alternatives Considered:**
1. **Single-line reservation** — One BookableTarget per reservation.
2. **Parent-child reservation** — Master reservation with sub-reservations.
3. **Line items with shared temporal scope** — All lines share check-in/check-out dates.

**Why They Were Rejected:**
1. Forces users to create separate reservations for bundled offerings.
2. Adds unnecessary hierarchy for what is fundamentally a single transaction.
3. Accommodation (nightly rate) and experiences (specific datetime) have incompatible temporal scopes.

**Consequences:**
- Users can book multiple heterogeneous items in one transaction.
- Each line is independently checked for availability.
- Pricing, confirmation, and notifications operate per line or per reservation as appropriate.
- Availability checking is per-line, not per-reservation.

**References:**
- `capabilities/reservation/` — BookingManager with `items[]` array

---

## Decision 6 — Quantity

**Date:** 2026-09-01
**Status:** Active

**Context:**
Quantity semantics differ across verticals.

**Decision:**
Quantity belongs to ReservationLine. Its semantic meaning depends on the target:
- passengers
- tickets
- units
- participants
- etc.

Quantity does NOT replace Resource Allocation.

---

## Decision 7 — Temporal Modes

**Date:** 2026-09-01
**Status:** Active

**Context:**
Different verticals have fundamentally different temporal semantics. DO NOT mix ontology/entity identity with booking behavior.

**Decision:**
The Reservation Core supports three temporal modes:

1. **DATE_RANGE** — Local civil dates. Used by accommodation.
2. **DATETIME_RANGE** — Continuous timestamp-based reservation. Example: vehicle rental.
3. **SLOT** — Scheduled session/departure/entry. Examples: navigation, dive session, guided tour, timed attraction.

Temporal mode is booking semantics. It is NOT the BookableTarget entity type.

**Alternatives Considered:**
1. **Single datetime range mode** — Represent all temporals as start/end datetimes.
2. **Four+ temporal modes** — Separate modes for date, datetime, slot, multi-day.
3. **Temporal mode as extension** — Core is timeless; verticals add temporal semantics.

**Why They Were Rejected:**
1. Accommodation date ranges are not datetimes — the concept of "night" is not a datetime range.
2. Too many modes create unnecessary fragmentation.
3. Extension model makes core temporal behavior unknowable.

**Consequences:**
- Each ReservationLine specifies its temporal mode.
- Availability computation is mode-specific.
- Pricing rules are mode-specific.
- Calendar UIs differ by mode.

---

## Decision 8 — Accommodation Dates

**Date:** 2026-09-01
**Status:** Active

**Context:**
Accommodation bookings operate on calendar dates. Converting dates to artificial UTC day boundaries breaks domain semantics.

**Decision:**
Accommodation DATE_RANGE uses local civil dates. Target must preserve:
- startDate
- endDate
- business/property timezone context

Accommodation date semantics are domain semantics. Do NOT convert 2026-09-01 → 2026-09-03 to artificial UTC day boundaries or encode accommodation nights as 00:00:00Z → 23:59:59Z.

For true datetime verticals: store/represent real instants consistently, generally UTC at persistence boundaries, while retaining business timezone where required for recurrence, interpretation, scheduling, and display.

Do NOT state that timezone is merely a presentation concern.

**References:**
- `database/schema/business/index.js` — `reservations` table with `accommodationId`

---

## Decision 9 — Availability

**Date:** 2026-09-01
**Status:** Active

**Context:**
Availability is NOT one mandatory materialized AvailabilityWindow model.

**Decision:**
The architecture distinguishes:
- Availability Rules
- Scheduled Occurrences where relevant
- Reservation Commitments
- Availability Blocks
- Capacity
- Inventory

Different verticals may implement availability differently:

**Vehicle:** rules + reservation interval overlap + blocks
**Tour:** scheduled occurrences + capacity
**Accommodation:** date availability + reservation ranges + blocks
**Timed attraction:** scheduled slots + capacity

DO NOT mandate:
- universal materialization
- universal on-demand computation
- universal availability table
- universal occurrence table

BOOKING-2 decides persistence strategy.

---

## Decision 10 — AvailabilityBlock is Not a Reservation

**Date:** 2026-09-01
**Status:** Active

**Context:**
Blocked dates (owner blocks, maintenance blocks) look similar to reservations but have different business semantics.

**Decision:**
AvailabilityBlock is NOT a Reservation. Examples:
- maintenance
- owner block
- weather closure
- operational closure
- unavailable period

AvailabilityBlock affects availability but is not a commercial/customer commitment.

DO NOT represent AvailabilityBlock as a Reservation or as a fake customerless Reservation. DO NOT use Reservation status for blackout. DO NOT use AvailabilityBlock itself as capacity allocation.

**Alternatives Considered:**
1. **Block as negative reservation** — Create a reservation with negative quantity.
2. **Block as reservation with special status** — Use reservation with status=BLOCKED.
3. **Block is purely availability-layer concern** — Block only affects availability computation.

**Why They Were Rejected:**
1. Negative reservations break financial calculations and reporting.
2. Special status bloats reservation semantics with non-reservation concerns.
3. Pure availability-layer blocks get lost when reservations are queried directly.

**Consequences:**
- AvailabilityBlocks are queried separately from Reservations.
- Blocking does not create a booking record.
- Unblocking removes the block without affecting any other state.
- Both Reservations and AvailabilityBlocks contribute to availability state.

---

## Decision 11 — Occurrence

**Date:** 2026-09-01
**Status:** Active

**Context:**
Some bookables repeat across multiple occurrences.

**Decision:**
Occurrence is a concrete scheduled instance where relevant:

- Tour departure: 2026-09-01 09:00
- Dive session: 2026-09-01 10:00
- Timed attraction: 2026-09-01 14:30

Occurrence is NOT mandatory for all verticals. Continuous DATETIME_RANGE bookings such as vehicle rental do not require pre-generated Occurrences.

DO NOT freeze:
- lazy materialization
- pre-generation
- storage table
- recurrence ownership
- occurrence persistence strategy

BOOKING-2 decides those details.

**References:**
- BOOKING-1A Semantic Analysis

---

## Decision 12 — Operational Allocation

**Date:** 2026-09-01
**Status:** Active

**Context:**
How is a reserved booking actually fulfilled?

**Decision:**
Operational Allocation is separate from the customer's commercial reservation commitment.

Conceptually:
```
ReservationLine
    |
    +-- optional Operational Allocation
             |
             +-- Resource
```

Examples:
- assign instructor to a dive
- assign boat to a departure
- assign equipment
- assign a room where business model supports late assignment

Allocation is operational/vertical behavior. It is NOT mandatory in Generic Reservation Core.

DO NOT model Allocation through AvailabilityBlock. DO NOT require Resource for every ReservationLine.

---

## Decision 13 — Quote is Optional

**Date:** 2026-09-01
**Status:** Active

**Context:**
Quote / Interaction exists in the current system as a pre-reservation commercial step.

**Decision:**
Quote / Interaction is OPTIONAL. Direct booking is valid:

> BookableTarget → Reservation

Optional commercial flow:

> Interaction / Quote → accepted proposal → Reservation

Reservation Core must NOT depend on Quote.

DO NOT state "A Quote is generated from every Reservation draft." DO NOT make Quote mandatory.

---

## Decision 14 — Payment

**Date:** 2026-09-01
**Status:** Active

**Context:**
Payment processing is external to the reservation core.

**Decision:**
Payment is a separate capability related to Reservation. Reservation may exist without Payment where business model permits.

External payment provider calls are NOT part of the Reservation PostgreSQL transaction.

Relevant architectural concepts include:
- idempotency
- state transitions
- compensation where necessary

DO NOT freeze:
- a new payment workflow
- new Reservation lifecycle states
- PENDING_PAYMENT → CONFIRMED mapping
- automatic slot release algorithm
- payment provider implementation details

BOOKING-2 may plan compatibility.

**References:**
- BOOKING-1A Semantic Analysis

---

## Decision 15 — Notifications

**Date:** 2026-09-01
**Status:** Active

**Context:**
Reservations require notifications at multiple lifecycle stages.

**Decision:**
Reservation integrates with Notification through domain/events. Notification is not part of Reservation persistence. Preserve event-driven integration.

DO NOT freeze a new notification infrastructure architecture.

---

## Decision 16 — Identity and Multitenancy

**Date:** 2026-09-01
**Status:** Active

**Context:**
How is a reservation identified? The existing system uses auto-increment IDs.

**Decision:**
tenantId remains the persistence isolation boundary. applicationId remains canonical application/routing context.

DO NOT add applicationId to Reservation persistence without separately justified requirement. Business/company ownership relationships remain explicit.

DO NOT invent UUID v7 requirement, confirmationCode length, new confirmationCode scope, or new reservation identity strategy unless those are already current repository facts and are clearly labelled CURRENT rather than TARGET.

---

## Decision 17 — Lifecycle

**Date:** 2026-09-01
**Status:** Active

**Context:**
The existing system has 14 reservation states.

**Decision:**
Preserve the existing 14 Reservation states during migration.

The EXISTING states are:
1. REQUESTED
2. OWNER_PENDING
3. OWNER_CONFIRMED
4. PAYMENT_PENDING
5. CONFIRMED
6. CHECKED_IN
7. CHECKED_OUT
8. COMPLETED
9. REJECTED
10. EXPIRED
11. CANCELLED
12. NO_SHOW
13. NO_RESPONSE
14. ARCHIVED

BOOKING-1B does NOT redesign lifecycle.

CHECKED_IN / CHECKED_OUT are recognized as accommodation-oriented operational semantics. Future vertical adapters may expose other operational actions.

DO NOT introduce DRAFT, PAYMENT_FAILED, REFUNDED, PENDING_MODIFICATION, MODIFIED, PENDING_CANCELLATION, INVOICED, or CLOSED as replacement states.

**References:**
- `capabilities/reservation/` — 14 states in reservation manager

---

## Decision 18 — Concurrency and Authoritative Persistence

**Date:** 2026-09-01
**Status:** Active

**Context:**
Multiple concurrent booking attempts must not oversell.

**Decision:**
PostgreSQL must ultimately be authoritative for Reservation capacity/inventory consistency. Passenger/process-local memory must NOT be authority for double-booking prevention.

Reservation commitment and corresponding inventory/capacity consumption must become atomic at persistence boundary.

BOOKING-2 may evaluate:
- PostgreSQL transactions
- row-level locks
- atomic conditional updates
- appropriate DB constraints
- idempotency keys
- other PostgreSQL-safe mechanisms

BOOKING-1B MUST NOT freeze a specific mechanism. Therefore:
- DO NOT state optimistic locking is the chosen mechanism
- DO NOT state version columns are required
- DO NOT state pessimistic locking is rejected
- DO NOT state SERIALIZABLE is rejected
- DO NOT state Redis distributed locking is rejected
- DO NOT state a specific SQL UPDATE is canonical

External payment remains outside DB transaction.

---

## Architectural Invariants

These invariants MUST NOT be violated by any implementation under BOOKING-2:

**INV-BOOKING-001:** Every Reservation contains at least one ReservationLine.

**INV-BOOKING-002:** Every ReservationLine references one resolvable BookableTarget.

**INV-BOOKING-003:** Resource is not globally required.

**INV-BOOKING-004:** AvailabilityBlock is not a Reservation.

**INV-BOOKING-005:** DATE_RANGE and timestamp-based temporal semantics must not be conflated.

**INV-BOOKING-006:** Reservation commitment cannot exceed available capacity/inventory.

**INV-BOOKING-007:** Capacity/inventory commitment and Reservation persistence must become atomic at the authoritative persistence boundary.

**INV-BOOKING-008:** Process-local caches cannot be authoritative for booking consistency.

**INV-BOOKING-009:** Quote is not required to create a Reservation.

**INV-BOOKING-010:** External payment calls do not participate in the Reservation database transaction.

**INV-BOOKING-011:** tenantId remains the persistence isolation boundary.

**INV-BOOKING-012:** applicationId is not added to Reservation persistence without a separately justified architectural requirement.

---

## Target Conceptual Model

```
Business
   |
   +-- Offering                 optional at Reservation Core
   |
   +-- BookableTarget          conceptual contract
          |
          +-- BookingPolicy
          |      temporal semantics
          |      capacity/inventory semantics
          |
          +-- Availability
          |      rules
          |      occurrences where relevant
          |      blocks
          |
          +-- optional Resource relationships

Reservation
   |
   +-- Customer
   +-- Status
   +-- ReservationLine [1..n]
   |      |
   |      +-- BookableTarget reference
   |      +-- Temporal Commitment
   |      +-- Quantity
   |      +-- Pricing Snapshot
   |      +-- Metadata
   |
   +-- Payment relationships
   |
   +-- Domain Events
          |
          +-- Notifications

ReservationLine
   |
   +-- optional Operational Allocation
          |
          +-- Resource
```

CONCEPTUAL ONLY. Do not convert boxes into mandatory tables.

---

## Current vs Target Compatibility

### CURRENT (PUSH-4 Physical Staging Certified — commit f44988e)

| Component | Current State |
|-----------|--------------|
| `reservations.accommodationId` | NOT NULL — couples to accommodation |
| `availability.accommodationId` | NOT NULL — couples to accommodation |
| `reservation.resourceId` | Field exists in capability schema |
| `checkInDate`/`checkOutDate` | Core temporal fields for accommodation |
| `checkIn`/`checkOut` semantics | Overnight nights calculation |
| `calculateNights()` | Used for accommodation duration |
| `availability.date` | Day-based availability materialization |
| `availability.inventory` | Reserved count field |
| `availability.reservedCount` | Used in overlap checking |
| Accommodation overlap checks | Filter by `accommodationId` |
| Reservation API | 11 endpoints |
| Availability API | 9 endpoints |
| `BookingManager.items[]` | Already supports multi-line |
| `Payment.reservationId` | FK relationship exists |
| Quote/Interaction | Separate from Reservation |
| Reservation events | ~30 event types in manager |
| 14-state lifecycle | REQUESTED, OWNER_PENDING, OWNER_CONFIRMED, PAYMENT_PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, COMPLETED, REJECTED, EXPIRED, CANCELLED, NO_SHOW, NO_RESPONSE, ARCHIVED |
| Process-local caches | Manager caches under Passenger multi-worker |
| `LockManager` | Available but not integrated into reservation creation |

### TARGET (BOOKING-2 determines final persistence)

| Component | Target Contract |
|-----------|-----------------|
| Reservation | 1..n ReservationLines |
| BookableTarget | Conceptual contract — persistence strategy belongs to BOOKING-2 |
| Resource | Optional |
| Offering | Optional at Reservation Core boundary |
| Temporal modes | DATE_RANGE, DATETIME_RANGE, SLOT |
| Accommodation dates | Local civil dates preserved |
| AvailabilityBlock | Not a Reservation |
| Quote | Optional |
| Payment | External to DB transaction |
| 14 states | Preserved during migration |
| PostgreSQL | Authoritative for capacity/inventory consistency |

### MIGRATION REQUIRED

The following require migration planning. Specific implementation choices belong to BOOKING-2:

- `reservations.accommodationId` coupling — needs generic resolution strategy
- `availability.accommodationId` coupling — needs generic resolution strategy
- `checkInDate`/`checkOutDate` semantics — accommodate non-accommodation verticals
- Accommodation overlap checks — generalize beyond `accommodationId`
- Availability materialization strategy — BOOKING-2 decides per vertical
- Occurrence materialization — BOOKING-2 decides persistence
- AvailabilityBlock persistence — BOOKING-2 decides
- Reservation identity strategy — existing auto-increment IDs may remain or be evolved
- Concurrency mechanism — BOOKING-2 evaluates PostgreSQL options

### COMPATIBLE AS-IS

| Component | Notes |
|-----------|-------|
| `items[]` array | Already supports multi-line |
| 14 states | All preserved |
| PostgreSQL persistence | Continues as authoritative |
| EventBus integration | Unchanged |
| Quote/Interaction separation | Already optional |
| Payment relationship via `reservationId` | Already external |
| Notification via events | Already event-driven |

### LEGACY ADAPTER CANDIDATES

These vertical-specific patterns may be encapsulated as legacy adapters:
- Accommodation adapter: Maps generic core concepts to/from `accommodationId`-centric queries
- Rate plan adapter: Maps Offering to existing rate plan tables where applicable
- Payment adapter: Maps payment status to existing payment tracking

---

## BOOKING-2: Migration & Implementation Plan

**BOOKING-2 is defined as:** Documentation-only Migration & Implementation Plan.

BOOKING-2 is documentation/planning, not implementation. BOOKING-2 will determine:

- target persistence representation
- whether ReservationLine becomes a table
- BookableTarget resolution strategy
- compatibility adapter strategy
- accommodation migration
- availability persistence strategy
- occurrence persistence/materialization strategy
- AvailabilityBlock persistence
- temporal field migration
- API compatibility/versioning
- PostgreSQL concurrency strategy
- data backfill
- rollback strategy
- migration ordering
- testing/certification gates

**BOOKING-2 Boundaries:**
- NO database schema changes in BOOKING-2 output
- NO code implementation in BOOKING-2 output
- NO deployment in BOOKING-2 output
- BOOKING-2 is a plan, not an execution

---

## References

- `docs/knowledge/ARCHITECT_DECISIONS.md` — ADR format template
- `capabilities/reservation/` — Existing reservation infrastructure (18 files)
- `capabilities/availability/` — Existing availability infrastructure
- `capabilities/booking/` — Existing generic BookingManager
- `database/schema/business/index.js` — Current reservation/availability schema
- `docs/ai/CURRENT_STATE.md` — BOOKING-0 discovery results
- `docs/roadmap/PRODUCT_ROADMAP.md` — BOOKING-2 milestone definition
