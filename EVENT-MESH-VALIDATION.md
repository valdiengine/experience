# EVENT-MESH-VALIDATION.md — Event System Audit

## Overview
- 30 event definition files analyzed
- ~420 unique event string constants cataloged
- Naming convention, producers, consumers, payloads validated

## Event Statistics

| Metric | Value |
|---|---|
| Event Definition Files | 30 |
| Total Event Constants | ~420 |
| Active Events (emitted + consumed) | ~290 |
| Dead Events (emitted but never consumed) | ~130 |
| Orphan Consumers (consumed but never emitted) | 25+ |
| Naming Convention Styles | 3 (colon, dot, bare) |
| Namespace Collisions | 1 (ENGAGEMENT_EVENTS) |

## Event Definition Files

| # | File | Export | Event Count |
|---|---|---|---|
| 1 | capabilities/core/events.js | CAPABILITY_EVENTS | 21 |
| 2 | capabilities/booking/booking.events.js | BOOKING_EVENTS | 5 |
| 3 | capabilities/billing/billing.events.js | BILLING_EVENTS | 18 |
| 4 | capabilities/availability/availability.events.js | AVAILABILITY_EVENTS | 6 |
| 5 | capabilities/cms/cms.events.js | CMS_EVENTS | 6 |
| 6 | capabilities/conversion/conversion.events.js | CONVERSION_EVENTS | 14 |
| 7 | capabilities/community/community.events.js | COMMUNITY_EVENTS | 22 |
| 8 | capabilities/communication/communication.events.js | COMMUNICATION_EVENTS | 6 |
| 9 | capabilities/engagement/engagement.events.js | ENGAGEMENT_EVENTS | 17 |
| 10 | capabilities/identity/identity.events.js | IDENTITY_EVENTS | 19 |
| 11 | capabilities/intelligence/intelligence.events.js | INTELLIGENCE_EVENTS | 24 |
| 12 | capabilities/lifecycle/lifecycle.events.js | LIFECYCLE_EVENTS | 19 |
| 13 | capabilities/notifications/notification.events.js | NOTIFICATION_EVENTS | 21 |
| 14 | capabilities/observability/observability.events.js | OBSERVABILITY_EVENTS | 10 |
| 15 | capabilities/onboarding/onboarding.events.js | ONBOARDING_EVENTS | 9 |
| 16 | capabilities/operations/operations.events.js | OPERATIONS_EVENTS | 21 |
| 17 | capabilities/public/public.events.js | PUBLIC_EVENTS | 12 |
| 18 | capabilities/pwa-engine/pwa-engine.events.js | PWA_ENGINE_EVENTS | 23 |
| 19 | capabilities/reservation/reservation.events.js | RESERVATION_EVENTS | 14 |
| 20 | capabilities/saas/saas.events.js | SAAS_EVENTS | 22 |
| 21 | capabilities/scheduler/scheduler.events.js | SCHEDULER_EVENTS | 21 |
| 22 | capabilities/seo-intelligence/seo-intelligence.events.js | SEO_INTELLIGENCE_EVENTS | 10 |
| 23 | capabilities/seo-intelligence/seo/seo.events.js | SEO_EVENTS | 12 |
| 24 | capabilities/governance/governance.events.js | GOVERNANCE_EVENTS | 34 |
| 25 | capabilities/admin/admin.events.js | ADMIN_EVENTS | 20 |
| 26 | capabilities/exploration/exploration.events.js | EXPLORATION_EVENTS | 20 |
| 27 | capabilities/exploration/engagement/engagement.events.js | ENGAGEMENT_EVENTS (exploration sub) | 23 |
| 28 | capabilities/owner/owner.events.js | OWNER_EVENTS | 16 |
| 29 | workflows/engine/workflow.events.js | WORKFLOW_EVENTS | 18 |
| 30 | automation/engine/automation.events.js | AUTOMATION_EVENTS | 15 |

## Naming Convention Analysis

### Three Styles Detected

**Style A: `domain:action` (colon-separated)** — 18 event files
Used by: booking, billing, availability, cms, conversion, communication, engagement, lifecycle, notifications, observability, public, pwa-engine, reservation, saas, scheduler, seo-intelligence, admin, owner, core

Examples: `booking:created`, `notification:sent`, `availability:requested`

**Style B: `domain.entity.action` (dot-separated)** — 4 event files
Used by: identity, intelligence, governance, operations

Examples: `identity.story.published`, `intelligence.demand.predicted`, `governance.place.approved`

**Style C: Bare entity names (mixed)** — 3 event files
Used by: community (partially), exploration (partially), exploration/engagement (partially)

Examples: `memory:created` (no domain prefix), `explorer:leveled_up`, `eco:tokens_earned`

### Convention Violations

| Violation | Count | Examples |
|---|---|---|
| Missing domain prefix | 3 | `data.loaded`, `data.changed`, `provider.error` |
| Plural domain name | 1 | `capabilities:activated` (should be `capability:activated`) |
| Bare entity without domain | 12 | `memory:created`, `review:created`, `visitor:visited_destination` |
| Bare exploration entities | 10 | `explorer:created`, `species:discovered`, `explorer:leveled_up` |
| Mixed exploration/engagement | 15 | `eco:tokens_earned`, `trust:updated`, `badge:awarded` |
| Non-domain prefixes in onboarding | 9 | `business:registered`, `tenant:created`, `plan:assigned` |
| Dual separator styles | Systemic | Colon vs dot across different capabilities |
| Underscore in actions | ~60+ | `content_loaded` instead of `content.loaded` |

## Dead Events (~130 — 30% of all events)

### Observability Events (8 dead)
All observability internal events have no external consumers:
- `observability:metric_created`, `observability:metric_aggregated`, `observability:health_checked`
- `observability:health_degraded`, `observability:health_recovered`, `observability:alert_escalated`
- `observability:started`, `observability:stopped`

### Communication Events (3 dead)
- `communication:message_read` — defined but never emitted
- `communication:conversation_started` — defined but never emitted
- `communication:conversation_updated` — defined but never emitted

### PWA Engine Events (~20 dead)
Only 3 of 23 events consumed: `pwa-engine:installed`, `pwa-engine:push_clicked`, `pwa-engine:offline_detected`
Remaining 20 have no identified consumers.

### SEO Events (12 dead)
ALL events in seo/seo.events.js are dead — none are emitted or consumed:
- `seo:analysis_completed`, `seo:issue_detected`, `seo:opportunity_found`, etc.

### Admin Events (~15 dead)
Most admin events are never emitted:
- `admin:tenant_created`, `admin:tenant_suspended`, `admin:plan_upgraded`, etc.

### Owner Events (15 of 16 dead)
Only `owner:dashboard_loaded` has a consumer. All others dead.

### Core Events (5 dead)
- `capability:state_changed`, `capability:dependency_missing`, `capability:dependency_ready`
- `capability:activation_blocked`, `pwa:install_prompt`, `pwa:update_available`

### Data Events (3 dead)
- `data.loaded`, `data.changed`, `provider.error` — emitted but no explicit consumers

### Lifecycle, Conversion, Engagement, Workflow, Automation Events
Most events in these files are emitted dynamically by sub-managers but have no explicit consumers found in the codebase.

## Orphan Consumers (25+ listeners with no matching emitter)

| Listener | Expected Event | Actual Defined Event | Mismatch |
|---|---|---|---|
| identity | `destination.created` | Not defined | No emitter |
| identity | `community.memory.created` | `memory:created` | Prefix mismatch |
| identity | `community.story.created` | Not defined | No emitter |
| identity | `ecology.heritage.added` | Not defined | No emitter |
| identity | `exploration.activity.completed` | `explorer:completed_experience` | Name mismatch |
| identity | `exploration.place.discovered` | `explorer:visited_place` | Name mismatch |
| governance | `exploration.place.discovered` | `explorer:visited_place` | Name mismatch |
| governance | `ecology.observation.created` | Not defined | No emitter |
| governance | `economy.partner.registered` | Not defined | No emitter |
| governance | `community.content.reported` | `community:content_flagged` | Name mismatch |
| governance | `engagement.badge.earned` | `badge:awarded` | Name mismatch |
| intelligence | `exploration.place.discovered` | `explorer:visited_place` | Name mismatch |
| intelligence | `exploration.species.observed` | `explorer:discovered_species` | Name mismatch |
| intelligence | `exploration.activity.completed` | `explorer:completed_experience` | Name mismatch |
| intelligence | `destination.data.updated` | Not defined | No emitter |
| intelligence | `ecology.observation.created` | Not defined | No emitter |
| operations | `destination.created` | Not defined | No emitter |
| operations | `exploration.place.discovered` | `explorer:visited_place` | Name mismatch |
| operations | `community.memory.created` | `memory:created` | Prefix mismatch |
| operations | `ecology.observation.created` | Not defined | No emitter |
| operations | `economy.partner.registered` | Not defined | No emitter |
| community | `destination:created` | Not defined | No emitter |
| community | `locality:created` | Not defined | No emitter |

## Namespace Collision

**ENGAGEMENT_EVENTS** is defined in TWO different files:
1. `capabilities/engagement/engagement.events.js` — events like `engagement:created`, `engagement:triggered`
2. `capabilities/exploration/engagement/engagement.events.js` — events like `engagement:mission_started`, `eco:tokens_earned`

Both export `ENGAGEMENT_EVENTS`. This creates import conflicts and domain ambiguity.

## Intentional Duplicates (Alias Pattern)

| Event String | Canonical | Alias |
|---|---|---|
| `booking:created/updated/cancelled/confirmed/completed` | core/events.js | booking/booking.events.js |
| `notification:sent/failed/queued` | core/events.js | notifications/notification.events.js |

These are by design — core serves as single source of truth.

## Event Propagation Diagram

```
                    ┌─────────────────────┐
                    │   CORE EVENTBUS     │
                    │   (shared/events)   │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
  ┌─────┴─────┐         ┌─────┴─────┐         ┌─────┴─────┐
  │ Capability │         │ Capability │         │ Capability │
  │  Layer     │         │  Layer     │         │  Layer     │
  └─────┬─────┘         └─────┬─────┘         └─────┬─────┘
        │                      │                      │
  ┌─────┴─────┐         ┌─────┴─────┐         ┌─────┴─────┐
  │  Manager  │         │  Manager  │         │  Manager  │
  │  Events   │         │  Events   │         │  Events   │
  └───────────┘         └───────────┘         └───────────┘

Flow: Capability.on(Event) → Manager.process() → EventBus.emit(Event) → Other Capability.on(Event)

Standard Pattern: this.on(EVENT, handler) in activate(), this.off(EVENT) in deactivate()
Alternative Pattern: bus.on() / bus.off() with _setupEventListeners/_removeEventListeners (intelligence, governance, operations, identity)
```

## Recommendations

1. **CRITICAL**: Standardize event naming to ONE convention (recommend `domain:entity.action` with colons)
2. **CRITICAL**: Resolve 25+ orphan consumers — either add missing event definitions or update listener strings
3. **CRITICAL**: Remove or consolidate ~130 dead events
4. **HIGH**: Resolve ENGAGEMENT_EVENTS namespace collision between engagement/ and exploration/engagement/
5. **HIGH**: Add `ecology:*`, `economy:*`, `destination:*`, `locality:*` event definitions (orphan consumers expect these)
6. **MEDIUM**: Standardize all event listener patterns to this.on()/this.off()
7. **MEDIUM**: Add event payload schemas to all event definitions
8. **LOW**: Consider event versioning for backward compatibility

---
*Generated by P11.5 Ecosystem Core Consolidation — Event Mesh Validation*
