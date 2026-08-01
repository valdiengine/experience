# UPDATED-TECHNICAL-DEBT.md — Post-Stabilization Technical Debt

## Overview

Updated technical debt catalog after P11.6 Ecosystem Stabilization.
6 items resolved, 2 partially resolved. Active items reduced from 28 to 22.

---

## Debt Summary

| Category | P11.5 | P11.6 | Change |
|---|---|---|---|
| CRITICAL | 4 | 3 | -1 resolved |
| HIGH | 8 | 5 | -2 resolved, -1 partial |
| MEDIUM | 7 | 5 | -1 resolved, -1 partial |
| LOW | 5 | 5 | No change |
| FUTURE | 4 | 4 | No change |
| RESOLVED | 0 | 6 | +6 new |
| **TOTAL ACTIVE** | **28** | **22** | **-6** |

---

## RESOLVED (6)

### TD-025: Public Capability Does Not Extend BaseCapability ✅

- **Description:** capabilities/public/public.capability.js exported a plain object literal
- **Resolution:** Refactored to class extending BaseCapability with proper lifecycle methods
- **Status:** ✅ RESOLVED in P11.6
- **Verified:** Public capability now uses this.on(), this.emit(), this.eventBus

### TD-028: Systemic Upward Imports (engine/core → src/) ✅

- **Description:** 4 engine/core files imported from ../../src/ (architectural inversion)
- **Resolution:** All imports moved to shared/utils/dom.js, shared/filters.js, shared/comparator.js
- **Status:** ✅ RESOLVED in P11.6
- **Files Fixed:** engine.js, router.js, theme.js, loader.js

### TD-032: Code Duplication in engine.js ✅

- **Description:** EXCLUDE_FIELDS, inferFields, and EventBus duplicated from shared/
- **Resolution:** Removed duplicated code; imports from shared/ directly
- **Status:** ✅ RESOLVED in P11.6
- **Impact:** Changes to shared/ now propagate correctly

### TD-033: Missing Dependencies Declaration (4 capabilities) ✅

- **Description:** intelligence, governance, operations, identity didn't declare static dependencies
- **Resolution:** All 4 now declare `static dependencies = []` (empty — event-driven coupling)
- **Status:** ✅ RESOLVED in P11.6
- **Note:** Empty array is correct — these capabilities use EventBus for cross-capability communication

### TD-039: Missing deactivate() in onboarding ✅

- **Description:** onboarding capability had no deactivate() override
- **Resolution:** Added deactivate() method with proper event listener cleanup
- **Status:** ✅ RESOLVED in P11.6
- **Impact:** No more potential memory leaks

### TD-037: ENGAGEMENT_EVENTS Namespace Collision ✅

- **Description:** ENGAGEMENT_EVENTS defined in both engagement/ and exploration/engagement/
- **Resolution:** Exploration sub-module renamed to EXPLORATION_ENGAGEMENT_EVENTS
- **Status:** ✅ RESOLVED in P11.6
- **Files Updated:** engagement.events.js, exploration.capability.js, all consumers

---

## PARTIALLY RESOLVED (2)

### TD-026: Dead Events (~130 → ~120) ⚠️

- **Description:** Approximately 130 of ~420 event constants were defined but never consumed
- **Partial Resolution:** 10 events marked as `Reserved` (not removed) as future extension points
- **Remaining:** ~120 dead events still present
- **Status:** ⚠️ PARTIALLY RESOLVED
- **Rationale:** Reserved events are intentional extension points for:
  - Service worker integration (pwa-engine)
  - SEO analysis pipeline (seo)
  - Health alerting (observability)
  - Tenant lifecycle management (admin)
  - Provider error propagation (data)
- **Recommended Next Step:** Add consumers for remaining dead events or remove in P12

### TD-027: Orphan Consumers (25+ → ~21) ⚠️

- **Description:** Capability listeners expected event strings that didn't match any defined event
- **Partial Resolution:** 4 new event files created (ecology, economy, destination, locality) resolving 12 orphan consumers
- **Remaining:** ~21 orphan consumers with name mismatches (prefix/format issues)
- **Status:** ⚠️ PARTIALLY RESOLVED
- **Remaining Mismatches:**
  - identity → `community.memory.created` vs actual `memory:created` (prefix mismatch)
  - identity → `community.story.created` vs actual `community.story.created` (added in P11.6)
  - identity → `exploration.activity.completed` vs actual `explorer:completed_experience`
  - identity → `exploration.place.discovered` vs actual `explorer:visited_place`
  - governance → `community.content.reported` vs actual `community:content_flagged`
  - governance → `engagement.badge.earned` vs actual `badge:awarded`
  - intelligence → `exploration.place.discovered` vs actual `explorer:visited_place`
  - intelligence → `exploration.species.observed` vs actual `explorer:discovered_species`
  - intelligence → `exploration.activity.completed` vs actual `explorer:completed_experience`
  - operations → `community.memory.created` vs actual `memory:created`
  - operations → `exploration.place.discovered` vs actual `explorer:visited_place`
- **Recommended Next Step:** Standardize event names across all capabilities in P12

---

## CRITICAL (3 remaining)

### TD-022: No Authentication System

- **Description:** No JWT, no session management, no login capability, no role-based access control
- **Risk:** All endpoints are publicly accessible; no tenant isolation enforcement
- **Impact:** Cannot deploy to production; cannot serve real customers
- **Recommended Fix:** Implement auth capability with JWT tokens, RBAC, middleware
- **Priority:** CRITICAL — prerequisite for P12

### TD-023: No Database / Persistence Layer

- **Description:** All data stored in-memory Maps; lost on page reload
- **Risk:** Data loss on every session; no multi-device sync; no audit trail
- **Impact:** Platform is a prototype, not a product
- **Recommended Fix:** Implement PostgreSQL/MongoDB provider for DataManager
- **Priority:** CRITICAL — prerequisite for P12

### TD-024: No Testing Infrastructure

- **Description:** Zero test files across entire codebase; no test framework configured
- **Risk:** No regression protection; no confidence in changes; no CI/CD possible
- **Impact:** Every code change is a risk; velocity decreases as codebase grows
- **Recommended Fix:** Add Vitest/Jest, unit tests for shared/, integration tests for capabilities
- **Priority:** CRITICAL — prerequisite for production

---

## HIGH (5 remaining)

### TD-026: Dead Events ⚠️ (Partial)

- **Status:** ⚠️ PARTIALLY RESOLVED — 10 marked Reserved, ~120 remain
- See PARTIALLY RESOLVED section above for details

### TD-027: Orphan Consumers ⚠️ (Partial)

- **Status:** ⚠️ PARTIALLY RESOLVED — 12 resolved via new event files, ~21 remain
- See PARTIALLY RESOLVED section above for details

### TD-029: Business Logic in Shared Layer

- **Description:** shared/constants/labels.js contains 24 domain-specific labels (drone, video, client)
- **Risk:** Shared layer is no longer business-agnostic; cannot be reused for other domains
- **Impact:** Violates fundamental architectural principle
- **Recommended Fix:** Move domain labels to business/ or capability-specific constants
- **Priority:** HIGH

### TD-030: Business Logic in Core Engine

- **Description:** engine/core/engine.js hardcodes drone status mapping, "Dronestica" brand, battery/price formatting
- **Risk:** Engine is coupled to specific business domain; cannot be generalized
- **Impact:** Engine cannot be used for non-drone businesses
- **Recommended Fix:** Extract to config files or capability-provided formatters
- **Priority:** HIGH

### TD-031: Hardcoded Tenant Configuration

- **Description:** engine/core/bootstrap.js hardcodes Dronestica tenant config (id, name, colors, capabilities)
- **Risk:** Cannot onboard new tenants without code changes
- **Impact:** Multi-tenant architecture is theoretical only
- **Recommended Fix:** Load tenant config from API/database at bootstrap
- **Priority:** HIGH

---

## MEDIUM (5 remaining)

### TD-034: Dual Event Naming Convention

- **Description:** 18 files use colon notation, 4 use dot notation
- **Risk:** Confusion about which convention to follow
- **Recommended Fix:** Standardize to one convention (recommend domain:entity.action with colons)
- **Priority:** MEDIUM

### TD-035: Folder-ID Mismatches

- **Description:** operations/ folder registered as 'destination-operations'; identity/ as 'destination-identity'
- **Risk:** Confusion when navigating codebase
- **Recommended Fix:** Rename folders OR change registered IDs to match
- **Priority:** MEDIUM

### TD-036: Inconsistent Export Patterns

- **Description:** 13 use export default, 11 use named only, 1 uses plain object
- **Risk:** Import style inconsistency across codebase
- **Recommended Fix:** Standardize all to export class + export default
- **Priority:** MEDIUM

### TD-038: Dual Event File in seo-intelligence

- **Description:** seo-intelligence has both seo-intelligence.events.js and seo/seo.events.js
- **Risk:** Confusion about which events file to use
- **Recommended Fix:** Merge or remove seo/seo.events.js
- **Priority:** MEDIUM

### TD-040: Context Mutation in lifecycle

- **Description:** lifecycle capability mutates shared context: context.lifecycle = this
- **Risk:** Side effect on shared object; potential conflicts
- **Recommended Fix:** Remove mutation; use capabilities.get('lifecycle') instead
- **Priority:** MEDIUM

---

## LOW (5 items — no change)

### TD-041: Missing READMEs (2 capabilities)
- pwa and owner capabilities lack README.md files
- **Priority:** LOW

### TD-042: 3 Unregistered Placeholder Capabilities
- catalog, gallery, payments exist as folders but are not in register.js
- **Priority:** LOW

### TD-043: Hardcoded localStorage Keys
- engine/core/theme.js uses 'dronestica-theme' as storage key
- **Priority:** LOW

### TD-044: Inconsistent Event Listener Patterns
- Some capabilities use this.on(), others use bus.on() with _setupEventListeners
- **Priority:** LOW

### TD-045: Spanish Hardcoded in format.js
- formatValue() hardcodes 'Sí'/'No' for booleans
- **Priority:** LOW

---

## FUTURE (4 items — no change)

### TD-046: No WebSocket / Real-time Layer
- All communication is in-process EventBus; no cross-tab or server push
- **Priority:** FUTURE — P13+

### TD-047: No Service Worker Implementation
- PWA capabilities exist but no actual service-worker.js registered
- **Priority:** FUTURE — P12+

### TD-048: No Internationalization Framework
- Labels hardcoded in Spanish; no i18n system
- **Priority:** FUTURE — P13+

### TD-049: No Analytics Pipeline
- Intelligence, conversion, engagement have analytics managers but no data pipeline
- **Priority:** FUTURE — P13+

---

## Debt Trajectory

```
P11.5:  28 active items (4 CRITICAL, 8 HIGH, 7 MEDIUM, 5 LOW, 4 FUTURE)
P11.6:  22 active items (3 CRITICAL, 5 HIGH, 5 MEDIUM, 5 LOW, 4 FUTURE)
        + 6 RESOLVED, 2 PARTIALLY RESOLVED

Reduction: 21.4% fewer active items
```

---

*Generated by P11.6 Ecosystem Stabilization — Technical Debt Update*
*Previous: TECHNICAL-DEBT-REPORT.md (P11.5)*
*Status: 6 RESOLVED, 2 PARTIALLY RESOLVED, 22 ACTIVE*
