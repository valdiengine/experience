# ARCHITECTURAL-INVARIANTS.md — Immutable Architecture Rules

## Purpose

These invariants represent architectural rules that emerged organically during the development of the Valdi Engine. They are now formally documented and must NEVER be broken, even if future capabilities are added.

Any change to these invariants requires an Architecture Decision Record (ADR) and explicit approval.

---

## Invariants

### INV-001: Event-Driven Communication Only

**Rule:** Capabilities communicate exclusively through the EventBus or context.capabilities.get(). Never through direct imports between capabilities.

**Rationale:** Loose coupling enables independent capability development, testing, and replacement. Direct imports create hidden dependencies and circular import risks.

**Evidence:** All 26 capabilities use event listeners (this.on/this.off) or context.capabilities.get() for cross-capability access.

**Violation if broken:** Circular dependencies, tight coupling, inability to test capabilities in isolation.

---

### INV-002: Providers Never Contain Business Logic

**Rule:** Provider classes handle ONLY data source communication (read, write, query). They never contain business rules, validations, transformations, or domain logic.

**Rationale:** Providers are swappable data adapters. Business logic in providers would make it impossible to switch data sources without rewriting business rules.

**Evidence:** BaseProvider defines pure data access interface (load, get, set, remove, exists, getAll, refresh). JSONProvider implements only data traversal and notification.

**Violation if broken:** Cannot swap database; business logic scattered across data layer.

---

### INV-003: Shared Layer Is Business-Agnostic

**Rule:** The shared/ directory contains only generic utilities, constants, and patterns that have ZERO knowledge of business domains (drones, tourism, ecology, bookings, etc.).

**Rationale:** Shared code is reused across all capabilities and potentially across different business verticals. Domain knowledge in shared/ creates coupling.

**Evidence:** 11 of 13 shared files are clean. labels.js is the only violator (contains domain-specific labels).

**Violation if broken:** Cannot reuse shared code for different business domains; domain changes require shared layer changes.

---

### INV-004: Capabilities Communicate Only Through Contracts

**Rule:** Each capability exposes a public API through its class interface. Internal managers, schemas, and implementation details are private to the capability.

**Rationale:** Contract-based communication enables capability replacement without breaking consumers.

**Evidence:** Capabilities use context.capabilities.get('name') to access other capabilities' public API, not internal managers.

**Violation if broken:** Tight coupling between capability internals; changes break consumers.

---

### INV-005: Offline-First by Design

**Rule:** Every feature must work without network connectivity. Online connectivity enhances but is never required for core functionality.

**Rationale:** Tourism destinations often have unreliable connectivity. The platform must work in remote areas.

**Evidence:** PWA capabilities, cache strategies, offline managers, DataManager cache API.

**Violation if broken:** Platform fails in target environments (remote tourism destinations).

---

### INV-006: Contextual Discovery Instead of Advertising

**Rule:** Capabilities discover each other through the context object and capability registry, not through explicit registration or advertising mechanisms.

**Rationale:** Reduces coupling; capabilities don't need to know about each other's existence at registration time.

**Evidence:** context.capabilities.get('name') pattern used across all capabilities.

**Violation if broken:** Capabilities must explicitly register with each other; adding a capability requires modifying multiple files.

---

### INV-007: Ecology Always Takes Precedence Over Monetization

**Rule:** When ecological conservation conflicts with revenue generation, ecology wins. The platform exists to protect destinations, not maximize extraction.

**Rationale:** This is the platform's core differentiator and moral foundation. Short-term revenue at the cost of ecological damage destroys long-term value.

**Evidence:** Design Principles P04 (Ecology Before Monetization), DESIGN_PRINCIPLES.md, WHY.md.

**Violation if broken:** Platform loses its reason for existence; becomes another extractive tourism platform.

---

### INV-008: Every Feature Must Be Multi-Tenant Compatible

**Rule:** All capabilities, events, data structures, and UI components must support multi-tenant operation. No feature may assume a single tenant.

**Rationale:** The platform serves multiple destinations simultaneously. Single-tenant features create isolation problems.

**Evidence:** TenantManager, TenantResolver, TenantRegistry infrastructure. All data queries scoped by tenantId.

**Violation if broken:** Data leakage between tenants; inability to onboard new destinations.

---

### INV-009: Every Destination Remains Independently Deployable

**Rule:** Each destination (tenant) must be configurable and deployable independently. Changes to one destination must not affect others.

**Rationale:** Destinations have different needs, timelines, and budgets. Shared infrastructure with independent configuration.

**Evidence:** Tenant configuration loaded at bootstrap; capability activation per tenant; separate data scopes.

**Violation if broken:** Destinations coupled; changes to one break others.

---

### INV-010: AI Assists Humans But Never Replaces Critical Decisions

**Rule:** AI provides recommendations, predictions, and insights. Human operators make final decisions on governance, ecology, finance, and community matters.

**Rationale:** AI lacks contextual understanding, moral judgment, and accountability. Critical decisions require human responsibility.

**Evidence:** Intelligence capability provides recommendations; Governance capability requires human approval; AI assistant is advisory.

**Violation if broken:** Loss of human oversight; potential ecological/social damage from AI errors.

---

### INV-011: No Capability May Import From a Higher Layer

**Rule:** Dependencies flow downward only. A capability at layer N may only import from layers 0 to N-1. Never upward.

**Rationale:** Upward imports create circular dependencies and break the layer model.

**Evidence:** LAYER_MODEL.md defines strict import rules. Core violations (engine/core → src/) are documented as technical debt.

**Violation if broken:** Circular imports; architectural collapse; inability to reason about system structure.

---

### INV-012: All Data Access Through DataManager

**Rule:** Capabilities never access providers directly. All data operations go through the DataManager abstraction.

**Rationale:** DataManager provides caching, validation, normalization, and subscription. Direct provider access bypasses these protections.

**Evidence:** DataManager wraps provider with cache API, search, filter, validate, subscribe methods.

**Violation if broken:** Inconsistent data access; bypassed caching; missed validations.

---

### INV-013: Events Are the Source of Truth for Cross-Capability State

**Rule:** When capabilities need to react to state changes in other capabilities, they subscribe to events. They never poll or periodically check.

**Rationale:** Event-driven architecture is more efficient, more responsive, and less coupled than polling.

**Evidence:** All cross-capability reactions use this.on(EVENT, handler) pattern.

**Violation if broken:** Wasted resources from polling; delayed reactions; tight coupling.

---

### INV-014: Every Capability Has a Single Responsibility

**Rule:** Each capability owns one and only one business domain. Capabilities do not overlap in responsibility.

**Rationale:** Clear boundaries enable independent development, testing, and replacement.

**Evidence:** 26 capabilities each own a distinct domain (booking, notifications, CMS, etc.).

**Violation if broken:** Overlapping responsibilities; confusion about where logic belongs; duplicate implementations.

---

## Amendment Process

To modify an invariant:
1. Create an Architecture Decision Record (ADR)
2. Document the current rule, proposed change, rationale, and consequences
3. Obtain explicit approval from architecture owner
4. Update this document with the change date and ADR reference
5. Update all affected documentation

## Review Schedule

These invariants should be reviewed:
- At the start of each major phase (P12, P13, etc.)
- When architectural violations are discovered
- When new capabilities are added that challenge existing rules
- Annually as a comprehensive architecture review

---
*Discovered and documented during P11.5 Ecosystem Core Consolidation — Valdi Engine*
*Date: 2026-07-27*
*Status: IMMUTABLE until explicit ADR revision*
