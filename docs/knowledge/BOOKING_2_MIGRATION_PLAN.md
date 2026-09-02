# BOOKING-2 — Reservation Domain Migration & Implementation Plan

> **Status:** IN PROGRESS
> **Owner:** Architecture Review
> **Date:** 2026-09-01
> **Depends On:** BOOKING-1B (commit 246c1ae)
> **Next:** BOOKING-3 (Implementation) — TBD

---

## Executive Summary

BOOKING-1B (commit 246c1ae) established the target architecture for the Reservation Domain. BOOKING-2 produces the concrete migration plan that transforms the current accommodation-centric persistence toward the generic target architecture without breaking existing accommodation behavior.

**Key Architectural Decisions Being Planned:**

1. **ReservationLine as a dedicated table** — The canonical 1..n cardinality requires a proper normalized structure. The existing flat `reservations` table with single-accommodation coupling migrates to a structure where `reservation_lines` is the authoritative line items table.

2. **BookableTarget Reference via targetType + targetId** — Rather than a polymorphic mega-table or mandatory central registry, each ReservationLine references a concrete entity (accommodation, vehicle, tour, etc.) via a typed discriminator pair. Vertical adapters resolve the reference.

3. **Accommodation as a Vertical Adapter** — The current `accommodationId NOT NULL` coupling becomes one vertical adapter among future others (navigation, diving, vehicle rental, tours). The adapter pattern preserves backward compatibility while enabling generic core behavior.

4. **PostgreSQL-Authoritative Concurrency** — The existing non-atomic overlap-check-then-create pattern is replaced with PostgreSQL-authoritative concurrency control:
   - **Materialized capacity/inventory** (accommodation day inventory, occurrence capacity): atomic conditional UPDATE that decrements available count within the Reservation transaction, preventing oversell.
   - **Occurrence capacity**: PostgreSQL-authoritative atomic capacity mutation — reservedCount updated atomically with the reservation commit.
   - **Exclusive DATETIME_RANGE** (vehicle rental): PostgreSQL-enforced serialization via exclusion constraint (preferred if btree_gist is available) or equivalent mechanism selected at the implementation gate.
   - **Multi-line Reservation**: all line commitments participate in one Reservation DB transaction; if any line fails, the entire commitment rolls back atomically.

5. **Temporal Fields Generalize to a JSONB temporal Commitment** — Rather than separate `checkInDate`/`checkOutDate` columns, a JSONB `temporal` field stores the mode-specific temporal commitment (DATE_RANGE with local dates, DATETIME_RANGE with UTC instants, SLOT with occurrence reference).

---

## 1. Current Persistence Reality

### 1.1 Reservations Table

```sql
reservations (
  id UUID PRIMARY KEY,
  tenantId UUID NOT NULL,
  accommodationId UUID NOT NULL,        -- COUPLING: hard-coded to accommodation
  userId UUID,
  visitorId UUID,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  confirmationCode VARCHAR(50) UNIQUE,
  checkInDate VARCHAR(20) NOT NULL,       -- "2026-09-10" — local civil date as string
  checkOutDate VARCHAR(20) NOT NULL,     -- "2026-09-13"
  checkInTime VARCHAR(20),               -- "15:00"
  checkOutTime VARCHAR(20),              -- "11:00"
  guestCount INT DEFAULT 1,
  adults INT DEFAULT 1,
  children INT DEFAULT 0,
  infants INT DEFAULT 0,
  pets INT DEFAULT 0,
  subtotal DECIMAL(12,2),
  taxes DECIMAL(12,2),
  fees DECIMAL(12,2),
  discount DECIMAL(12,2),
  totalPrice DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'USD',
  channel VARCHAR(50),
  customer JSONB,
  guestDetails JSONB,
  specialRequests TEXT,
  internalNotes TEXT,
  metadata JSONB,
  expiresAt TIMESTAMPTZ,
  confirmedAt TIMESTAMPTZ,
  cancelledAt TIMESTAMPTZ,
  checkedInAt TIMESTAMPTZ,
  checkedOutAt TIMESTAMPTZ,
  createdAt TIMESTAMPTZ NOT NULL,
  updatedAt TIMESTAMPTZ NOT NULL,
  deletedAt TIMESTAMPTZ,
  ...
)
```

**Key Observations:**
- `accommodationId NOT NULL` — forces every reservation to be accommodation-centric
- `checkInDate`/`checkOutDate` as `VARCHAR(20)` — stores ISO date strings "YYYY-MM-DD"
- `checkInTime`/`checkOutTime` as `VARCHAR(20)` — stores time strings "HH:MM"
- No `resourceId` in the schema (though the capability schema mentions it)
- No `items[]` / line-item structure — flat single-item reservation
- Confirmation code is VARCHAR, not UUID

### 1.2 Availability Table

```sql
availability (
  id UUID PRIMARY KEY,
  tenantId UUID NOT NULL,
  accommodationId UUID NOT NULL,         -- COUPLING: hard-coded to accommodation
  date VARCHAR(20) NOT NULL,             -- "2026-09-10" — day-level materialization
  status VARCHAR(50) DEFAULT 'available',
  isBlocked BOOLEAN DEFAULT FALSE,
  isReserved BOOLEAN DEFAULT FALSE,
  minStay INT,
  maxStay INT,
  arrivalDays JSONB,
  departureDays JSONB,
  price JSONB,
  inventory INT DEFAULT 1,               -- per-day inventory
  reservedCount INT DEFAULT 0,            -- reserved inventory for this day
  metadata JSONB,
  ...
)
```

**Key Observations:**
- `accommodationId NOT NULL` — couples availability to accommodation
- Day-level materialization (`date VARCHAR(20)`) — one row per accommodation per day
- `inventory` and `reservedCount` — simple per-day inventory tracking
- `isBlocked` — represents AvailabilityBlock (owner/maintenance block)
- No generic temporal model — specifically designed for DATE_RANGE accommodation

### 1.3 Reservation Capability (ReservationManager)

- 824-line manager with `#reservations` Map cache
- 14-state lifecycle (REQUESTED, OWNER_PENDING, OWNER_CONFIRMED, PAYMENT_PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, COMPLETED, REJECTED, EXPIRED, CANCELLED, NO_SHOW, NO_RESPONSE, ARCHIVED)
- `createRequest()` — creates reservation with flat fields
- `confirmReservation()` — calls `availability.updateAvailability()` to mark dates unavailable
- `cancelReservation()` — updates availability
- Non-atomic overlap check in `checkReservationOverlap()` — queries existing reservations, then creates new one in separate operation
- Process-local `#reservations` Map — not shared across Passenger workers

### 1.4 Availability Capability (AvailabilityManager)

- Day-level CRUD for availability
- `createDay()`, `updateDay()`, `archiveDay()`, `restoreDay()`
- `checkAvailability()` — checks date ranges against availability table
- `updateAvailability()` — marks dates as unavailable
- No support for datetime ranges or slots

### 1.5 Booking Capability (BookingManager)

- Business-agnostic manager with `items[]` array
- Already supports multi-line bookings
- `itemsOverlap()` — checks date + time overlap per item
- Separate from ReservationManager — different capability

### 1.6 Existing Related Tables

- `payments` — FK to `reservationId`, stores payment state
- `invoices` — FK to `reservationId`
- `reservationActivities` — FK to `reservationId`, audit log
- `businessNotifications` — FK to `reservationId`

### 1.7 API Routes

**Reservation API** (`/api/v1/reservations`):
- GET / — list with pagination
- GET /:id — get by ID
- POST / — create
- PUT /:id — full update
- PATCH /:id — partial update
- DELETE /:id — delete
- POST /:id/confirm — confirm
- POST /:id/reject — reject
- POST /:id/cancel — cancel
- POST /:id/checkin — check in
- POST /:id/checkout — check out

**Availability API** (`/api/v1/availability`):
- GET / — list with accommodationId filter
- GET /:id — get by ID
- POST / — create day-level availability
- PUT /:id — update
- DELETE /:id — delete
- POST /:id/block — block a date
- POST /:id/unblock — unblock
- POST /:id/reserve — mark reserved
- POST /:id/release — release reservation

---

## 2. Target Persistence Contract

### 2.1 ReservationLines Table (New)

```sql
reservation_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservationId UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  lineOrder INT DEFAULT 1,                          -- for display ordering
  
  -- BookableTarget reference (target resolution delegated to vertical adapter)
  targetType VARCHAR(50) NOT NULL,                 -- 'accommodation', 'vehicle', 'tour', 'dive', etc.
  targetId UUID NOT NULL,                           -- ID of the concrete entity
  
  -- Temporal Commitment (JSONB — mode-specific structure)
  temporal JSONB NOT NULL,                         -- { mode, startDate, endDate, startTime, endTime, slotId, occurrenceId, ... }
  
  -- Quantity and Pricing
  quantity INT DEFAULT 1,                          -- passengers, tickets, units
  unitPrice DECIMAL(12,2),                         -- price per unit at booking time
  lineTotal DECIMAL(12,2),                         -- quantity * unitPrice
  
  -- Optional Resource Allocation (operational, not commercial)
  allocatedResourceId UUID,                        -- specific boat, instructor, equipment
  allocatedAt TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_reservation_line_target (targetType, targetId),
  INDEX idx_reservation_line_reservation (reservationId)
)
```

**Design Rationale:**
- `targetType + targetId` pair avoids polymorphic mega-table while enabling flexible reference resolution
- Vertical adapter interprets the pair based on `targetType`
- `temporal` JSONB allows heterogeneous temporal modes in the same table without forcing separate columns
- `allocatedResourceId` is optional — represents operational allocation, not commercial booking
- Referenced by `reservationId` FK — deletion cascades to lines

### 2.2 Reservations Table (Migrated)

```sql
reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenantId UUID NOT NULL,
  
  -- Identity — existing confirmationCode preserved, new UUID primary key
  confirmationCode VARCHAR(50) NOT NULL UNIQUE,   -- existing data preserved
  legacyReservationId UUID,                         -- points to original reservation during migration
  
  -- Customer
  customer JSONB DEFAULT '{}',                     -- { name, email, phone, ... }
  
  -- Status — 14 states preserved exactly
  status VARCHAR(50) NOT NULL DEFAULT 'requested',
  
  -- Guest aggregate (sum across lines)
  guestCount INT DEFAULT 1,
  
  -- Pricing aggregate (sum across lines)
  subtotal DECIMAL(12,2),
  taxes DECIMAL(12,2),
  fees DECIMAL(12,2),
  discount DECIMAL(12,2),
  totalPrice DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Channel and source
  channel VARCHAR(50),
  source VARCHAR(50),
  
  -- Booking flavor
  bookingType VARCHAR(50),                         -- 'direct', 'quote', 'marketplace'
  
  -- Timestamps
  expiresAt TIMESTAMPTZ,
  confirmedAt TIMESTAMPTZ,
  cancelledAt TIMESTAMPTZ,
  checkedInAt TIMESTAMPTZ,
  checkedOutAt TIMESTAMPTZ,
  completedAt TIMESTAMPTZ,
  
  -- Legacy accommodation reference — nullable during migration, becomes adapter detail
  accommodationId UUID,                           -- NULL after full migration
  accommodationUnitId UUID,                       -- specific room/unit if applicable
  
  -- Legacy flat temporal fields — preserved for backward compatibility during migration
  -- Will be populated from first ReservationLine's temporal during read
  checkInDate VARCHAR(20),                        -- "2026-09-10" — migrate from first line
  checkOutDate VARCHAR(20),                       -- "2026-09-13"
  checkInTime VARCHAR(20),                        -- "15:00"
  checkOutTime VARCHAR(20),                       -- "11:00"
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  internalNotes TEXT,
  specialRequests TEXT,
  
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deletedAt TIMESTAMPTZ,
  
  -- Indexes
  INDEX idx_reservation_tenant (tenantId),
  INDEX idx_reservation_status (status),
  INDEX idx_reservation_customer (customer->>'email'),
  INDEX idx_reservation_checkin (checkInDate),
  INDEX idx_reservation_checkout (checkOutDate),
  INDEX idx_reservation_channel (channel)
)
```

**Migration Notes:**
- `accommodationId` remains nullable during transition, populated from the first ReservationLine for existing reservations
- `checkInDate`/`checkOutDate` are maintained as virtual read-derived from the first line's temporal, or as actual columns updated via triggers/views
- New code writes to ReservationLines; legacy code paths may continue writing to flat fields temporarily

### 2.3 Temporal JSONB Structure

```javascript
// DATE_RANGE — Accommodation
{
  mode: "DATE_RANGE",
  startDate: "2026-09-10",         // ISO date string — local civil date
  endDate: "2026-09-13",           // ISO date string — exclusive (check-out)
  startTime: "15:00",              // check-in time (optional)
  endTime: "11:00",                // check-out time (optional)
  timezone: "America/Santiago",    // property/business timezone
  nights: 3                       // computed: endDate - startDate
}

// DATETIME_RANGE — Vehicle rental, continuous booking
{
  mode: "DATETIME_RANGE",
  start: "2026-09-10T15:00:00Z",  // UTC instant
  end: "2026-09-12T11:30:00Z",    // UTC instant
  timezone: "America/Santiago",    // business timezone for display
  durationMinutes: 2700            // computed
}

// SLOT — Tour, dive session, timed attraction
{
  mode: "SLOT",
  occurrenceId: UUID,             // reference to scheduled occurrence
  slotId: UUID,                    // specific time slot
  date: "2026-09-10",              // local date
  startTime: "09:00",              // local time
  endTime: "11:00",                // local time
  durationMinutes: 120,
  occurrence: {
    // occurrence data embedded or referenced
  }
}
```

---

## 3. ReservationLine Strategy

### 3.1 Decision: Dedicated Table

**Recommendation: Yes, create `reservation_lines` as a dedicated table.**

Rationale:
- BOOKING-1B establishes that Reservation contains 1..n ReservationLines
- Referential integrity via FK to `reservations.id` maintains aggregate consistency
- Each line can have heterogeneous `temporal` JSONB while sharing the same table schema
- Queryability — lines can be queried independently for inventory, reporting
- Pricing snapshots are per-line, not flattened into reservation-level totals
- Multi-line reservations (e.g., villa + kayak + guided tour) require proper normalized structure

### 3.2 Migration of Existing Reservations

Existing single-accommodation reservations are migrated as follows:

1. For each existing reservation with `accommodationId`:
   - Create one `reservation_lines` row where `targetType = 'accommodation'` and `targetId = accommodationId`
   - Populate `temporal` from `checkInDate`/`checkOutDate` + `checkInTime`/`checkOutTime` as DATE_RANGE mode
   - Populate `quantity` from `guestCount`
   - Populate `unitPrice`/`lineTotal` from `totalPrice` (if single-item)
   - Set `lineOrder = 1`

2. After migration, `reservations.checkInDate`/`checkOutDate` are updated to reflect the first line's temporal
3. After full migration, `accommodationId` column becomes nullable adapter detail

### 3.3 Composite Pricing

- `reservation_lines.lineTotal = quantity * unitPrice`
- `reservations.subtotal = SUM(lineTotal) across lines` (maintained via trigger or application logic)
- `reservations.totalPrice = subtotal + taxes + fees - discount`

### 3.4 Heterogeneous Temporal Commitments

The `temporal` JSONB column allows different modes in the same table:

```javascript
// Line 1: Accommodation (DATE_RANGE)
{ mode: "DATE_RANGE", startDate: "2026-09-10", endDate: "2026-09-13", nights: 3 }

// Line 2: Kayak rental (DATETIME_RANGE)
{ mode: "DATETIME_RANGE", start: "2026-09-10T08:00:00Z", end: "2026-09-10T18:00:00Z" }

// Line 3: Guided tour (SLOT)
{ mode: "SLOT", occurrenceId: "...", date: "2026-09-11", startTime: "08:30", endTime: "11:30" }
```

Vertical adapters interpret each mode appropriately.

---

## 4. BookableTarget Resolution

### 4.1 Resolution Strategy: TargetType + TargetId Pair

Each ReservationLine carries:
- `targetType` — discriminator string: `'accommodation'`, `'vehicle'`, `'tour'`, `'dive'`, `'attraction'`, etc.
- `targetId` — UUID of the concrete entity

### 4.2 Vertical Adapter Registry

```javascript
const BookableTargetAdapters = {
  accommodation: {
    resolve(targetId) {
      // Returns accommodation entity from accommodations table
    },
    checkAvailability(targetId, temporal) {
      // Checks availability using availability table
    },
    reserve(targetId, temporal, quantity) {
      // Marks availability as reserved
    },
    release(targetId, temporal, quantity) {
      // Releases reserved inventory
    }
  },
  vehicle: {
    resolve(targetId) {
      // Returns vehicle entity
    },
    checkAvailability(targetId, temporal) {
      // Interval overlap check against reservations
    },
    reserve(targetId, temporal, quantity) {
      // Creates reservation commitment
    },
    release(targetId, temporal, quantity) {
      // Releases commitment
    }
  },
  tour: {
    resolve(targetId) {
      // Returns tour/offering entity
    },
    checkAvailability(targetId, occurrenceId) {
      // Checks occurrence capacity
    },
    reserve(targetId, occurrenceId, quantity) {
      // Decrements occurrence capacity
    },
    release(targetId, occurrenceId, quantity) {
      // Increments occurrence capacity
    }
  }
}
```

### 4.3 Resolution Algorithm

When loading a Reservation with ReservationLines:

1. For each line, look up `BookableTargetAdapters[line.targetType]`
2. Call `adapter.resolve(line.targetId)` to get the concrete entity
3. Call `adapter.checkAvailability(line.targetId, line.temporal)` to verify availability
4. The adapter is responsible for all vertical-specific logic

### 4.4 Why Not a Universal Table

- **No `bookable_targets` table** — Adding a universal table creates an extra join for every query when vertical-specific tables already exist
- **No polymorphic mega-table** — `targetType + targetId` is a lightweight reference pattern, not a polymorphic schema
- **No mandatory central registry** — Vertical adapters own the resolution; the core only stores the typed reference

---

## 5. Accommodation Compatibility Migration

### 5.1 Current State

- `reservations.accommodationId NOT NULL`
- `availability.accommodationId NOT NULL`
- `checkInDate`/`checkOutDate` as primary temporal fields
- Overlap checking via `checkReservationOverlap(context, accommodationId, checkIn, checkOut)`

### 5.2 Migration Phases

**Phase 1 (Compatibility Layer):**
- Add `reservation_lines` table with `targetType + targetId + temporal` columns
- ReservationManager updated to:
  - Create a default ReservationLine when `accommodationId` is present
  - Write `accommodationId` to `targetId` with `targetType = 'accommodation'`
  - Maintain flat fields for backward read compatibility
- AvailabilityManager updated to:
  - Accept `targetType + targetId` for availability operations
  - Continue writing to `availability` table as before

**Note:** `targetType + targetId` are ONLY at the ReservationLine level. The `reservations` table does NOT get these columns — the reservation level has only `accommodationId` for backward compatibility. BookableTarget authority is at ReservationLine level per BOOKING-1B.

**Phase 2 (Line Migration of Existing Data):**
- Backfill `reservation_lines` table for all existing reservations
- Populate `checkInDate`/`checkOutDate` from first line's temporal
- Validate integrity — every reservation has at least one line

**Phase 3 (Generic Reads):**
- Update reservation read paths to derive flat fields from ReservationLines
- Deprecate direct writes to flat temporal fields

**Phase 4 (Adapter Isolation):**
- Make `accommodationId` truly nullable — adapter resolves it from `targetId`
- Vertical adapter owns the mapping
- Remove `accommodationId` coupling from core reservation logic

### 5.3 Backward Compatibility

- Existing API contracts (`/api/v1/reservations`) continue to work
- Response includes both flat fields (derived) and line items
- New requests can use line items or flat fields (flat fields create a single implicit line)

---

## 6. Temporal Migration

### 6.1 DATE_RANGE (Accommodation)

**Current:** `checkInDate VARCHAR(20)`, `checkOutDate VARCHAR(20)` — ISO date strings

**Target:** `temporal JSONB` with mode `"DATE_RANGE"`:
```javascript
{
  mode: "DATE_RANGE",
  startDate: "2026-09-10",
  endDate: "2026-09-13",
  startTime: "15:00",      // optional check-in time
  endTime: "11:00",        // optional check-out time
  timezone: "America/Santiago"
}
```

**Migration:**
- `startDate = checkInDate`
- `endDate = checkOutDate`
- `timezone` derived from accommodation's property timezone
- `startTime`/`endTime` migrated as-is

**Key Rule:** Accommodation DATE_RANGE uses local civil dates. Do NOT convert to UTC boundaries. Night count = `endDate - startDate` in local date arithmetic.

### 6.2 DATETIME_RANGE (Vehicle Rental)

**Target:** `temporal JSONB` with mode `"DATETIME_RANGE"`:
```javascript
{
  mode: "DATETIME_RANGE",
  start: "2026-09-10T15:00:00Z",    // UTC instant
  end: "2026-09-12T11:30:00Z",      // UTC instant
  timezone: "America/Santiago",
  durationMinutes: 2700
}
```

**Storage:** UTC instants at persistence boundaries. Business timezone retained for display.

### 6.3 SLOT (Tours, Diving, Attractions)

**Target:** `temporal JSONB` with mode `"SLOT"`:
```javascript
{
  mode: "SLOT",
  occurrenceId: UUID,              // scheduled occurrence
  date: "2026-09-10",              // local date
  startTime: "09:00",
  endTime: "11:00",
  durationMinutes: 120
}
```

**Note:** Occurrence is a separate entity/table (see Occurrence Strategy).

### 6.4 Legacy Field Handling

During migration, flat date fields are maintained as derived values:

```sql
-- View for backward compatibility
CREATE VIEW reservation_flat AS
SELECT 
  r.*,
  (r.customer->>'name') AS guestName,
  rl.temporal->>'startDate' AS checkInDate,
  rl.temporal->>'endDate' AS checkOutDate,
  rl.temporal->>'startTime' AS checkInTime,
  rl.temporal->>'endTime' AS checkOutTime,
  rl.temporal->>'timezone' AS timezone
FROM reservations r
LEFT JOIN reservation_lines rl ON rl.reservationId = r.id AND rl.lineOrder = 1
WHERE r.deletedAt IS NULL;
```

After full migration, applications read from `reservation_lines` directly.

---

## 7. Availability Strategy

### 7.1 BOOKING-1B Principle

> Availability distinguishes: rules, occurrences where relevant, reservation commitments, blocks, capacity, and inventory. No universal materialization strategy.

### 7.2 Vertical Availability Patterns

**Accommodation — Materialized Day Availability:**
```javascript
{
  rules: availabilityRules table,    // min stay, arrival days, etc.
  commitments: reservations table,   // existing reservations
  blocks: availability.isBlocked,   // owner/maintenance blocks
  inventory: accommodationUnits      // room types with counts
}
```
- Materialized per-day availability rows in `availability` table
- Derived from: availability rules + reservation commitments + blocks

**Vehicle Rental — Interval Overlap:**
```javascript
{
  rules: rentalRules,                // min/max rental duration
  commitments: reservations with DATETIME_RANGE overlap check,
  blocks: availabilityBlocks table,
  inventory: vehicles table          // fleet inventory
}
```
- No pre-materialized slots
- Check overlap: new reservation's interval vs existing reservation intervals
- Inventory = total vehicles - reserved - blocked

**Tour/Occurrence — Scheduled Capacity:**
```javascript
{
  occurrences: occurrence table,      // scheduled departures
  commitments: reservation_lines with SLOT referencing occurrenceId,
  blocks: availabilityBlocks,
  inventory: occurrence.capacity
}
```
- Occurrences are pre-generated (weekly schedule, etc.)
- Capacity checked against `occurrence.remainingCapacity`

### 7.3 AvailabilityBlock is NOT Reservation

AvailabilityBlock represents:
- Maintenance periods
- Owner blocks
- Weather closures
- Operational closures

It is a temporal range with a reason, NOT a commercial commitment.

```sql
availability_blocks (
  id UUID PRIMARY KEY,
  tenantId UUID NOT NULL,
  targetType VARCHAR(50) NOT NULL,      -- 'accommodation', 'vehicle', etc.
  targetId UUID NOT NULL,
  startDate VARCHAR(20) NOT NULL,       -- or start TIMESTAMPTZ for datetime
  endDate VARCHAR(20) NOT NULL,
  reason VARCHAR(50) NOT NULL,          -- 'maintenance', 'owner_block', 'weather', 'operational'
  partialBlock BOOLEAN DEFAULT FALSE,    -- if TRUE, only reduces inventory; if FALSE, full block
  reducedQuantity INT,                   -- if partialBlock=true, new available quantity
  metadata JSONB,
  createdAt TIMESTAMPTZ NOT NULL,
  createdBy UUID
)
```

Availability computation:
```
available(targetType, targetId, temporal, quantity) = 
  capacity(targetType, targetId)
  - reserved(targetType, targetId, temporal)
  - blocked(targetType, targetId, temporal, quantity)   // partial block reduces available
```

### 7.4 Generalized Availability Interface

```javascript
class AvailabilityService {
  async checkAvailability(targetType, targetId, temporal, quantity = 1) {
    const adapter = BookableTargetAdapters[targetType]
    return adapter.checkAvailability(targetId, temporal, quantity)
  }
  
  async reserve(targetType, targetId, temporal, quantity, reservationId) {
    const adapter = BookableTargetAdapters[targetType]
    return adapter.reserve(targetId, temporal, quantity, reservationId)
  }
  
  async release(targetType, targetId, temporal, quantity, reservationId) {
    const adapter = BookableTargetAdapters[targetType]
    return adapter.release(targetId, temporal, quantity, reservationId)
  }
}
```

---

## 8. Occurrence Strategy

### 8.1 When Occurrences Are Relevant

Occurrences are relevant for:
- **Tours** — scheduled departures (daily 09:00, 14:00)
- **Diving** — scheduled sessions (Mon/Wed/Fri 10:00)
- **Timed attractions** — entry slots (14:00, 14:30, 15:00)

Occurrences are NOT relevant for:
- **Accommodation** — DATE_RANGE, no pre-scheduling
- **Vehicle rental** — DATETIME_RANGE, continuous interval

### 8.2 Occurrence Table

```sql
occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenantId UUID NOT NULL,
  
  -- Offering reference
  offeringId UUID NOT NULL,              -- tour/offering definition
  targetType VARCHAR(50) NOT NULL,        -- 'tour', 'dive', 'attraction'
  targetId UUID NOT NULL,                -- specific tour, dive operator, etc.
  
  -- Scheduled time
  date VARCHAR(20) NOT NULL,             -- local civil date "2026-09-10"
  startTime VARCHAR(20) NOT NULL,       -- "09:00"
  endTime VARCHAR(20) NOT NULL,         -- "11:00"
  durationMinutes INT,
  
  -- Capacity
  capacity INT NOT NULL DEFAULT 20,
  reservedCount INT NOT NULL DEFAULT 0,
  
  -- Status
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'cancelled', 'completed'
  
  -- Recurrence (if applicable)
  recurrenceRule VARCHAR(100),            -- RRULE for recurring occurrences
  seriesId UUID,                          -- groups recurring occurrences
  
  metadata JSONB DEFAULT '{}',
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_occurrence_offering (offeringId),
  INDEX idx_occurrence_target (targetType, targetId),
  INDEX idx_occurrence_date (date),
  INDEX idx_occurrence_status (status)
)
```

### 8.3 Occurrence Materialization Strategy

**Recommendation: Hybrid — Bounded Pre-Generation**

1. **Generate occurrences** for the next N days (configurable horizon, e.g., 30 days — not a frozen constant) based on recurrence rules
2. **Regenerate** on a schedule (daily cron) to maintain the configured N-day window
3. **On-demand creation** when a booking references a future date beyond the generated window
4. **Single-occurrence override** — specific occurrences can be cancelled/modified without changing the recurrence rule

The exact horizon is a business/configuration decision, not an architectural invariant. Shorter horizons reduce pre-generation overhead; longer horizons support advance bookings.

Rationale:
- Prevents unbounded growth of occurrence rows
- Ensures availability can be queried for the near future
- Allows cancellation of specific occurrences without series changes
- On-demand generation handles long-horizon bookings

### 8.4 Accommodation — No Occurrence

Accommodation uses DATE_RANGE with materialized day availability. No occurrence table needed.

---

## 9. AvailabilityBlock Strategy

### 9.1 Block Types

| Reason | Description | Effect |
|--------|-------------|--------|
| `maintenance` | Property/unit under maintenance | Full block — no availability |
| `owner_block` | Owner personal use | Full block — no availability |
| `weather` | Weather closure | Full block — no availability |
| `operational` | Operational reason | Full or partial — configurable |
| `政策性关闭` | Regulatory closure | Full block |

### 9.2 Persistence

```sql
availability_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenantId UUID NOT NULL,
  
  targetType VARCHAR(50) NOT NULL,        -- vertical discriminator
  targetId UUID NOT NULL,                -- target entity
  
  temporal JSONB NOT NULL,                -- { mode, startDate, endDate, ... } or { mode, date, startTime, endTime }
  
  reason VARCHAR(50) NOT NULL,            -- 'maintenance', 'owner_block', 'weather', 'operational'
  description TEXT,
  
  -- Partial blocking
  partialBlock BOOLEAN DEFAULT FALSE,    -- TRUE = reduces capacity; FALSE = full block
  originalCapacity INT,                  -- snapshot of capacity at block time
  reducedCapacity INT,                   -- available capacity during block
  
  -- Audit
  createdBy UUID,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiresAt TIMESTAMPTZ,                 -- optional auto-expiration
  
  metadata JSONB DEFAULT '{}'
)
```

### 9.3 Block Resolution in Availability

```javascript
function computeAvailableCapacity(targetType, targetId, temporal) {
  const baseCapacity = getBaseCapacity(targetType, targetId)  // from accommodationUnits, vehicles, etc.
  
  const fullBlocks = getFullBlocks(targetType, targetId, temporal)
    .filter(b => !b.partialBlock)
  
  const partialBlocks = getPartialBlocks(targetType, targetId, temporal)
    .filter(b => b.partialBlock)
  
  const reservedQuantity = getReservedQuantity(targetType, targetId, temporal)
  
  if (fullBlocks.length > 0) return 0
  
  let available = baseCapacity
  for (const block of partialBlocks) {
    available = Math.min(available, block.reducedCapacity)
  }
  
  return Math.max(0, available - reservedQuantity)
}
```

---

## 10. Operational Allocation Strategy

### 10.1 BOOKING-1B Principle

> Operational Allocation is separate from the customer's commercial reservation commitment. It is NOT mandatory in Generic Reservation Core.

### 10.2 When Allocation is Relevant

- **Diving** — assign specific instructor and equipment to a dive booking
- **Navigation** — assign specific boat to a departure
- **Accommodation** — assign specific room/unit after booking (optional in some business models)
- **Vehicle rental** — assign specific vehicle ( VIN/registration) after booking

### 10.3 Allocation Table (Optional)

```sql
reservation_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservationLineId UUID NOT NULL REFERENCES reservation_lines(id) ON DELETE CASCADE,
  
  resourceId UUID NOT NULL,              -- the assigned resource (boat, instructor, vehicle, room)
  resourceType VARCHAR(50) NOT NULL,     -- 'boat', 'instructor', 'vehicle', 'room'
  
  allocatedBy UUID,                      -- who made the assignment
  allocatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  status VARCHAR(50) DEFAULT 'pending',    -- 'pending', 'confirmed', 'cancelled'
  
  notes TEXT,
  metadata JSONB DEFAULT '{}'
)
```

### 10.4 Phase 1 Decision

**Operational Allocation is NOT in the first implementation phase.**

Rationale:
- BOOKING-1B explicitly states allocation is NOT mandatory in the core
- Current repository has no allocation table
- The 6 verticals (accommodation, navigation, diving, vehicle rental, tour, attraction) have varying allocation needs
- Adding allocation now adds complexity without immediate value

**Phase 2** may add allocation if a vertical requires it.

---

## 11. API Compatibility Plan

### 11.1 Current API Contract

**POST /api/v1/reservations**
```json
{
  "accommodationId": "uuid",
  "checkInDate": "2026-09-10",
  "checkOutDate": "2026-09-13",
  "guestCount": 2,
  "customer": { "name": "...", "email": "...", "phone": "..." }
}
```

**Response:**
```json
{
  "id": "uuid",
  "accommodationId": "uuid",
  "checkInDate": "2026-09-10",
  "checkOutDate": "2026-09-13",
  "guestCount": 2,
  "status": "confirmed",
  "confirmationCode": "ABC123",
  ...
}
```

### 11.2 Migration Strategy: Internal Adaptation

**Option: Internal Adapter Pattern (Recommended)**

The API layer internally adapts between flat and line-based models:

```javascript
// ReservationController.create()
async create(req, res) {
  const data = req.body
  
  // Detect legacy flat request vs new line-based request
  if (data.accommodationId && !data.lines) {
    // Legacy flat request — adapt to lines internally
    const adaptedData = {
      customer: data.customer,
      guestCount: data.guestCount,
      channel: data.channel,
      lines: [{
        targetType: 'accommodation',
        targetId: data.accommodationId,
        temporal: {
          mode: 'DATE_RANGE',
          startDate: data.checkInDate,
          endDate: data.checkOutDate,
          startTime: data.checkInTime,
          endTime: data.checkOutTime,
          timezone: data.timezone
        },
        quantity: data.guestCount,
        unitPrice: data.unitPrice
      }]
    }
    // Call service with adapted data
  } else {
    // New line-based request — pass through
  }
}
```

### 11.3 Extended API Contract (Future)

After migration, API may support:

```json
{
  "customer": { "name": "...", "email": "...", "phone": "..." },
  "lines": [
    {
      "targetType": "accommodation",
      "targetId": "uuid",
      "temporal": { "mode": "DATE_RANGE", "startDate": "2026-09-10", "endDate": "2026-09-13", "nights": 3 },
      "quantity": 2
    },
    {
      "targetType": "tour",
      "targetId": "uuid",
      "temporal": { "mode": "SLOT", "occurrenceId": "uuid", "date": "2026-09-11", "startTime": "08:30" },
      "quantity": 2
    }
  ]
}
```

### 11.4 Versioning Approach

- **Internal adaptation** — no API versioning required initially
- If breaking changes are needed, introduce `/api/v2/reservations` endpoint
- Existing `/api/v1/reservations` continues to work via internal adapter

---

## 12. PostgreSQL Concurrency Plan

### 12.1 Current Problem

The current `checkReservationOverlap()` + `createRequest()` pattern is **not atomic**:

```javascript
// Step 1: Check overlap
const { hasOverlap } = await checkReservationOverlap(context, accommodationId, checkIn, checkOut)
// Step 2: Create reservation — RACE CONDITION: another request may have created between step 1 and step 3
const reservation = await createReservation(data)
```

Between the overlap check and the reservation creation, another concurrent request can create a conflicting reservation.

### 12.2 Solution: Atomic Conditional UPDATE

**For Accommodation (day-level materialized):**

```sql
-- Atomically reserve inventory
UPDATE availability
SET 
  reservedCount = reservedCount + :quantity,
  isReserved = CASE WHEN reservedCount + :quantity >= inventory THEN TRUE ELSE isReserved END,
  updatedAt = NOW()
WHERE 
  accommodation_id = :accommodationId 
  AND date = :date
  AND reservedCount + :quantity <= inventory
  AND is_blocked = FALSE
RETURNING id;
```

If `rowsAffected = 0`, the reservation fails — no inventory available.

**For Vehicle Rental (exclusive interval — one vehicle):**

The `INSERT ... WHERE NOT EXISTS` pattern is **NOT safe** under concurrency. Two transactions may both observe no conflicting row and both insert successfully, causing double-booking.

Two or more concurrent transactions may read the same state before either writes, leading to overlapping commitments.

**Recommended mechanisms (evaluation required — exact selection is an implementation gate):**

**Option A: PostgreSQL Exclusion Constraint with Range Types**
```sql
-- Requires btree_gist extension
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reservation_lines
  ADD CONSTRAINT no_overlap_exclusion
  EXCLUDE USING gist (
    targetId WITH =,
    tstzrange(start, end) WITH &&
  ) WHERE (targetType = 'vehicle' AND status NOT IN ('cancelled', 'rejected', 'expired', 'archived'));
```
Pros: Database-enforced exclusion, no application retry logic
Cons: Requires btree_gist extension; range type management; per-target-type constraint

**Option B: Transaction-Scoped Advisory Lock**
```sql
-- Acquire advisory lock keyed by targetId before checking availability
SELECT pg_advisory_xact_lock(targetId_hash(:vehicleId));

-- Then check overlap and insert within the same transaction
-- Both steps happen atomically because the lock is held for the transaction
```
Pros: Simple, no extension required
Cons: Lock held for entire transaction; potential lock contention under high load

**Option C: SELECT ... FOR UPDATE on Target Row**
```sql
-- Lock the vehicle row first
SELECT id FROM vehicles WHERE id = :vehicleId FOR UPDATE;

-- Now check overlap safely within this transaction
SELECT id FROM reservation_lines rl
JOIN reservations r ON r.id = rl.reservation_id
WHERE rl.target_id = :vehicleId
  AND rl.target_type = 'vehicle'
  AND r.status NOT IN ('cancelled', 'rejected', 'expired', 'archived')
  AND tstzrange(rl.temporal->>'start', rl.temporal->>'end') && tstzrange(:start, :end)
FOR UPDATE;
```
Pros: Uses existing FK structure; clear locking scope
Cons: Requires vehicles table lock; more complex SQL

**Option D: SERIALIZABLE Isolation with Retry**
```sql
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- Insert with overlap check — serialization failure triggers automatic retry
```
Pros: Simplest application logic
Cons: High retry overhead under contention; risk of serialization failures causing 400+ errors

**Recommendation:** Option A (exclusion constraint) if btree_gist is acceptable in the deployment environment. Otherwise Option B (advisory lock) for simplicity. Option C requires evaluation against the actual query patterns.

**Invariant enforced:** Two concurrent commitments for an exclusive DATETIME_RANGE target cannot both succeed when their intervals overlap.

### 12.3 Implementation Pattern

```javascript
async reserveInventory(targetType, targetId, temporal, quantity, reservationId) {
  return await this.#repo.withTransaction(async (tx) => {
    // Try atomic reservation
    const reserved = await tx.reservationLineReserve({
      targetType,
      targetId,
      temporal,
      quantity,
      reservationId
    })
    
    if (!reserved) {
      throw new InventoryExhaustedError(targetType, targetId, temporal)
    }
    
    return reserved
  })
}
```

### 12.4 Why Not Optimistic Locking

BOOKING-1B explicitly states:
> BOOKING-2 selects concurrency mechanism

Optimistic locking (version columns) was removed from the approved ADR because:
- It requires retry logic on every conflict
- Under high contention, it performs worse than pessimistic approaches
- The SQL conditional UPDATE pattern is simpler for this use case

However, optimistic locking remains valid as an alternative if the conditional UPDATE approach proves impractical for certain verticals.

### 12.5 Idempotency

Every reservation creation request should carry an idempotency key:

```sql
reservations (
  ...
  idempotencyKey VARCHAR(100) UNIQUE,
  ...
)
```

If a request with the same idempotencyKey arrives twice, the second is rejected or returns the original result.

---

## 13. Payment Boundary

### 13.1 BOOKING-1B Principle

> External payment provider calls are NOT part of the Reservation PostgreSQL transaction.

### 13.2 Payment Flow

```
1. Reservation created with status REQUESTED (or OWNER_CONFIRMED if auto-confirm)
   └── Within PostgreSQL transaction: insert reservation + lines + initial inventory hold

2. Payment initiated (external call)
   └── NOT within PostgreSQL transaction
   └── Reservation status: PAYMENT_PENDING

3a. Payment succeeds (webhook/callback)
     └── Update reservation status to CONFIRMED
     └── Inventory hold becomes permanent commit

3b. Payment fails (webhook/callback)
     └── Payment failure recorded in Payment domain
     └── Release inventory hold (compensation via existing business policy)
     └── Payment failure does not introduce a new Reservation lifecycle state
     └── Reservation transitions through one of the existing 14 valid states per business policy
        (e.g., EXPIRED if grace period exceeded, or CANCELLED)

4. Cancellation (at any point before COMPLETED)
     └── Release inventory hold
     └── If payment was made, initiate refund (external call)
```

### 13.3 Inventory Hold Pattern

```javascript
async createReservationWithHold(data) {
  return await this.#repo.withTransaction(async (tx) => {
    // 1. Create reservation record
    const reservation = await tx.create('reservations', {
      ...data,
      status: 'PAYMENT_PENDING'
    })
    
    // 2. Reserve inventory atomically
    for (const line of data.lines) {
      const reserved = await tx.reserveInventory({
        targetType: line.targetType,
        targetId: line.targetId,
        temporal: line.temporal,
        quantity: line.quantity,
        reservationId: reservation.id
      })
      
      if (!reserved) {
        throw new InventoryExhaustedError(...)
      }
    }
    
  // 3. Commit transaction
    return reservation
  })
  // If external payment call fails, the inventory hold is released via compensation logic
}
```

### 13.4 Compensation on Payment Failure

```javascript
async handlePaymentFailed(reservationId) {
  await this.#repo.withTransaction(async (tx) => {
    // Release inventory holds
    const lines = await tx.findLinesByReservation(reservationId)
    for (const line of lines) {
      await tx.releaseInventory({
        targetType: line.targetType,
        targetId: line.targetId,
        temporal: line.temporal,
        quantity: line.quantity
      })
    }

    // Payment failure does not introduce a new Reservation lifecycle state.
    // Reservation transitions through one of the existing 14 valid states
    // per business policy: determineCompensationReservationStatus(existingReservation, businessPolicy)
    // BOOKING-2 does not invent a new lifecycle state.
    const compensationStatus = determineCompensationReservationStatus(reservation, businessPolicy)
    await tx.updateReservation(reservationId, {
      status: compensationStatus  // MUST be one of: REQUESTED, OWNER_PENDING, OWNER_CONFIRMED, PAYMENT_PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, COMPLETED, REJECTED, EXPIRED, CANCELLED, NO_SHOW, NO_RESPONSE, ARCHIVED
    })
  })
}
```

---

## 14. Data Backfill Plan

### 14.1 Backfill Scope

All existing reservations must be migrated to the new `reservation_lines` structure.

### 14.2 Backfill Script Design

```javascript
// scripts/migrations/backfill_reservation_lines.js

async function backfillReservationLines(tenantId) {
  const reservations = await db.reservations.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: 'asc' }
  })
  
  for (const reservation of reservations) {
    // Check if lines already exist
    const existingLines = await db.reservationLines.findMany({
      where: { reservationId: reservation.id }
    })
    
    if (existingLines.length > 0) {
      console.log(`Reservation ${reservation.id} already has lines, skipping`)
      continue
    }
    
    // Determine targetType/targetId
    let targetType = 'accommodation'
    let targetId = reservation.accommodationId
    
    // Create line from flat reservation data
    const line = {
      id: crypto.randomUUID(),
      reservationId: reservation.id,
      lineOrder: 1,
      targetType,
      targetId,
      temporal: {
        mode: 'DATE_RANGE',
        startDate: reservation.checkInDate,
        endDate: reservation.checkOutDate,
        startTime: reservation.checkInTime,
        endTime: reservation.checkOutTime,
        timezone: 'America/Santiago' // or derive from accommodation
      },
      quantity: reservation.guestCount || 1,
      unitPrice: reservation.totalPrice, // simplified
      lineTotal: reservation.totalPrice,
      metadata: {
        migratedFrom: 'flat_reservation',
        originalReservationId: reservation.id,
        migratedAt: new Date().toISOString()
      },
      createdAt: reservation.createdAt,
      updatedAt: reservation.createdAt
    }
    
    await db.reservationLines.create(line)
    
    // Update flat fields on reservation for backward compatibility
    await db.reservations.update({
      where: { id: reservation.id },
      data: {
        // Keep flat fields sync'd for read compatibility
        checkInDate: reservation.checkInDate,
        checkOutDate: reservation.checkOutDate,
        guestCount: reservation.guestCount,
        metadata: {
          ...reservation.metadata,
          migratedToLines: true
        }
      }
    })
    
    console.log(`Migrated reservation ${reservation.id}`)
  }
}
```

### 14.3 Verification Queries

```sql
-- Verify every reservation has at least one line
SELECT r.id, r.confirmationCode, COUNT(rl.id) as line_count
FROM reservations r
LEFT JOIN reservation_lines rl ON rl.reservation_id = r.id
WHERE r.deleted_at IS NULL
GROUP BY r.id, r.confirmationCode
HAVING COUNT(rl.id) = 0;

-- Verify line totals sum to reservation total
SELECT r.id, r.total_price, SUM(rl.line_total) as lines_total
FROM reservations r
JOIN reservation_lines rl ON rl.reservation_id = r.id
WHERE r.deleted_at IS NULL
GROUP BY r.id, r.total_price
HAVING ABS(r.total_price - SUM(rl.line_total)) > 0.01;
```

### 14.4 Historical Preservation

- All original `reservations` data is preserved
- `legacyReservationId` field points to original ID during transition
- No data is deleted — only new structures are added
- Original `confirmationCode` is preserved exactly

---

## 15. Phased Migration Sequence

### Phase 1: Foundation (Weeks 1-2)

**Objective:** Add ReservationLines structure with backward compatibility

**Files/Components:**
- New: `database/schema/business/reservation_lines.js`
- Modify: `database/schema/business/index.js` — add reservation_lines export
- New: `reservation_lines.repository.js` — CRUD for lines
- Modify: `ReservationManager` — create default line when `accommodationId` present
- Modify: `ReservationService` — line creation in createRequest

**Persistence Changes:**
- Add `reservation_lines` table with all columns (targetType, targetId, temporal, quantity, unitPrice, lineTotal, allocatedResourceId, metadata)
- The `reservations` table does NOT receive targetType/targetId columns — BookableTarget is at ReservationLine level only
- `accommodationId` column on reservations remains for backward compatibility during migration

**Compatibility:**
- Existing flat-field API continues to work
- New code can use line items

**Tests:**
- Create reservation with flat fields — verify line is created
- Create reservation with explicit lines
- Read reservation — flat fields still populated
- Line count = 1 for migrated reservations

**Rollback:** Drop `reservation_lines` table, revert ReservationManager changes

**Certification Gate:** All existing accommodation reservation tests pass

---

### Phase 2: Temporal Generalization (Weeks 2-3)

**Objective:** Populate `temporal` JSONB column from flat date fields and implement vertical adapters

**Files/Components:**
- Modify: `ReservationManager.createRequest()` — populate temporal from date fields
- Modify: `AvailabilityManager` — add `targetType + targetId` path
- New: Vertical adapter registry

**Persistence Changes:**
- (temporal column already added in Phase 1)
- Populate temporal for all existing lines via migration script

**Compatibility:**
- `checkInDate`/`checkOutDate` still populated from temporal
- Availability queries still use `accommodationId`

**Tests:**
- Create accommodation reservation — verify DATE_RANGE temporal
- Create vehicle reservation — verify DATETIME_RANGE temporal
- Create tour reservation — verify SLOT temporal with occurrenceId

**Rollback:** Revert temporal column, maintain flat field reads

---

### Phase 3: Availability Adapter (Weeks 3-4)

**Objective:** Implement vertical availability adapters

**Files/Components:**
- New: `availability/adapters/accommodation.adapter.js`
- New: `availability/adapters/vehicle.adapter.js`
- New: `availability/adapters/tour.adapter.js`
- Modify: `AvailabilityManager` — route to adapter
- Modify: `AvailabilityService` — use adapters

**Persistence Changes:**
- Add `availability_blocks` table
- Availability table gets optional `targetType + targetId`

**Compatibility:**
- Existing `accommodationId` queries continue via accommodation adapter

**Tests:**
- Block accommodation dates — verify block
- Check availability for accommodation — uses adapter
- Check availability for vehicle — uses interval overlap

**Rollback:** Remove adapter registry, direct routing

---

### Phase 4: Concurrent Reservation Safety (Weeks 4-5)

**Objective:** Replace non-atomic overlap check with atomic conditional UPDATE

**Files/Components:**
- Modify: `reservation_lines.repository.js` — add `reserveInventory()` with atomic UPDATE
- Modify: `AvailabilityManager` — use atomic reserve/release
- Modify: `ReservationManager` — use `reserveInventory()` in confirm path

**Persistence Changes:**
- None (logic change only)

**Compatibility:**
- No external API changes
- Internal availability semantics preserved

**Tests:**
- Concurrent reservation creation for same dates — only one succeeds
- Concurrent cancellation — inventory released correctly
- Payment failure after concurrent requests — inventory released for both

**Rollback:** Safe rollback must not restore unsafe concurrent write behavior:
- If the atomic path fails, disable the generic vertical booking write path
- Verticals may temporarily fall back to their last certified safe state
- Application code may be rolled back while preserving committed ReservationLines data
- No restoration of known race-condition patterns

---

### Phase 5: Backfill Existing Reservations (Week 5)

**Objective:** Migrate all existing reservations to ReservationLines

**Files/Components:**
- New: `scripts/migrations/backfill_reservation_lines.js`
- Run: Backfill script
- Verify: All reservations have at least one line
- Verify: Totals match

**Persistence Changes:**
- Populate `reservation_lines` for all existing reservations
- Update flat fields for read compatibility

**Compatibility:**
- All reads work via view/triggers
- All writes use new code path

**Tests:**
- Backfill verification queries
- Read existing reservation — data matches
- Legacy reports still work

**Rollback:** Restore from pre-backfill snapshot

---

### Phase 6: Line-Based Reads (Weeks 5-6)

**Objective:** Update read paths to use ReservationLines as source of truth

**Files/Components:**
- Modify: `ReservationRepository.findById()` — join and return lines
- Modify: `ReservationManager.#loadReservation()` — hydrate lines
- Modify: `ReservationService.listReservations()` — include lines

**Compatibility:**
- Response includes both flat fields (derived) and `lines[]`

**Tests:**
- GET reservation — includes lines array
- List reservations — lines populated
- Invoice generation — uses line totals

---

### Phase 7: Occurrence Support (Weeks 6-7)

**Objective:** Add occurrence table and tour/dive availability adapters

**Files/Components:**
- New: `database/schema/business/occurrences.js`
- New: `availability/adapters/tour.adapter.js` with occurrence support
- New: `OccurrenceManager`

**Persistence Changes:**
- Add `occurrences` table
- `reservation_lines.temporal` can reference `occurrenceId`

**Compatibility:**
- Accommodation adapter unchanged
- Vehicle adapter unchanged

**Tests:**
- Create tour reservation with occurrence
- Check occurrence capacity
- Cancel tour reservation — release occurrence capacity

---

### Phase 8: Production Certification (Week 8)

**Objective:** Full certification of migration

**Testing:**
- Full regression suite
- Load testing with concurrent reservations
- Multi-tenant isolation verification
- All 6 vertical types tested end-to-end
- Invoice generation verified
- Notification events verified

**Certification Gate:**
- Zero breaking changes to existing accommodation clients
- All 14 states working
- Concurrent safety verified
- Tenant isolation verified

---

## 16. Rollback Strategy

### 16.1 Additive-First Migrations

All migrations follow **additive-first** pattern:
- New tables/columns added, old structures preserved
- Dual-read during transition
- Old structures removed only after full validation

### 16.2 Phase-Specific Rollback

| Phase | Rollback Action |
|-------|-----------------|
| 1 | `DROP TABLE reservation_lines` |
| 2 | Revert `temporal` column population script |
| 3 | Remove adapter registry, direct routing |
| 4 | Disable unsafe concurrent writes; preserve committed data; restrict to last certified safe vertical behavior |
| 5 | Restore from backup (data migration) |
| 6 | Revert to flat-field reads |
| 7 | `DROP TABLE occurrences` |

### 16.3 Dual-Read Period

During Phase 5-6, both old and new code paths are active:

```javascript
// Dual-read during transition
const reservation = await this.#repo.findById(id)

// Use new structure
if (reservation.lines && reservation.lines.length > 0) {
  return this.#adaptLinesToFlat(reservation)
}

// Fallback to legacy flat fields
return reservation
```

### 16.4 Cutover Point

Cutover occurs when:
- All reservations have at least one line (verified by query)
- All reads use the new code path
- No remaining references to `accommodationId` as the sole target

After cutover:
- Backward adapter code is removed
- Flat field population becomes optional/derived
- `accommodationId` column remains nullable

---

## 17. Testing / Certification Gates

### 17.1 Required Test Coverage

**Accommodation Regression:**
- Create reservation with check-in/check-out dates
- Verify reservation created with correct dates
- Verify availability updated
- Cancel reservation — availability restored
- All 14 state transitions work

**DATE_RANGE Reservation:**
- Create accommodation reservation
- Verify temporal.mode = "DATE_RANGE"
- Verify startDate/endDate preserved as local dates
- Verify nights computed correctly

**DATETIME_RANGE Reservation:**
- Create vehicle rental reservation
- Verify temporal.mode = "DATETIME_RANGE"
- Verify UTC instants stored correctly
- Verify timezone retained for display

**SLOT Reservation:**
- Create tour reservation referencing occurrence
- Verify temporal.mode = "SLOT"
- Verify occurrenceId populated
- Verify capacity decremented

**Capacity > 1:**
- Create reservation with quantity = 5
- Verify inventory reserved by 5
- Verify availability shows correct remaining

**Inventory = 1:**
- Create last available reservation
- Verify next request fails with appropriate error

**Concurrent Competing Reservations:**
- Submit two simultaneous reservation requests for same dates
- Verify only one succeeds
- Verify failure gets appropriate error (not generic 500)

**Physical Concurrent Tests (Phase 4 Certification Gate):**

1. **inventory = 1, two simultaneous requests**
   - Two processes send concurrent reservation requests for same accommodation date with inventory = 1
   - Exactly one request succeeds; the other fails with inventory exhaustion
   - No double-booking occurs

2. **occurrence capacity exceeded**
   - Tour has remaining capacity = 3
   - Two concurrent requests each request quantity = 2 (total = 4 > 3)
   - Oversell must be zero; one or both requests fail appropriately

3. **exclusive DATETIME_RANGE overlapping requests**
   - Vehicle with exclusive assignment (one vehicle, DATETIME_RANGE)
   - Two concurrent overlapping interval requests
   - Exactly one succeeds; the other fails without creating overlapping commitments

4. **non-overlapping DATETIME_RANGE requests**
   - Two requests for same vehicle but non-overlapping intervals
   - Both may succeed

5. **multi-line reservation atomicity**
   - Reservation with line 1 (available) + line 2 (unavailable)
   - Entire Reservation commitment must roll back atomically
   - Neither line is committed independently

6. **multi-worker Passenger execution**
   - Concurrent requests processed by different Passenger workers
   - Correctness does not depend on process-local memory
   - PostgreSQL is authoritative for all committed state

**Multi-Line Reservation:**
- Create reservation with accommodation + tour
- Verify two lines created
- Verify each line has correct temporal
- Verify total price = sum of line totals

**AvailabilityBlock:**
- Create block for accommodation dates
- Verify block does not create reservation
- Verify availability returns blocked

**Direct Booking (No Quote):**
- Create reservation without quote
- Verify status = REQUESTED (or appropriate)
- Verify no quote reference required

**Payment Outside Transaction:**
- Verify payment initiation is separate HTTP call
- Verify reservation status changes on payment webhook

**Tenant Isolation:**
- Tenant A creates reservation
- Tenant B cannot see Tenant A's reservations
- Cross-tenant reservation attempts fail

**Multi-Worker Behavior:**
- Two Passenger workers process concurrent requests
- No shared memory race conditions
- PostgreSQL is authoritative

### 17.2 Certification Checklist

```
[ ] All accommodation regression tests pass
[ ] All 14 state transitions work
[ ] DATE_RANGE temporal preserved as local civil dates
[ ] DATETIME_RANGE temporal stored as UTC instants
[ ] SLOT temporal references occurrence correctly
[ ] Capacity > 1 works
[ ] Inventory = 1 prevents oversell
[ ] Concurrent requests — only one wins
[ ] Concurrent: inventory=1, two simultaneous, exactly one succeeds
[ ] Concurrent: occurrence capacity exceeded, oversell = zero
[ ] Concurrent: exclusive DATETIME_RANGE overlap, exactly one succeeds
[ ] Concurrent: non-overlapping DATETIME_RANGE, both succeed
[ ] Concurrent: multi-line atomic rollback when any line unavailable
[ ] Concurrent: multi-worker Passenger correctness
[ ] Multi-line reservation creates correct structure
[ ] AvailabilityBlock does not create reservation
[ ] Direct booking without quote works
[ ] Payment is external to DB transaction
[ ] Tenant isolation enforced
[ ] Multi-worker concurrency safe
[ ] Backfill verified — all reservations have lines
[ ] API backward compatibility verified
```

---

## 18. Vertical Validation Matrix

### 18.1 Accommodation

| Concept | Value |
|---------|-------|
| Offering | Optional (room type, rate plan) |
| BookableTarget | Accommodation or AccommodationUnit |
| Resource | Optional (specific room) |
| Temporal Mode | DATE_RANGE |
| Availability | Day-level materialized + reservation commitments + blocks |
| Capacity | From accommodationUnits table |
| ReservationLine | { targetType: 'accommodation', targetId, temporal: DATE_RANGE, quantity: guests } |
| Operational Allocation | Optional room assignment |

### 18.2 Navigation

| Concept | Value |
|---------|-------|
| Offering | "Balcarceda & Serrano Navigation" |
| BookableTarget | Navigation departure (specific scheduled trip) |
| Resource | Optional (specific boat) |
| Temporal Mode | SLOT with occurrenceId |
| Availability | Occurrence capacity - reserved |
| Capacity | From occurrence.capacity |
| ReservationLine | { targetType: 'navigation', targetId, temporal: SLOT, quantity: passengers } |
| Operational Allocation | Boat assignment (later phase) |

### 18.3 Diving

| Concept | Value |
|---------|-------|
| Offering | "Introductory Dive", "Certified Dive" |
| BookableTarget | Dive session (specific scheduled session) |
| Resource | Instructor, Equipment |
| Temporal Mode | SLOT with occurrenceId |
| Availability | Occurrence capacity - reserved |
| Capacity | From occurrence.capacity |
| ReservationLine | { targetType: 'dive', targetId, temporal: SLOT, quantity: divers } |
| Operational Allocation | Instructor/equipment assignment (later phase) |

### 18.4 Vehicle Rental

| Concept | Value |
|---------|-------|
| Offering | "SUV Rental", "Sedan Rental" |
| BookableTarget | Vehicle category or specific vehicle |
| Resource | Specific vehicle (VIN) |
| Temporal Mode | DATETIME_RANGE |
| Availability | Interval overlap check against existing reservations + blocks |
| Capacity | Fleet count |
| ReservationLine | { targetType: 'vehicle', targetId, temporal: DATETIME_RANGE, quantity: 1 } |
| Operational Allocation | Vehicle assignment (later phase) |

### 18.5 Guided Tour

| Concept | Value |
|---------|-------|
| Offering | "City Tour", "Wine Tour" |
| BookableTarget | Tour departure (occurrence) |
| Resource | Optional (guide) |
| Temporal Mode | SLOT with occurrenceId |
| Availability | Occurrence capacity - reserved |
| Capacity | From occurrence.capacity |
| ReservationLine | { targetType: 'tour', targetId, temporal: SLOT, quantity: participants } |
| Operational Allocation | Guide assignment (later phase) |

### 18.6 Timed Attraction

| Concept | Value |
|---------|-------|
| Offering | "Museum Entry", "Theme Park" |
| BookableTarget | Attraction slot (occurrence) |
| Resource | None (no physical resource required) |
| Temporal Mode | SLOT with occurrenceId |
| Availability | Occurrence capacity - reserved |
| Capacity | From occurrence.capacity |
| ReservationLine | { targetType: 'attraction', targetId, temporal: SLOT, quantity: tickets } |
| Operational Allocation | None |

### 18.7 Validation Summary

All 6 verticals are supported by the proposed architecture:
- ✓ Accommodation — DATE_RANGE with day availability
- ✓ Navigation — SLOT with occurrence
- ✓ Diving — SLOT with occurrence + allocation
- ✓ Vehicle Rental — DATETIME_RANGE with interval overlap
- ✓ Guided Tour — SLOT with occurrence
- ✓ Timed Attraction — SLOT with occurrence, no resource

---

## 19. Risks and Open Implementation Questions

### 19.1 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Concurrent oversell despite atomic UPDATE | Medium | High | Thorough concurrent load testing |
| Backfill performance degradation on large tables | Medium | Medium | Batch backfill, offline window |
| Adapter complexity underestimated | Medium | Medium | Start with accommodation only |
| Temporal JSONB query performance | Low | Medium | Index on temporal->>'startDate' |
| Flat field deprecation breaks existing reports | Low | Medium | Maintain view/triggers for transition |

### 19.2 Open Questions for BOOKING-3

1. **Occurrence generation schedule** — How far in advance should occurrences be generated?
2. **Rate plan / pricing engine** — How does the Offering map to pricing rules?
3. **Payment provider choice** — Stripe? PayPal? Local payment methods?
4. **Refund policy engine** — How are refund amounts calculated?
5. **Cancellation policy per vertical** — Different policies for different verticals?
6. **Waitlist / overbooking** — If capacity is exhausted, queue for cancellation?

### 19.3 BOOKING-3 Boundary Suggestion

BOOKING-3 is the first implementation phase and should focus on:
1. Phase 1-3 of the migration (ReservationLines foundation)
2. Accommodation vertical adapter fully implemented
3. Concurrent safety implemented and certified
4. Backfill executed and verified

BOOKING-3 does NOT include:
- Full 6-vertical implementation
- Occurrence support (may be Phase 2)
- Operational allocation (later vertical feature)

---

## 20. BOOKING-2 Summary

**What BOOKING-2 produced:**
- Target persistence schema with `reservation_lines` table
- BookableTarget resolution via targetType + targetId adapter pattern
- Accommodation compatibility via vertical adapter
- Temporal generalization with JSONB mode-specific structure
- Availability strategy per vertical (materialized, interval overlap, occurrence)
- Occurrence table and hybrid materialization strategy
- AvailabilityBlock as separate from Reservation
- Operational allocation deferred to later phase
- API compatibility via internal adapter pattern
- Atomic conditional UPDATE for concurrency (not optimistic locking)
- Payment boundary preserving external payment pattern
- Data backfill script design
- 8-phase migration sequence with rollback points
- Testing/certification gates
- Vertical validation matrix

**What BOOKING-2 did NOT decide:**
- Specific PostgreSQL syntax for atomic conditional UPDATE (deferred to implementation)
- Exact occurrence generation schedule
- Rate plan / pricing engine details
- Payment provider implementation
- Cancellation policy engine
- Full 6-vertical scope for implementation

---

## References

- `docs/knowledge/BOOKING_1B_ADR.md` — BOOKING-1B architectural decisions (commit 246c1ae)
- `capabilities/reservation/` — ReservationManager (824 lines), 14 states
- `capabilities/availability/` — AvailabilityManager
- `capabilities/booking/` — BookingManager with `items[]`
- `database/schema/business/index.js` — Current reservations, availability tables
- `docs/ai/CURRENT_STATE.md` — BOOKING-0 discovery results
