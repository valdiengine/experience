# PROJECT_CONTEXT.md

> Primary context file for AI agents. Read after `00_READ_FIRST.md`.

---

## Project Vision

A multi-tenant SaaS platform for vacation rental management, combining a Commercial Aggregate (Business, Accommodation, Availability, Reservation, Visitor, Payment, Notification) with a Destination Ecosystem (Community, Exploration, Governance, Operations, Identity).

---

## Architecture Philosophy

**Layered Capability-Based Architecture** with strict dependency rules:

1. **Capability Isolation**: Each capability is a self-contained module with clear boundaries
2. **Aggregate Root Pattern**: Business is the sole aggregate root for commercial domain
3. **Repository Abstraction**: All persistence is abstracted through repository interfaces
4. **Provider Independence**: Commercial capabilities have zero infrastructure dependencies
5. **Event-Driven Communication**: Cross-capability communication happens exclusively through events
6. **Runtime Decoupling**: Capabilities are runtime-agnostic

---

## DDD Principles

- **Business** is the Aggregate Root for all commercial entities
- **Accommodation**, **Availability**, **Reservation**, **Visitor**, **Payment**, **Notification** are compositions or references within the aggregate
- **Repository Is the Only Persistence Path**: No SQL/ORM in capabilities
- **Business Logic Must Not Leak**: Domain logic stays in domain capabilities
- **Infrastructure Is a Plugin**: Providers are external, capabilities remain clean

---

## Commercial Aggregate

```
Business (Aggregate Root)
├── Accommodation (Composition)
│   └── businessId (required)
├── Availability (Composition via Accommodation)
│   └── accommodationId (required)
├── Reservation (Composition)
│   ├── businessId (required)
│   ├── accommodationId (optional)
│   ├── visitorId (optional)
│   └── notificationId (reference, nullable)
├── Visitor (Reference)
│   └── businessId (optional, through Reservation)
├── Payment (Reference)
│   ├── businessId (required)
│   ├── reservationId (optional)
│   └── notificationId (reference, nullable)
└── Notification (Composition)
    ├── businessId (required)
    ├── visitorId (optional)
    ├── reservationId (optional)
    └── paymentId (optional)
```

---

## Platform Layers

| Layer | Description |
|-------|-------------|
| Presentation | Flutter Mobile, Flutter Web, WordPress, Admin, Owner, API |
| API | REST API, Auth, AuthZ, Validation, Rate Limiting |
| Runtime | Bootstrap, Engine, Event Bus, Repository, Search, Sync, Scheduler, Queue, Config, Logging, Health |
| Capabilities | Commercial Aggregate + Identity, Destination, Search, CMS, Auth, Observability, Scheduler, Intelligence, Community, Engagement, SaaS |
| Repository | Repository Engine, Factory, Registry, Adapters |
| Infrastructure | PostgreSQL, Drizzle, JWT, WordPress, Search, Providers |

---

## Runtime Engine

- **Location:** `runtime/`
- **Entry Point:** `runtime/startup/application.start.js`
- **Bootstrap:** `runtime/bootstrap/`
- **Core:** `runtime/core/`
- **Context:** `RuntimeContext` — provides capabilities, repositories, event bus, config

---

## Repository Engine

- **Location:** `persistence/`
- **Pattern:** Unit of Work + Repository Pattern
- **ORM Adapter:** Abstract ORM contract with Drizzle implementation
- **Provider:** PostgreSQL via Drizzle

---

## Capability Engine

- **Location:** `capabilities/`
- **Count:** 32 registered capabilities
- **Base Class:** `BaseCapability`
- **Registration:** `capabilities/register.js`
- **Business Sub-Managers:** 12 (BusinessManager + 11 sub-managers)

---

## Business Managers

| Manager | File | Purpose |
|---------|------|---------|
| BusinessManager | business.manager.js | Aggregate root manager |
| BusinessAccommodationManager | business-accommodation.manager.js | Accommodation CRUD |
| BusinessAvailabilityManager | business-availability.manager.js | Availability/calendar |
| BusinessReservationManager | business-reservation.manager.js | Reservations |
| BusinessVisitorManager | business-visitor.manager.js | Visitors |
| BusinessPaymentManager | business-payment.manager.js | Payments |
| BusinessNotificationManager | business-notification.manager.js | Notifications |
| BusinessBrandManager | business-brand.manager.js | Branding |
| BusinessCMSManager | business-cms.manager.js | CMS integration |
| BusinessOwnerManager | business-owner.manager.js | Owner management |
| BusinessSearchManager | business-search.manager.js | Search indexing |
| BusinessStatisticsManager | business-statistics.manager.js | Analytics |

---

## REST API

- **Location:** `api/`
- **Entry Point:** `api/bootstrap/api.bootstrap.js`
- **Bootstrap with Runtime:** `startWithApi()` in `application.start.js`
- **Route Files:** 6 route files (accommodation, visitor, reservation, payment, review, availability)
- **Controller Pattern:** Controllers access BusinessService via `capability?.service`
- **Response Format:** JSON with `success`, `data`, `pagination` fields

---

## Repository Count

| Metric | Value |
|--------|-------|
| Repository Engine | 40+ files |
| Entity Repositories | 27 repos |
| ORM Adapter | 10 files |
| PostgreSQL Provider | 10 files |
| Drizzle Schema | 10 files |

---

## Capability Count

**32 Registered Capabilities**

| Domain | Capabilities |
|--------|--------------|
| Commercial | business, accommodation, availability, reservation, visitor, payment, notification |
| Identity | identity, auth, authorization |
| Infrastructure | persistence, repository, cms, wordpress |
| Ecosystem | community, exploration, governance, destination-operations, destination-identity |
| Platform | scheduler, observability, intelligence, engagement, conversion, lifecycle |
| Management | onboarding, admin, saas, billing, owner, public, pwa, pwa-engine, cms-bridge, communication, booking, seo-intelligence |

---

## Business Manager Count

| Metric | Value |
|--------|-------|
| Total Managers | 12 |
| Aggregate Root Manager | 1 (BusinessManager) |
| Sub-Managers | 11 |

---

## Current Phase

**P14.FINAL** — API Layer Closure Audit

> Last updated: P14.FINAL — Platform Certified, API Layer CLOSED

---

## Completed Phases

**100 phases completed** (74 base + 26 extension phases)

Key milestones:
- P13: Business Services foundation
- P13.8: Commercial Aggregate Final Validation (Design Freeze)
- P14: API Layer Foundation
- P14.0.7: Runtime/API Smoke Test (95/100)
- P14.1: API Layer Integration
- P14.1.5: API Layer Integration Validation
- P14.1.5.5: Commercial Aggregate Entry Point Validation (BusinessService as ONLY entry point)

---

## Frozen Components

Per **DESIGN_FREEZE.md** (P13.8, 2026-08-01):

- Business Aggregate
- BusinessService
- Business Managers
- Repository Engine
- Runtime Engine
- Capability Registration
- Aggregate Ownership
- Event Model

---

## Immutable Rules

Per **ARCHITECTURE_IMMUTABLE.md**:

1. Never redesign frozen architecture
2. Never bypass BusinessService
3. Never bypass Business Managers
4. Never access repositories directly
5. Never introduce infrastructure into capabilities
6. Never violate Aggregate Ownership
7. Always preserve Design Freeze

---

## Design Freeze Status

| Item | Value |
|------|-------|
| Branch | `release/design-freeze-p13.8` |
| Tag | `design-freeze-p13.8` |
| Commit | `1728d1a5460e96b912d491a0d58495407b6dab14` |
| Date | 2026-08-01 |
| Architecture Score | 98/100 |
| Status | **APPROVED** |

---

## Coding Rules

1. **BusinessService is the ONLY official entry point** for commercial domain
2. Controllers MUST use `capability?.service` to obtain BusinessService
3. Never use `capability?.getXxxService()` — these return capability objects, not services
4. All persistence goes through Repository layer
5. All cross-capability communication via events
6. No infrastructure imports in capabilities (HTTP, SMTP, Stripe, etc.)

---

## Validation Process

1. Architecture Proposal (required for changes)
2. Architecture Audit
3. Design Freeze Approval

---

## Smoke Test Process

```bash
node runtime/startup/api.smoke.test.js
```

Current score: **95/100**

---

## Architecture Audit Process

1. Run `api.smoke.test.js` — verify 95+ score
2. Run `api.integration.test.js` — verify endpoint functionality
3. Check `DESIGN_FREEZE.md` — confirm no violations
4. Review `ARCHITECTURE_IMMUTABLE.md` — confirm compliance

---

## Directory Structure

```
docs/
├── architecture/           # Architecture documents
│   ├── 00_READ_FIRST.md   # THIS FILE — reading order
│   ├── DESIGN_FREEZE.md   # Frozen components
│   ├── ARCHITECTURE_IMMUTABLE.md  # Immutable rules
│   ├── MASTER_ARCHITECTURE.md     # Platform overview
│   ├── MASTER_ARCHITECTURE.puml   # Visual diagram
│   ├── MASTER_ARCHITECTURE.mmd    # Alternative visual
│   ├── API_LAYER.md       # REST API spec
│   ├── API_RUNTIME_INTEGRATION.md  # Runtime+API bootstrap
│   ├── COMMERCIAL_AGGREGATE_FINAL_VALIDATION.md
│   ├── COMMERCIAL_AGGREGATE_ENTRY_POINT_VALIDATION.md
│   └── ...
├── ai/                    # AI context files
│   ├── CURRENT_STATE.md   # Implementation state
│   ├── NEXT_PHASE.md      # Next target
│   └── ...
├── roadmap/               # Roadmap files
│   └── ROADMAP.md        # Master roadmap
capabilities/
├── business/              # Commercial Aggregate
│   ├── business.capability.js
│   ├── business.service.js
│   ├── business.manager.js
│   ├── business-*.manager.js  # 11 sub-managers
│   └── ...
├── community/
├── cms/
├── destination-operations/
└── ...                    # 32 total capabilities
api/
├── bootstrap/
│   ├── api.bootstrap.js   # API entry point
│   └── server/
├── routes/                # 6 route files
├── controllers/
└── ...
runtime/
├── startup/
│   ├── application.start.js  # Runtime + API bootstrap
│   └── api.smoke.test.js   # Smoke test
├── bootstrap/
├── core/
└── ...
persistence/
├── repository/
├── engine/
└── ...
```

---

## Reading Order

1. `docs/architecture/00_READ_FIRST.md` (this file's companion)
2. `docs/architecture/DESIGN_FREEZE.md`
3. `docs/architecture/ARCHITECTURE_IMMUTABLE.md`
4. `docs/architecture/MASTER_ARCHITECTURE.md`
5. `docs/architecture/MASTER_ARCHITECTURE.puml`
6. `docs/architecture/MASTER_ARCHITECTURE.mmd`
7. `docs/architecture/API_LAYER.md`
8. `docs/architecture/API_RUNTIME_INTEGRATION.md`
9. `docs/architecture/COMMERCIAL_AGGREGATE_FINAL_VALIDATION.md`
10. `docs/architecture/COMMERCIAL_AGGREGATE_ENTRY_POINT_VALIDATION.md`
11. `docs/ai/CURRENT_STATE.md`
12. `docs/roadmap/ROADMAP.md`
13. `docs/ai/NEXT_PHASE.md`

---

## Future Roadmap

| Priority | Phase | Name | Status |
|----------|-------|------|--------|
| 1 | P12.3.1 | Database Connection & Migration | Pending |
| 2 | P12.3.2 | Authentication Provider Configuration | Pending |
| 3 | P12.3.3 | CMS Provider Configuration | Pending |
| 4 | P12.3.4 | Repository Adapter Registration | Pending |
| 5 | P12.3.5 | Environment Setup | Pending |
| 6 | P12.3.6 | Event → CMS Sync Wiring | Pending |
| 7 | P12.3.7 | Event → Email Wiring | Pending |
| 8 | P12.3.8 | Accommodation Management API | Pending |
| 9 | P12.3.9 | Reservation API | Pending |
| 10 | P12.3.10 | Owner Portal API | Pending |
| 11 | P12.3.11 | Visitor Experience API | Pending |
| 12 | P12.3.12 | Testing Setup | Pending |

---

## Known Decisions

| Decision | Reference |
|----------|-----------|
| BusinessService is ONLY entry point | P14.1.5.5 — OPTION A |
| Design Freeze at P13.8 | DESIGN_FREEZE.md |
| No infrastructure in capabilities | ARCHITECTURE_IMMUTABLE.md |
| Repository is only persistence path | MASTER_ARCHITECTURE.md |
| Event-driven cross-capability comms | MASTER_ARCHITECTURE.md |

---

## Known Constraints

1. **No direct capability imports**: Capabilities must use `context.capabilities.get()`
2. **No SQL/ORM in capabilities**: All persistence via Repository layer
3. **No infrastructure imports**: No HTTP, SMTP, Stripe in commercial domain
4. **Aggregate ownership**: Business is the only aggregate root
5. **Design Freeze**: Commercial Aggregate frozen at P13.8

---

## Current Entry Point

### BusinessService

**Location:** `capabilities/business/business.service.js`

**Access Pattern:**
```javascript
const capability = global.runtimeContext?.capabilities?.get('business');
const service = capability?.service; // BusinessService instance
```

**NOT:**
```javascript
// WRONG - returns BusinessCapability, not BusinessService
capability?.getAccommodationService?.()
capability?.getReservationService?.()
capability?.getVisitorService?.()
```

---

## Current Runtime Bootstrap

**Location:** `runtime/startup/application.start.js`

**Method:** `startWithApi()`

This method:
1. Initializes RuntimeContext
2. Registers all 32 capabilities
3. Bootstraps API server
4. Integrates API with Runtime context

---

## Current API Bootstrap

**Location:** `api/bootstrap/api.bootstrap.js`

**Parameter:** `runtimeContext`

The API layer receives RuntimeContext at bootstrap, enabling route access to BusinessService.

---

## Current Documentation Index

| Document | Location | Purpose |
|----------|----------|---------|
| AI_BOOTSTRAP.md | docs/architecture/ | Mandatory onboarding for AIs |
| 00_READ_FIRST.md | docs/architecture/ | Reading order |
| PROJECT_CONTEXT.md | docs/architecture/ | This file |
| DESIGN_FREEZE.md | docs/architecture/ | Frozen components |
| ARCHITECTURE_IMMUTABLE.md | docs/architecture/ | Immutable rules |
| MASTER_ARCHITECTURE.md | docs/architecture/ | Platform overview |
| API_LAYER.md | docs/architecture/ | REST API spec |
| API_RUNTIME_INTEGRATION.md | docs/architecture/ | Runtime+API bootstrap |
| CURRENT_STATE.md | docs/ai/ | Implementation state |
| ROADMAP.md | docs/roadmap/ | Development phases |
| NEXT_PHASE.md | docs/ai/ | Next target |
| PROJECT_HEALTH.md | docs/architecture/ | Health dashboard |
| GIT_WORKFLOW.md | docs/architecture/ | Git strategy |
| RELEASE_PROCESS.md | docs/architecture/ | Release procedure |

---

## AI Bootstrap Instructions

Every AI agent must:

1. Read `docs/architecture/AI_BOOTSTRAP.md`
2. Read `docs/architecture/00_READ_FIRST.md`
3. Read `docs/architecture/PROJECT_CONTEXT.md` (this file)
4. Read `docs/architecture/PROJECT_HEALTH.md`
5. Read `docs/ai/CURRENT_STATE.md`
6. Read `docs/ai/NEXT_PHASE.md`
7. Only then begin implementation

---

## AI Operating System

| Item | Version |
|------|---------|
| AI Operating System | 1.0 |
| Architecture Version | P13.8 Design Freeze + P14.FINAL API Closure |
| Documentation Version | 1.0 |
| Context Version | P14.FINAL |
