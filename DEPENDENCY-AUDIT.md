# DEPENDENCY-AUDIT.md — Dependency Graph Analysis

## Overview
- All imports inspected across capabilities, shared, core, providers
- Rules checked: no upward imports, no sibling capability imports, only context.capabilities.get() or EventBus for cross-capability communication

## Declared Capability Dependencies

```
booking          → (none)
notifications    → (none)
pwa              → (none)
cms              → (none)
communication    → (none)
availability     → communication
intelligence     → NOT DECLARED (should depend on: exploration, community, ecology, reservation)
reservation      → booking, availability, communication, notifications
scheduler        → (none)
observability    → scheduler
onboarding       → (none)
owner            → reservation, availability, communication, observability
engagement       → communication, availability, reservation, intelligence, notifications, scheduler, observability
conversion       → communication, engagement, reservation, availability, intelligence, observability
public           → cms, pwa, reservation, communication, engagement
seo-intelligence → cms, public, observability, intelligence
pwa-engine       → notifications, communication, public, observability
admin            → onboarding, reservation, availability, cms, seo-intelligence, pwa-engine, observability
saas             → (none)
billing          → saas
lifecycle        → saas, billing, communication, engagement, observability
community        → (none)
exploration      → (none)
governance       → NOT DECLARED (should depend on: community, exploration, ecology, engagement)
operations       → NOT DECLARED (should depend on: community, exploration, ecology, reservation, governance)
identity         → NOT DECLARED (should depend on: community, exploration, ecology, governance)
```

## Dependency Graph (ASCII)

```
Level 0 (no deps):     booking, notifications, pwa, cms, communication, scheduler, onboarding, saas, community, exploration
Level 1 (1 dep):       availability→communication, billing→saas, observability→scheduler
Level 2 (2-3 deps):    reservation→[booking,availability,communication,notifications]
Level 3 (4-5 deps):    owner→[reservation,availability,communication,observability]
                        seo-intelligence→[cms,public,observability,intelligence]
                        pwa-engine→[notifications,communication,public,observability]
                        lifecycle→[saas,billing,communication,engagement,observability]
Level 4 (6+ deps):     engagement→[communication,availability,reservation,intelligence,notifications,scheduler,observability]
                        conversion→[communication,engagement,reservation,availability,intelligence,observability]
                        public→[cms,pwa,reservation,communication,engagement]
Level 5 (7+ deps):     admin→[onboarding,reservation,availability,cms,seo-intelligence,pwa-engine,observability]
```

## Circular Dependency Check

Result: **NO CIRCULAR DEPENDENCIES DETECTED**

The dependency graph is a Directed Acyclic Graph (DAG). All dependencies flow downward from simpler capabilities to more complex ones.

## Import Violations

### CRITICAL: Upward Imports (engine/core → src/)

4 files in engine/core/ import from ../../src/ which is an architectural inversion:

| File | Imports From | What |
|---|---|---|
| engine/core/engine.js | ../../src/utils.js | el, elAttr, clear, $, $$, sanitize, getIcon, getLabel, formatValue, getType, debounce, trapFocus, observeOnce, resolveContainer |
| engine/core/engine.js | ../../src/filters.js | Filters |
| engine/core/engine.js | ../../src/comparator.js | Comparator |
| engine/core/router.js | ../../src/utils.js | $, $$, announce |
| engine/core/theme.js | ../../src/utils.js | $ |
| engine/core/loader.js | ../../src/utils.js | $ |
| engine/core/bootstrap.js | ../../src/ui.js | UIManager |

**Root Cause:** The DOM utilities ($, $$, announce, etc.) exist in shared/utils/dom.js but are ALSO re-exported through src/utils.js. Core should import from shared/ directly.

### CRITICAL: Upward Imports (engine/core → capabilities/)

| File | Imports From | What |
|---|---|---|
| engine/core/bootstrap.js | ../../capabilities/tenant/manager.js | TenantManager |
| engine/core/bootstrap.js | ../../capabilities/core/loader.js | CapabilityLoader |
| engine/core/bootstrap.js | ../../capabilities/core/register.js | createAllCapabilities |

**Note:** These are bootstrap/wiring imports that are architecturally necessary for the engine to initialize capabilities. Acceptable but should be documented.

### HIGH: Business Logic in shared/

| File | Violation |
|---|---|
| shared/constants/labels.js | 24 domain-specific labels (drone: battery, altitude, heading; video: codec, bitDepth, chroma; business: client, director) |
| shared/utils/format.js | Hardcoded Spanish strings 'Sí'/'No' for booleans |

### HIGH: Business Logic in engine/core/

| File | Violation | Status |
|---|---|---|
| engine/core/engine.js | Hardcoded drone status mapping (flying→success, idle→warning), "Dronestica" brand, battery/price formatting | ✅ RESOLVED - Hero title now reads from window.DATA |
| engine/core/bootstrap.js | Hardcoded tenant config: id='dronestica', colors, capabilities list | ✅ RESOLVED - Imports from config/product.config.js |
| engine/core/theme.js | Hardcoded 'dronestica-theme' localStorage key | ✅ RESOLVED - Uses PLATFORM_CONFIG.theme.storageKey |
| engine/core/loader.js | Hardcoded "Dronestica" display text | ✅ RESOLVED - Uses PRODUCT_CONFIG.name |

### HIGH: Business Domain Data in engine/data/

| File | Violation |
|---|---|
| engine/data/categories.js | Domain categories (drone, client, destination, style, pace) |
| engine/data/status.js | Domain statuses (DRONE_STATUS, MISSION_STATUS, PROJECT_STATUS) |

## Hidden Dependencies

| Capability | Hidden Dependency | Evidence |
|---|---|---|
| intelligence | exploration, community, ecology | Listens to exploration.place.discovered, community.memory.created, ecology.observation.created |
| governance | community, exploration, ecology | Listens to community.content.reported, exploration.place.discovered, ecology.observation.created |
| operations | community, exploration, ecology, reservation | Listens to community.memory.created, exploration.place.discovered, ecology.observation.created, reservation.confirmed |
| identity | community, exploration, ecology | Listens to community.memory.created, community.story.created, ecology.heritage.added, exploration.place.discovered |
| community | destination, locality | Listens to destination:created, locality:created |

These capabilities consume events from other capabilities but don't declare those as dependencies. This is by design (event-driven loose coupling) but should be documented.

## Unused Dependencies

| Capability | Declared Dependency | Evidence |
|---|---|---|
| pwa | (none declared) | No capability imports pwa directly; only consumed via event bus |
| saas | (none declared) | No capability imports saas directly; only consumed via event bus |

These are correct — dependencies are for initialization order, not direct imports.

## Duplicate Dependencies

| Capability | Duplicate | Issue |
|---|---|---|
| engagement | communication, availability, reservation | Also declared by owner, conversion |
| conversion | communication, engagement, reservation, availability, intelligence | Large dependency set; consider if all are needed for init order |

## Code Duplication in Dependencies

| Original | Duplicated In | What |
|---|---|---|
| shared/constants/status.js (EXCLUDE_FIELDS) | engine/core/engine.js line 81 | Same Set duplicated |
| shared/schema/normalize.js (inferFields) | engine/core/engine.js lines 83-90 | Same function duplicated |
| shared/events/eventbus.js (createEventBus) | engine/core/engine.js lines 44-57 | EventBus implementation duplicated |

## Recommendations

1. **CRITICAL**: Move DOM utility imports in core/ from ../../src/utils.js to ../../shared/utils/dom.js
2. **CRITICAL**: Document hidden event-driven dependencies in capability metadata
3. **HIGH**: Remove duplicated code in engine/core/engine.js (use shared/ imports)
4. **HIGH**: Extract business logic from engine/core/ to config files or capability layer
5. **HIGH**: Move domain labels from shared/constants/labels.js to business layer
6. **MEDIUM**: Add `static dependencies` to intelligence, governance, operations, identity
7. **MEDIUM**: Consider reducing engagement dependency count (7 deps) — some may be unnecessary for init order
8. **LOW**: Document bootstrap imports from capabilities/ as architecturally necessary

---
*Generated by P11.5 Ecosystem Core Consolidation — Dependency Audit*
