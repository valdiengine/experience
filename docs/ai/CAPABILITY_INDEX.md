# CAPABILITY_INDEX.md

> Complete index of all 34 registered capabilities with details.
> Source of truth: `capabilities/core/register.js`
> Updated: P13.8 — Commercial Aggregate Final Validation

---

## Core Platform Capabilities (L4)

### 0. accommodation
- **ID:** `accommodation`
- **Name:** Accommodation
- **Version:** 1.0.0
- **Dependencies:** —
- **Purpose:** Complete lifecycle management of accommodation properties: creation, update, publish, unpublish, archive, restore, delete, validation, media, pricing, SEO, search indexing, CMS sync. Reference implementation for all business capabilities.
- **Files:** `capabilities/accommodation/` (14 files: capability, manager, service, workflow, validation, schema, events, errors, permissions, pricing, media, search, status, README)
- **Events:** accommodation:created, accommodation:updated, accommodation:deleted, accommodation:archived, accommodation:restored, accommodation:published, accommodation:unpublished, accommodation:media.updated, accommodation:price.updated, accommodation:owner.changed
- **Statuses:** DRAFT, PENDING_REVIEW, PUBLISHED, HIDDEN, ARCHIVED, DELETED
- **Permissions:** accommodation:create, accommodation:update, accommodation:delete, accommodation:publish, accommodation:archive, accommodation:read
- **Repository:** `capabilities/persistence/repositories/accommodation.repository.js` (extends BaseRepository, cacheable=true, searchable=true, softDeletable=true, dependencies: tenant, destination, business)

### 1. business
- **ID:** `business`
- **Name:** Business
- **Version:** 1.0.0
- **Dependencies:** tenant, destination
- **Purpose:** Aggregate root of the commercial domain. Manages company registrations on the platform. Belongs to ONE tenant. Owns Accommodation, Reservations, Availability, CMS, Payments. NOT WordPress, NOT CMS, NOT a Tenant.
- **Files:** `capabilities/business/` (14 files + 11 sub-managers in `manager/`: business-accommodation, business-brand, business-owner, business-search, business-statistics, business-cms, business-availability, business-reservation, business-visitor, business-payment, business-notification) + P13.2 updates in accommodation/ (5 files)
- **Events:** business:created, business:updated, business:published, business:unpublished, business:archived, business:restored, business:deleted, business:owner_changed, business:verified, business:error, business.accommodation:*, business.availability:*, business.reservation:*, business.visitor:*, business.payment:* (~104 total)
- **Statuses:** DRAFT, PENDING_REVIEW, PUBLISHED, SUSPENDED, ARCHIVED, DELETED
- **Permissions:** business:create, business:update, business:delete, business:publish, business:archive, business:transfer, business:verify, business:read, business:manage
- **Repository:** `capabilities/persistence/repositories/business.repository.js` (extends AggregateRepository, aggregate=true, cacheable=true, searchable=true, softDeletable=true, dependencies: tenant, destination)

### 2. availability

- **ID:** `availability`
- **Name:** Availability
- **Version:** 1.0.0
- **Dependencies:** accommodation
- **Purpose:** Calendar domain for determining whether an Accommodation can be booked for a specific period. Owns calendar, blocked dates, availability windows, booking rules, seasons, manual blocks, maintenance, reservation locks. NOT part of Business, Accommodation, or Reservation.
- **Files:** `capabilities/availability/` (14 files: capability, manager, service, workflow, validation, schema, events, errors, permissions, rules, calendar, search, status, README)
- **Events:** availability:created, availability:updated, availability:deleted, availability:archived, availability:restored, availability:blocked, availability:unblocked, availability:reserved, availability:released, availability:rule.created, availability:rule.updated, availability:rule.deleted, availability:calendar.updated, availability:sync.requested, availability:sync.completed
- **Statuses:** AVAILABLE, BLOCKED, RESERVED, PENDING, MAINTENANCE, HIDDEN, ARCHIVED, DELETED
- **Permissions:** availability:read, availability:write, availability:publish, availability:archive, availability:override, availability:manage, availability:sync
- **Repository:** `capabilities/persistence/repositories/availability.repository.js` (extends BaseRepository, cacheable=true, searchable=true, dependencies: accommodation)

### 3. persistence
- **ID:** `persistence`
- **Name:** Persistence
- **Version:** 1.0.0
- **Dependencies:** —
- **Purpose:** Generic repository engine — all capabilities access persistent data through this layer. Provider-agnostic. Business-agnostic.
- **Files:** `capabilities/persistence/` (40 files — refactored into 12 subdirectories: adapters/, contracts/, engine/, errors/, events/, identity/, mixins/, providers/ (5 sub), repositories/ (27 sub))
- **ORM Adapter Layer:** `adapters/orm/` (10 files — abstract ORM contract, entity/query/schema mappers, transaction bridge, factory, registry, errors, events)
- **PostgreSQL Provider:** `providers/postgres/` (10 files — provider, config, connection, pool, health, lifecycle, migrations, errors, events)
- **Drizzle Implementation:** `providers/postgres/drizzle/` (10 files — provider, client, connection, schema loader, repository adapter, transaction adapter, query builder, migration runner, health, errors, events)
- **Mixins:** 10 (tenant, destination, soft-delete, pagination, search, audit, optimistic-lock, filtering, sorting, timestamps)
- **Events:** ~13 repository lifecycle events (registered, created, initialized, disposed, entity created/updated/deleted/restored/archived, transaction started/committed/rolled back)
- **Repositories (27):** Tenant, Destination, Business, Accommodation, Reservation, Availability, Visitor, Identity, Community, Memory, Story, Species, Observation, Habitat, Route, Campaign, Challenge, Badge, Partner, Notification, Media, Analytics, Audit, Governance, Operations, Subscription, Payment

### 1. booking
- **ID:** `booking`
- **Name:** Booking
- **Version:** 1.0.0
- **Dependencies:** —
- **Purpose:** Core booking system for creating, confirming, and managing bookings
- **Files:** `capabilities/booking/`
- **Events:** booking:created, booking:updated, booking:cancelled, booking:confirmed, booking:completed

### 2. notifications
- **ID:** `notifications`
- **Name:** Notifications
- **Version:** 2.0.0
- **Dependencies:** —
- **Purpose:** Multi-channel notification engine with templates, preferences, scheduling, batching, rate limiting
- **Files:** `capabilities/notifications/`
- **Events:** ~21 notification events (sent, failed, queued, delivered, opened, scheduled, batch, rate_limited, template, preference, retry, analytics)

### 3. pwa
- **ID:** `pwa`
- **Name:** PWA
- **Version:** 1.0.0
- **Dependencies:** —
- **Purpose:** Basic PWA functionality (manifest, install prompt)
- **Files:** `capabilities/pwa/`
- **Events:** — (basic)

### 4. cms
- **ID:** `cms`
- **Name:** CMS Bridge
- **Version:** 1.0.0
- **Dependencies:** —
- **Purpose:** WordPress integration for content/SEO/URLs
- **Files:** `capabilities/cms/`
- **Events:** cms:content_loaded, cms:content_updated, cms:content_deleted, cms:sync_started, cms:sync_completed, cms:sync_failed

### 5. communication
- **ID:** `communication`
- **Name:** Communication
- **Version:** 1.0.0
- **Dependencies:** —
- **Purpose:** Multi-channel messaging (WhatsApp, Chat, Email, Push)
- **Files:** `capabilities/communication/`
- **Events:** communication:message_sent, communication:message_failed, communication:message_read, communication:conversation_started, communication:conversation_updated, communication:channel_registered

### 6. availability
- **ID:** `availability`
- **Name:** Availability
- **Version:** 1.0.0
- **Dependencies:** —
- **Purpose:** Active availability collection system with natural language parsing
- **Files:** `capabilities/availability/`
- **Events:** availability:requested, availability:received, availability:updated, availability:expired, availability:conflict_detected, availability:calendar_synced

### 7. scheduler
- **ID:** `scheduler`
- **Name:** Scheduler
- **Version:** 2.0.0
- **Dependencies:** —
- **Purpose:** Production-ready job scheduling with executor, locks, retry, circuit breaker, cleanup
- **Files:** `capabilities/scheduler/`
- **Events:** ~21 scheduler events (job lifecycle, tick, lock, retry, circuit breaker, cleanup)

### 8. observability
- **ID:** `observability`
- **Name:** Observability
- **Version:** 1.0.0
- **Dependencies:** —
- **Purpose:** Metrics collection, health monitoring, alert management
- **Files:** `capabilities/observability/`
- **Events:** observability:metric_created, observability:metric_aggregated, observability:health_checked, observability:health_degraded, observability:health_recovered, observability:alert_created, observability:alert_resolved, observability:alert_escalated, observability:started, observability:stopped

### 9. onboarding
- **ID:** `onboarding`
- **Name:** Onboarding
- **Version:** 1.0.0
- **Dependencies:** —
- **Purpose:** Business registration and SaaS tenant creation
- **Files:** `capabilities/onboarding/`
- **Events:** business:registered, business:created, business:updated, business:activated, tenant:created, tenant:configured, plan:assigned, plan:changed, capabilities:activated

### 10. saas
- **ID:** `saas`
- **Name:** SaaS
- **Version:** 1.0.0
- **Dependencies:** —
- **Purpose:** Products, plans, subscriptions, entitlements, features, limits
- **Files:** `capabilities/saas/`
- **Events:** ~22 saas events (product, plan, subscription, feature, limit, upgrade, entitlement)

---

## Business Layer Capabilities (L4-L6)

### 11. intelligence
- **ID:** `intelligence`
- **Name:** Intelligence
- **Version:** 1.0.0
- **Dependencies:** availability
- **Purpose:** Analytics, recommendations, demand analysis, opportunity detection
- **Files:** `capabilities/intelligence/`
- **Events:** intelligence.visitor.profile.created, intelligence.recommendation.generated, intelligence.destination.insight.created, intelligence.demand.predicted, intelligence.ai.assistant.requested, intelligence.knowledge.graph.updated

### 12. reservation
- **ID:** `reservation`
- **Name:** Reservation
- **Version:** 2.1.0
- **Dependencies:** booking, availability, communication, notifications
- **Purpose:** Full reservation lifecycle orchestration with workflow, timers, recovery, pricing, search
- **Files:** `capabilities/reservation/` (18 files: capability, manager, service, workflow, validation, permissions, errors, search, schema, events, status, flow, timer, recovery, config, ui/, README)
- **Events:** 22 events: reservation:created, reservation:updated, reservation:validated, reservation:started, reservation:submitted, reservation:owner_requested, reservation:owner_confirmed, reservation:confirmed, reservation:checked_in, reservation:checked_out, reservation:completed, reservation:rejected, reservation:cancelled, reservation:expired, reservation:no_show, reservation:archived, reservation:restored, reservation:payment_pending, reservation:price_calculated, reservation:state_changed, reservation:timeout_warning, reservation:recovered, reservation:sync_required
- **Statuses:** REQUESTED, OWNER_PENDING, OWNER_CONFIRMED, PAYMENT_PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, COMPLETED, REJECTED, EXPIRED, CANCELLED, NO_SHOW, NO_RESPONSE, ARCHIVED
- **Permissions:** reservation:read, reservation:create, reservation:update, reservation:cancel, reservation:confirm, reservation:reject, reservation:archive, reservation:restore, reservation:delete, reservation:override, reservation:manage

### 13. owner
- **ID:** `owner`
- **Name:** Owner
- **Version:** 1.0.0
- **Dependencies:** reservation, availability, communication, observability
- **Purpose:** Owner portal with dashboard, reservations, availability, customers, metrics
- **Files:** `capabilities/owner/`
- **Events:** owner:dashboard_loaded, owner:reservation_confirmed, owner:availability_updated, owner:customer_viewed, owner:message_sent, owner:metrics_loaded

### 14. engagement
- **ID:** `engagement`
- **Name:** Engagement
- **Version:** 1.0.0
- **Dependencies:** communication, availability, observability
- **Purpose:** Customer engagement with triggers, campaigns, journeys, templates
- **Files:** `capabilities/engagement/`
- **Events:** ~17 engagement events (created, triggered, message_sent, campaign, availability, journey, trigger, metric)

### 15. conversion
- **ID:** `conversion`
- **Name:** Conversion
- **Version:** 1.0.0
- **Dependencies:** communication, engagement, observability
- **Purpose:** Customer scoring, lead scoring, opportunity detection, recovery, follow-up, retention
- **Files:** `capabilities/conversion/`
- **Events:** conversion:lead_created, conversion:score_updated, conversion:customer_scored, conversion:opportunity_detected, conversion:recovery_started, conversion:followup_sent, conversion:retention_action

### 16. billing
- **ID:** `billing`
- **Name:** Billing
- **Version:** 1.0.0
- **Dependencies:** saas
- **Purpose:** Invoicing, payments, transactions, provider management
- **Files:** `capabilities/billing/`
- **Events:** ~18 billing events (invoice, payment, subscription, refund, provider_error)

### 17. payment
- **ID:** `payment`
- **Name:** Payment
- **Version:** 1.0.0
- **Dependencies:** —
- **Purpose:** Commercial payment domain capability. Complete payment lifecycle: creation, authorization, capture, settlement, refunds, disputes, and archival. Pure commercial domain — no gateway knowledge.
- **Files:** `capabilities/payment/` (14 files: capability, manager, service, workflow, validation, schema, events, errors, permissions, calculation, fees, refund, search, status, README)
- **Events:** payment:created, payment:updated, payment:authorized, payment:captured, payment:paid, payment:failed, payment:cancelled, payment:expired, payment:refunded, payment:partially_refunded, payment:disputed, payment:chargeback, payment:archived, payment:restored, payment:deleted
- **Statuses:** DRAFT, PENDING, PROCESSING, AUTHORIZED, PARTIALLY_PAID, PAID, FAILED, CANCELLED, EXPIRED, PARTIALLY_REFUNDED, REFUNDED, DISPUTED, CHARGEBACK, ARCHIVED
- **Permissions:** payment:create, payment:read, payment:update, payment:cancel, payment:refund, payment:archive, payment:restore, payment:delete, payment:manage
- **Repository:** via `context.repositories.payment` (persistence-agnostic)

### 18. notification
- **ID:** `notification`
- **Name:** Notification
- **Version:** 1.0.0
- **Dependencies:** —
- **Purpose:** Domain-only notification lifecycle management. Manages notification status, transitions, templates, preferences, channels, and analytics. Does NOT handle delivery (no providers, no HTTP, no queues, no workers). External systems consume notification records.
- **Files:** `capabilities/notification/` (14 files: capability, service, manager, status, channels, templates, preferences, events, errors, permissions, schema, validation, workflow, search)
- **Events:** notification:created, notification:updated, notification:scheduled, notification:processing, notification:sent, notification:delivered, notification:failed, notification:retried, notification:cancelled, notification:archived, notification:restored, notification:deleted, notification:preferences_updated, notification:error
- **Statuses:** DRAFT, PENDING, SCHEDULED, PROCESSING, SENT, DELIVERED, FAILED, CANCELLED, ARCHIVED, DELETED
- **Permissions:** notification:create, notification:read, notification:update, notification:delete, notification:send, notification:archive, notification:manage_templates, notification:manage_preferences, notification:analytics
- **Coexistence:** Coexists with `notifications` (v2.0) which HAS email/push/whatsapp providers

### 19. lifecycle
- **ID:** `lifecycle`
- **Name:** Lifecycle
- **Version:** 1.0.0
- **Dependencies:** saas, billing, communication, onboarding, observability
- **Purpose:** Customer lifecycle from onboarding to retention (9 segments, trial, activation, churn, renewal)
- **Files:** `capabilities/lifecycle/`
- **Events:** ~19 lifecycle events (customer, trial, upgrade, plan, churn, recovery, renewal, activation)

---

## Public Layer Capabilities (L4-L9)

### 20. public
- **ID:** `public`
- **Name:** Public
- **Version:** 1.0.0
- **Dependencies:** cms, pwa, reservation, communication, engagement
- **Purpose:** Public experience with page rendering, navigation, SEO, schema JSON-LD
- **Pattern:** ESM class + `export default` (extends BaseCapability)
- **Files:** `capabilities/public/`
- **Events:** public:loaded, public:page_rendered, public:route_changed, public:seo_generated, public:pwa_ready, public:reservation_opened

### 21. seo-intelligence
- **ID:** `seo-intelligence`
- **Name:** SEO Intelligence
- **Version:** 1.0.0
- **Dependencies:** cms, public, observability, intelligence
- **Purpose:** SEO analysis, content analysis, keyword analysis, link analysis
- **Files:** `capabilities/seo-intelligence/`
- **Events:** seo-intelligence:analysis_started, seo-intelligence:issue_detected, seo-intelligence:opportunity_found, seo-intelligence:score_changed

### 22. pwa-engine
- **ID:** `pwa-engine`
- **Name:** PWA Engine
- **Version:** 1.0.0
- **Dependencies:** notifications, communication, public, observability
- **Purpose:** Full PWA engine with manifest, service worker, cache, install, offline
- **Files:** `capabilities/pwa-engine/`
- **Events:** ~23 pwa-engine events (manifest, sw, cache, install, offline, push)

### 23. admin
- **ID:** `admin`
- **Name:** Admin
- **Version:** 1.0.0
- **Dependencies:** reservation, availability, seo-intelligence, pwa-engine, observability, onboarding, saas, billing
- **Purpose:** Complete admin platform with users, roles, tenants, plans, content, analytics
- **Files:** `capabilities/admin/`
- **Events:** ~20 admin events (user, tenant, plan, capability, reservation, content, analytics)

---

## SaaS Layer Capabilities (L4-L6)

### 24. community
- **ID:** `community`
- **Name:** Community
- **Version:** 1.0.0
- **Dependencies:** —
- **Purpose:** Visitor-generated knowledge layer (memories, reviews, interactions, reputation, moderation)
- **Files:** `capabilities/community/`
- **Events:** ~22 community events (visitor, memory, review, interaction, reputation, moderation)

### 25. visitor
- **ID:** `visitor`
- **Name:** Visitor
- **Version:** 1.0.0
- **Dependencies:** —
- **Purpose:** Pure business customer domain. Represents the business customer; may exist with or without authentication. IS NOT Authentication, Identity, JWT, or Session. Owns profile, preferences, travel history, trust, tags, statistics.
- **Files:** `capabilities/visitor/` (14 files: capability, manager, service, workflow, validation, schema, events, errors, permissions, profile, preferences, statistics, search, status)
- **Events:** 20 events: visitor:created, visitor:updated, visitor:deleted, visitor:archived, visitor:restored, visitor:merged, visitor:verified, visitor:activated, visitor:deactivated, visitor:vip_granted, visitor:vip_revoked, visitor:blacklisted, visitor:removed_from_blacklist, visitor:profile_updated, visitor:preferences_updated, visitor:statistics_updated, visitor:reservation_linked, visitor:reservation_removed, visitor:tag_added, visitor:tag_removed
- **Statuses:** ANONYMOUS, REGISTERED, VERIFIED, ACTIVE, VIP, INACTIVE, ARCHIVED, DELETED
- **Permissions:** visitor:create, visitor:read, visitor:update, visitor:delete, visitor:archive, visitor:restore, visitor:merge, visitor:view_statistics, visitor:update_preferences, visitor:update_profile
- **Repository:** `capabilities/persistence/repositories/visitor.repository.js` (business customer store; access only via `context.repositories.visitor`)
- **Registration:** Registered in `capabilities/core/register.js` (P13.5.5); wired by `runtime/startup/capability.bootstrap.js`

### 26. opportunity
- **ID:** `opportunity`
- **Name:** Opportunity
- **Version:** 1.0.0
- **Dependencies:** —
- **Purpose:** Opportunity detection/discovery for the commercial business. P13.5.5 thin runtime wrapper over the existing `OpportunityEngine` — no business logic lives in the capability.
- **Files:** `capabilities/opportunity/opportunity.capability.js` (thin wrapper) + `capabilities/intelligence/opportunity.engine.js` (engine)
- **Repository:** `capabilities/persistence/repositories/opportunity/opportunity.repository.js` (metadata-only placeholder; access via `context.repositories.opportunity`)
- **Registration:** Registered in `capabilities/core/register.js` (P13.5.5); wired by `runtime/startup/capability.bootstrap.js`

---

## Destination Ecosystem Capabilities (L11)

### 27. exploration
- **ID:** `exploration`
- **Name:** Exploration
- **Version:** 1.1.0
- **Dependencies:** community
- **Purpose:** Gamification, eco-pokedex, missions, badges, leaderboards, sports tracking
- **Files:** `capabilities/exploration/`
- **Events:** ~19 exploration events (explorer, mission, pokedex, leaderboard, media)
- **Sub-modules:** `engagement/` (eco-tokens, trust, badges, territory, validation)

### 28. intelligence (Destination)
- **ID:** `intelligence` (reuses core intelligence)
- **Name:** Destination Intelligence
- **Version:** 1.0.0
- **Dependencies:** community, exploration
- **Static Dependencies:** `static dependencies = []`
- **Purpose:** Visitor profiles, recommendations, predictions, knowledge graph, AI assistant
- **Files:** `capabilities/intelligence/` (extended)
- **Events:** ~24 intelligence events (visitor, recommendation, pattern, prediction, AI, knowledge, sync)

### 29. governance
- **ID:** `governance`
- **Name:** Governance
- **Version:** 1.0.0
- **Dependencies:** community
- **Static Dependencies:** `static dependencies = []`
- **Purpose:** RBAC, workflows, moderation, audit, partner certification
- **Files:** `capabilities/governance/`
- **Events:** ~35 governance events (destination, locality, place, experience, business, partner, observation, content, moderation, audit, permission, workflow, reputation, health)

### 30. destination-operations
- **ID:** `destination-operations`
- **Name:** Operations
- **Version:** 1.0.0
- **Dependencies:** community, governance
- **Static Dependencies:** `static dependencies = []`
- **Purpose:** Destination health, campaigns, seasonal patterns, recommendations
- **Files:** `capabilities/operations/`
- **Events:** ~21 operations events (destination, health, campaign, seasonal, alert, report, agent)

---

## Event-Only Modules (P11.6)

| Module | Events Constant | Count | File |
|--------|----------------|-------|------|
| ecology | ECOLOGY_EVENTS | 6 | `capabilities/ecology/ecology.events.js` |
| economy | ECONOMY_EVENTS | 4 | `capabilities/economy/economy.events.js` |
| destination | DESTINATION_EVENTS | 4 | `capabilities/destination/destination.events.js` |
| locality | LOCALITY_EVENTS | 3 | `capabilities/locality/locality.events.js` |

> Note: Onboarding capability now has `deactivate()` method (P11.6).
> Note: `EXPLORATION_ENGAGEMENT_EVENTS` renamed from `ENGAGEMENT_EVENTS` in `exploration/engagement/` to avoid namespace collision.

---

## Unregistered (Orphans)

| File | Status | Notes |
|------|--------|-------|
| `capabilities/catalog/catalog.capability.js` | Placeholder | Created in P1-3, never registered |
| `capabilities/gallery/gallery.capability.js` | Placeholder | Created in P1-3, never registered |
| `capabilities/payments/payments.capability.js` | Placeholder | Created in P1-3, never registered |
