# CHANGELOG.md

> Chronological history of all completed phases.

---

## v4.3 — OWNER-SESSION-1 Complete (2026-08-22)

### Platform Release 4.3 — PERSISTENT OWNER IDENTITY

**Status:** OWNER-SESSION-1 COMPLETE

- **Next:** OWNER-SESSION-2 — Persistent Sessions

#### Key Deliverables

- PostgreSQL Owner Identity: owner identity, password hash (scrypt), application grants
- Migration 0006: `public.users` + `owner_application_grants` schema
- Staging Provisioning CLI: migrate, bootstrap, update lifecycle
- Auth Cutover: `authenticateOwner` resolves against PostgreSQL
- Runtime Auth Cutover: removed `#bootstrapStagingOwner`, `registerOwner`, `getOwnerCount` from web.server.js
- HTTP Boundary Hardening: 503 INFRASTRUCTURE_UNAVAILABLE, 409 AMBIGUOUS_APPLICATION, 403 NO_ACTIVE_GRANT
- Sessions remain in-memory (OWNER-SESSION-2 boundary)

#### Physical Staging Certification

- PostgreSQL/Neon Owner login works
- valdi.app/albasie grant works
- Mi Negocio and Contenido preserved
- Legacy startup provisioning removed
- STAGING_OWNER_* removed from runtime
- HTTP status boundary deployed and verified

#### Files Created

- `web/owner/repositories/owner-identity.repository.js` — PostgreSQL repository
- `web/owner/services/owner-identity.service.js` — Identity service
- `web/owner/services/owner-authorization.service.js` — Grant authorization service
- `web/owner/password/owner-password.module.js` — scrypt module
- `web/owner/bootstrap/owner-staging-migrate.js` — Migration CLI
- `web/owner/bootstrap/owner-staging-bootstrap.js` — Bootstrap CLI
- `web/owner/bootstrap/owner-staging-update.js` — Update CLI
- `database/migrations/0006_owner_identity_grants/index.js` — Schema migration
- `docs/owner/OWNER_SESSION_1_FINAL_REPORT.md` — Certification report

#### Files Modified

- `web/owner/owner.api.js` — await authenticateOwner, HTTP status mapping
- `web/owner/owner.auth.js` — PostgreSQL authentication, scrypt password verification
- `web/owner/owner.middleware.js` — INFRASTRUCTURE_UNAVAILABLE → 503
- `web/web.server.js` — removed bootstrapStagingOwner, registerOwner, getOwnerCount
- `database/config/database.config.js` — TURISTIC_ENV=staging support
- `database/connection/postgres.connection.js` — pg.Pool options normalization

#### Test Results

- OWNER-SESSION-1 test suite: 73/73 PASS
- owner-stage-1-1-wiring: 12/12 PASS
- owner-stage-2-e2e: 20/20 PASS

---

## v4.2 — Product Runtime (2026-08-07)

### Platform Release 4.2 — STORAGE INTEGRATION COMPLETE

**Status:** STORAGE INFRASTRUCTURE COMPLETE

- **Platform Core Freeze:** ACTIVE (P13.8)
- **Platform Vision Freeze:** ACTIVE (P15.0)
- **Architecture:** CLOSED
- **Design Freezes:** 2 ACTIVE
- **Guardian Score:** 100/100
- **Next Phase:** P12.3.2.3 — Media Processing Provider

#### Version History

```
v4.0-platform (2026-08-02) — Platform Certified
        ↓
v4.1-platform-vision (2026-08-06) — Architecture Frozen
        ↓
v4.1.1-database-foundation (2026-08-06) — Database Ready
        ↓
v4.2-product-runtime (2026-08-07) — Storage Integration Complete ← CURRENT
        ↓
v4.2.x-media-processing (PENDING) — Media Processing Provider
```

#### Key Deliverables

- Storage Providers: Local, S3, R2 implementations
- Storage Integration: Complete pipeline wiring
- Integration Tests: 47 tests, 100% pass rate
- StorageGuardian: 20 validation checks
- Documentation: 6 new storage documents
- Provider Switching: Runtime switching without code changes

#### P12.3.2.2 — Storage Integration & Testing

- Created `storage/integration/index.js` — Integration layer
- Created `storage/tests/integration.test.js` — 47 integration tests
- Expanded StorageGuardian with 20 validation checks
- Created 6 documentation files
- Validated complete storage pipeline
- Guardian Score: 100/100

---

## v4.1.1 — Database Foundation (2026-08-06)

#### Key Deliverables

- Database Schema: 33 Drizzle ORM entities across 5 layers
- Migrations: 5 migration files covering all schema layers
- PostgreSQL Connection: Full connection pool and health checking
- Seed Data: Platform identity with 5 destinations, 17 categories, 18 modules
- Documentation: 10 new database documentation files

#### P12.3.1.2 — Database Schema Design

- Created 33 Drizzle ORM schemas in `database/schema/`
- 5 schema layers: platform (7), ecosystem (4), company (4), identity (5), business (12)
- Documents: `VALDI_DATABASE_ERD.md`, `DATABASE_IMPLEMENTATION_RULES.md`, `DATABASE_SCHEMA_REFERENCE.md`

#### P12.3.1.3 — Migration Implementation

- Created 5 migration files (0001-0005) in `database/migrations/`
- drizzle.config.js with PostgreSQL dialect, env mapping, pool settings
- MIGRATION_REGISTRY in `database/index.js`
- Documents: `MIGRATION_IMPLEMENTATION_REPORT.md`, `MIGRATION_STRATEGY.md`

#### P12.3.1.4 — PostgreSQL Connection & Environment Configuration

- `database/config/database.config.js` — PostgreSQL settings, pool config
- `database/config/environment.loader.js` — Loads .env files by NODE_ENV
- `database/connection/postgres.connection.js` — Pool, query, transaction, health
- `database/connection/connection.pool.js` — PoolState, initialize/shutdown
- `database/connection/connection.health.js` — checkConnection, ping, checkTables
- `database/client.js` — Drizzle client with schema exports
- `database/bootstrap/database.bootstrap.js` — Full bootstrap flow
- `runtime/startup/database.bootstrap.js` — Runtime integration
- `guardian/database.guardian.js` — Database architecture validation
- Environment templates: `.env.example`, `.env.*.example`
- Documents: `DATABASE_CONNECTION_ARCHITECTURE.md`, `P12.3.1.4_CONNECTION_REPORT.md`

#### P12.3.1.5 — Initial Platform Seed Data

- `database/seeds/` — Complete seed data structure
- Platform seeds: tenants, countries, regions, languages, themes
- Ecosystem seeds: destinations, ecosystems, categories, modules, experiences
- Company seeds: companies, company settings
- Seed registry with dependency ordering
- Seed runner with idempotency checks
- Documents: `SEED_IMPLEMENTATION_REPORT.md`, `INITIAL_PLATFORM_STATE.md`

#### Seed Data Summary

- 3 tenants (Valdi Platform, Valdivia Ecosystem, Patagonia Ecosystem)
- 1 country (Chile) with architecture for future countries
- 4 regions (Los Ríos, Magallanes, Los Lagos, Aysén)
- 5 destinations (Valdivia, Natales, Punta Arenas, Chiloé, Coyhaique)
- 17 categories, 18 modules, 4 experiences
- 6 sample companies (architecture examples only)

---

## v4.1 — Platform Vision Frozen (2026-08-06)

### Platform Release 4.1 — PLATFORM VISION FROZEN

**Status:** PRODUCT DEVELOPMENT ACTIVE

- **Platform Core Freeze:** ACTIVE (P13.8)
- **Platform Vision Freeze:** ACTIVE (P15.0)
- **Architecture:** CLOSED
- **Design Freezes:** 2 ACTIVE
- **Next Phase:** P12.3.1 — Database Connection & Migration

#### Key Deliverables

- Platform Manifest: `docs/architecture/PLATFORM_MANIFEST.md`
- Platform Vision: `docs/architecture/VALDI_PLATFORM_VISION.md`
- Multi-Ecosystem Architecture: `docs/architecture/MULTI-ECOSYSTEM-ARCHITECTURE.md`
- Platform Freezes: `docs/architecture/PLATFORM_FREEZES.md`
- Vision Freeze Certification: `docs/architecture/PLATFORM_VISION_FREEZE.md`

#### P15.0 — Platform Vision Freeze

- **VERDICT:** PLATFORM VISION FROZEN
- **Documents Certified:** 8 architecture documents verified for consistency
- **Philosophy:** Platform owns behavior, Experience Engine composes, Products own identity
- **Architecture:** Platform Core → Product Resolver → Ecosystem Loader → Experience Engine

#### P15.0 — Multi-Ecosystem Architecture

- Complete multi-ecosystem architecture designed
- Country → Region → Destination → Experience → Company hierarchy
- Product Resolver architecture (domain, subdomain, path, header, query, geo)
- Ecosystem Loader architecture (configuration loading, inheritance resolution)
- Experience Engine architecture (composition layer)

#### P15.0 — Platform Decoupling

- **Dronestica references externalized** from engine/core
- **New config structure:** `config/platform.config.js`, `config/product.config.js`
- **Technical debt reduced:** 22 → 19 active items
- **HIGH priority items resolved:** TD-030, TD-031, TD-043
- **Zero impact on certified Platform Core**

#### Configuration Changes

- `engine/core/bootstrap.js` — Now imports from `config/product.config.js`
- `engine/core/theme.js` — Uses `PLATFORM_CONFIG.theme.storageKey`
- `engine/core/loader.js` — Uses `PRODUCT_CONFIG.name`
- `engine/core/engine.js` — Hero reads from `window.DATA?.studio?.name`
- `index.html` — Dynamic bindings on logos and title

---

## v4.0 — Platform Certified (2026-08-02)

### Platform Release 4.0 — PLATFORM CERTIFIED

**Status:** READY FOR PRODUCT DEVELOPMENT

- **Architecture Score:** 98/100 (P13.8 Design Freeze)
- **API Layer:** CLOSED (P14.FINAL Audit: 97/100)
- **Design Freeze:** ACTIVE (P13.8 branch)
- **Architecture Guardian:** Operational

#### Key Deliverables

- Platform Baseline: `docs/architecture/PLATFORM_BASELINE.md`
- Platform Certificate: `docs/architecture/PLATFORM_CERTIFICATE.md`
- API Layer Closure: `docs/architecture/API_LAYER_CLOSED.md`
- Product Mode Guide: `docs/architecture/PRODUCT_MODE.md`
- Release Notes: `docs/releases/RELEASE_NOTES_v4.0.md`
- Git Commands: `docs/releases/GIT_COMMANDS.md`

#### P14.FINAL — API Layer Closure Audit

- **VERDICT:** API LAYER CLOSED
- **Score:** 97/100
- **P2 Issues:** 2 (resolved in P14.1.7)
- **P14 becomes immutable under Design Freeze**

#### P14.1.7 — API Closure Corrections

- Added `reportReview` method to BusinessService
- Added availability wrapper methods: `blockDate`, `unblockDate`, `reserveDate`, `releaseDate`
- Routes and BusinessService now expose identical signatures

#### P14.1.6 — Integration Validation Corrections

- Fixed route files to use BusinessService methods directly
- No direct capability access bypassing BusinessService

#### P14.1.5.5 — Commercial Aggregate Entry Point Validation

- Decision: OPTION A — BusinessService is the ONLY official entry point
- Controllers MUST NEVER access Capability.service directly

#### P14.1.5 — API Layer Integration Validation

- All route handlers now delegate to BusinessService
- BusinessService provides orchestration layer

---

## v1.0 — Foundation (P0-P3.1c)

### P0 — Extract Shared
- Separated reusable utilities from application logic
- Created `shared/utils/`, `shared/constants/`, `shared/events/`, `shared/schema/`
- 15 files created, 1 modified

### P1 — Core Extraction
- Moved engine orchestration to `engine/core/`
- Created bootstrap, eventbus, datamanager, router, loader, theme
- `src/*.js` converted to thin re-export layers

### P1-1 — Providers + DataManager
- Created data-agnostic layer with providers and cache
- DataManager centralizes cache, search, filter, validate, normalize
- Providers handle ONLY data source communication

### P1-2 — Tenant Manager
- Multi-tenant support with per-project configuration
- Tenant resolution via URL, subdomain, path, localStorage
- Independent branding, capabilities, and limits per tenant

### P1-3 — Capability System
- Independent capability system with dynamic loading
- CapabilityLoader loads capabilities, verifies dependencies, activates modules
- Placeholders created: catalog, gallery, booking, notifications, payments, pwa

### P2 — Experience Engine
- Migrated components to `engine/components/`
- Card, carousel, lightbox, gallery, configurator, format-explorer, expanded-view, animations

### P3 — Capability Foundation
- Professional base for multi-tenant capabilities
- BaseCapability, schema system, event system
- Booking, notifications, pwa capabilities created

### P3.1 — Capability Integration Audit
- Verified architecture, dependencies, and communication flow
- 1 critical issue found (missing createSchema)

### P3.1c — Capability Integration Corrections
- Created centralized registration (`register.js`)
- Fixed initialization order
- Normalized capability events

---

## v2.0 — Core Capabilities (P4-P11.3)

### P4 — Hybrid Architecture
- WordPress = CMS (content, SEO, URLs)
- Engine = applications (bookings, notifications, PWA, admin)
- CMS Bridge capability created

### P5 — Communication Capability
- Multi-channel messaging: WhatsApp, Chat, Email, Push
- Provider-based architecture

### P6 — Availability Engagement System
- Active availability collection system
- Natural language date parser

### P5.1 — Availability Intelligence Layer
- Analytics, demand analysis, opportunity detection, recommendations

### P5.2 — Reservation Production Layer
- Reservation orchestration with workflow, timers, recovery

### P5.2.1 — Reservation Reliability Layer
- Generic scheduler + reservation timers + automatic recovery

### P5.2.2 — Scheduler Reliability Hardening
- Production-ready: executor, locks, retry, circuit breaker, cleanup

### P5.2.3 — Observability Layer
- Metrics collection, health monitoring, alert management

### P6.1 — Business Onboarding & SaaS Registration
- Business types, plans, automatic tenant creation

### P7 — Reservation Engine (UI)
- Calendar, selector, form, view, flow

### P7.1 — Owner Portal & Business Dashboard
- Dashboard, reservations, availability, customers, metrics

### P8 — Customer Engagement & Notification Intelligence
- Triggers, campaigns (4 types), customer journey (7 stages), templates (8 defaults)

### P8.1 — Customer Conversion & Retention Intelligence
- Customer scoring, lead scoring, opportunity detection, recovery, follow-up, retention

### P9 — Public Experience & Discovery Layer
- PageRenderer, SectionRenderer (11 types), ComponentRenderer, MenuManager, RouteManager

### P9.1 — SEO Intelligence & Content Management
- ContentAnalyzer, MetadataAnalyzer, SchemaAnalyzer, KeywordAnalyzer, LinkAnalyzer

### P10 — Multi-Tenant PWA Engine
- ManifestGenerator, ServiceWorkerManager, CacheStrategy (5 strategies), InstallManager, OfflineManager

### P11 — Multi-Tenant Admin Platform
- Users, roles, tenants, plans, analytics, content management

### P11.1 — SaaS Product & Subscription Architecture
- Products, plans, subscriptions, entitlements, features, limits

### P11.2 — Billing & Payment Infrastructure
- Invoicing, payments, transactions, provider management

### P11.3 — SaaS Customer Lifecycle & Revenue Management
- Customer lifecycle (9 segments), trial, activation, churn, renewal

### P12 — Notification Engine
- Templates (8 defaults), preferences, scheduling, batching, rate limiting

### P13 — Business Services
- Reservation, payment, notification, user, analytics services

### P14 — API Layer Foundation
- API bootstrap, routing, middleware, responses, errors, health, versioning
- 56 endpoints across 7 domain routes (business, accommodation, availability, reservation, visitor, payment, review)
- 9 middleware files, 10 error classes, 7 entity serializers

### P14.0.5 — API Layer Architecture Validation
- Validated P14 API Layer against architectural rules (score: 78/100)
- Found 2 P0 critical issues (bootstrap imports non-existent modules)

### P14.0.6 — Validation Corrections
- Fixed P0-001: `registerNotificationRoutes` → `registerReviewRoutes`
- Fixed P0-002: Removed non-existent `registerOpenAPI` import
- Score improved: 78 → 100/100

### P14.0.7 — Runtime/API Smoke Test
- Executed `runtime/startup/api.smoke.test.js` against API Layer
- Node.js v24.18.1 (portable), Windows 10
- Result: 18/19 tests pass (95/100)
- API Layer boots standalone — all health endpoints respond, all 7 route groups register
- Finding: Runtime integration missing (expected for P14, required for P14.1)
- Report: `docs/architecture/API_LAYER_RUNTIME_SMOKE_TEST.md`

### P14.1 — API Layer Integration
- Integrated Platform Runtime with API Layer via `startWithApi()` in application.start.js
- Single entry point: `node runtime/startup/application.start.js`
- RuntimeContext injected into API via `global.runtimeContext`
- Fixed: BusinessController was getting Capability instead of Capability.service
- Fixed: BusinessService missing API-facing wrapper methods
- Controllers now reach BusinessService → BusinessManager → Capability → Repository
- Health endpoints operational (HTTP 200), Business endpoint returns 403 (auth required)
- Report: `docs/architecture/API_RUNTIME_INTEGRATION.md`

### P14.1.5 — API Layer Integration Validation
- Validated runtime ↔ API integration (score: 75/100)
- Found 6 route files with incorrect capability access pattern
- All non-Business controllers use `business` capability + non-existent getter methods
- Should use own capability (accommodation, visitor, etc.) + `.service`
- Report: `docs/architecture/API_LAYER_INTEGRATION_VALIDATION.md`

### P14.1.5.5 — Commercial Aggregate Entry Point Validation
- Decision: OPTION A — BusinessService is the ONLY official entry point
- Controllers MUST NEVER access Capability.service directly
- Pattern B (direct capability access) violates Commercial Aggregate architecture
- 6 route files violate OPTION A (input for P14.1.6)
- Report: `docs/architecture/COMMERCIAL_AGGREGATE_ENTRY_POINT_VALIDATION.md`

### P15 — Automation Engine
- Event-based rules, triggers, conditions, actions

---

## v3.0 — Destination Ecosystem (P11.3.0-P11.3.9)

### P11.3.0 — Destination Ecosystem Architecture
- Master architecture specification for tourism destination ecosystem

### P11.3.1 — Destination Data Foundation
- Destination, locality, place, experience, business data model

### P11.3.2 — Destination Community & Memory
- 16 files, community capability (visitor, memory, review, interaction, reputation, moderation)

### P11.3.3 — Ecology & Conservation
- 36KB architecture specification (18 sections)

### P11.3.4 — Exploration, Gamification & Eco Pokedex
- 12 files, exploration capability (missions, badges, leaderboards, pokedex)

### P11.3.4.1 — Ecosystem Engagement & Gamification Rules
- Eco-tokens, trust, territory, validation, anti-gaming

### P11.3.4.2 — Destination Experience Journey
- 25KB architecture specification (16 sections)

### P11.3.5 — Destination Economy & Partner Ecosystem
- 23KB architecture specification (16 sections)

### P11.3.6 — Destination Intelligence & Personalization
- 11 files, intelligence capability (profiles, recommendations, predictions, knowledge graph, AI assistant)

### P11.3.7 — Destination Governance & Ecosystem Administration
- 11 files, governance capability (RBAC, workflows, moderation, audit)

### P11.3.8 — Destination Operations & Ecosystem Orchestration
- 10 files, operations capability (health, campaigns, seasonal, alerts, reports)

### P11.3.9 — Destination Identity, Storytelling & Cultural Memory
- 10 files, identity capability (stories, heritage, heroes, cultural memory)

---

## v4.0 — API Layer (P14)

### P14 — API Layer Foundation
- Created `api/` directory with complete bootstrap, routing, middleware, responses, errors, health, versioning
- 7 route files (business, accommodation, availability, reservation, visitor, payment, review)
- Base controller + BusinessController
- 9 middleware files
- RFC 9457 Problem Details response format
- Health endpoints (/health, /ready, /live)

### P14.0.5 — API Layer Architecture Validation
- Full audit against 13 architectural categories (score: 78/100)
- 2 P0 critical issues fixed (non-existent module imports)
- 1 P1 high priority issue (middleware chain order)

### P14.0.6 — Validation Corrections
- Fixed bootstrap imports
- Corrected middleware registration

### P14.0.7 — Runtime/API Smoke Test
- First real API runtime execution (Node.js v24.18.1)
- 79/79 checks PASS — 100/100 score
- Startup 23ms, shutdown 1ms, all 8 health rows healthy

### P14.1 — API Layer Integration
- RuntimeContext injection into API layer
- BusinessService as ONLY entry point per OPTION A decision
- 56 API endpoints across 7 route groups

### P14.1.5 — API Layer Integration Validation
- Validated BusinessService entry point enforcement
- All 6 route groups follow OPTION A pattern

### P14.1.5.5 — Commercial Aggregate Entry Point Validation
- Decision: OPTION A — BusinessService is the ONLY official entry point
- Controllers MUST NEVER access Capability.service directly

### P14.1.6 — Integration Validation Corrections
- Fixed route files to use BusinessService methods directly
- No direct capability access bypassing BusinessService

### P14.1.7 — API Closure Corrections
- Added `reportReview` method to BusinessService
- Added availability wrapper methods: `blockDate`, `unblockDate`, `reserveDate`, `releaseDate`
- Routes and BusinessService now expose identical signatures

### P14.FINAL — API Layer Closure Audit
- **VERDICT: API LAYER CLOSED**
- P14 becomes immutable under Design Freeze
- Ready for P12.3 infrastructure phase
- Audit: `docs/architecture/API_LAYER_CLOSURE_AUDIT.md`

---

## v4.1 — Infrastructure (P12.3)

### P12.3.1 — Database Connection & Migration

**Status:** IN PROGRESS

- **Architecture Boundary:** Runtime → Repository → Drizzle ORM → PostgreSQL
- **33 entities** across 5 layers (Platform, Ecosystem, Company, Identity, Business)
- **29 tables** across 5 migrations

#### P12.3.1.2 — Database Schema Design

- Created 33 Drizzle ORM schemas in `database/schema/`
- 5 schema layers: platform, ecosystem, company, identity, business
- Documents: `VALDI_DATABASE_ERD.md`, `DATABASE_IMPLEMENTATION_RULES.md`, `DATABASE_SCHEMA_REFERENCE.md`

#### P12.3.1.3 — Migration Implementation

- Created 5 migration files (0001-0005) in `database/migrations/`
- drizzle.config.js with PostgreSQL dialect, env mapping, pool settings
- MIGRATION_REGISTRY in `database/index.js`
- Documents: `MIGRATION_IMPLEMENTATION_REPORT.md`, `MIGRATION_STRATEGY.md`

#### P12.3.1.4 — PostgreSQL Connection & Environment Configuration

- `database/config/database.config.js` — PostgreSQL settings, pool config
- `database/config/environment.loader.js` — Loads .env files by NODE_ENV
- `database/connection/postgres.connection.js` — Pool, query, transaction, health
- `database/connection/connection.pool.js` — PoolState, initialize/shutdown
- `database/connection/connection.health.js` — checkConnection, ping, checkTables
- `database/client.js` — Drizzle client with schema exports
- `database/bootstrap/database.bootstrap.js` — Full bootstrap flow
- `runtime/startup/database.bootstrap.js` — Runtime integration
- `guardian/database.guardian.js` — Database architecture validation
- Environment templates: `.env.example`, `.env.*.example`
- Documents: `DATABASE_CONNECTION_ARCHITECTURE.md`, `P12.3.1.4_CONNECTION_REPORT.md`

#### P12.3.1.5 — Initial Platform Seed Data

- `database/seeds/` — Complete seed data structure
- Platform seeds: tenants, countries, regions, languages, themes
- Ecosystem seeds: destinations, ecosystems, categories, modules, experiences
- Company seeds: companies, company settings
- Seed registry with dependency ordering
- Seed runner with idempotency checks
- Documents: `SEED_IMPLEMENTATION_REPORT.md`, `INITIAL_PLATFORM_STATE.md`

**Seed Data Summary:**
- 3 tenants (Valdi Platform, Valdivia Ecosystem, Patagonia Ecosystem)
- 1 country (Chile) with architecture for future expansion
- 4 regions (Los Ríos, Magallanes, Los Lagos, Aysén)
- 5 destinations (Valdivia, Natales, Punta Arenas, Chiloé, Coyhaique)
- 17 categories, 18 modules, 4 experiences
- 6 sample companies (architecture examples only)
