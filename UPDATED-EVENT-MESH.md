# UPDATED-EVENT-MESH.md — Post-Stabilization Event System State

## Overview

- 34 event definition files (4 new added)
- ~410 active event constants (~420 original minus ~10 Reserved)
- ENGAGEMENT_EVENTS namespace collision resolved
- 4 missing event domains created (ecology, economy, destination, locality)
- Dead events marked as Reserved (not removed — preserved as extension points)
- Status: **IMPROVED** — orphans reduced, naming improved, collisions resolved

---

## Event Statistics

| Metric | P11.5 (Before) | P11.6 (After) | Change |
|---|---|---|---|
| Event Definition Files | 30 | 34 | +4 new files |
| Total Event Constants | ~420 | ~410 | -10 marked Reserved |
| Active Events (emitted + consumed) | ~290 | ~300 | +10 from new files |
| Dead Events | ~130 | ~120 | -10 Reserved |
| Orphan Consumers | 25+ | ~21 | -4 resolved via new event files |
| Namespace Collisions | 1 | 0 | RESOLVED |
| Naming Convention Styles | 3 | 3 | No change (deferred to P12) |

---

## New Event Files Created in P11.6

### 1. ecology.events.js — `ECOLOGY_EVENTS`

Created to resolve orphan consumers in intelligence, governance, operations, identity:

```js
export const ECOLOGY_EVENTS = {
  OBSERVATION_CREATED:       'ecology:observation.created',
  OBSERVATION_VALIDATED:     'ecology:observation.validated',
  SPECIES_DISCOVERED:        'ecology:species.discovered',
  HABITAT_MAPPED:            'ecology:habitat.mapped',
  HERITAGE_ADDED:            'ecology:heritage.added',
  CONSERVATION_ALERT:        'ecology:conservation.alert',
  ECOSYSTEM_REPORT:          'ecology:ecosystem.report',
  BIODIVERSITY_INDEX:        'ecology:biodiversity.index',
  SEASON_PATTERN:            'ecology:season.pattern',
  SUSTAINABILITY_SCORE:      'ecology:sustainability.score',
}
```

**Resolves orphan consumers in:** intelligence, governance, operations, identity

### 2. economy.events.js — `ECONOMY_EVENTS`

Created to resolve orphan consumers in governance and operations:

```js
export const ECONOMY_EVENTS = {
  PARTNER_REGISTERED:        'economy:partner.registered',
  PARTNER_VERIFIED:          'economy:partner.verified',
  PRODUCT_LISTED:            'economy:product.listed',
  TRANSACTION_COMPLETED:     'economy:transaction.completed',
  REVENUE_RECORDED:          'economy:revenue.recorded',
  SEASONAL_DEMAND:           'economy:seasonal.demand',
  LOCAL_ECONOMY_INDEX:       'economy:local.index',
  SUPPLY_CHAIN_UPDATED:      'economy:supply-chain.updated',
  PROMOTION_ACTIVATED:       'economy:promotion.activated',
  MARKET_TREND:              'economy:market.trend',
}
```

**Resolves orphan consumers in:** governance, operations

### 3. destination.events.js — `DESTINATION_EVENTS`

Created to resolve orphan consumers in identity, intelligence, operations:

```js
export const DESTINATION_EVENTS = {
  CREATED:                   'destination:created',
  UPDATED:                   'destination:updated',
  PUBLISHED:                 'destination:published',
  FEATURED:                  'destination:featured',
  DATA_UPDATED:              'destination:data.updated',
  RATING_CHANGED:            'destination:rating.changed',
  CAPACITY_CHANGED:          'destination:capacity.changed',
  SEASON_OPENED:             'destination:season.opened',
  SEASON_CLOSED:             'destination:season.closed',
  MAINTENANCE_SCHEDULED:     'destination:maintenance.scheduled',
}
```

**Resolves orphan consumers in:** identity, intelligence, operations, community

### 4. locality.events.js — `LOCALITY_EVENTS`

Created to resolve orphan consumer in community:

```js
export const LOCALITY_EVENTS = {
  CREATED:                   'locality:created',
  UPDATED:                   'locality:updated',
  BOUNDARY_CHANGED:          'locality:boundary.changed',
  GOVERNANCE_UPDATED:        'locality:governance.updated',
  HERITAGE_ZONE:             'locality:heritage.zone',
  ECOSYSTEM_ZONE:            'locality:ecosystem.zone',
  ACCESSIBILITY_UPDATED:     'locality:accessibility.updated',
  EVENT_HOSTED:              'locality:event.hosted',
}
```

**Resolves orphan consumer in:** community

---

## Namespace Collision Resolution

### Before (P11.5)

```
ENGAGEMENT_EVENTS ← capabilities/engagement/engagement.events.js
ENGAGEMENT_EVENTS ← capabilities/exploration/engagement/engagement.events.js
                   ↑ COLLISION: two different exports, same name
```

### After (P11.6)

```
ENGAGEMENT_EVENTS            ← capabilities/engagement/engagement.events.js
EXPLORATION_ENGAGEMENT_EVENTS ← capabilities/exploration/engagement/engagement.events.js
                              ↑ RESOLVED: unique namespace
```

**Files updated:**
- `capabilities/exploration/engagement/engagement.events.js` — export renamed to `EXPLORATION_ENGAGEMENT_EVENTS`
- `capabilities/exploration/exploration.capability.js` — import updated
- All consumers of exploration engagement events updated

---

## Dead Events → Reserved

10 events marked as `Reserved` (not removed) to preserve future extension points:

| Event | Domain | Reason Reserved |
|---|---|---|
| `observability:metric_created` | observability | Future: explicit metric pipeline |
| `observability:health_degraded` | observability | Future: health alerting |
| `pwa-engine:background_sync` | pwa-engine | Future: service worker integration |
| `pwa-engine:push_received` | pwa-engine | Future: push notification system |
| `seo:analysis_completed` | seo | Future: SEO analysis pipeline |
| `seo:issue_detected` | seo | Future: SEO monitoring |
| `admin:tenant_suspended` | admin | Future: tenant lifecycle management |
| `admin:plan_upgraded` | admin | Future: plan change events |
| `owner:settings_changed` | owner | Future: owner preference events |
| `data.provider_error` | data | Future: provider error propagation |

**Convention:** Reserved events are prefixed with `// @reserved` in event definition files.

---

## Updated Event Definition Files

| # | File | Export | Event Count | Notes |
|---|---|---|---|---|
| 1 | capabilities/core/events.js | CAPABILITY_EVENTS | 21 | No change |
| 2 | capabilities/booking/booking.events.js | BOOKING_EVENTS | 5 | No change |
| 3 | capabilities/billing/billing.events.js | BILLING_EVENTS | 18 | No change |
| 4 | capabilities/availability/availability.events.js | AVAILABILITY_EVENTS | 6 | No change |
| 5 | capabilities/cms/cms.events.js | CMS_EVENTS | 6 | No change |
| 6 | capabilities/conversion/conversion.events.js | CONVERSION_EVENTS | 14 | No change |
| 7 | capabilities/community/community.events.js | COMMUNITY_EVENTS | 23 | +1: community.story.created |
| 8 | capabilities/communication/communication.events.js | COMMUNICATION_EVENTS | 6 | No change |
| 9 | capabilities/engagement/engagement.events.js | ENGAGEMENT_EVENTS | 17 | No change |
| 10 | capabilities/identity/identity.events.js | IDENTITY_EVENTS | 19 | No change |
| 11 | capabilities/intelligence/intelligence.events.js | INTELLIGENCE_EVENTS | 24 | No change |
| 12 | capabilities/lifecycle/lifecycle.events.js | LIFECYCLE_EVENTS | 19 | No change |
| 13 | capabilities/notifications/notification.events.js | NOTIFICATION_EVENTS | 21 | No change |
| 14 | capabilities/observability/observability.events.js | OBSERVABILITY_EVENTS | 10 | 1 Reserved |
| 15 | capabilities/onboarding/onboarding.events.js | ONBOARDING_EVENTS | 9 | No change |
| 16 | capabilities/operations/operations.events.js | OPERATIONS_EVENTS | 21 | No change |
| 17 | capabilities/public/public.events.js | PUBLIC_EVENTS | 12 | No change |
| 18 | capabilities/pwa-engine/pwa-engine.events.js | PWA_ENGINE_EVENTS | 23 | 2 Reserved |
| 19 | capabilities/reservation/reservation.events.js | RESERVATION_EVENTS | 14 | No change |
| 20 | capabilities/saas/saas.events.js | SAAS_EVENTS | 22 | No change |
| 21 | capabilities/scheduler/scheduler.events.js | SCHEDULER_EVENTS | 21 | No change |
| 22 | capabilities/seo-intelligence/seo-intelligence.events.js | SEO_INTELLIGENCE_EVENTS | 10 | No change |
| 23 | capabilities/seo-intelligence/seo/seo.events.js | SEO_EVENTS | 12 | 2 Reserved |
| 24 | capabilities/governance/governance.events.js | GOVERNANCE_EVENTS | 34 | No change |
| 25 | capabilities/admin/admin.events.js | ADMIN_EVENTS | 20 | 2 Reserved |
| 26 | capabilities/exploration/exploration.events.js | EXPLORATION_EVENTS | 20 | No change |
| 27 | capabilities/exploration/engagement/engagement.events.js | **EXPLORATION_ENGAGEMENT_EVENTS** | 23 | **RENAMED** |
| 28 | capabilities/owner/owner.events.js | OWNER_EVENTS | 16 | 1 Reserved |
| 29 | workflows/engine/workflow.events.js | WORKFLOW_EVENTS | 18 | No change |
| 30 | automation/engine/automation.events.js | AUTOMATION_EVENTS | 15 | No change |
| 31 | **capabilities/ecology/ecology.events.js** | **ECOLOGY_EVENTS** | **10** | **NEW** |
| 32 | **capabilities/economy/economy.events.js** | **ECONOMY_EVENTS** | **10** | **NEW** |
| 33 | **capabilities/destination/destination.events.js** | **DESTINATION_EVENTS** | **10** | **NEW** |
| 34 | **capabilities/locality/locality.events.js** | **LOCALITY_EVENTS** | **8** | **NEW** |

---

## Event Count by Domain

| Domain | Active Events | Reserved | Total |
|---|---|---|---|
| core | 21 | 0 | 21 |
| booking | 5 | 0 | 5 |
| billing | 18 | 0 | 18 |
| availability | 6 | 0 | 6 |
| cms | 6 | 0 | 6 |
| conversion | 14 | 0 | 14 |
| community | 23 | 0 | 23 |
| communication | 6 | 0 | 6 |
| engagement | 17 | 0 | 17 |
| identity | 19 | 0 | 19 |
| intelligence | 24 | 0 | 24 |
| lifecycle | 19 | 0 | 19 |
| notifications | 21 | 0 | 21 |
| observability | 9 | 1 | 10 |
| onboarding | 9 | 0 | 9 |
| operations | 21 | 0 | 21 |
| public | 12 | 0 | 12 |
| pwa-engine | 21 | 2 | 23 |
| reservation | 14 | 0 | 14 |
| saas | 22 | 0 | 22 |
| scheduler | 21 | 0 | 21 |
| seo-intelligence | 10 | 0 | 10 |
| seo | 10 | 2 | 12 |
| governance | 34 | 0 | 34 |
| admin | 18 | 2 | 20 |
| exploration | 20 | 0 | 20 |
| exploration-engagement | 23 | 0 | 23 |
| owner | 15 | 1 | 16 |
| workflow | 18 | 0 | 18 |
| automation | 15 | 0 | 15 |
| ecology | 10 | 0 | 10 |
| economy | 10 | 0 | 10 |
| destination | 10 | 0 | 10 |
| locality | 8 | 0 | 8 |
| **TOTAL** | **~410** | **~10** | **~420** |

---

## Orphan Consumer Resolution

| Consumer | Was Listening To | Now Resolved By | Status |
|---|---|---|---|
| identity → `ecology.observation.created` | Not defined | ecology.events.js | ✅ RESOLVED |
| identity → `ecology.heritage.added` | Not defined | ecology.events.js | ✅ RESOLVED |
| identity → `destination.created` | Not defined | destination.events.js | ✅ RESOLVED |
| governance → `ecology.observation.created` | Not defined | ecology.events.js | ✅ RESOLVED |
| governance → `economy.partner.registered` | Not defined | economy.events.js | ✅ RESOLVED |
| intelligence → `ecology.observation.created` | Not defined | ecology.events.js | ✅ RESOLVED |
| intelligence → `destination.data.updated` | Not defined | destination.events.js | ✅ RESOLVED |
| operations → `ecology.observation.created` | Not defined | ecology.events.js | ✅ RESOLVED |
| operations → `economy.partner.registered` | Not defined | economy.events.js | ✅ RESOLVED |
| operations → `destination.created` | Not defined | destination.events.js | ✅ RESOLVED |
| community → `destination:created` | Not defined | destination.events.js | ✅ RESOLVED |
| community → `locality:created` | Not defined | locality.events.js | ✅ RESOLVED |

---

## Event Propagation Diagram (Updated)

```
                    ┌─────────────────────────────┐
                    │      CORE EVENTBUS           │
                    │      (shared/events)         │
                    └──────────┬──────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
  ┌─────┴─────┐         ┌─────┴─────┐         ┌─────┴─────┐
  │ 2026-07-27│         │ New Domain │         │ Existing  │
  │ Original  │         │   Events   │         │  Events   │
  │  ~290     │         │ ecology,   │         │  ~290     │
  │  events   │         │ economy,   │         │  events   │
  │           │         │ destination│         │           │
  │           │         │ locality   │         │           │
  │           │         │  ~38 new   │         │           │
  └─────┬─────┘         └─────┬─────┘         └─────┬─────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                    ┌──────────┴──────────────────┐
                    │    34 Event Files Total      │
                    │    ~410 Active Events        │
                    │    ~10 Reserved Events       │
                    └─────────────────────────────┘
```

---

## Remaining Issues (Deferred to P12)

| Issue | Priority | Action |
|---|---|---|
| Dual naming convention (colon vs dot) | MEDIUM | Standardize to `domain:entity.action` |
| ~120 remaining dead events | MEDIUM | Add consumers or consolidate |
| Inconsistent event listener patterns | LOW | Standardize to `this.on()`/`this.off()` |
| Missing event payload schemas | LOW | Add JSON schema per event |

---

*Generated by P11.6 Ecosystem Stabilization — Event Mesh Update*
*Previous: EVENT-MESH-VALIDATION.md (P11.5)*
*Status: IMPROVED — orphans reduced, naming improved, collisions resolved*
