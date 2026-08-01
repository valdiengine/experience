# Architect Decisions

> The permanent memory of the Architect's decisions.
> This document explains WHY. Architecture documents explain WHAT.
> Never duplicate architecture documentation. Always reference existing documents.

---

## Purpose

This document stores the irreversible architectural decisions made during the evolution of Valdi Engine.

Architecture documents explain WHAT exists. This document explains WHY it exists.

Every decision recorded here represents a commitment that future contributors — human or artificial — must understand before modifying the platform. These decisions are not arbitrary. They emerged from specific problems, specific contexts, and specific requirements that must be understood to be respected.

This is the Decision Memory of Valdi Engine.

---

## Decision Template

Every decision follows this structure. No section may be omitted. If a section has no applicable content, write "None" rather than omitting it. The structure is the contract.

```
### AD-XXX — [Title]

**Date:** [YYYY-MM-DD or approximate period]
**Status:** [Active | Deprecated | Superseded]

**Context:**
[What situation or problem prompted this decision. What existed before. What constraints applied.]

**Decision:**
[What was decided. The specific architectural choice that was made.]

**Alternatives Considered:**
[What other approaches were evaluated. Be specific about each alternative.]

**Why They Were Rejected:**
[Why each alternative was eliminated. The specific reason each was insufficient.]

**Consequences:**
[What this decision enables. What it prevents. What trade-offs it creates.]

**Future Reconsideration Rules:**
[Under what circumstances this decision may be revisited. What would need to change.]

**References:**
[Links to architecture documents, design principles, invariants, or other decisions.]
```

---

## AD-001 — Capability Architecture

**Date:** P1-3 (Capability System Foundation)
**Status:** Active

**Context:**
The platform needed a way to organize business functionality into discrete, maintainable units. The initial codebase had features scattered across files with no clear boundaries. As the platform grew from a reservation system to a tourism ecosystem, the number of features increased dramatically. Without structural discipline, the codebase would become unmaintainable — a monolithic tangle where changing one feature broke three others.

The fundamental problem was organizational: how do you structure a platform that must serve hotels, dive shops, campsites, municipalities, and ecology conservation simultaneously?

**Decision:**
Every business domain is encapsulated in a capability. A capability is a self-contained module that owns its data, its events, its managers, and its public API. Capabilities discover each other through the context object and the capability registry. They never import each other directly. Every capability extends `BaseCapability`, declares its identity statically, and implements a lifecycle (init, activate, deactivate, destroy).

The capability contract is documented in `ENGINEERING-STANDARDS.md` Section 2. The capability registry is centralized in `capabilities/core/register.js`. The base class is defined in `capabilities/core/base.capability.js`.

**Alternatives Considered:**
1. **Monolithic service layer** — All business logic in a single `services/` directory with classes like `BookingService`, `NotificationService`, `AvailabilityService`.
2. **Microservices architecture** — Each feature as a separate deployable service with its own database and API.
3. **Plugin system** — Features as plugins that can be loaded and unloaded at runtime.
4. **Module federation** — Features as independently built modules that are composed at runtime.

**Why They Were Rejected:**
1. **Monolithic service layer** creates tight coupling. Changing the booking service requires understanding the entire service layer. Testing requires instantiating the entire platform. Services cannot be deactivated without affecting others.
2. **Microservices architecture** introduces network complexity, deployment complexity, and data consistency challenges that are inappropriate for a tourism platform that must work offline. The operational overhead of managing dozens of services is unjustifiable for the platform's scale.
3. **Plugin system** was considered but deferred. The platform may evolve toward plugins (L5) for truly optional features, but the core business domains need the structural guarantees of capabilities — lifecycle management, dependency declaration, and event integration.
4. **Module federation** introduces build complexity and runtime composition challenges that conflict with the offline-first requirement.

**Consequences:**
- Every business domain has clear ownership boundaries
- Capabilities can be developed, tested, and reasoned about independently
- The platform can serve different verticals by activating different capability sets
- Cross-capability communication is standardized through the EventBus
- New capabilities can be added without modifying existing ones
- The 26 registered capabilities demonstrate the pattern's scalability

**Future Reconsideration Rules:**
This decision is permanent for the platform's core architecture. The capability pattern is foundational — every invariant, every layer rule, and every engineering standard assumes capabilities exist. Replacing capabilities would require rewriting the entire platform.

**References:**
- `ARCHITECTURAL-INVARIANTS.md` — INV-004 (Contracts), INV-014 (Single Responsibility)
- `ENGINEERING-STANDARDS.md` — Section 2 (Capability Creation Checklist)
- `docs/ai/MASTER_CONTEXT.md` — Golden Rule 6 (Capabilities access via context)
- `docs/architecture/LAYER_MODEL.md` — L4 (Capabilities layer)
- `docs/ai/AI_DECISION_FRAMEWORK.md` — DT-05 (Capability Scope)

---

## AD-002 — Event-Driven Communication

**Date:** P1-3 (Capability System Foundation)
**Status:** Active

**Context:**
When capabilities were introduced, the question of how they communicate became critical. The initial implementation had capabilities importing each other directly — `booking` imported `notifications`, `notifications` imported `communication`, `communication` imported `availability`. This created a web of dependencies that made it impossible to test a capability in isolation, replace a capability without breaking its consumers, deactivate a capability without leaving orphan references, or understand the impact of changing a capability's interface.

The direct import pattern created hidden coupling. A change in `notifications` could break `booking` even though the booking team knew nothing about the notification implementation.

**Decision:**
Capabilities communicate exclusively through the EventBus or through `context.capabilities.get('name')`. They never import each other directly. Events follow a strict naming convention: `domain:entity.action` with optional detail suffixes. The EventBus is the communication backbone of the entire platform.

Cross-engine communication (between Experience Engine, Reservation Engine, PWA Engine, Admin Engine) is also EventBus-only. Direct engine-to-engine imports are forbidden.

**Alternatives Considered:**
1. **Direct imports** — Capabilities import each other's classes and call methods directly.
2. **Shared state store** — A central Redux-like store that all capabilities read from and write to.
3. **Message queue** — An external message broker (RabbitMQ, Kafka) for inter-capability communication.
4. **REST API between capabilities** — Capabilities expose HTTP endpoints and communicate via API calls.

**Why They Were Rejected:**
1. **Direct imports** create circular dependencies and hidden coupling. This was the original approach and it failed — the dependency graph became unmanageable.
2. **Shared state store** creates a single point of failure and a single point of contention. All capabilities would depend on the store's schema, making it impossible to evolve capabilities independently.
3. **Message queue** introduces external infrastructure dependency that conflicts with the offline-first requirement. A tourism platform that cannot function without a message broker is not a tourism platform.
4. **REST API between capabilities** introduces network overhead, serialization complexity, and latency that is inappropriate for in-process communication. Capabilities run in the same process; treating them as network services is over-engineering.

**Consequences:**
- Capabilities can be developed, tested, and replaced independently
- The dependency graph remains acyclic and manageable
- New capabilities can subscribe to existing events without modifying producers
- The event system is the platform's nervous system — approximately 425 events across 31 event files
- Dead events can be identified and cleaned up systematically
- The EventBus becomes a critical piece of infrastructure that must be highly reliable

**Future Reconsideration Rules:**
This decision is permanent. Event-driven communication is referenced by 6 architectural invariants and underpins the entire layer model. The only permissible evolution is adding new communication patterns (like `context.capabilities.get()`) alongside the EventBus, not replacing it.

**References:**
- `ARCHITECTURAL-INVARIANTS.md` — INV-001 (Event-Driven Only), INV-013 (Events as Source of Truth)
- `docs/ai/EVENT_INDEX.md` — Complete event catalog
- `docs/architecture/SYSTEM_OVERVIEW.md` — Event flow documentation
- `docs/ai/AI_DECISION_FRAMEWORK.md` — DT-03 (Event System)

---

## AD-003 — Shared Layer Independence

**Date:** P0 (Extract Shared)
**Status:** Active

**Context:**
The very first architectural decision was extracting shared code from the application. The original codebase had utilities, constants, and schemas embedded within business logic. This meant business logic leaked into utilities that should be reusable, utilities carried knowledge of specific business domains, different business verticals could not reuse the same utilities, and testing utilities required instantiating business logic.

The shared layer had to be extracted before anything else because it is the foundation that every other layer depends on. If the foundation is contaminated with business knowledge, every layer built upon it inherits that contamination.

**Decision:**
The `shared/` directory contains only generic, business-agnostic code. It has ZERO knowledge of booking, notifications, availability, or any other business domain. It contains utilities, constants, schemas, and base classes that are useful across any platform — not just tourism.

The shared layer cannot import from any higher layer. It is completely isolated. It is the only layer that has no imports from application code.

**Alternatives Considered:**
1. **Shared services with business logic** — Put common business logic (like "calculate availability" or "send notification") in shared/.
2. **Domain-agnostic shared with business plugins** — Shared has minimal code; business logic lives in domain-specific shared modules.
3. **No shared layer** — Each capability duplicates the utilities it needs.

**Why They Were Rejected:**
1. **Shared services with business logic** create coupling between capabilities through shared code. If `shared/` knows about booking, then every capability that imports shared/ inherits booking knowledge.
2. **Domain-agnostic shared with business plugins** adds complexity without clear benefit. The separation between "truly generic" and "domain-specific" is clean enough with a single `shared/` directory.
3. **No shared layer** creates massive duplication. Every capability would implement its own event utilities, its own validation patterns, its own logging. Duplication is the root of inconsistency.

**Consequences:**
- `shared/` can be reused across different business verticals (tourism, municipalities, education, marine conservation)
- Capabilities can be reasoned about without understanding shared/ internals
- The foundation is stable — shared/ changes rarely because it has no business dependencies
- Any shared code that gains business knowledge must be moved out of shared/
- The clean separation makes the platform's multi-vertical ambition technically feasible

**Future Reconsideration Rules:**
This decision is permanent. The shared layer's business-agnostic nature is referenced by INV-003 and is the foundation of the layer model. The only permissible change is moving code OUT of shared/ when it gains business knowledge — never adding business knowledge TO shared/.

**References:**
- `ARCHITECTURAL-INVARIANTS.md` — INV-003 (Shared Is Business-Agnostic)
- `docs/architecture/LAYER_MODEL.md` — L0 (Shared layer definition)
- `docs/ai/MASTER_CONTEXT.md` — Golden Rule 5 (Shared has ZERO app knowledge)
- `docs/knowledge/DESIGN_PRINCIPLES.md` — Principle of modularity

---

## AD-004 — Providers Own External Communication Only

**Date:** P1-1 (Providers + DataManager)
**Status:** Active

**Context:**
When the data layer was designed, the question of where business logic belongs in relation to data access became critical. The initial approach had data access code mixed with business logic — validation happened in database queries, caching happened in API calls, search logic lived in provider implementations.

This mixing created a problem: switching from mock data to a real API required rewriting business logic, not just data access. The provider layer had to be abstract enough that swapping the data source would not affect business rules.

**Decision:**
Providers handle ONLY data source communication. They read, write, and query external data sources. They do NOT cache, search, filter, or validate. Those responsibilities belong to DataManager, capability managers, and other modules respectively.

The data flow is: `Capability Manager -> DataManager <-> Provider <-> Data Source`.

This separation means providers are swappable data adapters. A mock provider, a REST API provider, a GraphQL provider, or a database provider can all serve the same capabilities without changing business logic.

**Alternatives Considered:**
1. **Smart providers** — Providers handle caching, validation, and business logic alongside data access.
2. **Repository pattern** — A repository abstraction that handles all data operations including business rules.
3. **Active Record pattern** — Data models that contain their own business logic and persistence.
4. **CQRS** — Completely separate read and write models with different optimization strategies.

**Why They Were Rejected:**
1. **Smart providers** make it impossible to switch data sources without rewriting business logic. This was the original approach and it failed — mock providers contained business rules that real providers could not replicate.
2. **Repository pattern** is close to the chosen approach but conflates data access with data management. The DataManager handles caching, normalization, and subscription — responsibilities that belong to the platform, not the data source.
3. **Active Record pattern** couples business logic to data models, making it impossible to test business logic without a database.
4. **CQRS** introduces complexity inappropriate for the platform's current scale. The read/write separation can be added later if performance requires it.

**Consequences:**
- Providers can be replaced without affecting business logic
- Mock providers enable development and testing without external services
- DataManager provides consistent caching, validation, and normalization across all providers
- The platform can evolve from mock data to real APIs by swapping providers, not rewriting capabilities
- Clear responsibility boundaries prevent the "smart provider" anti-pattern from re-emerging

**Future Reconsideration Rules:**
This decision is permanent for the platform's data architecture. The provider DataManager separation is referenced by INV-002 and INV-012. The only permissible evolution is adding new DataManager responsibilities (like real-time subscriptions or optimistic updates), not moving them into providers.

**References:**
- `ARCHITECTURAL-INVARIANTS.md` — INV-002 (Providers No Business Logic), INV-012 (All Data Through DataManager)
- `docs/architecture/LAYER_MODEL.md` — L2 (Providers layer)
- `docs/ai/MASTER_CONTEXT.md` — Golden Rule 4 (DataManager ONLY via Providers)
- `docs/api/DATA_CONTRACTS.md` — Entity schemas

---

## AD-005 — Offline First

**Date:** P10 (Multi-Tenant PWA Engine)
**Status:** Active

**Context:**
Tourism happens in places with unreliable connectivity. Mountain trails, rural villages, coastal areas, historical sites — these are the places tourists visit, and they often have poor or no internet connectivity. A tourism platform that requires internet connectivity is useless in the places where tourism actually happens.

The offline-first requirement is not a technical preference. It is a fundamental constraint of the domain. Tourists lose connectivity. Communities in remote areas have limited bandwidth. Mobile networks are unreliable in natural environments.

**Decision:**
The platform assumes no internet connectivity. Every feature must work without a network connection. Synchronization is delayed, not blocking. The PWA architecture with service workers, local caching, and offline data sync ensures the platform functions in any connectivity scenario.

Data is cached locally. Actions are queued and synced when connectivity returns. The platform degrades gracefully — not catastrophically — when offline.

**Alternatives Considered:**
1. **Online-first with offline caching** — The platform assumes internet and caches data for performance.
2. **Connectivity-required with clear messaging** — The platform shows "No internet" messages when offline.
3. **Hybrid approach** — Some features work offline, others require connectivity.

**Why They Were Rejected:**
1. **Online-first with offline caching** makes connectivity the default assumption. When connectivity is lost, features break instead of degrading gracefully.
2. **Connectivity-required with clear messaging** is the standard approach for most web applications. It is unacceptable for a tourism platform because tourists are the primary users and they are frequently in areas with poor connectivity.
3. **Hybrid approach** creates inconsistency. Users cannot predict which features will work offline. The platform's reliability becomes unpredictable.

**Consequences:**
- The platform works in remote areas with no connectivity
- Tourists can access information, make reservations, and log experiences offline
- Synchronization happens in the background when connectivity returns
- The PWA architecture enables installation on mobile devices
- Service workers cache static assets for instant loading
- Local data storage (IndexedDB, localStorage) provides offline data access
- The platform's reliability is independent of network conditions

**Future Reconsideration Rules:**
This decision is permanent. Offline-first is referenced by INV-005 and is a core design principle (P05). The only permissible evolution is improving offline capabilities — never adding hard connectivity requirements to core features.

**References:**
- `ARCHITECTURAL-INVARIANTS.md` — INV-005 (Offline-First by Design)
- `docs/knowledge/DESIGN_PRINCIPLES.md` — P05 (Offline First)
- `docs/architecture/SYSTEM_OVERVIEW.md` — PWA architecture
- `docs/ai/MASTER_CONTEXT.md` — Platform architecture

---

## AD-006 — Hybrid WordPress Architecture

**Date:** P4 (Hybrid Architecture)
**Status:** Active

**Context:**
The platform needed a content management system for tourism content — articles, guides, photo galleries, event listings, destination descriptions. Building a custom CMS from scratch would take months and would be inferior to existing solutions. WordPress powers 43% of the web and has a mature ecosystem for content management.

However, WordPress is not suitable for building interactive applications — booking systems, real-time availability, gamification engines, or offline-first PWAs. WordPress plugins are PHP-based, cannot run offline, and have limited capability for complex client-side state management.

The question was: how do you combine the content management strengths of WordPress with the application capabilities of a custom engine?

**Decision:**
WordPress serves as the CMS layer. The Engine serves as the application layer. They communicate through a defined API boundary. WordPress handles content creation, media management, SEO metadata, and editorial workflows. The Engine handles business logic, real-time data, offline functionality, and interactive experiences.

The CMS Bridge capability (`cms`) manages the integration. It syncs content from WordPress to the Engine's data layer and syncs metadata back to WordPress. The separation is permanent — WordPress will never contain business logic, and the Engine will never contain content management.

**Alternatives Considered:**
1. **WordPress-only architecture** — Build everything as WordPress plugins and themes.
2. **Custom CMS** — Build a content management system from scratch within the Engine.
3. **Headless CMS with multiple backends** — Use WordPress plus other CMS solutions for different content types.
4. **Static site generation** — Pre-build content into static files and deploy to CDN.

**Why They Were Rejected:**
1. **WordPress-only architecture** cannot support offline-first, real-time data, complex state management, or the gamification engine. WordPress plugins are PHP server-rendered; the platform needs client-side interactivity.
2. **Custom CMS** would take months to build and would be inferior to WordPress for content management. WordPress has decades of development, thousands of plugins, and a mature editorial workflow.
3. **Headless CMS with multiple backends** introduces unnecessary complexity. WordPress alone handles all content management needs. Adding more CMS solutions multiplies integration points without clear benefit.
4. **Static site generation** cannot support dynamic, personalized content. Tourism content changes frequently — events, availability, community posts. Static generation would require rebuilds for every change.

**Consequences:**
- Content creators use WordPress's familiar interface
- The Engine handles all business logic and interactive features
- The CMS Bridge provides bidirectional sync between the two systems
- SEO metadata flows from WordPress to the Engine for client-side rendering
- Media assets are managed in WordPress and referenced by the Engine
- The separation allows each system to evolve independently
- WordPress can be replaced in the future without affecting the Engine

**Future Reconsideration Rules:**
This decision is permanent. The hybrid architecture is a Golden Rule (Master Context Rule 11) and cannot be violated. The only permissible evolution is improving the CMS Bridge integration — never moving business logic into WordPress or content management into the Engine.

**References:**
- `docs/ai/MASTER_CONTEXT.md` — Golden Rule 11 (Hybrid Architecture)
- `docs/architecture/SYSTEM_OVERVIEW.md` — CMS integration
- `docs/architecture/LAYER_MODEL.md` — CMS Bridge capability
- `capabilities/cms/` — CMS Bridge implementation

---

## AD-007 — Vanilla JavaScript

**Date:** P0 (Platform Foundation)
**Status:** Active

**Context:**
The platform needed a frontend technology choice. The major options were React, Vue, Angular, Svelte, or vanilla JavaScript with ES modules. This decision would affect every future developer, every future feature, and the platform's long-term maintainability.

The platform has specific constraints that most web applications do not:
- Offline-first requirement means the framework must work without a build step
- Multi-tenant architecture means the framework must support dynamic configuration
- PWA architecture means the framework must be lightweight enough for service workers
- Decade-long lifespan means the framework must be future-proof
- Tourism destinations have limited bandwidth; framework bundle size matters

**Decision:**
The platform uses vanilla JavaScript with ES modules. No framework. No build step required. No JSX. No virtual DOM. No dependency on any third-party UI library.

Components are plain JavaScript classes or functions. Templates are DOM manipulation or template literals. State is managed through the capability's own state patterns. Styling uses CSS custom properties with the Cinematic design system.

**Alternatives Considered:**
1. **React** — Component-based UI library with massive ecosystem.
2. **Vue** — Progressive framework with gentle learning curve.
3. **Angular** — Full-featured framework with TypeScript, dependency injection, and CLI.
4. **Svelte** — Compiler-based framework with minimal runtime overhead.
5. **Lit** — Web Components library with minimal overhead.

**Why They Were Rejected:**
1. **React** introduces a 40KB+ runtime, requires a build step for JSX, creates dependency on Meta's maintenance decisions, and adds complexity that conflicts with the offline-first requirement. React's ecosystem evolves rapidly; what is best practice today may be deprecated in two years.
2. **Vue** is lighter than React but still introduces framework dependency, build step requirements, and ecosystem lock-in. The platform's decade-long lifespan means the framework must survive longer than most frameworks do.
3. **Angular** is the heaviest option with the most opinionated architecture. Its TypeScript requirement, build step, and dependency injection system are over-engineered for a tourism platform.
4. **Svelte** compiles away its runtime, which is appealing, but introduces compiler dependency and a smaller ecosystem. The platform's offline-first requirement means the compiled output must be debuggable without the compiler.
5. **Lit** is the closest to the chosen approach (Web Components), but still introduces a library dependency. The platform can use Web Components natively without any library.

**Consequences:**
- Zero framework dependency — the platform survives any framework trend
- Minimal bundle size — no framework runtime means faster loading on slow connections
- Full control over rendering — no virtual DOM overhead, no reconciliation surprises
- ES modules enable native code splitting without build tooling
- The platform's code is vanilla JavaScript that any developer can read
- No build step required for development — faster iteration cycles
- The Cinematic design system is implemented with pure CSS custom properties
- Long-term maintainability is maximized — vanilla JS does not go out of style

**Future Reconsideration Rules:**
This decision is permanent for the platform's core architecture. The vanilla JavaScript choice is fundamental to the offline-first, lightweight, decade-spanning architecture. The only permissible evolution is adopting Web Components standards natively — never adding a framework dependency to the core platform. Individual capabilities may use framework-specific code in isolated contexts, but the core engine remains framework-free.

**References:**
- `docs/architecture/SYSTEM_OVERVIEW.md` — Technology stack
- `docs/ai/MASTER_CONTEXT.md` — Platform architecture
- `docs/knowledge/DESIGN_PRINCIPLES.md` — Long-term thinking principle
- `docs/ai/AI_DECISION_FRAMEWORK.md` — DT-01 (Code Location)

---

## AD-008 — Destination Ecosystem

**Date:** P11.3.0 (Destination Ecosystem Architecture)
**Status:** Active

**Context:**
The platform began as a reservation SaaS for tourism businesses. As development progressed, it became clear that a reservation system alone was insufficient. Tourism does not happen in isolation — it happens within destinations that have ecology, culture, communities, governance, and economy.

The platform needed to evolve from serving individual businesses to serving entire destinations. A hotel does not exist in isolation — it exists within a locality that has flora, fauna, cultural heritage, partner businesses, and community memory. The platform needed to model this reality.

The question was: how do you evolve a business-focused SaaS into a destination-focused ecosystem without rewriting everything?

**Decision:**
The platform evolved into a Destination Ecosystem where the territory is the primary entity. Businesses are ecosystem participants, not the center. The hierarchy is: Tourism Network > Region > Destination > Commune > Locality > Place > Experience > Business Tenant.

Each level of the hierarchy can have its own PWA, branding, SEO, community content, and governance. The Destination Ecosystem adds four new capabilities (ecology, economy, destination, locality) and four new event namespaces. The original business capabilities continue to function but are now nested within the ecosystem context.

**Alternatives Considered:**
1. **Stay as reservation SaaS** — Focus on serving individual tourism businesses.
2. **Add destination features as plugins** — Destination capabilities as optional add-ons.
3. **Build a separate destination platform** — Create a new platform specifically for destinations.
4. **Government portal approach** — Build a top-down government management system.

**Why They Were Rejected:**
1. **Stay as reservation SaaS** ignores the reality that tourism is a destination-level phenomenon. A reservation system serves businesses; a tourism ecosystem serves territories.
2. **Add destination features as plugins** treats destination capabilities as optional. They are not optional — they are the foundation upon which business capabilities depend. A hotel exists within a destination; the destination is not a plugin.
3. **Build a separate destination platform** creates duplication. The business capabilities (booking, availability, notifications) already exist and should be reused within the ecosystem context.
4. **Government portal approach** is top-down and excludes community participation. The platform's philosophy is community-first, not government-first.

**Consequences:**
- The platform serves destinations, not just businesses
- The territory is the primary entity; businesses are participants
- Ecology, culture, and community are first-class concerns
- The Destination Ecosystem architecture spec covers 9 sub-phases with hundreds of pages of specification
- The platform can serve municipalities, regions, and tourism networks
- Business capabilities are reused within the ecosystem context
- The platform's ambition expands from SaaS to digital infrastructure

**Future Reconsideration Rules:**
This decision is permanent. The destination ecosystem is the platform's core identity. The only permissible evolution is expanding the ecosystem to cover more aspects of destination life — never reducing it back to a business-focused SaaS.

**References:**
- `docs/architecture/DESTINATION-ECOSYSTEM-ARCHITECTURE.md` — Master specification
- `docs/knowledge/DESIGN_PRINCIPLES.md` — P01 (Experience Before Listings), P06 (Destination Identity)
- `docs/knowledge/PLATFORM_MANIFESTO.md` — Seven commitments
- `docs/ai/CAPABILITY_INDEX.md` — 26 capabilities including 4 ecosystem capabilities

---

## AD-009 — Experience Before Commerce

**Date:** P11.3.4.2 (Destination Experience Journey)
**Status:** Active

**Context:**
Traditional tourism platforms prioritize commerce — bookings, prices, availability. The user experience is: search > filter by price > compare > book. This reduces destinations to product catalogs and visitors to consumers.

The platform's philosophy is fundamentally different. Visitors are not consumers — they are explorers and community members. Destinations are not product catalogs — they are living ecosystems with stories, ecology, and culture.

The question was: how do you structure the visitor journey so that experience comes before commerce?

**Decision:**
The visitor journey begins with discovery, not with search. Contextual discovery replaces advertising. Recommendations replace banners. Experiences come before bookings. The hierarchy is: Experience > Place > Locality > Destination.

Visitors first encounter the story of a place — its ecology, its culture, its community. They discover experiences through contextual relevance, not through paid placement. Commerce (reservations, bookings) happens naturally after the visitor has connected with the destination emotionally.

The Experience Journey architecture defines: visitor evolution stages, PWA hierarchy, discovery flow, completion system, and gamification rules. Missions are tied to real places. Badges require real knowledge. The Explorer Card is a public profile that tells a story, not a list of bookings.

**Alternatives Considered:**
1. **Commerce-first with experience content** — Show bookings and prices first, add experience content as secondary.
2. **Search-and-filter model** — Traditional search with filters for price, rating, availability.
3. **Advertising-driven discovery** — Businesses pay for visibility; visitors see promoted content first.
4. **Algorithmic curation** — Machine learning determines what visitors see based on behavior.

**Why They Were Rejected:**
1. **Commerce-first with experience content** reduces destinations to product catalogs. Visitors become consumers rather than explorers.
2. **Search-and-filter model** assumes visitors know what they want. Tourism is about discovery, not known-item search. A tourist exploring a new destination does not have search criteria — they have curiosity.
3. **Advertising-driven discovery** degrades trust. When businesses pay for visibility, visitors cannot distinguish genuine recommendations from paid promotions. This is the model that has corrupted other tourism platforms.
4. **Algorithmic curation** without transparency creates black boxes. Visitors do not know why they see what they see. The platform's philosophy requires transparent, explainable discovery.

**Consequences:**
- Visitors connect with destinations emotionally before engaging commercially
- Contextual discovery creates genuine value rather than paid placement
- The platform differentiates from all commerce-first competitors
- Community-generated content is more trustworthy than business-generated content
- Gamification educates rather than exploits
- The visitor journey is longer but more meaningful
- Commerce happens naturally as a result of engagement, not as the entry point

**Future Reconsideration Rules:**
This decision is permanent. Experience before commerce is a core design principle (P01, P02) and cannot be violated. The only permissible evolution is improving the discovery experience — never adding advertising, paid placement, or commerce-first patterns.

**References:**
- `docs/knowledge/DESIGN_PRINCIPLES.md` — P01 (Experience Before Listings), P02 (Context Before Advertising), P03 (Community Before Marketing)
- `docs/architecture/DESTINATION-EXPERIENCE-JOURNEY-ARCHITECTURE.md` — Experience journey specification
- `docs/knowledge/PLATFORM_GLOSSARY.md` — Visitor vocabulary
- `docs/knowledge/PLATFORM_MANIFESTO.md` — Seven commitments

---

## AD-010 — AI as Assistant

**Date:** P11.7 (Platform SDK & Developer Experience)
**Status:** Active

**Context:**
As the platform matured, AI tools became increasingly capable of generating code, writing documentation, and making architectural suggestions. The question arose: what role should AI play in the platform's development?

The platform's philosophy is human-centered. Communities own their knowledge. Culture belongs to people. Decisions about ecology, governance, and finance require human judgment. AI can process information faster than humans, but it cannot understand cultural context, moral implications, or community values.

The risk was that AI would begin making decisions that should be human — decisions about what content to publish, what governance rules to apply, what ecological priorities to set.

**Decision:**
AI assists humans but never owns decisions. The Architect always decides. AI proposes. Humans approve. This applies to code generation, architecture decisions, content moderation, governance rules, and ecological policies.

AI cannot invent cultural facts. AI cannot publish without human review. AI cannot make final decisions on governance, ecology, finance, or community matters. AI provides recommendations with rationale; the Architect (or community member, or governance board) makes the final call.

**Alternatives Considered:**
1. **AI-autonomous development** — AI makes all technical decisions without human approval.
2. **AI as code generator only** — AI generates code but has no input on architecture.
3. **AI as平等 collaborator** — AI and humans share decision-making equally.
4. **AI as implementation tool** — AI only implements what humans specify in detail.

**Why They Were Rejected:**
1. **AI-autonomous development** removes human judgment from technical decisions. AI can generate correct code but cannot understand business context, community values, or long-term architectural implications.
2. **AI as code generator only** underutilizes AI's analytical capabilities. AI can analyze architecture, identify risks, and suggest improvements — limiting it to code generation wastes this potential.
3. **AI as equal collaborator** creates accountability ambiguity. When AI and humans share decisions, who is responsible when things go wrong? The Architect must be the final decision-maker for accountability.
4. **AI as implementation tool** underutilizes AI's capability for analysis and suggestion. AI can propose architectural improvements, identify technical debt, and suggest optimizations — limiting it to implementation wastes this potential.

**Consequences:**
- AI contributes to development without overriding human judgment
- The Architect remains the final decision-maker for all architectural choices
- AI-generated code is reviewed by humans before implementation
- Cultural content is validated by community members, not AI
- Governance decisions are made by humans, with AI providing analysis
- The platform's human-centered philosophy is preserved
- AI collaboration is standardized through the AI Operating Manual and AI Brain system

**Future Reconsideration Rules:**
This decision is permanent. AI as assistant is referenced by INV-010 and is a core design principle (P08). The only permissible evolution is expanding AI's analytical capabilities — never granting AI autonomous decision-making authority over governance, ecology, finance, or community matters.

**References:**
- `ARCHITECTURAL-INVARIANTS.md` — INV-010 (AI Assists, Humans Decide)
- `docs/knowledge/DESIGN_PRINCIPLES.md` — P08 (AI Augments Humans)
- `docs/ai/AI_OPERATING_MANUAL.md` — AI collaboration protocol
- `docs/ai/MASTER_CONTEXT.md` — Golden Rules 12-14 (Culture, AI, Community)

---

## AD-011 — Long-Term Thinking

**Date:** P0 (Platform Foundation)
**Status:** Active

**Context:**
Most software projects are built with short-term thinking. The next deadline. The next feature. The next sprint. This approach produces code that works today but becomes unmaintainable tomorrow.

The platform is intended to serve destinations for decades. Tourism infrastructure does not change every two years. Destinations, communities, and ecosystems persist for generations. The platform that serves them must be built with the same long-term perspective.

The question was: how do you build software that remains maintainable for 10+ years?

**Decision:**
Every decision must survive 10+ years. Avoid trend-driven architecture. Prefer timeless principles over fashionable patterns. Code for the next decade, not the next deadline.

This means:
- Vanilla JavaScript survives framework trends
- Capability architecture survives architectural fashion
- Event-driven communication survives paradigm shifts
- Offline-first survives connectivity improvements
- Business-agnostic shared layer survives vertical changes

Short-term convenience at the cost of long-term maintainability is always the wrong choice.

**Alternatives Considered:**
1. **Sprint-driven development** — Optimize for the current sprint's deliverables.
2. **Trend-driven architecture** — Adopt the latest framework or pattern for developer experience.
3. **Minimum viable architecture** — Build the simplest thing that works and refactor later.
4. **Enterprise architecture** — Over-engineer for hypothetical future requirements.

**Why They Were Rejected:**
1. **Sprint-driven development** produces technical debt that compounds over time. Each sprint's shortcuts become the next sprint's obstacles.
2. **Trend-driven architecture** creates framework dependency. Today's trendy framework is tomorrow's deprecated dependency. The platform must survive framework lifecycles.
3. **Minimum viable architecture** defers complexity rather than solving it. "Refactor later" never happens; the MVP becomes the permanent architecture.
4. **Enterprise architecture** over-engineers for requirements that may never exist. The platform should be appropriately engineered for its actual constraints.

**Consequences:**
- The platform's architecture is designed for decades, not quarters
- Vanilla JavaScript ensures long-term maintainability
- Capability architecture ensures structural integrity over time
- Event-driven communication ensures flexibility over time
- Technical debt is tracked and prioritized, not ignored
- Every architectural decision is documented with rationale (this document)
- The platform can evolve without rewriting

**Future Reconsideration Rules:**
This decision is permanent. Long-term thinking is the foundation of every other decision. The only permissible evolution is adding new timeless principles — never adopting trend-driven patterns that compromise long-term maintainability.

**References:**
- `docs/knowledge/DESIGN_PRINCIPLES.md` — All 14 principles
- `docs/knowledge/PLATFORM_MANIFESTO.md` — Long-term vision
- `docs/vision/2030_VISION.md` — Decade-long trajectory
- `docs/ai/AI_OPERATING_MANUAL.md` — Section 19 (Long-Term Vision)

---

## AD-012 — Documentation First

**Date:** P11.5 (Ecosystem Core Consolidation)
**Status:** Active

**Context:**
As the platform grew, documentation fell behind code. Features were implemented without specification documents. Architecture evolved without formal documentation. Decisions were made in conversations but not recorded.

This created a knowledge problem: new contributors (human or AI) could not understand why things were built the way they were. The code told them WHAT existed, but not WHY. Without understanding WHY, they would make decisions that contradicted the original architecture.

The question was: should documentation precede implementation, or should implementation precede documentation?

**Decision:**
Documentation precedes implementation. Architecture is written before code. Documentation is part of the product, not a byproduct of development.

This means:
- Architecture specifications are written and approved before code is generated
- Design decisions are recorded in this document before implementation
- Capability README files are written alongside capability code
- Event indices are maintained as events are added
- The AI Brain system standardizes documentation formats

Documentation is not overhead. It is the institutional memory that prevents future contributors from undoing years of architectural thinking.

**Alternatives Considered:**
1. **Code-first, document-later** — Write code first, document afterward.
2. **Inline documentation only** — Code comments and JSDoc as the only documentation.
3. **README-only documentation** — Each module has a README; no central documentation.
4. **Documentation as separate project** — Documentation maintained in a separate repository.

**Why They Were Rejected:**
1. **Code-first, document-later** never produces documentation. "Document later" is the software equivalent of "refactor later" — it never happens because there is always more code to write.
2. **Inline documentation only** provides implementation details but not architectural context. Comments explain HOW code works; documentation explains WHY it exists.
3. **README-only documentation** creates scattered knowledge. Without a central documentation system, knowledge is dispersed across dozens of README files with no cross-referencing.
4. **Documentation as separate project** creates synchronization problems. Documentation and code diverge because they are maintained separately.

**Consequences:**
- Architecture is understood before code is written
- Decisions are recorded with rationale before implementation
- New contributors can understand the platform's history and intent
- AI systems can read documentation to understand architectural context
- The documentation system is itself versioned and maintained
- Cross-referencing prevents documentation drift
- The AI Brain system ensures consistent documentation formats

**Future Reconsideration Rules:**
This decision is permanent. Documentation first is the foundation of the platform's institutional memory. The only permissible evolution is improving documentation tools and formats — never allowing code to precede documentation for architectural decisions.

**References:**
- `docs/ai/AI_OPERATING_MANUAL.md` — Section 14 (Documentation Rules)
- `docs/ai/AI_BOOT_SEQUENCE.md` — Reading order and bootstrap checklist
- `docs/ai/MASTER_CONTEXT.md` — Documentation system
- `ENGINEERING-STANDARDS.md` — Section 6 (Documentation Requirements)

---

## AD-013 — Single Source of Truth

**Date:** P11.5 (Ecosystem Core Consolidation)
**Status:** Active

**Context:**
As the platform's documentation grew, duplication emerged. The same information was written in multiple places — the roadmap, the current state document, the capability index, and individual capability READMEs. When information was updated in one place, it was not always updated in others. This created contradictions and confusion.

The fundamental problem was: where does each piece of information live? Without a clear answer, documentation drifts and contradictions accumulate.

**Decision:**
No duplicated documentation. One owner per concept. Cross-reference instead of copy.

Each concept has exactly one canonical location:
- Platform identity: `docs/ai/MASTER_CONTEXT.md`
- Current state: `docs/ai/CURRENT_STATE.md`
- Capabilities: `docs/ai/CAPABILITY_INDEX.md`
- Events: `docs/ai/EVENT_INDEX.md`
- Architecture: `docs/architecture/`
- Design principles: `docs/knowledge/DESIGN_PRINCIPLES.md`
- Engineering standards: `ENGINEERING-STANDARDS.md`
- Architectural invariants: `ARCHITECTURAL-INVARIANTS.md`
- Architect decisions: `docs/knowledge/ARCHITECT_DECISIONS.md` (this document)

When another document needs to reference information from a canonical source, it cross-references rather than copies. This ensures that updates propagate automatically through cross-references.

**Alternatives Considered:**
1. **Duplicated documentation** — Each document contains all information it needs, even if duplicated.
2. **Wiki-style documentation** — A single wiki where all information lives.
3. **Generated documentation** — Documentation generated from code comments and annotations.
4. **No central documentation** — Each module maintains its own documentation.

**Why They Were Rejected:**
1. **Duplicated documentation** creates maintenance burden and contradiction risk. Every update must be applied to every copy. Missed updates create inconsistencies.
2. **Wiki-style documentation** creates a single point of failure and a single point of contention. All knowledge in one place means all conflicts happen in one place.
3. **Generated documentation** captures implementation details but not architectural context. Code comments explain HOW; documentation explains WHY.
4. **No central documentation** creates scattered knowledge. Without a central system, contributors cannot find the information they need.

**Consequences:**
- Each piece of information has exactly one canonical location
- Updates propagate through cross-references, not manual duplication
- Contradictions are impossible when the source of truth is singular
- New contributors know exactly where to find each type of information
- AI systems can reliably locate canonical information
- The documentation system is maintainable because each document has a clear owner

**Future Reconsideration Rules:**
This decision is permanent. Single source of truth is the foundation of the documentation system. The only permissible evolution is adding new canonical locations for new concepts — never duplicating information across documents.

**References:**
- `docs/ai/MASTER_CONTEXT.md` — Single source of truth for platform identity
- `docs/ai/CURRENT_STATE.md` — Single source of truth for project state
- `docs/ai/CAPABILITY_INDEX.md` — Single source of truth for capabilities
- `docs/ai/EVENT_INDEX.md` — Single source of truth for events
- `docs/ai/AI_OPERATING_MANUAL.md` — Section 14 (Documentation Rules)

---

## AD-014 — Scalability Before Features

**Date:** P0 (Platform Foundation)
**Status:** Active

**Context:**
The platform had to serve individual tourism businesses, entire destinations, municipalities, regions, and tourism networks. Each level of scale has different requirements. A hotel needs booking management. A destination needs ecosystem governance. A municipality needs regional oversight.

The question was: in what order should the platform scale? Should it start with features for individual businesses and add destination-level capabilities later? Or should it start with the platform foundation and add business-level features on top?

**Decision:**
Capabilities first. Products second. Destinations third. Platform always first.

The platform's scalability hierarchy is:
1. **Platform foundation** — Shared utilities, event system, capability framework (L0-L1)
2. **Core capabilities** — Business-agnostic capability infrastructure (L2-L4)
3. **Business capabilities** — Booking, availability, notifications (L4)
4. **Destination capabilities** — Ecology, economy, governance, identity (L4)
5. **Product features** — Specific implementations for specific destinations (L6-L11)

Each level depends on the levels below it. The platform foundation must be solid before business capabilities can be built. Business capabilities must exist before destination capabilities can compose them. Destination capabilities must exist before products can be deployed.

**Alternatives Considered:**
1. **Features-first** — Build specific features for specific customers, then generalize.
2. **Product-first** — Build complete products, then extract reusable capabilities.
3. **Destination-first** — Build the ecosystem layer first, then add business capabilities.
4. **Simultaneous development** — Build all levels at the same time.

**Why They Were Rejected:**
1. **Features-first** creates a feature tangle. Without structural foundations, features accumulate without organization. The codebase becomes a bag of features with no coherence.
2. **Product-first** creates product-specific code that cannot be reused. Each product becomes a silo; sharing between products requires rewriting.
3. **Destination-first** builds on a foundation that does not yet exist. Destination capabilities depend on business capabilities, which depend on the platform foundation.
4. **Simultaneous development** spreads resources too thin. Without a solid foundation, building at multiple levels simultaneously produces instability at all levels.

**Consequences:**
- The platform foundation is built first and built right
- Business capabilities compose the platform foundation
- Destination capabilities compose business capabilities
- Products deploy destination capabilities for specific contexts
- Each level of scale is supported by solid foundations below it
- The platform can serve any level of scale because the foundations are universal
- New verticals (municipalities, education, marine conservation) can be served by composing existing capabilities

**Future Reconsideration Rules:**
This decision is permanent. Scalability before features is the foundation of the platform's growth strategy. The only permissible evolution is adding new levels of scale — never building features without solid foundations.

**References:**
- `docs/architecture/LAYER_MODEL.md` — L0-L11 layer definitions
- `docs/architecture/SYSTEM_OVERVIEW.md` — Scalability hierarchy
- `docs/ai/MASTER_CONTEXT.md` — Platform identity
- `docs/knowledge/DESIGN_PRINCIPLES.md` — Modularity principle

---

## AD-015 — Human-Centered Platform

**Date:** P0 (Platform Foundation)
**Status:** Active

**Context:**
The tourism industry has been colonized by platforms that serve technology, not people. Booking.com serves hotels. Airbnb serves hosts. TripAdvisor serves advertisers. Google Maps serves advertisers. Facebook serves advertisers.

None of these platforms serve the communities that live in tourism destinations. None serve the ecology that makes tourism possible. None serve the culture that makes destinations worth visiting.

The question was: who does the platform serve?

**Decision:**
Technology serves people. Communities. Nature. Businesses. Visitors. Never the opposite.

The platform's hierarchy of service:
1. **Communities** — The people who live in tourism destinations
2. **Nature** — The ecology that makes tourism possible
3. **Culture** — The heritage that makes destinations worth visiting
4. **Visitors** — The people who explore and participate
5. **Businesses** — The partners who provide services
6. **The platform** — The technology that connects everyone

The platform exists to serve this hierarchy. When the platform's interests conflict with any element above it, the higher element wins. When monetization conflicts with ecology, ecology wins. When growth conflicts with community, community wins. When features conflict with culture, culture wins.

**Alternatives Considered:**
1. **Investor-centered** — The platform serves investors through revenue growth.
2. **Platform-centered** — The platform's metrics and growth are the priority.
3. **Business-centered** — The platform serves businesses through customer acquisition.
4. **Visitor-centered** — The platform serves visitors through convenience.
5. **Technology-centered** — The platform serves developers through technical excellence.

**Why They Were Rejected:**
1. **Investor-centered** prioritizes revenue over everything else. This leads to advertising, data extraction, and ecological damage — the exact problems the platform exists to solve.
2. **Platform-centered** prioritizes platform metrics over platform purpose. Growth at the cost of community is extractive, not regenerative.
3. **Business-centered** prioritizes business needs over community needs. This is the Booking.com model — businesses pay for visibility; communities are invisible.
4. **Visitor-centered** prioritizes visitor convenience over destination integrity. This leads to over-tourism, cultural commodification, and ecological damage.
5. **Technology-centered** prioritizes technical elegance over human impact. Beautiful architecture that does not serve people is engineering narcissism.

**Consequences:**
- Every feature is evaluated by its impact on communities, ecology, and culture
- The platform's success is measured by territorial impact, not platform metrics
- Monetization is subservient to the platform's human-centered mission
- The platform can say "no" to revenue opportunities that conflict with its values
- Communities are empowered, not exploited
- Ecology is protected, not degraded
- Culture is preserved, not commodified
- Visitors are participants, not consumers

**Future Reconsideration Rules:**
This decision is permanent. Human-centered platform is the foundation of every other decision. The only permissible evolution is expanding who the platform serves — never changing the hierarchy of service.

**References:**
- `docs/knowledge/PLATFORM_MANIFESTO.md` — Seven commitments
- `docs/knowledge/WHY.md` — Platform purpose
- `docs/knowledge/DESIGN_PRINCIPLES.md` — All 14 principles
- `docs/knowledge/PLATFORM_GLOSSARY.md` — Human-centered vocabulary
- `docs/ai/MASTER_CONTEXT.md` — Platform identity

---

## Decision Evolution

This section explains how future decisions should be added to this document.

**Adding New Decisions:**
1. Assign the next sequential AD-XXX number
2. Follow the Decision Template exactly
3. All eight sections must be present
4. Reference existing decisions when they relate to the new decision
5. Reference architecture documents, design principles, and invariants as appropriate
6. Write with professional engineering clarity
7. Include specific alternatives considered — not generic ones
8. Explain specific rejection reasons — not generic ones
9. Document specific consequences — not generic ones
10. Define specific reconsideration rules — not generic ones

**Decision IDs Never Change:**
Once assigned, an AD number is permanent. AD-001 will always be "Capability Architecture" even if the decision is superseded. This ensures cross-references remain valid.

**Deprecated Decisions Stay Documented:**
If a decision is deprecated, its status changes to "Deprecated" but the decision remains in the document. The deprecation notice explains why the decision is no longer active and what replaced it.

**Superseded Decisions Reference Replacements:**
If a decision is superseded by a new decision, the old decision's status changes to "Superseded" and the "Future Reconsideration Rules" section references the new decision that replaced it.

**Never Delete History:**
Architectural decisions are historical records. Even when they are wrong, they teach future contributors what was considered and why alternatives were rejected. Deleting history repeats history.

**Review Schedule:**
This document should be reviewed at the start of each major phase. Review means verifying that all Active decisions remain valid and that no new decisions need to be recorded.

---

## Architecture Philosophy

The philosophy of Valdi Engine can be summarized in one page.

**Long-Term Thinking:**
Every decision survives 10+ years. Vanilla JavaScript. Capability architecture. Event-driven communication. Timeless principles over fashionable patterns. The platform is built for decades, not quarters.

**Platform Thinking:**
The platform is not an application. It is infrastructure. It serves destinations, communities, ecology, and culture. Applications are built on top of it. The platform persists; applications evolve.

**Modularity:**
Capabilities are self-contained. Events are the communication backbone. Dependencies flow downward. The shared layer is business-agnostic. Every module can be reasoned about independently.

**Events:**
The EventBus is the nervous system. Capabilities communicate through events, not imports. Loose coupling enables independent evolution. The event system scales from 26 capabilities to 260.

**Capabilities:**
Every business domain has clear ownership. The capability contract is the interface. Lifecycle management enables activation and deactivation. The 26 registered capabilities prove the pattern works.

**Offline-First:**
The platform assumes no internet. Tourism happens where connectivity is poor. Features work without network. Synchronization is delayed, not blocking. The PWA architecture enables installation on any device.

**Community:**
Communities own their knowledge. Culture belongs to people. Visitor-generated content is primary. Marketing content is secondary. Community validation is required for cultural content.

**Ecology:**
Ecology precedes monetization. If a feature harms ecology, it does not ship. Conservation generates value through eco-tokens, carbon credits, and citizen science. The platform protects what makes tourism possible.

**Tourism:**
Tourism is not extraction. Tourism is regeneration. Visitors are participants, not consumers. Destinations are living ecosystems, not product catalogs. Experience comes before commerce.

**AI Collaboration:**
AI assists humans but never owns decisions. The Architect decides. AI proposes. Cultural content requires human validation. The AI Brain system standardizes collaboration protocols.

**Human Decisions:**
The Architect is the final decision-maker. AI systems propose; humans dispose. This is not a limitation — it is a responsibility. Technology serves people, and people decide how technology serves them.

---

## Final Principle

Architecture is temporary. Principles are permanent. Technology changes. Vision endures.

Every decision recorded here exists to protect that vision. The capabilities will evolve. The events will change. The code will be rewritten. But the principles — that communities own their knowledge, that ecology precedes monetization, that experience comes before commerce, that technology serves people — these principles endure.

The Architect Decisions document is not a constraint. It is a compass. When future contributors wonder why the platform was built this way, this document provides the answer. When future AI systems wonder what they must preserve, this document provides the boundaries.

The vision is a world where tourism regenerates destinations instead of extracting from them. Every architectural decision serves that vision. Every line of code serves that vision. Every feature serves that vision.

Protect the vision. Record the decisions. Respect the principles. Build for decades.

---

*Architect Decisions — Valdi Engine*
*The permanent memory of the Architect's decisions.*
*Status: Active — Updated after each major architectural decision*
*Review: At the start of each major phase*
