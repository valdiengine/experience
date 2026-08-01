# MASTER_CONTEXT.md

> Single source of truth for AI agents working on Valdi Engine.
> Read this file FIRST before any task. Updated after each phase completion. Last update: P13.6 — Payment Capability.

## Platform Identity

**Valdi Engine** is a multi-tenant tourism ecosystem platform. It is NOT only a reservation SaaS.

It provides digital infrastructure for tourism destinations where:
- **Destinations** are territories with identity, content, and ecosystems
- **Localities** represent community identity inside destinations
- **Places** are tourism discovery points (trails, viewpoints, restaurants, parks)
- **Experiences** are bookable services offered by businesses
- **Businesses** participate inside destinations as service providers
- **Visitors** are ecosystem explorers who generate content, reviews, and reputation
- **Community** is the visitor-generated knowledge layer (memories, photos, reviews)
- **Ecology** connects tourism with conservation (flora, fauna, citizen science)
- **Identity** gives destinations their cultural soul (stories, heritage, heroes, memory)
- **SaaS services** provide monetization through business tooling

**The territory is the main entity. Businesses participate inside destinations.**

## Core Vision

```
Tourism Network > Region > Destination > Commune > Locality > Place > Experience > Business Tenant
```

Each level can have its own PWA, branding, SEO, and community content. The platform evolves from Reservation SaaS to Destination Digital Infrastructure.

## Design System

| Token | Value |
|-------|-------|
| Primary BG | `#0a0a0f` (cinematic black) |
| Secondary BG | `#12121a` (deep navy) |
| Card BG | `#1a1a2e` with glassmorphism |
| Accent Primary | `#d4a053` (warm gold/amber) |
| Accent Secondary | `#8b7355` (muted bronze) |
| Accent Tertiary | `#c9a96e` (light gold) |
| Text Primary | `#f5f0e8` (warm white) |
| Text Secondary | `#a89b8c` (muted warm) |
| Text Muted | `#6b5e4f` (dim bronze) |
| Display Font | Cabinet Grotesk |
| Body Font | Inter |
| Mono Font | JetBrains Mono |
| Border Radius | 12px cards, 8px buttons, 24px modals |
| Glassmorphism | `backdrop-filter: blur(12px)` |
| Animations | 300ms ease-in-out, scale(1.02) on hover |

## Architecture Layers

```
L0  Shared          - Utilities, constants, schemas, events (ZERO business knowledge)
L1  Core            - Bootstrap, routing, theme, data access, event bus
L2  Providers       - Data source abstraction (JSON, API, CMS)
L3  Tenant Manager  - Project configuration, engine resolution
L4  Capabilities    - Feature modules (33 registered)
L5  Plugins         - Cross-cutting concerns
L6  Business        - Domain logic (reservations, payments, notifications)
L7  Workflows       - Visual multi-step flow execution
L8  Automation      - Event-based rules
L9  Engines         - Specialized subsystems
L10 Admin           - Business management panel
L11 Destination     - Tourism destination ecosystem
```

## Golden Rules

1. **Never import UP** - Lower layers cannot import higher layers
2. **Never import SAME-LEVEL sibling** - Use EventBus for cross-engine communication
3. **Cross-engine ONLY via EventBus** - Engines never import each other
4. **DataManager ONLY via Providers** - DataManager never accesses data sources directly
5. **Shared has ZERO app knowledge** - `shared/` cannot import from any app layer
6. **Capabilities access each other ONLY via** `context.capabilities.get('name')`
7. **Only `register.js` imports capability classes**
8. **Providers handle ONLY data source communication** - cache/search/filters/validation live in DataManager
9. **Capabilities are business-agnostic** - They never know about tourism, drones, restaurants
10. **Industry-specific logic** lives in `engine/data/`, tenant config, business services, or plugins
11. **Hybrid Architecture** - WordPress is CMS (content/SEO/URLs), Engine handles applications (bookings/notifications/PWA/admin)
12. **Culture belongs to communities** - Stories require ownership and attribution
13. **AI preserves authenticity** - Cannot invent cultural facts
14. **Community validation required** - For all cultural content

## Capability Contract

```js
{
  static id: 'capability-name',
  static name: 'Capability Name',
  static version: '1.0.0',
  static dependencies: ['other-capability'],

  async init(context) { /* receives { tenant, dataManager, eventBus, provider, config, capabilities } */ },
  async activate() {},
  async deactivate() {},
  async destroy() {}
}
```

## File Structure Per Capability

```
capabilities/{name}/
├── {name}.capability.js      # Entry point, extends BaseCapability
├── {name}.manager.js          # Orchestrator
├── {name}.schema.js           # Entity schemas and enums
├── {name}.events.js           # Event definitions
├── README.md                  # Documentation
└── sub-modules/               # Domain-specific managers
```

## Current Progress

- **Phases completed:** 74/74 + P13.2 + P13.2.1 + P13.3 + P13.3.1 + P13.4 + P13.4.1 + P13.5 + P13.5.1 + P13.5.2 + P13.5.3 + P13.5.4 + P13.5.5 + P13.5.6 + P13.6
- **Capabilities registered:** 33
- **Architecture specs:** 26 + 6 audit reports + 3 hardening specs + 2 CMS architecture docs + 1 wiring doc (MULTI-TENANT-IDENTITY-AUDIT, AUTHENTICATION-SECURITY-AUDIT, AUTHORIZATION-AUDIT, IDENTITY-READINESS-REPORT, IDENTITY-DEPENDENCY-AUDIT, IDENTITY-EVENT-AUDIT, plus rate-limit contract, brute-force detector, secrets contract; plus WORDPRESS-PROVIDER-ARCHITECTURE.md and CMS-SYNC-ENGINE-ARCHITECTURE.md; plus INFRASTRUCTURE-WIRING-ARCHITECTURE.md; plus BUSINESS-AVAILABILITY-MANAGER.md; plus RESERVATION-CAPABILITY.md; plus BUSINESS-RESERVATION-MANAGER.md; plus VISITOR-CAPABILITY.md; plus BUSINESS-VISITOR-MANAGER.md; plus COMMERCIAL-AGGREGATE-VALIDATION.md; plus COMMERCIAL-RUNTIME-VERIFICATION.md; plus COMMERCIAL-RUNTIME-STARTUP.md; plus COMMERCIAL-RUNTIME-SMOKE-TEST.md)
- **Last updated:** P13.6 — Payment Capability (Commercial Domain)

## Key Files

| File | Purpose |
|------|---------|
| `ROADMAP.md` | Master roadmap with all phases |
| `agent.md` | Platform documentation (638 lines) |
| `capabilities/core/register.js` | Centralized capability registry |
| `capabilities/core/base.capability.js` | Base class for all capabilities |
| `docs/ai/MASTER_CONTEXT.md` | This file |
| `docs/ai/PROJECT_BOOT.md` | Quick start for new sessions |
| `docs/ai/CURRENT_STATE.md` | Exact current state snapshot |
| `docs/ai/DECISION_LOG.md` | Architectural decisions |
| `docs/ai/CAPABILITY_INDEX.md` | All 31 capabilities |
| `docs/ai/EVENT_INDEX.md` | All ~425 events |
| `docs/ai/NEXT_PHASE.md` | What comes next |
| `docs/ai/AI_OPERATING_MANUAL.md` | AI operational constitution (21 sections) |
| `docs/ai/AI_BOOT_SEQUENCE.md` | Mandatory AI startup procedure |
| `docs/ai/AI_DECISION_FRAMEWORK.md` | 8 standardized decision trees |
| `docs/ai/AI_CONTEXT_COMPACTION.md` | Standard session handoff format |
| `docs/knowledge/ARCHITECT_DECISIONS.md` | 15 architectural decisions with rationale |
| `docs/knowledge/PROJECT_EVOLUTION.md` | Historical narrative of platform evolution |
| `docs/architecture/DATABASE-BLUEPRINT.md` | P12.0.0 — Canonical persistence model for all providers |
| `docs/architecture/PERSISTENCE-CONTRACTS.md` | P12.0.1 — Permanent contracts between capabilities, repositories, providers, database |
| `docs/architecture/REPOSITORY-UOW-ARCHITECTURE.md` | P12.0.2 — Repository, Unit of Work, Transaction Manager architecture |
| `capabilities/persistence/` | P12.0.3 — Repository Engine / P12.0.3.1 — Refactored (12 subdirectories, 10 mixins, adapters) |
| `capabilities/persistence/adapters/orm/` | P12.0.4 — ORM Adapter Layer (10 files, abstract ORM contract) |
| `docs/architecture/ORM-ADAPTER-ARCHITECTURE.md` | P12.0.4 — Full architecture document |
| `capabilities/persistence/providers/postgres/` | P12.0.5 — PostgreSQL Provider (10 files) |
| `capabilities/persistence/providers/postgres/drizzle/` | P12.0.5 — Drizzle ORM implementation (10 files) |
| `docs/architecture/POSTGRES-PROVIDER-ARCHITECTURE.md` | P12.0.5 — Full PostgreSQL provider architecture (16 sections) |
| `runtime/` | P12.0.5.1 — Platform Runtime core (9 files: engine, context, registry, factory, lifecycle, health, events, errors, README) |
| `runtime/contracts/` | P12.0.5.1 — Infrastructure contracts (17 files: base + 16 runtime modules) |
| `docs/architecture/PLATFORM-RUNTIME-ARCHITECTURE.md` | P12.0.5.1 — Full Platform Runtime architecture (14 sections, 12 rules) |
| `docs/architecture/IDENTITY-AUTHENTICATION-BLUEPRINT.md` | P12.1.0 — Identity domain & authentication architecture (13 sections, 15 rules) |
| `runtime/auth/contracts/` | P12.1.1 — Authentication Runtime Contracts (17 files: 16 abstract contracts + README) |
| `docs/architecture/AUTHENTICATION-RUNTIME-CONTRACTS.md` | P12.1.1 — Authentication Runtime Contracts architecture (11 sections, 12 rules) |
| `runtime/auth/engine/` | P12.1.2 — Authentication Engine (17 files: 10 sub-engines + registry + factory + context + health + events + errors + README) |
| `docs/architecture/AUTHENTICATION-ENGINE-ARCHITECTURE.md` | P12.1.2 — Authentication Engine architecture (10 sections, 12 rules) |
| `runtime/auth/integration/` | P12.1.3 — Authentication Runtime Integration (8 files: bridge + context + factory + registry + health + events + errors + README) |
| `docs/architecture/AUTHENTICATION-RUNTIME-INTEGRATION.md` | P12.1.3 — Auth Runtime Integration architecture (13 sections, 10 rules) |
| `runtime/auth/providers/jwt/` | P12.1.4 — JWT Provider & Session Infrastructure (13 files: provider + 9 services + events + errors + README) |
| `docs/architecture/JWT-PROVIDER-ARCHITECTURE.md` | P12.1.4 — JWT Provider architecture (15 sections, 12 security rules) |
| `runtime/auth/authorization/` | P12.1.5 — Authorization Engine (8 files: engine + context + registry + factory + health + events + errors + README) |
| `runtime/auth/policies/` | P12.1.5 — Policy Engine (7 files: engine + registry + context + compiler + cache + built-in + README) |
| `runtime/auth/permissions/` | P12.1.5 — Permission Resolver (5 files: resolver + matrix + registry + events + README) |
| `runtime/auth/roles/` | P12.1.5 — Role Manager (5 files: manager + registry + built-in + events + README) |
| `runtime/auth/scopes/` | P12.1.5 — Scope Manager (5 files: manager + registry + built-in + events + README) |
| `runtime/auth/audit/` | P12.1.5 — Authorization Audit (3 files: audit + events + README) |
| `docs/architecture/AUTHORIZATION-POLICY-ENGINE.md` | P12.1.5 — Authorization & Policy Engine architecture (17 sections, 12 + 10 rules) |
| `runtime/auth/integration/authorization/` | P12.1.6 — Authorization Runtime Integration (8 files: integration + context + factory + registry + health + events + errors + README) |
| `docs/architecture/AUTHORIZATION-RUNTIME-INTEGRATION.md` | P12.1.6 — Authorization Runtime Integration architecture (13 sections, 12 rules) |
| `docs/architecture/IDENTITY-DEPENDENCY-AUDIT.md` | P12.1.7 — Identity dependency graph + violations |
| `docs/architecture/IDENTITY-EVENT-AUDIT.md` | P12.1.7 — Identity event inventory + consistency audit |
| `docs/security/MULTI-TENANT-IDENTITY-AUDIT.md` | P12.1.7 — Multi-tenant isolation audit (93/100) |
| `docs/security/AUTHENTICATION-SECURITY-AUDIT.md` | P12.1.7 — Authentication security audit (73/100) |
| `docs/security/AUTHORIZATION-AUDIT.md` | P12.1.7 — Authorization audit (91/100) |
| `docs/security/IDENTITY-READINESS-REPORT.md` | P12.1.7.1 — Production readiness score (87/100 PRODUCTION-READY) |
| `runtime/auth/security/` | P12.1.7.1 — Auth Security (4 files: rate-limit contract, brute-force detector, events, errors) |
| `runtime/security/secrets.runtime.js` | P12.1.7.1 — Secret provider contract (get, set, delete, list, rotate) |
| `docs/architecture/CMS-DOMAIN-BLUEPRINT.md` | P12.2.0 — CMS Domain Blueprint (15 sections, 13 rules) |
| `runtime/cms/contracts/` | P12.2.1 — CMS Runtime Contracts (12 files: 11 abstract contracts + README) |
| `runtime/cms/integration/` | P12.2.2 — CMS Runtime Integration (8 files: bridge + context + factory + registry + health + events + errors + README) |
| `runtime/cms/providers/wordpress/` | P12.2.3 — WordPress Provider (21 files: provider + 8 modules + README) |
| `docs/architecture/WORDPRESS-PROVIDER-ARCHITECTURE.md` | P12.2.3 — WordPress Provider architecture (12 sections, 10 rules) |
| `runtime/cms/sync/` | P12.2.4 — CMS Sync Engine (26 files: 4 subsystems + 3 strategies + state + events + errors + README) |
| `docs/architecture/CMS-SYNC-ENGINE-ARCHITECTURE.md` | P12.2.4 — CMS Sync Engine architecture (12 sections, 10 rules) |
| `docs/architecture/PRE_MVP_ARCHITECTURE_REVIEW.md` | P12.2.5 — Pre-MVP Architecture Review (10 areas, 66/100 score) |
| `runtime/bootstrap/` | P12.3.0 — Infrastructure Wiring Bootstrap (BootstrapConfig, BootstrapPipeline, BootstrapEvents, BootstrapErrors) |
| `docs/architecture/INFRASTRUCTURE-WIRING-ARCHITECTURE.md` | P12.3.0 — Infrastructure Wiring Architecture (12 sections, 12 rules) |
| `capabilities/accommodation/` | P13.0 — Accommodation Capability (14 files, full lifecycle) |
| `docs/architecture/ACCOMMODATION-CAPABILITY.md` | P13.0 — Reference architecture for all business capabilities (12 sections) |
| `capabilities/business/` | P13.1 — Business Capability (14 files, aggregate root) + P13.2 integration + P13.2.1 modularization (9 sub-managers) |
| `docs/architecture/BUSINESS-CAPABILITY.md` | P13.1 — Business Capability architecture (12 sections, pending P13.2 update) |
| `docs/architecture/BUSINESS-INTERNAL-MODULARIZATION.md` | P13.2.1 — Business Internal Modularization architecture |
| `capabilities/availability/` | P13.3 — Availability Capability (14 files, calendar domain) |
| `docs/architecture/AVAILABILITY-CAPABILITY.md` | P13.3 — Availability Capability architecture |
| `capabilities/business/manager/business-availability.manager.js` | P13.3.1 — Business Availability Manager (~420 lines, orchestration only) |
| `docs/architecture/BUSINESS-AVAILABILITY-MANAGER.md` | P13.3.1 — Business Availability Manager architecture |
| `capabilities/reservation/` (18 files) | P13.4 — Reservation Capability Modernization (service, validation, permissions, errors, search, extended lifecycle) |
| `docs/architecture/RESERVATION-CAPABILITY.md` | P13.4 — Reservation Capability architecture |
| `capabilities/business/manager/business-reservation.manager.js` | P13.4.1 — Business Reservation Manager (~550 lines, orchestration only) |
| `docs/architecture/BUSINESS-RESERVATION-MANAGER.md` | P13.4.1 — Business Reservation Manager architecture |
| `capabilities/visitor/` (14 files) | P13.5 — Visitor Capability (business customer domain, zero auth/infra imports) |
| `docs/architecture/VISITOR-CAPABILITY.md` | P13.5 — Visitor Capability architecture |
| `capabilities/business/manager/business-visitor.manager.js` | P13.5.1 — Business Visitor Manager (~850 lines, orchestration only) |
| `docs/architecture/BUSINESS-VISITOR-MANAGER.md` | P13.5.1 — Business Visitor Manager architecture |
| `docs/architecture/COMMERCIAL_AGGREGATE_VALIDATION.md` | P13.5.2 — Commercial Aggregate Validation (68/100) + P13.5.3 Corrections (92/100, C1–C3/H1–H3 applied) |
| `docs/architecture/COMMERCIAL_RUNTIME_VERIFICATION.md` | P13.5.4 — Commercial Runtime Verification (53/100, RUNTIME BLOCKERS FOUND; RB1/RB2/RB9/RB10 fixed, RB3–RB8 classified) |
| `runtime/startup/application.start.js` | P13.5.5 — Single, mandatory, deterministic platform entry (RuntimeEngine/BootstrapPipeline/RepositoryEngine/Auth/CMS/CapabilityRegistry wiring) |
| `docs/architecture/COMMERCIAL_RUNTIME_STARTUP.md` | P13.5.5 — Commercial Runtime Startup (providers disabled RB3; 12 repos + 9 capabilities wired; placeholders per Missing Components Policy) |
| `runtime/startup/smoke.test.js` | P13.5.6 — End-to-End runtime smoke test harness (79 checks; exit 0/2/3; writes smoke.report.json) |
| `docs/architecture/COMMERCIAL_RUNTIME_SMOKE_TEST.md` | P13.5.6 — End-to-End Runtime Smoke Test (79/79 PASS, 100/100; 16 runtime defects fixed; RB6 resolved) |
| `capabilities/payment/` (14 files) | P13.6 — Payment Capability (commercial payment domain, zero gateway knowledge) |
| `docs/architecture/PAYMENT-CAPABILITY.md` | P13.6 — Payment Capability architecture (16 sections, 10 rules) |
