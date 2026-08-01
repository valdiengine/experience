# DECISION_LOG.md

> Architectural decisions made during Valdi Engine development.
> Each decision includes context, rationale, and consequences.

---

## D001 — Capability-Based Architecture

**Date:** P1-P3
**Decision:** Build the platform as a collection of self-contained capabilities instead of monolithic modules.
**Context:** Need for modularity, testability, and tenant-specific feature activation.
**Rationale:** Capabilities can be independently activated, deactivated, and composed per tenant. Follows SOLID principles.
**Consequences:** Requires registration system, dependency management, and lifecycle management. Adds complexity but enables flexibility.
**Status:** Active — All 26 capabilities follow this pattern.

---

## D002 — EventBus as Sole Communication Layer

**Date:** P1
**Decision:** Components communicate ONLY through EventBus. No direct imports between peers.
**Context:** Tight coupling was emerging between modules. Need for loose coupling.
**Rationale:** Enables independent development, testing, and replacement of components. Prevents circular dependencies.
**Consequences:** Event naming conventions required. Debugging harder (can't trace call stack). Requires event documentation.
**Status:** Active — Enforced by golden rules.

---

## D003 — DataManager Abstraction Over Providers

**Date:** P1-1
**Decision:** DataManager centralizes cache, search, filter, validate, normalize. Providers handle ONLY data source communication.
**Context:** Data access logic was scattered across components. Need for single source of truth for data operations.
**Rationale:** Providers become simple and focused. DataManager provides consistent API regardless of data source.
**Consequences:** Extra layer of indirection. DataManager becomes critical path component.
**Status:** Active — All data access goes through DataManager.

---

## D004 — Business-Agnostic Capabilities

**Date:** P3
**Decision:** Capabilities never know about tourism, drones, restaurants, or any specific industry.
**Context:** Platform must support multiple industries. Capabilities should be reusable.
**Rationale:** Industry-specific logic changes. Core capabilities (booking, notifications, payments) are universal.
**Consequences:** Requires business services layer for domain logic. Configuration-driven behavior.
**Status:** Active — Enforced by golden rules.

---

## D005 — Hybrid WordPress + Engine Architecture

**Date:** P4
**Decision:** WordPress handles CMS (content, SEO, URLs), Engine handles applications (bookings, notifications, PWA, admin).
**Context:** WordPress is strong at content management. Engine is strong at application logic.
**Rationale:** Best of both worlds. WordPress ecosystem for content, Engine for business logic.
**Consequences:** Requires CMS Bridge capability. Two systems to maintain. Synchronization challenges.
**Status:** Active — CMS Bridge capability handles synchronization.

---

## D006 — ES Module Syntax for Capabilities

**Date:** P3
**Decision:** All new capability files use ES module syntax (import/export).
**Context:** Codebase was mixing CommonJS and ES modules. Need for consistency.
**Rationale:** ES modules are standard. Tree-shaking support. Better developer experience.
**Consequences:** All capability files must use import/export. register.js uses ES module imports.
**Status:** Active — All capability files follow this convention.

---

## D007 — capability-context Access Pattern

**Date:** P3.1c
**Decision:** Capabilities access each other ONLY via `context.capabilities.get('name')`. Never via direct imports.
**Context:** Circular dependencies were discovered during integration audit.
**Rationale:** Breaks dependency cycles. Makes capability composition explicit. Enables runtime capability resolution.
**Consequences:** Requires capabilities to be registered before use. Access is dynamic (no static type checking).
**Status:** Active — Only register.js imports capability classes.

---

## D008 — Destination Ecosystem Vision

**Date:** P11.3.0
**Decision:** Platform evolves from "Reservation SaaS" to "Digital infrastructure for tourism destinations."
**Context:** Market opportunity in destination management. Businesses need more than reservations.
**Rationale:** Territory is the center. Businesses participate inside destinations. Enables network effects.
**Consequences:** Adds 13 new capability layers. Increases platform complexity significantly. New governance model required.
**Status:** Active — 8 destination capabilities implemented.

---

## D009 — Destination Hierarchy Model

**Date:** P11.3.0
**Decision:** Tourism Network > Region > Destination > Commune > Locality > Place > Experience > Business Tenant.
**Context:** Need for hierarchical organization of tourism entities.
**Rationale:** Matches real-world tourism structure. Enables multi-level PWA, branding, SEO.
**Consequences:** Complex data model. Requires hierarchical permission system. PWA hierarchy (4 levels).
**Status:** Active — Implemented in governance and community capabilities.

---

## D010 — Community-First Cultural Memory

**Date:** P11.3.9
**Decision:** Cultural content (stories, heritage, memories) belongs to communities. AI cannot invent cultural facts.
**Context:** Need for authentic cultural representation. Risk of AI hallucination.
**Rationale:** Cultural authenticity requires human ownership. Community validation ensures accuracy.
**Consequences:** All cultural content requires validation workflow. Slower content creation but higher quality.
**Status:** Active — Identity capability implements this pattern.

---

## D011 — Gamification Without Advertising

**Date:** P11.3.4, P11.3.5
**Decision:** Contextual discovery replaces advertising. No ads in the platform.
**Context:** Tourism platforms traditionally rely on advertising revenue.
**Rationale:** Advertising degrades user experience. Contextual discovery is non-intrusive and relevant.
**Consequences:** Revenue must come from SaaS subscriptions, not advertising. Different business model.
**Status:** Active — Economy capability implements contextual discovery.

---

## D012 — PWA Hierarchy for Destinations

**Date:** P11.3.4.2
**Decision:** 4-level PWA hierarchy: Destination > Locality > Place > Business.
**Context:** Each level needs its own branding, content, and offline experience.
**Rationale:** Matches destination hierarchy. Enables community-specific experiences.
**Consequences:** Complex PWA management. Requires PWA Engine to support multiple manifests.
**Status:** Active — Spec in DESTINATION-EXPERIENCE-JOURNEY-ARCHITECTURE.md.

---

## D013 — Capability Registration Pattern

**Date:** P3.1c
**Decision:** All capabilities registered in centralized `capabilities/core/register.js`.
**Context:** Scattered registration was causing inconsistencies.
**Rationale:** Single source of truth. Easy to see all capabilities. Simplifies bootstrap.
**Consequences:** All new capabilities must be added to register.js. Import costs at startup.
**Status:** Active — 26 capabilities registered.

---

## D014 — Architecture Specs Before Code

**Date:** P11.3.0+
**Decision:** Create detailed architecture specifications before implementing code.
**Context:** Complex destination ecosystem needed careful design.
**Rationale:** Prevents rework. Enables review before implementation. Documents decisions.
**Consequences:** Slower initial progress but higher quality. Some specs remain unimplemented.
**Status:** Active — 6 architecture specs created.

---

## D015 — Write Tool for Large Files

**Date:** P11.3.9
**Decision:** Use Write tool for file creation instead of PowerShell.
**Context:** PowerShell was timing out on large file blocks.
**Rationale:** Write tool is faster and more reliable for large files.
**Consequences:** More efficient file creation. Still use PowerShell for verification commands.
**Status:** Active — Used for all recent file creation.

---

## Pending Decisions

| ID | Topic | Status |
|----|-------|--------|
| D016 | Testing framework selection | Pending |
| D017 | Real API provider integration | Pending |
| D018 | Authentication system | Pending |
| D019 | Multi-language (i18n) strategy | Pending |
| D020 | CI/CD pipeline | Pending |
