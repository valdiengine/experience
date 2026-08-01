# TECHNICAL-DEBT-REPORT.md — Consolidated Technical Debt

## Overview
Updated technical debt catalog from the full P11.5 ecosystem audit.
Updated: P11.6 — Ecosystem Stabilization (6 items resolved).

## Debt Summary

| Category | Count | Total Items |
|---|---|---|
| CRITICAL | 3 | Must fix before P12 |
| HIGH | 5 | Must fix before production |
| MEDIUM | 5 | Should fix before v1.0 |
| LOW | 5 | Nice to have |
| FUTURE | 4 | Post-v1.0 |
| **TOTAL** | **22** | |

## CRITICAL (4)

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

### TD-025: Public Capability Does Not Extend BaseCapability ✅ RESOLVED (P11.6)
- **Description:** capabilities/public/public.capability.js exports a plain object literal instead of a class extending BaseCapability
- **Risk:** Cannot use this.on(), this.emit(), this.eventBus; inconsistent lifecycle; no base class protections
- **Impact:** Public capability behaves differently from all 25 other capabilities
- **Recommended Fix:** Refactor to class extending BaseCapability with proper lifecycle methods
- **Priority:** CRITICAL — architectural inconsistency

## HIGH (8)

### TD-026: ~130 Dead Events (30% of all events)
- **Description:** Approximately 130 of ~420 event constants are defined but never consumed
- **Risk:** Confusion about which events are active; maintenance burden; false assumptions
- **Impact:** Developers may listen to dead events; event index is inaccurate
- **Recommended Fix:** Remove dead events or add consumers; consolidate observability/admin/owner events
- **Priority:** HIGH

### TD-027: 25+ Orphan Consumers
- **Description:** Capability listeners expect event strings that don't match any defined event
- **Risk:** These listeners never fire; features appear broken
- **Impact:** Identity, governance, intelligence, operations capabilities have broken event chains
- **Recommended Fix:** Add missing event definitions (ecology, economy, destination) or update listener strings
- **Priority:** HIGH

### TD-028: Systemic Upward Imports (engine/core → src/) ✅ RESOLVED (P11.6)
- **Description:** 4 engine/core files import from ../../src/ (architectural inversion)
- **Risk:** Core depends on application layer; violates layer model
- **Impact:** Cannot reuse core engine independently; tight coupling
- **Recommended Fix:** Import DOM utilities from shared/utils/dom.js directly (they exist there)
- **Priority:** HIGH

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

### TD-032: Code Duplication in engine.js ✅ RESOLVED (P11.6)
- **Description:** EXCLUDE_FIELDS, inferFields, and EventBus are duplicated from shared/ in engine/core/engine.js
- **Risk:** Changes to shared/ don't propagate; inconsistent behavior
- **Impact:** Maintenance burden; potential divergence
- **Recommended Fix:** Import from shared/ instead of duplicating
- **Priority:** HIGH

### TD-033: Missing Dependencies Declaration (4 capabilities) ✅ RESOLVED (P11.6)
- **Description:** intelligence, governance, operations, identity don't declare static dependencies
- **Risk:** Activation order may be incorrect
- **Impact:** Runtime errors if dependencies not initialized
- **Recommended Fix:** Add static dependencies = [...] to each
- **Priority:** HIGH

## MEDIUM (7)

### TD-034: Dual Event Naming Convention
- **Description:** 18 files use colon notation (domain:action), 4 use dot notation (domain.entity.action)
- **Risk:** Confusion about which convention to follow
- **Impact:** Inconsistent codebase; new developers confused
- **Recommended Fix:** Standardize to one convention (recommend domain:entity.action with colons)
- **Priority:** MEDIUM

### TD-035: Folder-ID Mismatches
- **Description:** operations/ folder registered as 'destination-operations'; identity/ as 'destination-identity'
- **Risk:** Confusion when navigating codebase
- **Impact:** Developer friction; potential import errors
- **Recommended Fix:** Rename folders OR change registered IDs to match
- **Priority:** MEDIUM

### TD-036: Inconsistent Export Patterns
- **Description:** 13 use export default, 11 use named only, 1 uses plain object
- **Risk:** Import style inconsistency across codebase
- **Impact:** Developer friction; inconsistent patterns
- **Recommended Fix:** Standardize all to export class + export default
- **Priority:** MEDIUM

### TD-037: ENGAGEMENT_EVENTS Namespace Collision ✅ RESOLVED (P11.6)
- **Description:** ENGAGEMENT_EVENTS defined in both engagement/ and exploration/engagement/ with different events
- **Risk:** Import conflicts; naming ambiguity
- **Impact:** Developers may import wrong events
- **Recommended Fix:** Rename exploration sub-module events to EXPLORATION_ENGAGEMENT_EVENTS
- **Priority:** MEDIUM

### TD-038: Dual Event File in seo-intelligence
- **Description:** seo-intelligence has both seo-intelligence.events.js and seo/seo.events.js
- **Risk:** Confusion about which events file to use
- **Impact:** SEO sub-module events are completely dead
- **Recommended Fix:** Merge or remove seo/seo.events.js
- **Priority:** MEDIUM

### TD-039: Missing deactivate() in onboarding ✅ RESOLVED (P11.6)
- **Description:** onboarding capability has no deactivate() override
- **Risk:** May not properly clean up event listeners
- **Impact:** Potential memory leaks
- **Recommended Fix:** Add deactivate() method
- **Priority:** MEDIUM

### TD-040: Context Mutation in lifecycle
- **Description:** lifecycle capability mutates shared context: context.lifecycle = this
- **Risk:** Side effect on shared object; potential conflicts
- **Impact:** Other capabilities may depend on this side effect
- **Recommended Fix:** Remove mutation; use capabilities.get('lifecycle') instead
- **Priority:** MEDIUM

## LOW (5)

### TD-041: Missing READMEs (2 capabilities)
- **Description:** pwa and owner capabilities lack README.md files
- **Risk:** Documentation gaps
- **Impact:** Developer onboarding friction
- **Recommended Fix:** Add README.md files
- **Priority:** LOW

### TD-042: 3 Unregistered Placeholder Capabilities
- **Description:** catalog, gallery, payments exist as folders but are not in register.js
- **Risk:** Confusion about platform capabilities
- **Impact:** Dead code in codebase
- **Recommended Fix:** Remove or register them
- **Priority:** LOW

### TD-043: Hardcoded localStorage Keys
- **Description:** engine/core/theme.js uses 'dronestica-theme' as storage key
- **Risk:** Brand coupling in infrastructure
- **Impact:** Minor — affects theme persistence only
- **Recommended Fix:** Use configurable storage key
- **Priority:** LOW

### TD-044: Inconsistent Event Listener Patterns
- **Description:** Some capabilities use this.on(), others use bus.on() with _setupEventListeners
- **Risk:** Two patterns to maintain
- **Impact:** Developer confusion
- **Recommended Fix:** Standardize to this.on()/this.off()
- **Priority:** LOW

### TD-045: Spanish Hardcoded in format.js
- **Description:** formatValue() hardcodes 'Sí'/'No' for booleans
- **Risk:** Locale coupling in utility
- **Impact:** Cannot support other languages without code change
- **Recommended Fix:** Use locale from config
- **Priority:** LOW

## FUTURE (4)

### TD-046: No WebSocket / Real-time Layer
- **Description:** All communication is in-process EventBus; no cross-tab or server push
- **Risk:** Limited to single-tab experience
- **Impact:** Cannot support live dashboards, real-time notifications
- **Recommended Fix:** Add WebSocket layer in P13+
- **Priority:** FUTURE

### TD-047: No Service Worker Implementation
- **Description:** PWA capabilities exist but no actual service-worker.js registered
- **Risk:** No offline capability, no push notifications
- **Impact:** PWA features are theoretical
- **Recommended Fix:** Implement service worker in P12+
- **Priority:** FUTURE

### TD-048: No Internationalization Framework
- **Description:** Labels hardcoded in Spanish; no i18n system
- **Risk:** Cannot support multi-language
- **Impact:** Limited to Spanish-speaking market
- **Recommended Fix:** Add i18n framework in P13+
- **Priority:** FUTURE

### TD-049: No Analytics Pipeline
- **Description:** Intelligence, conversion, engagement have analytics managers but no data pipeline
- **Risk:** Analytics data stays in-memory
- **Impact:** Cannot do real analytics
- **Recommended Fix:** Add analytics pipeline in P13+
- **Priority:** FUTURE

---
*Generated by P11.5 Ecosystem Core Consolidation — Technical Debt Report. Updated P11.6 Ecosystem Stabilization (6 items resolved: TD-025, TD-028, TD-032, TD-033, TD-037, TD-039).*  
