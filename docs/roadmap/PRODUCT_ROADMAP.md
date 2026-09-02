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

**Next:** BOOKING-3 (Implementation) — TBD

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
