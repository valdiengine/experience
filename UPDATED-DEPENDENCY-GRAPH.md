# UPDATED-DEPENDENCY-GRAPH.md — Post-Stabilization Dependency State

## Overview

- All 26 capabilities audited after P11.6 Ecosystem Stabilization
- 4 missing dependency declarations now added
- 4 upward import violations now resolved
- Code duplication in engine.js removed
- Status: **CLEAN** — all P11.5 critical/high dependency issues resolved

---

## Updated Capability Dependencies

```
booking          → (none)
notifications    → (none)
pwa              → (none)
cms              → (none)
communication    → (none)
scheduler        → (none)
onboarding       → (none)
saas             → (none)
community        → (none)
exploration      → (none)
availability     → communication
billing          → saas
observability    → scheduler
intelligence     → []                          ← FIXED: was NOT DECLARED
governance       → []                          ← FIXED: was NOT DECLARED
operations       → []                          ← FIXED: was NOT DECLARED
identity         → []                          ← FIXED: was NOT DECLARED
reservation      → booking, availability, communication, notifications
owner            → reservation, availability, communication, observability
engagement       → communication, availability, reservation, intelligence, notifications, scheduler, observability
conversion       → communication, engagement, reservation, availability, intelligence, observability
public           → cms, pwa, reservation, communication, engagement
seo-intelligence → cms, public, observability, intelligence
pwa-engine       → notifications, communication, public, observability
admin            → onboarding, reservation, availability, cms, seo-intelligence, pwa-engine, observability
lifecycle        → saas, billing, communication, engagement, observability
```

**Note:** intelligence, governance, operations, and identity declare empty static dependencies `[]` because their runtime dependencies are event-driven (loose coupling via EventBus). They consume events from other capabilities but do not require those capabilities to be initialized first.

---

## Resolved Issues from P11.5

### ✅ CRITICAL: Upward Imports (engine/core → src/) — RESOLVED

4 engine/core files previously imported from `../../src/` (architectural inversion). All imports now route through `shared/`:

| File | Was Importing From | Now Imports From | Status |
|---|---|---|---|
| engine/core/engine.js | ../../src/utils.js | shared/utils/dom.js | ✅ FIXED |
| engine/core/engine.js | ../../src/filters.js | shared/filters.js | ✅ FIXED |
| engine/core/engine.js | ../../src/comparator.js | shared/comparator.js | ✅ FIXED |
| engine/core/router.js | ../../src/utils.js | shared/utils/dom.js | ✅ FIXED |
| engine/core/theme.js | ../../src/utils.js | shared/utils/dom.js | ✅ FIXED |
| engine/core/loader.js | ../../src/utils.js | shared/utils/dom.js | ✅ FIXED |

### ✅ HIGH: Code Duplication in engine.js — RESOLVED

| Duplicated Code | Original Location | Resolution |
|---|---|---|
| EXCLUDE_FIELDS Set | shared/constants/status.js | Removed from engine.js; import from shared/ |
| inferFields() function | shared/schema/normalize.js | Removed from engine.js; import from shared/ |
| EventBus implementation | shared/events/eventbus.js | Removed from engine.js; import from shared/ |

### ✅ HIGH: Missing Dependencies Declaration — RESOLVED

| Capability | Was | Now | Reason |
|---|---|---|---|
| intelligence | NOT DECLARED | `[]` (empty) | Event-driven coupling only |
| governance | NOT DECLARED | `[]` (empty) | Event-driven coupling only |
| operations | NOT DECLARED | `[]` (empty) | Event-driven coupling only |
| identity | NOT DECLARED | `[]` (empty) | Event-driven coupling only |

---

## Dependency Graph (ASCII)

```
Level 0 (no deps):     booking, notifications, pwa, cms, communication,
                        scheduler, onboarding, saas, community, exploration,
                        intelligence, governance, operations, identity
                        (14 capabilities)

Level 1 (1 dep):       availability→communication
                        billing→saas
                        observability→scheduler
                        (3 capabilities)

Level 2 (2-3 deps):    reservation→[booking, availability, communication,
                        notifications]
                        (1 capability)

Level 3 (4-5 deps):    owner→[reservation, availability, communication,
                        observability]
                        seo-intelligence→[cms, public, observability,
                        intelligence]
                        pwa-engine→[notifications, communication, public,
                        observability]
                        lifecycle→[saas, billing, communication, engagement,
                        observability]
                        (4 capabilities)

Level 4 (6+ deps):     engagement→[communication, availability, reservation,
                        intelligence, notifications, scheduler, observability]
                        conversion→[communication, engagement, reservation,
                        availability, intelligence, observability]
                        public→[cms, pwa, reservation, communication,
                        engagement]
                        (3 capabilities)

Level 5 (7+ deps):     admin→[onboarding, reservation, availability, cms,
                        seo-intelligence, pwa-engine, observability]
                        (1 capability)
```

---

## Layer Architecture Compliance

```
┌──────────────────────────────────────────────────────────┐
│                    L0: shared/                            │
│          (ZERO business knowledge, ZERO imports)         │
│  dom.js, format.js, labels.js, status.js, eventbus.js   │
└──────────────────────┬───────────────────────────────────┘
                       │ only import from L0
┌──────────────────────┴───────────────────────────────────┐
│                  L1: engine/core/                         │
│           (imports shared/ only, no upward)              │
│    engine.js, router.js, theme.js, loader.js, bootstrap │
│    ✅ All upward imports resolved in P11.6               │
└──────────────────────┬───────────────────────────────────┘
                       │ imports L0
┌──────────────────────┴───────────────────────────────────┐
│              L4: capabilities/                            │
│     (26 capabilities, cross-cap via context.get())       │
│                                                          │
│  ┌─────────┐ ┌──────────┐ ┌─────────────┐              │
│  │ booking │ │ saas     │ │ community   │              │
│  │  (L0)   │ │  (L0)    │ │   (L0)      │              │
│  └────┬────┘ └────┬─────┘ └─────┬───────┘              │
│       │           │              │                       │
│  ┌────┴───────────┴──────────────┴───────────────┐      │
│  │        availability, billing, scheduler,      │      │
│  │        observability, exploration, ...         │      │
│  │                  (L1 deps)                     │      │
│  └────────────────────┬──────────────────────────┘      │
│                       │                                  │
│  ┌────────────────────┴──────────────────────────┐      │
│  │         reservation, owner, lifecycle          │      │
│  │              (L2-L3 deps)                      │      │
│  └────────────────────┬──────────────────────────┘      │
│                       │                                  │
│  ┌────────────────────┴──────────────────────────┐      │
│  │   engagement, conversion, public, seo, pwa    │      │
│  │              (L4 deps)                         │      │
│  └────────────────────┬──────────────────────────┘      │
│                       │                                  │
│  ┌────────────────────┴──────────────────────────┐      │
│  │            admin (L5 — top level)              │      │
│  └───────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────┘
```

---

## Circular Dependency Check

Result: **NO CIRCULAR DEPENDENCIES**

The dependency graph remains a valid Directed Acyclic Graph (DAG). All dependencies flow from simpler (Level 0) to more complex (Level 5) capabilities.

---

## Remaining Notes (Non-blocking)

| Item | Status | Action Required |
|---|---|---|
| Hidden event-driven dependencies (intelligence, governance, operations, identity) | Documented | None — by design (loose coupling) |
| Business logic in shared/constants/labels.js | Deferred to P12 | Move domain labels to capability layer |
| Business logic in engine/core/engine.js | Deferred to P12 | Extract drone status mapping to config |
| Hardcoded tenant config in bootstrap.js | Deferred to P12 | Load from API/database |
| Unused dependencies (pwa, saas as standalone) | Correct | No action — init order only |

---

*Generated by P11.6 Ecosystem Stabilization — Dependency Graph Update*
*Previous: DEPENDENCY-AUDIT.md (P11.5)*
*Status: CLEAN — all critical/high issues resolved*
