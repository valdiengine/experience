# PRODUCT_ROADMAP.md

> Product development roadmap for Valdi Platform.
> This document tracks product milestones, not platform phases.

---

## Overview

| Item | Value |
|------|-------|
| **Platform Version** | 4.0 (CERTIFIED) |
| **Product Development Mode** | ACTIVE |
| **Current Product Milestone** | TO BE SELECTED — post-PUSH-4 roadmap discovery |
| **Architecture Version** | P13.8 Design Freeze |
| **API Layer** | P14.FINAL (CLOSED) |

---

## Terminology

| Term | Definition |
|------|------------|
| **Product Milestone** | A deliverable in product development (P12.3.x series) |
| **Platform Phase** | A phase in platform development (P0-P14.FINAL - COMPLETED) |
| **Sprint** | A short iteration of product work |

---

## Product Milestones

### Infrastructure (P12.3.x)

| Milestone | Name | Status | Priority |
|-----------|------|--------|----------|
| P12.3.1 | Database Connection & Migration | COMPLETE | — |
| P12.3.2 | Storage Provider | COMPLETE | — |
| P12.3.2 | Authentication Provider Configuration | Pending | 2 |
| P12.3.3 | CMS Provider Configuration | Pending | 3 |
| P12.3.4 | Repository Adapter Registration | Pending | 4 |
| P12.3.5 | Environment Setup (dev/staging/prod) | Pending | 5 |
| P12.3.6 | Event → CMS Sync Wiring | Pending | 6 |
| P12.3.7 | Event → Email Wiring | Pending | 7 |

### MVP Features (P12.3.8 - P12.3.11)

| Milestone | Name | Status | Priority |
|-----------|------|--------|----------|
| P12.3.8 | Accommodation Management API | Pending — see BOOKING-1 | 8 |
| P12.3.9 | Reservation API | Pending — see BOOKING-1 | 9 |
| P12.3.10 | Owner Portal API | Pending | 10 |
| P12.3.11 | Visitor Experience API | Pending | 11 |

### Quality (P12.3.12)

| Milestone | Name | Status | Priority |
|-----------|------|--------|----------|
| P12.3.12 | Testing Setup | Pending | 12 |

---

## Milestone Details

### P12.3.1 — Database Connection & Migration

| Item | Value |
|------|-------|
| **Status** | COMPLETE |
| **Priority** | — |
| **Category** | Infrastructure |
| **Description** | Connect platform to PostgreSQL database |
| **Dependencies** | None |
| **Effort** | 1-2 days |

#### Objectives

- Configure real PostgreSQL connection string in `.env`
- Run `PostgresProvider` against real PG instance
- Execute `DrizzleMigrationRunner` to create schema
- Validate `RepositoryEngine` operations against real data

#### Deliverables

- [ ] PostgreSQL connection configured
- [ ] Schema migration executed
- [ ] Repository operations validated
- [ ] Health check passes

---

> ⚠️ **NUMBERING CONFLICT NOTE:** The completed Storage Provider (P12.3.2) and the planned Authentication Provider Configuration (also labeled P12.3.2) are different items. The Storage Provider was completed as part of the infrastructure phase. This roadmap item refers to Authentication Provider Configuration, which remains pending. Future roadmap normalization should clarify this numbering overlap.

### P12.3.2 — Authentication Provider Configuration (Pending — different from completed Storage Provider)

| Item | Value |
|------|-------|
| **Status** | Pending |
| **Priority** | 2 |
| **Category** | Infrastructure |
| **Description** | Configure JWT authentication provider |
| **Dependencies** | P12.3.1 |
| **Effort** | 1-2 days |

#### Objectives

- Configure JWT provider with real secrets
- Set up token generation and validation
- Connect to persistent auth store
- Validate authentication flow

---

### P12.3.3 — CMS Provider Configuration

| Item | Value |
|------|-------|
| **Status** | Pending |
| **Priority** | 3 |
| **Category** | Infrastructure |
| **Description** | Configure WordPress CMS provider |
| **Dependencies** | P12.3.1 |
| **Effort** | 1 day |

#### Objectives

- Configure WordPress API credentials
- Verify CMS sync engine connectivity
- Test content pull/push operations

---

### P12.3.4 — Repository Adapter Registration

| Item | Value |
|------|-------|
| **Status** | Pending |
| **Priority** | 4 |
| **Category** | Infrastructure |
| **Description** | Register all repository adapters |
| **Dependencies** | P12.3.1 |
| **Effort** | 1 day |

#### Objectives

- Register PostgreSQL adapter with factory
- Register Drizzle schema with adapter
- Verify all entity repositories work
- Validate Unit of Work operations

---

### P12.3.5 — Environment Setup

| Item | Value |
|------|-------|
| **Status** | Pending |
| **Priority** | 5 |
| **Category** | Infrastructure |
| **Description** | Set up dev/staging/prod environments |
| **Dependencies** | P12.3.1, P12.3.2, P12.3.3, P12.3.4 |
| **Effort** | 1-2 days |

#### Objectives

- Configure development environment
- Configure staging environment
- Configure production environment
- Set up environment-specific variables
- Document environment setup

---

### P12.3.6 — Event → CMS Sync Wiring

| Item | Value |
|------|-------|
| **Status** | Pending |
| **Priority** | 6 |
| **Category** | Backend |
| **Description** | Wire events to CMS sync engine |
| **Dependencies** | P12.3.3, P12.3.5 |
| **Effort** | 2 days |

#### Objectives

- Connect accommodation:created → SyncEngine push
- Connect accommodation:updated → SyncEngine push
- Connect content webhooks → SyncEngine pull
- Test bidirectional sync

---

### P12.3.7 — Event → Email Wiring

| Item | Value |
|------|-------|
| **Status** | Pending |
| **Priority** | 7 |
| **Category** | Backend |
| **Description** | Wire events to email notifications |
| **Dependencies** | P12.3.5 |
| **Effort** | 1 day |

#### Objectives

- Connect reservation:created → email confirmation
- Connect reservation:cancelled → email notification
- Set up email templates
- Test email delivery

---

### P12.3.8 — Accommodation Management API

| Item | Value |
|------|-------|
| **Status** | Pending |
| **Priority** | 8 |
| **Category** | MVP |
| **Description** | CRUD API for accommodations |
| **Dependencies** | P12.3.5 |
| **Effort** | 3-5 days |

#### Objectives

- CRUD for Accommodation entities
- Unit management (room types, inventory)
- Calendar and availability management
- Pricing and season configuration
- Media upload via Storage provider

---

### P12.3.9 — Reservation API

| Item | Value |
|------|-------|
| **Status** | Pending |
| **Priority** | 9 |
| **Category** | MVP |
| **Description** | Booking flow API |
| **Dependencies** | P12.3.8 |
| **Effort** | 5-7 days |

#### Objectives

- Check availability
- Create reservation
- Process payment (stub)
- Confirm reservation
- Status management (pending → confirmed → completed → cancelled)
- Owner approval workflow
- Cancellation with refund (stub)

---

### P12.3.10 — Owner Portal API

| Item | Value |
|------|-------|
| **Status** | Pending |
| **Priority** | 10 |
| **Category** | MVP |
| **Description** | API for property owners |
| **Dependencies** | P12.3.8, P12.3.9 |
| **Effort** | 3-5 days |

#### Objectives

- Dashboard metrics API
- Reservation management API
- Availability calendar API
- Payment history API

---

### P12.3.11 — Visitor Experience API

| Item | Value |
|------|-------|
| **Status** | Pending |
| **Priority** | 11 |
| **Category** | MVP |
| **Description** | API for end customers |
| **Dependencies** | P12.3.8, P12.3.9 |
| **Effort** | 3-5 days |

#### Objectives

- Search accommodations (PostgreSQL FTS)
- Detail page data (accommodation + CMS content)
- Reservation flow (dates → payment → confirmation)
- User account management

---

### P12.3.12 — Testing Setup

| Item | Value |
|------|-------|
| **Status** | Pending |
| **Priority** | 12 |
| **Category** | Quality |
| **Description** | Set up automated testing |
| **Dependencies** | All above |
| **Effort** | 3-5 days |

#### Objectives

- Set up Vitest
- Core unit tests for providers
- Repository integration tests
- API endpoint tests
- E2E test infrastructure

---

## Future Product Milestones

### P12.4 — Payment Integration

| Milestone | Description |
|-----------|-------------|
| P12.4.1 | Stripe Integration |
| P12.4.2 | Payment Webhooks |
| P12.4.3 | Refund Flow |

### P12.5 — Notification System

| Milestone | Description |
|-----------|-------------|
| P12.5.1 | Email Templates |
| P12.5.2 | Push Notifications |
| P12.5.3 | SMS Integration |

### P13 — Flutter Mobile App

| Milestone | Description |
|-----------|-------------|
| P13.1 | Flutter Project Setup |
| P13.2 | Authentication Flow |
| P13.3 | Accommodation List/Detail |
| P13.4 | Booking Flow |
| P13.5 | User Profile |

### P14 — PWA

| Milestone | Description |
|-----------|-------------|
| P14.1 | PWA Setup |
| P14.2 | Offline Support |
| P14.3 | Push Notifications |

### P15 — Admin Panel

| Milestone | Description |
|-----------|-------------|
| P15.1 | Admin Authentication |
| P15.2 | Accommodation Management |
| P15.3 | Reservation Management |
| P15.4 | Analytics Dashboard |

---

## Release Plan

### MVP Release (v1.0)

| Milestone | Target |
|-----------|--------|
| P12.3.1 - P12.3.7 | Infrastructure Complete |
| P12.3.8 - P12.3.9 | Core APIs Complete |
| P12.3.10 - P12.3.11 | Owner/Visitor APIs |
| P12.3.12 | Testing Complete |
| **MVP Release** | **v1.0.0** |

### v1.1 — Payment & Notifications

| Milestone | Target |
|-----------|--------|
| P12.4 | Payment Integration |
| P12.5 | Notifications |
| **Release** | **v1.1.0** |

### v2.0 — Mobile & PWA

| Milestone | Target |
|-----------|--------|
| P13 | Flutter App |
| P14 | PWA |
| **Release** | **v2.0.0** |

---

## Reservation Domain

> The reservation domain encompasses booking infrastructure across multiple tourism verticals.

### BOOKING-0 — Reservation Domain Discovery

**Status:** COMPLETE — READ-ONLY DISCOVERY

BOOKING-0 was a read-only architectural investigation of the existing reservation capability in Turistic OS.

**Key findings:**

- Existing reservation infrastructure is substantial (18 capability files, full lifecycle, events, persistence)
- Current persistence is accommodation-centric (`accommodationId` NOT NULL in both `reservations` and `availability` tables)
- Existing generic architectural intent exists (`resourceId`, generic `BOOKING_SCHEMA`, business-agnostic capability description)
- Concurrency/double-booking risk identified but NOT remediated
- Quote, Reservation, Payment, Notification are currently distinct systems

### BOOKING-1 — Generic Reservation Contract & Migration Design

| Item | Value |
|------|-------|
| **Classification** | Architecture / Product Domain Design |
| **Status** | COMPLETE |
| **Implementation** | NOT YET |

#### Purpose

Define the minimum generic reservation contract and migration path before modifying the existing reservation runtime or PostgreSQL schema.

BOOKING-1 produced three architectural options. Option B (Generic Core + Vertical Adapters) was recommended.

#### BOOKING-1A — Semantic Analysis

**Status:** COMPLETE

BOOKING-1A established:
- BookableTarget as the canonical conceptual contract
- Resource is OPTIONAL globally
- Offering is a valid optional commercial/catalog concept
- Reservation target cardinality is 1..n ReservationLines
- Temporal semantics: DATE_RANGE, DATETIME_RANGE, SLOT
- Accommodation uses local civil dates
- Availability distinguishes rules, occurrences where relevant, blocks, capacity, and inventory
- Occurrence/materialization strategy is implementation-dependent
- Operational Allocation is separated from commercial Reservation commitment

#### BOOKING-1B — Architecture Decision Record

**Status:** COMPLETE

Canonical ADR created at `docs/knowledge/BOOKING_1B_ADR.md` with 18 Owner-approved decisions and 12 architectural invariants.

#### BOOKING-2 — Migration & Implementation Plan

| Item | Value |
|------|-------|
| **Classification** | Migration Planning |
| **Status** | COMPLETE |
| **Implementation** | NOT YET |

**BOOKING-2 is defined as:** Documentation-only Migration & Implementation Plan. BOOKING-2 does NOT include implementation itself.

**Plan created at:** `docs/knowledge/BOOKING_2_MIGRATION_PLAN.md`

BOOKING-2 determines:
1. Target persistence: `reservation_lines` table with `targetType + targetId`
2. ReservationLine becomes a dedicated table
3. BookableTarget resolution: vertical adapter registry
4. Compatibility adapter strategy: accommodation adapter preserves existing behavior
5. Accommodation migration: 4-phase compatibility layer
6. Availability persistence: per-vertical strategy (materialized, interval overlap, occurrence)
7. Occurrence persistence: hybrid bounded pre-generation
8. AvailabilityBlock: separate table, not Reservation
9. Temporal field: JSONB `temporal` with mode-specific structure
10. API compatibility: internal adapter pattern
11. PostgreSQL concurrency: atomic conditional UPDATE (not optimistic locking)
12. Data backfill, rollback strategy, migration ordering, testing gates documented

**Next:** BOOKING-3 (Implementation) — COMPLETE

#### BOOKING-3 — ReservationLine Foundation

| Item | Value |
|------|-------|
| **Classification** | Implementation |
| **Status** | PHYSICAL POSTGRESQL CERTIFIED |
| **Physical PG Certification** | PASS - Neon valdi_test |

**What BOOKING-3 Implemented:**

1. `reservation_lines` table schema (Drizzle + migration)
2. Atomic `createReservationWithLine()` in `ReservationRepository`
3. Accommodation compatibility line creation in `ReservationManager.createRequest()`
4. Explicit adapter capability detection (not error-based fallback)
5. Mandatory ReservationLine when accommodation reservation created

**Atomic Transaction Design:**
- `BEGIN -> INSERT reservation -> INSERT reservation_lines -> COMMIT`
- All errors propagate (fail-closed)
- Structural fallback only when PostgreSQL adapter absent

**Accommodation Line Semantics:**
- `targetType = 'accommodation'`
- `quantity = 1` (one accommodation unit, not guest count)
- `temporal.mode = 'DATE_RANGE'` with civil date strings
- `unitPrice = null`, `lineTotal = null` (legacy pricing)

**Forbidden (NOT implemented):**
- No `applicationId`
- No `allocatedResourceId` / `allocatedAt`
- No mandatory `resourceId` or `offeringId`
- No universal `bookable_targets` table

**Tests:** 110/110 PASS (BOOKING-3: 23, Reservation: 21, Availability: 30, business.lifecycle: 36)

**Migration 0006:** Created, registered, and physically executed successfully on Neon `valdi_test`

**Physical Certification:**
- Core migration chain `0001 -> 0006`: PASS on Neon `valdi_test`
- Real Reservation + ReservationLine transaction: PASS
- Forced line failure rollback: PASS (`reservationRows = 0`, `lineRows = 0`)
- Certification marker: `BOOKING3_PHYSICAL_TRANSACTION_GATE_PASS`

**Next Milestone:** BOOKING-4 - Availability Generalization

---

#### BOOKING-3.1 — ReservationLine Read Foundation

| Item | Value |
|------|-------|
| **Classification** | Implementation |
| **Status** | PHYSICAL POSTGRESQL CERTIFIED |
| **Physical PG Certification** | PASS - Neon valdi_test |

**What BOOKING-3.1 Implemented:**

1. `findLinesByReservationId(tenantId, reservationId)` in `ReservationRepository`
2. Tenant isolation enforced through JOIN with parent Reservation
3. No tenant_id column on reservation_lines (enforced through JOIN)
4. Deterministic ordering: line_order ASC, created_at ASC, id ASC
5. Multi-line read support (1..n cardinality)

**Read Contract:**
- Requires tenantId explicitly (no unscoped reads)
- tenant A + reservation A owned by tenant A → lines returned
- tenant A + reservation B owned by tenant B → empty
- Knowledge of reservationId alone does NOT bypass tenant isolation

**Database Column Status:**
```
DATABASE_LINE_TENANT_COLUMN = ABSENT
TENANT_SCOPE_ENFORCED_THROUGH_PARENT_RESERVATION = YES
```

**Query Semantics:**
```sql
SELECT rl.*
FROM reservation_lines rl
JOIN reservations r ON r.id = rl.reservation_id
WHERE rl.reservation_id = $reservationId AND r.tenant_id = $tenantId
ORDER BY rl.line_order ASC, rl.created_at ASC, rl.id ASC;
```

**Forbidden (NOT implemented):**
- No applicationId
- No target-based lookup (reservationId only for this milestone)
- No direct line lookup by ID

**Tests:** 125/125 PASS (BOOKING-3.1: 15, BOOKING-3: 23, Reservation: 21, Availability: 30, business.lifecycle: 36)

**Files Modified:**
- `capabilities/persistence/repositories/reservation/reservation.repository.js` — Added findLinesByReservationId

**Files Created:**
- `tests/capability/booking31.test.js` — 15 focused tests

**Future Dependency:**
- BOOKING-3.1 read foundation enables:
  - Owner Booking Calendar read models
  - Booking analytics
  - NOD booking/availability context
- Does NOT implement calendar UI or Owner Booking Center

**Physical Certification:**
- Correct tenant ReservationLine read: PASS
- Cross-tenant read isolation: PASS
- Certification marker: `BOOKING31_PHYSICAL_TENANT_ISOLATION_GATE_PASS`

**Next Milestone:** BOOKING-4 - Availability Generalization

---

#### BOOKING-4.1 - Availability Target Identity Foundation

| Item | Value |
|------|-------|
| **Classification** | Implementation |
| **Status** | PHYSICAL POSTGRESQL CERTIFIED |
| **Physical PG Certification** | PASS - Neon valdi_test |
| **Production Impact** | NONE - production database not modified |

**What BOOKING-4.1 Implemented:**

1. Generic Availability identity foundation through `targetType + targetId`.
2. Accommodation compatibility mirror:
   - `targetType = 'accommodation'`
   - `targetId = accommodationId`
3. `accommodationId` remains authoritative during this migration stage.
4. Target identity mismatch fails closed.
5. Context tenant is authoritative for Availability writes.
6. Caller-supplied tenant mismatch fails closed.
7. Existing accommodation APIs and DATE_RANGE civil-date behavior remain compatible.
8. Migration `0008_booking_availability_target_identity` added and registered.

**Database Contract:**

- `target_type VARCHAR(50) NOT NULL DEFAULT 'accommodation'`
- `target_id UUID NOT NULL` after controlled legacy backfill
- Existing unique `(accommodation_id, date)` behavior preserved
- No generic target/date unique index introduced
- `accommodation_id` remains NOT NULL in BOOKING-4.1
- Therefore generic non-accommodation persistence is NOT enabled yet
- The `'accommodation'` target_type default is transitional and is not the permanent generic default

**Tenant Safety:**

- Availability writes require context tenant
- Explicit data tenant mismatch is rejected
- Explicit identity tenant mismatch is rejected
- New rows persist context tenant
- Existing repository read/update tenant scoping remains in place

**Tests:** BOOKING-4.1 focused suite `35/35 PASS`

**Physical PostgreSQL Certification:**

- Migration 0008 executed successfully on Neon `valdi_test`
- `target_type` physically verified as VARCHAR / NOT NULL / default `'accommodation'`
- `target_id` physically verified as UUID / NOT NULL
- Existing accommodation/date unique index preserved
- No generic target/date unique index added
- Real legacy-row backfill physically verified
- Backfill test executed inside rollback-only transaction
- Certification marker: `BOOKING41_PHYSICAL_MIGRATION_PASS`
- Backfill marker: `BOOKING41_PHYSICAL_BACKFILL_PASS`
- Rollback marker: `BOOKING41_PHYSICAL_BACKFILL_ROLLBACK_OK`

**Published Commits:**

- `4723851` - database schema registry/bootstrap dependency repair
- `2128d98` - BOOKING-4.1 availability target identity implementation

**Explicitly NOT Implemented:**

- No generic non-accommodation Availability persistence yet
- No SLOT
- No DATETIME_RANGE
- No Occurrences
- No AvailabilityBlock persistence redesign
- No mandatory BookableTarget table
- No Owner Calendar
- No Payment integration
- No booking analytics
- No NOD integration
- No visual booking UI

**Next Milestone:** BOOKING-4.2 - Generic Availability Read Contract

BOOKING-4.2 must expose availability through `targetType + targetId` so consumers do not need to understand the accommodation-specific persistence model, while preserving the current accommodation path.

**MVP Sequence After BOOKING-4.2:**

1. BOOKING-4.3 - PostgreSQL-authoritative capacity/atomicity and double-booking protection.
2. Deliberately stop broad backend expansion.
3. Audit/harden the remaining Owner-session persistence/runtime gap.
4. Move into the mobile-first visual MVP and end-to-end traveler/owner experience.

---
## Future Product Capabilities

> Capabilities below are exploratory ideas. They are NOT approved implementations, NOT technical debt, and do not change the current milestone.

### Traveler Pack / Mochila del Viajero

| Item | Value |
|------|-------|
| **Classification** | Future Product Capability |
| **Concept** | Persistent personal inventory/backpack for travelers |
| **Cross-Application** | YES — intended to span multiple Turistic OS territories |

#### Collectible Categories (conceptual)

- Places, Companies, Routes
- Flora, Fauna, Experiences, Discoveries
- Badges, Medals, Territorial memories

#### Usable Object Categories (conceptual)

- Rewards, Benefits, Tickets, Passes
- Coupons, Digital keys, Unlock objects
- Company-issued rewards

#### Conceptual Behaviors (NOT an implementation contract)

- COLLECTIBLE — saved and reopened later
- CONSUMABLE — single use
- REUSABLE — multi-use
- UNLOCK: permanently unlocks access, content, or an experience
- REDEEMABLE — exchange for value

#### Example

A traveler receives a "Brewer Medal" at a brewery visit. The medal persists with the traveler. On return, Turistic OS may recognize the collectible and the business may unlock a reward, experience, or digital object.

#### Architectural Intent

- Do NOT model saved elements as mere URLs
- Reference stable/canonical identities for underlying entities
- Keep conceptually distinct: favorites, discoveries, achievements, usable objects, rewards

---

## Progress Tracking

| Category | Milestones | Completed | In Progress | Pending |
|----------|------------|-----------|-------------|---------|
| Infrastructure | 7 | 0 | 1 | 6 |
| MVP | 4 | 0 | 0 | 4 |
| Quality | 1 | 0 | 0 | 1 |
| **Total** | **12** | **0** | **1** | **11** |

---

**Document Created:** 2026-08-02
**Platform Version:** 4.0
**Product Mode:** ACTIVE

---

## BOOKING-4.2 - Generic Availability Read Contract

**Status:** CLOSED - PHYSICAL POSTGRESQL CERTIFIED

**Implementation:** `b4439f3` - `feat(booking): add generic availability read contract`

### Product Capability Delivered

Turistic OS now has a minimum generic Availability read boundary based on:

`targetType + targetId`

Current supported target type:

- `accommodation`

Consumers can query Availability without depending directly on `accommodationId` as the public generic read contract.

Supported read modes:

- no date range -> persisted Availability rows;
- complete `startDate + endDate` -> calendar-expanded Availability;
- partial date ranges -> rejected;
- unsupported target types -> rejected.

Existing accommodation Availability APIs remain compatible.

### Tenant Isolation

Availability operations now validate accommodation ownership through the active tenant before persistence or generic target reads.

Protected operations:

- create day;
- block;
- reserve;
- generic target read.

Cross-tenant targets fail closed.

### Certification

- BOOKING-4.2 focused suite: **30/30 PASS**
- Physical PostgreSQL certification: **PASS**
- Neon branch: `valdi-test`
- Database: `valdi_test`
- Production database untouched.
- Physical marker: `BOOKING42_PHYSICAL_POSTGRESQL_GATE_PASS`
- Fixture cleanup marker: `BOOKING42_FIXTURE_CLEANUP_DONE`

### Current Boundary

BOOKING-4.2 is intentionally not a complete generic Availability engine.

Not enabled:

- non-accommodation Availability persistence;
- SLOT;
- DATETIME_RANGE;
- Occurrences;
- generic AvailabilityBlock persistence;
- mandatory BookableTarget table;
- Owner Calendar;
- Payment;
- analytics;
- NOD;
- booking UI.

A concrete generic PostgreSQL ORM adapter/runtime wiring gap also remains infrastructure debt for production certification.

### MVP-Critical Sequence

The backend sequence is now intentionally constrained:

1. **BOOKING-4.3 - Capacity / Atomicity / Double-booking Protection**
   - PostgreSQL-authoritative inventory/capacity mutation.
   - Prevent concurrent overbooking.
   - Preserve the existing Reservation lifecycle.
   - Keep scope limited to what the MVP requires.

2. **Owner Session Runtime Audit / Hardening**
   - Do not reimplement completed OWNER-SESSION milestones.
   - Identify only the remaining persistence/runtime gap required for the MVP.
   - Certify the owner login/session path needed by the visual product.

3. **Mobile-first Visual MVP**
   - Shift primary development effort from architecture expansion to product experience.
   - Build a polished app-like traveler experience.
   - Build the minimum owner operational experience.

### Fundraising Demo Target

The MVP should demonstrate a coherent end-to-end product rather than isolated backend capabilities.

Traveler path:

`Destination -> Discover Experience -> View Availability -> Reserve -> Confirmation`

Owner path:

`Login -> Reservations / Calendar -> Manage Reservation`

The product priority after BOOKING-4.3 is to make Turistic OS demonstrable, understandable, visually credible, and usable enough to support startup fundraising.

Further backend architecture expansion should require direct justification from this MVP path.
