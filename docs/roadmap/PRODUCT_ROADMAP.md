# PRODUCT_ROADMAP.md

> Product development roadmap for Valdi Platform.
> This document tracks product milestones, not platform phases.

---

## Overview

| Item | Value |
|------|-------|
| **Platform Version** | 4.0 (CERTIFIED) |
| **Product Development Mode** | ACTIVE |
| **Current Product Milestone** | P12.3.1 |
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
| **P12.3.1** | Database Connection & Migration | NEXT | 1 |
| P12.3.2 | Authentication Provider Configuration | Pending | 2 |
| P12.3.3 | CMS Provider Configuration | Pending | 3 |
| P12.3.4 | Repository Adapter Registration | Pending | 4 |
| P12.3.5 | Environment Setup (dev/staging/prod) | Pending | 5 |
| P12.3.6 | Event → CMS Sync Wiring | Pending | 6 |
| P12.3.7 | Event → Email Wiring | Pending | 7 |

### MVP Features (P12.3.8 - P12.3.11)

| Milestone | Name | Status | Priority |
|-----------|------|--------|----------|
| P12.3.8 | Accommodation Management API | Pending | 8 |
| P12.3.9 | Reservation API | Pending | 9 |
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
| **Status** | NEXT |
| **Priority** | 1 |
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

### P12.3.2 — Authentication Provider Configuration

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
