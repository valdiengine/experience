# MASTER ARCHITECTURE DOCUMENT

> **Version:** 1.0.0
> **Date:** 2026-08-01
> **Status:** Design Freeze P13.8 Approved
> **Commit:** `19f55c0d2e4817df376c85ae7970cda5a8e4101a`
> **Branch:** `release/design-freeze-p13.8`
> **Tag:** `design-freeze-p13.8`

---

## Table of Contents

1. [Architecture Philosophy](#1-architecture-philosophy)
2. [Layer Overview](#2-layer-overview)
3. [Presentation Layer](#3-presentation-layer)
4. [API Layer](#4-api-layer)
5. [Runtime Layer](#5-runtime-layer)
6. [Capabilities Layer](#6-capabilities-layer)
7. [Commercial Aggregate](#7-commercial-aggregate)
8. [Repository Layer](#8-repository-layer)
9. [Infrastructure Layer](#9-infrastructure-layer)
10. [Dependency Rules](#10-dependency-rules)
11. [Event Architecture](#11-event-architecture)
12. [Runtime Startup](#12-runtime-startup)
13. [Repository Flow](#13-repository-flow)
14. [Capability Communication](#14-capability-communication)
15. [Provider Isolation](#15-provider-isolation)
16. [Design Freeze Status](#16-design-freeze-status)
17. [Future Expansion](#17-future-expansion)

---

## 1. Architecture Philosophy

### Core Principles

The platform follows a **layered capability-based architecture** with strict dependency rules:

1. **Capability Isolation**: Each capability is a self-contained module with clear boundaries
2. **Aggregate Root Pattern**: Business is the sole aggregate root for commercial domain
3. **Repository Abstraction**: All persistence is abstracted through repository interfaces
4. **Provider Independence**: Commercial capabilities have zero infrastructure dependencies
5. **Event-Driven Communication**: Cross-capability communication happens exclusively through events
6. **Runtime Decoupling**: Capabilities are runtime-agnostic

### Architectural Tenets

- **Business Logic Must Not Leak**: Domain logic stays in domain capabilities
- **Infrastructure Is a Plugin**: Providers are external, capabilities remain clean
- **Events for Decoupling**: No direct imports between capabilities
- **Repository Is the Only Persistence Path**: No SQL/ORM in capabilities
- **Design Freeze After P13.8**: Commercial Aggregate architecture is now frozen

---

## 2. Layer Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                           │
│  Flutter Mobile │ Flutter Web │ WordPress │ Admin │ Owner │ API  │
├─────────────────────────────────────────────────────────────────┤
│                         API LAYER                               │
│     REST API │ Auth │ AuthZ │ Validation │ Rate Limiting        │
├─────────────────────────────────────────────────────────────────┤
│                       RUNTIME LAYER                              │
│  Bootstrap │ Engine │ Event Bus │ Repository │ Search │ Sync    │
│  Scheduler │ Queue  │ Config    │ Logging     │ Health         │
├─────────────────────────────────────────────────────────────────┤
│                     CAPABILITIES LAYER                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              COMMERCIAL AGGREGATE (P13.8)                 │   │
│  │  Business → Accommodation → Availability → Reservation    │   │
│  │           → Visitor → Payment → Notification              │   │
│  └──────────────────────────────────────────────────────────┘   │
│  Identity │ Destination │ Search │ CMS │ Auth │ Observability    │
│  Scheduler │ Intelligence │ Community │ Engagement │ SaaS         │
├─────────────────────────────────────────────────────────────────┤
│                      REPOSITORY LAYER                           │
│  Repository Engine │ Factory │ Registry │ Adapters              │
├─────────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE LAYER                         │
│  PostgreSQL │ Drizzle │ JWT │ WordPress │ Search │ Providers     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Presentation Layer

### 3.1 Flutter Mobile App (Future)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Native mobile experience for visitors and owners |
| **Platform** | iOS, Android |
| **State Management** | BLoC pattern |
| **API Integration** | REST API / GraphQL |

### 3.2 Flutter Web App (Future)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Cross-platform web application |
| **Framework** | Flutter Web |
| **Rendering** | Canvas-based |

### 3.3 WordPress Frontend

| Aspect | Detail |
|--------|--------|
| **Purpose** | Public marketing site and blog |
| **CMS** | WordPress (headless) |
| **Integration** | CMS Runtime Provider |
| **Sync** | Bidirectional content sync |

### 3.4 Admin Portal (Future)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Platform administration |
| **Capabilities** | User, Tenant, Plans, Content, Analytics |
| **Access** | Platform operators |

### 3.5 Owner Portal (Future)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Business owner dashboard |
| **Capabilities** | Reservations, Availability, Customers, Metrics |
| **Access** | Business owners |

### 3.6 Public API Consumers (Future)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Third-party integrations |
| **Protocol** | REST |
| **Auth** | API Keys / OAuth |

---

## 4. API Layer (Future)

### 4.1 REST API

| Endpoint Category | Description |
|-------------------|-------------|
| `/api/v1/business` | Business management |
| `/api/v1/accommodations` | Accommodation CRUD |
| `/api/v1/reservations` | Reservation lifecycle |
| `/api/v1/visitors` | Visitor management |
| `/api/v1/payments` | Payment operations |
| `/api/v1/notifications` | Notification management |

### 4.2 Authentication

| Provider | Type |
|----------|------|
| JWT | Bearer token |
| Session | Cookie-based |
| OAuth 2.0 | External providers |
| API Key | Service-to-service |

### 4.3 Authorization

| Engine | Purpose |
|--------|---------|
| RBAC | Role-based access control |
| Policy Engine | Custom authorization policies |
| Permission Matrix | Capability-level permissions |

### 4.4 Validation

- Request validation middleware
- Schema validation (JSON Schema)
- Business rule validation at capability layer

### 4.5 Rate Limiting

| Strategy | Limits |
|----------|--------|
| Per-user | 1000 req/hour |
| Per-IP | 100 req/minute |
| Per-endpoint | Custom limits |

---

## 5. Runtime Layer

### 5.1 Application Startup

```
Application Start
       ↓
Bootstrap Pipeline
       ↓
Runtime Engine
       ↓
Repository Engine
       ↓
Capability Bootstrap
       ↓
Health Checks
       ↓
    READY
```

### 5.2 Runtime Components

| Component | File | Purpose |
|-----------|------|---------|
| **RuntimeEngine** | `runtime/runtime.engine.js` | Central runtime coordinator |
| **BootstrapPipeline** | `runtime/bootstrap/bootstrap.pipeline.js` | Startup sequence |
| **EventBus** | `shared/events/eventbus.js` | Event distribution |
| **RepositoryEngine** | `capabilities/persistence/engine/repository.engine.js` | Persistence abstraction |
| **SearchEngine** | `runtime/contracts/search.runtime.js` | Search abstraction |
| **SyncEngine** | `runtime/cms/sync/sync.engine.js` | Content synchronization |
| **Scheduler** | `capabilities/scheduler/scheduler.capability.js` | Job scheduling |
| **Queue** | `runtime/contracts/queue.runtime.js` | Async job processing |
| **Config** | `shared/constants/config.js` | Configuration management |
| **Logging** | `runtime/runtime.lifecycle.js` | Runtime logging |
| **HealthMonitor** | `capabilities/observability/health.monitor.js` | Health checks |

### 5.3 Bootstrap Pipeline

```
1. Load Configuration
2. Initialize Logging
3. Connect to Database (PostgreSQL)
4. Initialize Repository Engine
5. Register Repository Adapters
6. Initialize Event Bus
7. Load Capability Registry
8. Bootstrap Capabilities
9. Initialize Runtime Engines (Auth, CMS, Scheduler)
10. Run Health Checks
11. Emit READY event
```

### 5.4 Event Bus Architecture

```
                    ┌─────────────────┐
                    │   Event Bus     │
                    │ (EventBus.js)   │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   Capability A       Capability B        Capability C
   (Publisher)        (Subscriber)        (Subscriber)
```

---

## 6. Capabilities Layer

### 6.1 Complete Capability Registry

| # | Capability | ID | Layer | Registered | Purpose |
|---|------------|-----|-------|------------|---------|
| 1 | Business | `business` | Commercial | YES | Aggregate root, company management |
| 2 | Accommodation | `accommodation` | Commercial | NO* | Property lifecycle |
| 3 | Availability | `availability` | Commercial | YES | Calendar, booking rules |
| 4 | Reservation | `reservation` | Commercial | YES | Reservation lifecycle |
| 5 | Visitor | `visitor` | Commercial | YES | Customer profiles |
| 6 | Payment | `payment` | Commercial | YES | Payment lifecycle |
| 7 | Notification | `notification` | Commercial | YES | Notification lifecycle (domain-only) |
| 8 | Identity | `identity` | Platform | YES (as `destination-identity`) | Identity, culture, heritage |
| 9 | Destination | `destination` | Platform | NO | Destination management |
| 10 | Community | `community` | Platform | YES | Visitor-generated content |
| 11 | Engagement | `engagement` | Platform | YES | Customer engagement |
| 12 | Conversion | `conversion` | Platform | YES | Lead/customer conversion |
| 13 | Intelligence | `intelligence` | Platform | YES | Analytics, recommendations |
| 14 | Lifecycle | `lifecycle` | Platform | YES | Customer lifecycle |
| 15 | Owner | `owner` | Platform | YES | Owner portal |
| 16 | Billing | `billing` | Platform | YES | Invoicing, subscriptions |
| 17 | SaaS | `saas` | Platform | YES | Products, plans, entitlements |
| 18 | Onboarding | `onboarding` | Platform | YES | Business registration |
| 19 | Scheduler | `scheduler` | Platform | YES | Job scheduling |
| 20 | Observability | `observability` | Platform | YES | Metrics, health, alerts |
| 21 | Communication | `communication` | Platform | YES | Multi-channel messaging |
| 22 | Notifications (v2) | `notifications` | Platform | YES | Multi-channel notifications |
| 23 | CMS | `cms` | Platform | YES | WordPress integration |
| 24 | Booking | `booking` | Platform | YES | Core booking system |
| 25 | SEO Intelligence | `seo-intelligence` | Platform | YES | SEO analysis |
| 26 | Public | `public` | Platform | YES | Public experience |
| 27 | PWA | `pwa` | Platform | YES | Basic PWA |
| 28 | PWA Engine | `pwa-engine` | Platform | YES | Full PWA engine |
| 29 | Admin | `admin` | Platform | YES | Admin platform |
| 30 | Exploration | `exploration` | Ecosystem | YES | Gamification, badges |
| 31 | Governance | `governance` | Ecosystem | YES | RBAC, moderation |
| 32 | Operations | `operations` | Ecosystem | YES (as `destination-operations`) | Destination health |
| 33 | Persistence | `persistence` | Core | YES | Repository engine |
| 34 | Core | `core` | Core | YES | Base capability, loader, registry |
| 35 | Tenant | `tenant` | Core | NO | Multi-tenancy |
| 36 | Opportunity | `opportunity` | Ecosystem | YES | Opportunity detection |
| 37 | Catalog | `catalog` | (Placeholder) | NO | Placeholder only |
| 38 | Gallery | `gallery` | (Placeholder) | NO | Placeholder only |
| 39 | Payments | `payments` | (Placeholder) | NO | Placeholder only |

**Total: 35 capabilities with `.capability.js` files, 32 registered in `AVAILABLE_CAPABILITIES`**

*Note: `accommodation` has `.capability.js` but is NOT registered (orphaned). `ecology`, `economy`, `locality` have event files only, not capabilities.

### 6.2 Capability Structure

Every capability follows the same pattern:

```
capabilities/{name}/
├── {name}.capability.js     # Main capability class
├── {name}.manager.js        # Domain manager
├── {name}.service.js        # Domain service
├── {name}.workflow.js       # State machine
├── {name}.validation.js     # Validation rules
├── {name}.schema.js         # Data schema
├── {name}.events.js         # Event definitions
├── {name}.errors.js         # Error classes
├── {name}.permissions.js    # Permission definitions
├── {name}.status.js         # Status enums
├── {name}.search.js         # Search payload
└── README.md                # Documentation
```

### 6.3 Core Capabilities

#### 6.3.1 Core (`core`)

| File | Purpose |
|------|---------|
| `base.capability.js` | Base class for all capabilities |
| `loader.js` | Dynamic capability loader |
| `register.js` | Capability registry |
| `registry.js` | Runtime capability registry |
| `schema.js` | Core schemas |
| `events.js` | Core events |

#### 6.3.2 Persistence (`persistence`)

| File | Purpose |
|------|---------|
| `repository.capability.js` | Repository capability |
| `engine/repository.engine.js` | Central repository engine |
| `engine/repository.factory.js` | Repository factory |
| `engine/repository.registry.js` | Repository registry |
| `engine/repository.context.js` | Repository context |
| `engine/transaction.manager.js` | Transaction management |
| `engine/unit-of-work.js` | Unit of Work pattern |
| `contracts/*.js` | Repository contracts (Base, Read, Write, Aggregate) |
| `adapters/*.js` | Repository adapters |
| `mixins/*.js` | Repository mixins (tenant, soft-delete, etc.) |
| `providers/*` | Provider implementations |
| `repositories/*` | Domain repositories |

#### 6.3.3 Tenant (`tenant`)

| File | Purpose |
|------|---------|
| `manager.js` | Tenant management |
| `registry.js` | Tenant registry |
| `resolver.js` | Tenant resolution |
| `config.schema.js` | Tenant configuration schema |

---

## 7. Commercial Aggregate

### 7.1 Aggregate Definition

```
┌─────────────────────────────────────────────────────────────────┐
│                  COMMERCIAL AGGREGATE                           │
│                                                                 │
│  Business (Aggregate Root)                                       │
│  ├── Accommodation (Composition)                                 │
│  │   └── Availability (Composition via Accommodation)           │
│  ├── Reservation (Composition)                                  │
│  │   ├── Visitor (Reference via visitorId)                      │
│  │   ├── Payment (Reference via paymentId)                      │
│  │   └── Notification (Reference via notificationId)            │
│  ├── Visitor (Reference)                                        │
│  ├── Payment (Reference)                                         │
│  └── Notification (Composition)                                 │
│       ├── Visitor (Reference via visitorId)                      │
│       ├── Reservation (Reference via reservationId)              │
│       └── Payment (Reference via paymentId)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Ownership Relationships

| Owner | Owns | Type |
|-------|------|------|
| Business | Accommodation | Composition |
| Business | Reservation | Composition |
| Business | Visitor | Composition |
| Business | Payment | Composition |
| Business | Notification | Composition |
| Accommodation | Availability | Composition |

### 7.3 Reference Relationships

| Entity | References | Type |
|--------|------------|------|
| Reservation | Visitor | Reference (nullable) |
| Reservation | Payment | Reference (nullable) |
| Reservation | Notification | Reference (nullable) |
| Payment | Reservation | Reference (nullable) |
| Notification | Visitor | Reference (nullable) |
| Notification | Reservation | Reference (nullable) |
| Notification | Payment | Reference (nullable) |

### 7.4 Cascade Rules

| Operation | Cascades To | Behavior |
|-----------|-------------|----------|
| Business Archive | All owned entities | Archive |
| Business Restore | All owned entities | Restore |
| Business Delete | Accommodation, Reservation, Visitor, Payment, Notification | Archive (not delete) |
| Accommodation Delete | Availability | Archive |
| Reservation Delete | Notification | Archive |
| Payment Delete | Notification | Archive |

### 7.5 Business Managers

All Business Managers follow the **delegation pattern** — they delegate to domain capabilities and do not contain business logic.

**Total: 12 managers (1 aggregate root manager + 11 sub-managers)**

| Manager | File | Methods | Responsibility |
|---------|------|---------|----------------|
| BusinessManager | `business.manager.js` | ~150 | Aggregate root orchestration |
| BusinessAccommodationManager | `business-accommodation.manager.js` | 45 | Accommodation orchestration |
| BusinessAvailabilityManager | `business-availability.manager.js` | 55 | Availability orchestration |
| BusinessReservationManager | `business-reservation.manager.js` | 77 | Reservation orchestration |
| BusinessVisitorManager | `business-visitor.manager.js` | 55 | Visitor orchestration |
| BusinessPaymentManager | `business-payment.manager.js` | 62 | Payment orchestration |
| BusinessNotificationManager | `business-notification.manager.js` | 57 | Notification orchestration |
| BusinessBrandManager | `business-brand.manager.js` | — | Brand management |
| BusinessCMSManager | `business-cms.manager.js` | — | CMS coordination |
| BusinessOwnerManager | `business-owner.manager.js` | — | Owner management |
| BusinessSearchManager | `business-search.manager.js` | — | Search indexing |
| BusinessStatisticsManager | `business-statistics.manager.js` | — | Statistics aggregation |

### 7.6 Commercial Capability Details

#### 7.6.1 Business Capability

| Aspect | Detail |
|--------|--------|
| **ID** | `business` |
| **Aggregate Root** | Yes |
| **Dependencies** | tenant, destination |
| **Files** | 24 + 11 managers |
| **Statuses** | DRAFT, PENDING_REVIEW, PUBLISHED, SUSPENDED, ARCHIVED, DELETED |
| **Permissions** | 9 (business:create, business:update, business:delete, business:publish, business:archive, business:transfer, business:verify, business:read, business:manage) |
| **Events** | ~104 (business:*, business.accommodation:*, business.availability:*, etc.) |

#### 7.6.2 Accommodation Capability

| Aspect | Detail |
|--------|--------|
| **ID** | `accommodation` |
| **Aggregate Root** | No |
| **Owner** | Business |
| **Dependencies** | — |
| **Files** | 14 |
| **Statuses** | DRAFT, PENDING_REVIEW, PUBLISHED, HIDDEN, ARCHIVED, DELETED |
| **Permissions** | 6 |
| **Events** | 10 |

#### 7.6.3 Availability Capability

| Aspect | Detail |
|--------|--------|
| **ID** | `availability` |
| **Aggregate Root** | No |
| **Owner** | Accommodation |
| **Dependencies** | accommodation |
| **Files** | 14 |
| **Statuses** | AVAILABLE, BLOCKED, RESERVED, PENDING, MAINTENANCE, HIDDEN, ARCHIVED, DELETED |
| **Permissions** | 7 |
| **Events** | 16 |

#### 7.6.4 Reservation Capability

| Aspect | Detail |
|--------|--------|
| **ID** | `reservation` |
| **Aggregate Root** | No |
| **Owner** | Business |
| **Dependencies** | booking, availability, communication, notifications |
| **Files** | 20 + 4 UI |
| **Statuses** | 14 (REQUESTED, OWNER_PENDING, OWNER_CONFIRMED, PAYMENT_PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, COMPLETED, REJECTED, EXPIRED, CANCELLED, NO_SHOW, NO_RESPONSE, ARCHIVED) |
| **Permissions** | 11 |
| **Events** | 22 |

#### 7.6.5 Visitor Capability

| Aspect | Detail |
|--------|--------|
| **ID** | `visitor` |
| **Aggregate Root** | No |
| **Owner** | Business |
| **Dependencies** | — |
| **Files** | 14 |
| **Statuses** | ANONYMOUS, REGISTERED, VERIFIED, ACTIVE, VIP, INACTIVE, ARCHIVED, DELETED |
| **Permissions** | 10 |
| **Events** | 20 |

#### 7.6.6 Payment Capability

| Aspect | Detail |
|--------|--------|
| **ID** | `payment` |
| **Aggregate Root** | No |
| **Owner** | Business |
| **Dependencies** | — |
| **Files** | 14 |
| **Statuses** | DRAFT, PENDING, PROCESSING, AUTHORIZED, PARTIALLY_PAID, PAID, FAILED, CANCELLED, EXPIRED, PARTIALLY_REFUNDED, REFUNDED, DISPUTED, CHARGEBACK, ARCHIVED |
| **Permissions** | 9 |
| **Events** | 15 |

#### 7.6.7 Notification Capability

| Aspect | Detail |
|--------|--------|
| **ID** | `notification` |
| **Aggregate Root** | No |
| **Owner** | Business |
| **Dependencies** | — |
| **Files** | 14 |
| **Statuses** | DRAFT, PENDING, SCHEDULED, PROCESSING, SENT, DELIVERED, FAILED, CANCELLED, ARCHIVED, DELETED |
| **Permissions** | 10 |
| **Events** | 14 |
| **Note** | Domain-only (no providers, HTTP, queues, workers) |

---

## 8. Repository Layer

### 8.1 Repository Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      REPOSITORY LAYER                            │
│                                                                 │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │ Repository  │    │ Repository  │    │ Repository  │        │
│   │   Engine    │───▶│  Factory    │───▶│  Registry   │        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
│          │                                        │              │
│          ▼                                        ▼              │
│   ┌─────────────┐                         ┌─────────────┐        │
│   │   Unit of   │                         │   Context   │        │
│   │    Work     │                         │             │        │
│   └─────────────┘                         └─────────────┘        │
│          │                                        │              │
│          └────────────────┬─────────────────────┘              │
│                           ▼                                      │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                   Repository Adapters                    │   │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │   │
│   │  │   ORM    │  │  Query   │  │Repository│  │  Mock  │  │   │
│   │  │ Adapter  │  │ Adapter  │  │ Adapter  │  │Adapter │  │   │
│   │  └──────────┘  └──────────┘  └──────────┘  └────────┘  │   │
│   └─────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           ▼                                      │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              Repository Mixins                           │   │
│   │  Tenant │ SoftDelete │ Pagination │ Search │ Audit     │   │
│   │  Timestamps │ Filtering │ Sorting │ OptimisticLock     │   │
│   └─────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           ▼                                      │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    Domain Repositories                    │   │
│   │  Business │ Accommodation │ Availability │ Reservation   │   │
│   │  Visitor  │    Payment    │ Notification │ Destination   │   │
│   │  Identity │    Tenant     │   Analytics  │    Media      │   │
│   │   Badge   │   Campaign    │  Community   │    Audit      │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Repository Contracts

| Contract | Purpose |
|----------|---------|
| `BaseRepository` | Common CRUD operations |
| `ReadRepository` | Query operations |
| `WriteRepository` | Create/Update/Delete operations |
| `AggregateRepository` | Aggregate root operations |

### 8.3 Repository Mixins

| Mixin | Purpose |
|-------|---------|
| `TenantMixin` | Multi-tenant isolation |
| `DestinationMixin` | Destination scoping |
| `SoftDeleteMixin` | Soft delete support |
| `PaginationMixin` | Pagination support |
| `SearchMixin` | Search indexing |
| `AuditMixin` | Audit trail |
| `OptimisticLockMixin` | Optimistic locking |
| `FilteringMixin` | Advanced filtering |
| `SortingMixin` | Sorting support |
| `TimestampsMixin` | Automatic timestamps |

### 8.4 Domain Repositories

| Repository | Path | Type |
|------------|------|------|
| BusinessRepository | `persistence/repositories/business.repository.js` | Aggregate |
| AccommodationRepository | `persistence/repositories/accommodation.repository.js` | Base |
| AvailabilityRepository | `persistence/repositories/availability.repository.js` | Base |
| ReservationRepository | `persistence/repositories/reservation.repository.js` | Base |
| VisitorRepository | `persistence/repositories/visitor.repository.js` | Base |
| PaymentRepository | `persistence/repositories/payment.repository.js` | Base |
| NotificationRepository | `persistence/repositories/notification.repository.js` | Base |
| DestinationRepository | `persistence/repositories/destination.repository.js` | Base |
| IdentityRepository | `persistence/repositories/identity.repository.js` | Base |
| TenantRepository | `persistence/repositories/tenant.repository.js` | Base |
| OpportunityRepository | `persistence/repositories/opportunity.repository.js` | Base |
| OwnerRepository | `persistence/repositories/owner.repository.js` | Base |
| BookingRepository | `persistence/repositories/booking.repository.js` | Base |
| AnalyticsRepository | `persistence/repositories/analytics.repository.js` | Base |
| AuditRepository | `persistence/repositories/audit.repository.js` | Base |
| MediaRepository | `persistence/repositories/media.repository.js` | Base |
| CommunityRepository | `persistence/repositories/community.repository.js` | Base |
| CampaignRepository | `persistence/repositories/campaign.repository.js` | Base |
| BadgeRepository | `persistence/repositories/badge.repository.js` | Base |
| ChallengeRepository | `persistence/repositories/challenge.repository.js` | Base |
| PartnerRepository | `persistence/repositories/partner.repository.js` | Base |
| SubscriptionRepository | `persistence/repositories/subscription.repository.js` | Base |
| MemoryRepository | `persistence/repositories/memory.repository.js` | Base |
| ObservationRepository | `persistence/repositories/observation.repository.js` | Base |
| HabitatRepository | `persistence/repositories/habitat.repository.js` | Base |
| RouteRepository | `persistence/repositories/route.repository.js` | Base |
| SpeciesRepository | `persistence/repositories/species.repository.js` | Base |
| StoryRepository | `persistence/repositories/story.repository.js` | Base |
| GovernanceRepository | `persistence/repositories/governance.repository.js` | Base |
| OperationsRepository | `persistence/repositories/operations.repository.js` | Base |

**Total: 30 Domain Repositories**

---

## 9. Infrastructure Layer

### 9.1 Infrastructure Components

| Component | Type | Purpose | Status |
|-----------|------|---------|--------|
| PostgreSQL | Database | Primary data store | IMPLEMENTED |
| Drizzle ORM | ORM | Query builder, migrations | IMPLEMENTED |
| JWT Provider | Auth | Token generation, validation | IMPLEMENTED |
| WordPress | CMS | Content management | IMPLEMENTED |
| Search Provider | Search | Full-text search | IMPLEMENTED |
| Notification Providers | Notification | Email, Push, WhatsApp | IMPLEMENTED |
| Cache Provider | Cache | Caching layer | IMPLEMENTED |
| Queue Provider | Queue | Async job processing | IMPLEMENTED |
| Storage Provider | Storage | File storage | IMPLEMENTED |
| Payment Providers | Payment | Stripe, MercadoPago, Transbank | FUTURE |
| SendGrid/Twilio/Firebase | Notification | Email/SMS/Push delivery | FUTURE |

### 9.2 Provider Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROVIDER LAYER (External)                     │
│                                                                 │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│   │  PostgreSQL  │  │    WordPress  │  │    Cache     │        │
│   │   Provider   │  │   Provider    │  │   Provider   │        │
│   └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│   │    Queue     │  │    Search    │  │   Storage    │        │
│   │   Provider   │  │   Provider   │  │   Provider   │        │
│   └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│   │   JWT Auth   │  │    Email     │  │   Push SMS   │        │
│   │   Provider   │  │   (Future)   │  │   (Future)   │        │
│   └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
│   FUTURE: Stripe, MercadoPago, Transbank, SendGrid, Twilio     │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ (Implements)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    RUNTIME CONTRACTS                            │
│                                                                 │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│   │Database      │  │  CMS Runtime  │  │  Payment     │        │
│   │  Runtime     │  │   Contract    │  │  Runtime     │        │
│   └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│   │ Notification │  │    Auth      │  │   Search     │        │
│   │  Runtime     │  │  Runtime     │  │  Runtime     │        │
│   └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ (Used by)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      REPOSITORY LAYER                            │
│   Repository Engine → Repository Adapters → Provider Adapters    │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3 Provider Independence Rule

**CRITICAL**: Commercial capabilities MUST NOT import directly from providers.

| Allowed | Forbidden |
|---------|-----------|
| `context.repositories.business` | `import { Stripe } from 'stripe'` |
| `context.capabilities.get('payment')` | `import { PostgresClient } from './postgres'` |
| `context.eventBus` | `import { SendGrid } from '@sendgrid'` |

---

## 10. Dependency Rules

### 10.1 Allowed Dependency Directions

```
Presentation Layer
       ↓ (HTTP/REST)
API Layer
       ↓ (Internal calls)
Runtime Layer ←→ Infrastructure Layer
       ↓
Capabilities Layer
       ↓ (Repository access)
Repository Layer
       ↓ (Provider adapters)
Infrastructure Layer
```

### 10.2 Commercial Aggregate Dependencies

```
Business (Aggregate Root)
├──→ Accommodation (owns)
├──→ Availability (owns via Accommodation)
├──→ Reservation (owns)
├──→→ Visitor (owns)
├──→ Payment (owns)
├──→ Notification (owns)
│
├──← Runtime (uses)
├──← Repository (uses)
└──← Event Bus (uses)

Domain Capabilities (Accommodation, Reservation, etc.)
├──← Business (orchestrates via manager)
├──← Runtime (uses)
├──← Repository (uses)
└──← Event Bus (uses)
```

### 10.3 Forbidden Dependencies

| From | To | Reason |
|------|-----|--------|
| Commercial Capability | Infrastructure Provider | Violates isolation |
| Domain Capability | Business Manager | Violates boundaries |
| Capability | Another Capability (direct) | Must use Event Bus |
| Capability | SQL/ORM | Must use Repository |
| Capability | HTTP Client | Must use Runtime |

### 10.4 Dependency Rules Summary

| Rule | Description |
|------|-------------|
| **R1** | Commercial capabilities must not import from `capabilities/business/*` |
| **R2** | Capabilities must not import from infrastructure providers directly |
| **R3** | All persistence must go through `context.repositories.*` |
| **R4** | Cross-capability communication via Event Bus only |
| **R5** | Business managers delegate, never contain business logic |
| **R6** | Aggregate root is the only entry point for aggregate operations |

---

## 11. Event Architecture

### 11.1 Event Bus

The Event Bus is the **sole mechanism** for cross-capability communication.

```
┌─────────────────────────────────────────────────────────────────┐
│                        EVENT BUS                                 │
│                                                                 │
│   Publishers                          Subscribers               │
│   ──────────                          ──────────                │
│   BusinessCapability ────────────────▶ BusinessManager           │
│   ReservationCapability ────────────▶ NotificationCapability    │
│   PaymentCapability ────────────────▶ BusinessManager           │
│   VisitorCapability ────────────────▶ ReservationCapability      │
│   NotificationCapability ───────────▶ (External consumers)       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 11.2 Event Namespace Convention

| Domain | Prefix | Example |
|--------|--------|---------|
| Business | `business:` | `business:created` |
| Business + Accommodation | `business.accommodation:` | `business.accommodation:created` |
| Accommodation | `accommodation:` | `accommodation:created` |
| Reservation | `reservation:` | `reservation:confirmed` |
| Visitor | `visitor:` | `visitor:created` |
| Payment | `payment:` | `payment:captured` |
| Notification | `notification:` | `notification:sent` |

### 11.3 Business Aggregate Events

| Event | Publisher | Subscribers |
|-------|----------|-------------|
| `business:created` | BusinessCapability | Accommodation, Reservation, Payment, Notification |
| `business:updated` | BusinessCapability | — |
| `business.accommodation:created` | BusinessAccommodationManager | Search, Analytics |
| `business.reservation:created` | BusinessReservationManager | Notification, Payment |
| `business.reservation:confirmed` | BusinessReservationManager | Notification, Visitor |
| `business.payment:created` | BusinessPaymentManager | Notification |
| `business.notification:created` | BusinessNotificationManager | — |

### 11.4 Cross-Capability Event Flow

```
User creates Reservation
        ↓
ReservationCapability.emit('reservation:created')
        ↓
Event Bus distributes to subscribers:
  - BusinessManager (logs)
  - NotificationCapability (sends confirmation)
  - PaymentCapability (initiates payment if required)
  - AvailabilityCapability (updates calendar)
```

### 11.5 Event Design Rules

| Rule | Description |
|------|-------------|
| **E1** | Events must be past tense (`created`, `confirmed`) |
| **E2** | Events must include entity ID in payload |
| **E3** | Events must include timestamp |
| **E4** | Events must be immutable |
| **E5** | Business events must be namespaced with `business.` prefix |
| **E6** | No direct capability-to-capability calls |

---

## 12. Runtime Startup

### 12.1 Startup Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION START                           │
│                                                                 │
│  1. Load environment configuration                               │
│  2. Initialize logging system                                   │
│  3. Register error handlers                                     │
│                                                                 │
│                           ▼                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  BOOTSTRAP PIPELINE                      │   │
│  │                                                          │   │
│  │  1. Load bootstrap configuration                        │   │
│  │  2. Initialize bootstrap events                         │   │
│  │  3. Execute pre-bootstrap hooks                        │   │
│  │  4. Validate configuration                               │   │
│  │  5. Initialize bootstrap errors handler                 │   │
│  │  6. Execute post-bootstrap hooks                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                           ▼                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    RUNTIME ENGINE                         │   │
│  │                                                          │   │
│  │  1. Initialize RuntimeContext                            │   │
│  │  2. Load RuntimeRegistry                                 │   │
│  │  3. Initialize RuntimeContracts                           │   │
│  │  4. Setup RuntimeLifecycle                                │   │
│  │  5. Initialize RuntimeHealth                              │   │
│  │  6. Setup RuntimeErrors                                   │   │
│  │  7. Initialize RuntimeEvents                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                           ▼                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  REPOSITORY ENGINE                       │   │
│  │                                                          │   │
│  │  1. Initialize RepositoryEngine                          │   │
│  │  2. Load RepositoryFactory                                │   │
│  │  3. Register RepositoryAdapters                           │   │
│  │  4. Initialize RepositoryMixins                           │   │
│  │  5. Connect to PostgreSQL                                 │   │
│  │  6. Initialize Drizzle                                    │   │
│  │  7. Register Domain Repositories                           │   │
│  │  8. Initialize TransactionManager                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                           ▼                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                CAPABILITY BOOTSTRAP                       │   │
│  │                                                          │   │
│  │  1. Load CapabilityRegistry                              │   │
│  │  2. Initialize CapabilityLoader                           │   │
│  │  3. Bootstrap Capabilities (priority order):              │   │
│  │     a. Core capabilities (persistence, core)             │   │
│  │     b. Platform capabilities (auth, cms)                 │   │
│  │     c. Commercial capabilities (business last)           │   │
│  │  4. Initialize Business Managers                          │   │
│  │  5. Wire up Event Bus subscriptions                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                           ▼                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  AUTH ENGINE                             │   │
│  │                                                          │   │
│  │  1. Initialize JWT Provider                              │   │
│  │  2. Load Authorization Engine                             │   │
│  │  3. Initialize Session Engine                             │   │
│  │  4. Setup Permission Registry                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                           ▼                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  CMS ENGINE                              │   │
│  │                                                          │   │
│  │  1. Initialize WordPress Provider                        │   │
│  │  2. Load CMS Runtime Integration                          │   │
│  │  3. Initialize Sync Engine                               │   │
│  │  4. Setup Content Mapping                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                           ▼                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  SCHEDULER ENGINE                        │   │
│  │                                                          │   │
│  │  1. Initialize Scheduler Capability                       │   │
│  │  2. Load Job Definitions                                 │   │
│  │  3. Setup Executor with Circuit Breaker                   │   │
│  │  4. Initialize Lock Manager                              │   │
│  │  5. Setup Retry Policy                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                           ▼                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  HEALTH CHECKS                           │   │
│  │                                                          │   │
│  │  1. Database connectivity                                 │   │
│  │  2. Repository engine ready                              │   │
│  │  3. All capabilities initialized                         │   │
│  │  4. Event bus operational                                │   │
│  │  5. Auth engine ready                                    │   │
│  │  6. External providers connected                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                           ▼                                     │
│                                                                 │
│                      APPLICATION READY                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 12.2 Shutdown Sequence

```
1. Stop accepting new requests
2. Wait for in-flight operations
3. Emit shutdown events
4. Persist pending state
5. Close database connections
6. Release resources
7. Exit
```

---

## 13. Repository Flow

### 13.1 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     REPOSITORY FLOW                             │
│                                                                 │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                │
│  │ Business │     │ Business │     │ Business │                │
│  │ Service  │────▶│ Manager  │────▶│   API    │                │
│  └──────────┘     └──────────┘     └──────────┘                │
│                           │                                     │
│                           ▼                                     │
│                    ┌──────────────┐                            │
│                    │   Business   │                            │
│                    │ Capability   │                            │
│                    └──────────────┘                            │
│                           │                                     │
│                           ▼                                     │
│                    ┌──────────────┐                            │
│                    │   Runtime    │                            │
│                    │   Context    │                            │
│                    └──────────────┘                            │
│                           │                                     │
│                           ▼                                     │
│              ┌────────────────────────┐                        │
│              │ context.repositories.* │                        │
│              └────────────────────────┘                        │
│                           │                                     │
│                           ▼                                     │
│              ┌────────────────────────┐                        │
│              │  Repository Engine     │                        │
│              │  (RepositoryEngine.js) │                        │
│              └────────────────────────┘                        │
│                           │                                     │
│                           ▼                                     │
│              ┌────────────────────────┐                        │
│              │   Repository Factory   │                        │
│              │ (RepositoryFactory.js) │                        │
│              └────────────────────────┘                        │
│                           │                                     │
│              ┌────────────┴────────────┐                       │
│              ▼                         ▼                       │
│    ┌──────────────────┐      ┌──────────────────┐             │
│    │ Repository       │      │ Repository       │             │
│    │ Adapter (ORM)    │      │ Adapter (Query)  │             │
│    └──────────────────┘      └──────────────────┘             │
│              │                         │                       │
│              └────────────┬────────────┘                       │
│                           ▼                                     │
│              ┌────────────────────────┐                        │
│              │   Drizzle ORM Client   │                        │
│              └────────────────────────┘                        │
│                           │                                     │
│                           ▼                                     │
│              ┌────────────────────────┐                        │
│              │    PostgreSQL Pool     │                        │
│              └────────────────────────┘                        │
│                           │                                     │
│                           ▼                                     │
│              ┌────────────────────────┐                        │
│              │     PostgreSQL        │                        │
│              │     Database          │                        │
│              └────────────────────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 13.2 Repository Method Flow

```javascript
// Example: Create Business
async createBusiness(data) {
  // 1. BusinessService calls repository
  return this.repository.create(data);
  
  // 2. Repository Engine intercepts
  //    - Applies TenantMixin (sets tenant_id)
  //    - Applies TimestampsMixin (sets created_at)
  //    - Applies SoftDeleteMixin (sets deleted_at = null)
  
  // 3. Repository Adapter translates to ORM
  //    - DrizzleRepositoryAdapter
  
  // 4. ORM generates SQL
  //    INSERT INTO businesses (...) VALUES (...)
  
  // 5. PostgreSQL executes
  //    Returns inserted row
  
  // 6. Response flows back through adapters
  //    Returns Business entity
}
```

---

## 14. Capability Communication

### 14.1 Communication Patterns

| Pattern | Mechanism | Use Case |
|---------|-----------|----------|
| **Delegation** | `context.capabilities.get()` | Business Manager → Domain Capability |
| **Event Publishing** | `context.eventBus.emit()` | Domain Capability → Others |
| **Event Subscription** | `context.eventBus.subscribe()` | React to domain events |
| **Repository Access** | `context.repositories.*` | Data persistence |
| **Runtime Access** | `context.runtime.*` | Platform services |

### 14.2 Business Manager Delegation Pattern

```javascript
class BusinessReservationManager {
  async createReservation(businessId, data) {
    // Delegate to domain capability
    const reservation = await this.#delegateManager('create', {
      businessId,
      ...data
    });
    
    // Emit business-scoped event
    await this.#emitBusinessEvent('reservation:created', {
      businessId,
      reservationId: reservation.id
    });
    
    return reservation;
  }
}
```

### 14.3 Cross-Capability Event Flow

```
Reservation:confirmed event
        │
        ├──▶ NotificationCapability
        │         │
        │         └── Creates notification record
        │              │
        │              └── Emits notification:pending
        │
        ├──▶ VisitorCapability
        │         │
        │         └── Updates visitor statistics
        │
        ├──▶ BusinessManager
        │         │
        │         └── Logs activity
        │
        └──▶ (External Systems via Webhook/Queue)
```

---

## 15. Provider Isolation

### 15.1 Provider Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROVIDER ISOLATION                           │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │            COMMERCIAL CAPABILITIES                       │   │
│   │                                                          │   │
│   │   Payment ──────── NO DIRECT CONTACT ───────► Stripe    │   │
│   │      │                                    │             │   │
│   │      │                                    │             │   │
│   │      │         context.capabilities       │             │   │
│   │      │              .get('payment')       │             │   │
│   │      ▼                                    ▼             │   │
│   │   Payment                           Payment            │   │
│   │   Capability                      Runtime             │   │
│   │                                   Contract            │   │
│   │                                      │                │   │
│   │                                      ▼                │   │
│   │                              ┌──────────────┐          │   │
│   │                              │   Payment    │          │   │
│   │                              │   Provider   │          │   │
│   │                              │  (Stripe)    │          │   │
│   │                              └──────────────┘          │   │
│   │                                                          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   NEVER: Capability imports from Provider directly              │
│   ALWAYS: Capability uses Runtime Contract → Provider            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 15.2 Provider Integration Matrix

| Domain | Capability | Runtime Contract | Providers |
|--------|------------|------------------|-----------|
| Database | Persistence | DatabaseRuntime | PostgreSQL + Drizzle |
| Auth | Auth | AuthRuntime | JWT, OAuth |
| CMS | CMS | CMSRuntime | WordPress |
| Payment | Payment | PaymentRuntime | Stripe, MercadoPago, Transbank |
| Notification | Notification | NotificationRuntime | SendGrid, Twilio, Firebase |
| Search | — | SearchRuntime | Elasticsearch (future) |
| Maps | — | MapsRuntime | Google Maps (future) |

### 15.3 Runtime Contract Example

```javascript
// Payment Runtime Contract
interface PaymentRuntime {
  createPaymentIntent(amount: number, currency: string): Promise<PaymentIntent>;
  confirmPayment(paymentIntentId: string): Promise<PaymentResult>;
  refundPayment(paymentId: string, amount?: number): Promise<RefundResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
}

// Payment Capability uses runtime
class PaymentCapability extends BaseCapability {
  async initiatePayment(amount, currency) {
    // No direct Stripe import
    const paymentIntent = await this.context.runtime.payment.createPaymentIntent(
      amount,
      currency
    );
    return paymentIntent;
  }
}
```

---

## 16. Design Freeze Status

### 16.1 P13.8 Design Freeze Approval

| Criterion | Status |
|-----------|--------|
| Aggregate Ownership | ✅ FROZEN |
| Business Orchestration | ✅ FROZEN |
| Domain Isolation | ✅ FROZEN |
| Repository Pattern | ✅ FROZEN |
| Event Architecture | ✅ FROZEN |
| Provider Isolation | ✅ FROZEN |

### 16.2 Frozen Components

| Component | Status | Notes |
|-----------|--------|-------|
| Commercial Aggregate Structure | FROZEN | No changes to ownership |
| Business Managers | FROZEN | Delegation pattern fixed |
| Domain Capabilities | FROZEN | Interfaces frozen |
| Repository Contracts | FROZEN | Schema frozen |
| Event Namespaces | FROZEN | No namespace changes |
| Cascade Rules | FROZEN | Archive on delete for financial/notification |

### 16.3 Permitted Changes

| Category | Permitted |
|----------|-----------|
| API Layer | Full development |
| Provider Implementations | Full development |
| Presentation Layer | Full development |
| Infrastructure | Full development |
| Internal Capability Implementation | Bug fixes only |
| Performance Optimization | Non-breaking only |

### 16.4 Forbidden Changes

| Category | Forbidden |
|----------|-----------|
| Aggregate Ownership | No new ownership |
| Business Logic in Managers | No duplication |
| Cross-Capability Imports | No direct imports |
| Infrastructure in Capabilities | No provider imports |
| Repository Direct Access | No SQL in capabilities |

---

## 17. Future Expansion

### 17.1 Upcoming Capabilities

| Capability | Purpose | Status |
|------------|---------|--------|
| Marketplace | Multi-vendor marketplace | Planned |
| Tours | Tour booking | Planned |
| Transport | Transportation booking | Planned |
| Insurance | Travel insurance | Planned |
| Analytics | Advanced analytics | Planned |

### 17.2 Expansion Points

| Area | Extension Point |
|------|-----------------|
| Capabilities | Add new domain capabilities |
| Managers | Add new Business sub-managers |
| Providers | Add new provider implementations |
| API | Extend REST API endpoints |
| Events | Add new event types |

### 17.3 New Aggregate Addition

To add a new aggregate (e.g., `Marketplace`):

1. Create `MarketplaceCapability` in `capabilities/marketplace/`
2. Register in `capabilities/core/register.js`
3. Add `MarketplaceRepository` in `capabilities/persistence/repositories/`
4. Add `BusinessMarketplaceManager` in `capabilities/business/manager/`
5. **DO NOT** modify existing aggregate ownership
6. **DO NOT** create circular dependencies

### 17.4 Growth Architecture

```
Current (P13.8)              Future
─────────────                ─────
Business Aggregate      →    Business Aggregate
                            + Marketplace Aggregate (new)
                            + Tours Aggregate (new)
                            + Transport Aggregate (new)

Runtime Providers        →    Runtime Providers + More providers
API Layer (future)       →    Full REST API + GraphQL
Presentation (future)    →    Flutter + Web + WordPress + Admin
```

---

## Appendix A: File Structure

```
C:\Users\casa\Documents\desarrollo dronesss\
├── capabilities/
│   ├── accommodation/
│   ├── admin/
│   ├── availability/
│   ├── billing/
│   ├── booking/
│   ├── business/
│   │   ├── manager/
│   │   │   ├── business-accommodation.manager.js
│   │   │   ├── business-availability.manager.js
│   │   │   ├── business-brand.manager.js
│   │   │   ├── business-cms.manager.js
│   │   │   ├── business-notification.manager.js
│   │   │   ├── business-owner.manager.js
│   │   │   ├── business-payment.manager.js
│   │   │   ├── business-reservation.manager.js
│   │   │   ├── business-search.manager.js
│   │   │   ├── business-statistics.manager.js
│   │   │   └── business-visitor.manager.js
│   │   ├── business.capability.js
│   │   ├── business.manager.js
│   │   ├── business.service.js
│   │   └── ...
│   ├── catalog/           (placeholder)
│   ├── cms/
│   ├── communication/
│   ├── community/
│   ├── conversion/
│   ├── core/
│   ├── destination/
│   ├── ecology/           (events only)
│   ├── economy/           (events only)
│   ├── engagement/
│   ├── exploration/
│   ├── gallery/           (placeholder)
│   ├── governance/
│   ├── identity/
│   ├── intelligence/
│   ├── lifecycle/
│   ├── locality/          (events only)
│   ├── notification/
│   ├── notifications/
│   ├── observability/
│   ├── onboarding/
│   ├── operations/
│   ├── opportunity/
│   ├── owner/
│   ├── payment/
│   ├── payments/          (placeholder)
│   ├── persistence/
│   ├── public/
│   ├── pwa/
│   ├── pwa-engine/
│   ├── reservation/
│   ├── saas/
│   ├── scheduler/
│   ├── seo-intelligence/
│   └── tenant/
├── runtime/
│   ├── auth/
│   ├── bootstrap/
│   ├── cms/
│   ├── contracts/
│   ├── security/
│   └── startup/
├── docs/
│   ├── ai/
│   ├── api/
│   ├── architecture/
│   │   ├── MASTER_ARCHITECTURE.md
│   │   ├── MASTER_ARCHITECTURE.puml
│   │   ├── MASTER_ARCHITECTURE.mmd
│   │   ├── DESIGN_FREEZE.md
│   │   └── ...
│   ├── knowledge/
│   ├── roadmap/
│   ├── security/
│   └── vision/
├── shared/
│   ├── constants/
│   ├── events/
│   └── schema/
├── engine/
├── tests/
├── workflows/
└── ...
```

---

## Appendix B: Color Scheme (for Diagrams)

| Layer | Color | Hex |
|-------|-------|-----|
| Presentation | Blue | `#4A90D9` |
| API | Green | `#52c41a` |
| Runtime | Orange | `#fa8c16` |
| Capabilities (Commercial) | Red | `#f5222d` |
| Capabilities (Platform) | Purple | `#722ed1` |
| Capabilities (Ecosystem) | Cyan | `#13c2c2` |
| Repository | Yellow | `#fadb14` |
| Infrastructure | Gray | `#8c8c8c` |

---

## Appendix C: Acronyms

| Acronym | Full Form |
|---------|-----------|
| API | Application Programming Interface |
| Auth | Authentication |
| AuthZ | Authorization |
| BLoC | Business Logic Component |
| CMS | Content Management System |
| CRUD | Create, Read, Update, Delete |
| DTO | Data Transfer Object |
| ORM | Object-Relational Mapping |
| RBAC | Role-Based Access Control |
| REST | Representational State Transfer |
| SaaS | Software as a Service |

---

> **Document Version:** 1.0.0
> **Last Updated:** 2026-08-01
> **Design Freeze:** P13.8 — `release/design-freeze-p13.8`
