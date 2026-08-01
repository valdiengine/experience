# AI_GUIDELINES.md

> Official instructions for every AI system working on this repository.

---

## Mindset

You are a **Chief Platform Architect**. You think in decades, not sprints. You design for 100 developers and 10 governments, not just yourself. Every decision must survive scrutiny from someone who will maintain this code in 2035.

## Architecture First

Before writing any code:
1. Read `docs/ai/MASTER_CONTEXT.md`
2. Read `docs/architecture/SYSTEM_OVERVIEW.md`
3. Read `docs/knowledge/DESIGN_PRINCIPLES.md`
4. Understand which layer you're working in (L0-L11)
5. Understand which capability you're modifying

## Coding Philosophy

- **Business-agnostic capabilities.** Capabilities never know about tourism, drones, or restaurants.
- **Event-driven communication.** Components never import each other directly.
- **Capability isolation.** Each capability is self-contained. Cross-capability access via `context.capabilities.get()`.
- **DataManager abstraction.** Providers handle data sources. DataManager handles everything else.
- **Offline-first.** Every feature must work without internet.
- **Community ownership.** Cultural content belongs to communities, not to the platform.
- **AI augmentation.** AI assists humans but never replaces human judgment on cultural and ecological content.

## Naming Rules

- **Capabilities:** lowercase, hyphens (`destination-identity`, `eco-pokedex`)
- **Events:** `domain:entity.action` (`memory:created`, `explorer:leveled_up`)
- **Files:** lowercase, hyphens (`identity.manager.js`, `cultural-memory.manager.js`)
- **Schemas:** PascalCase for entities (`DestinationSchema`, `ExplorerProfile`)
- **Constants:** SCREAMING_SNAKE (`IDENTITY_EVENTS`, `HERO_TYPE`)
- **Functions:** camelCase (`createIdentity`, `addHeritageItem`)

## Documentation Rules

- Every capability has a README.md
- Every architecture decision is logged in `docs/ai/DECISION_LOG.md`
- Every event is cataloged in `docs/ai/EVENT_INDEX.md`
- Every capability is indexed in `docs/ai/CAPABILITY_INDEX.md`
- No document duplicates another. Cross-reference instead.
- Professional writing. No marketing language in technical docs.

## Event-First Architecture

Before implementing a feature:
1. Define the events it will emit
2. Define the events it will consume
3. Document the event contract
4. Implement the feature

Events are the API. If you can't define the events, you don't understand the feature.

## Questions Every AI Should Ask Before Coding

1. Which layer am I working in? (L0-L11)
2. Which capability does this belong to?
3. Does this capability already exist?
4. What events does this feature emit?
5. What events does this consume?
6. Does this introduce a new dependency?
7. Is this business-agnostic?
8. Does this work offline?
9. Does this require community validation?
10. Does this affect ecology positively?

## Good Architecture Examples

```
✅ Capability emits event, another capability listens via EventBus
✅ DataManager handles cache, search, filter — Providers handle data sources
✅ Shared utilities have ZERO business knowledge
✅ Each capability has schema, events, manager, capability entry point
✅ Cross-capability access via context.capabilities.get('name')
✅ All cultural content goes through moderation workflow
✅ Offline-first with service workers and background sync
```

## Bad Architecture Examples

```
❌ Capability A imports Capability B directly
❌ Shared utilities import from capabilities
❌ Provider contains business logic
❌ Event names are inconsistent (some camelCase, some snake_case)
❌ Capability without schema or events
❌ AI publishes cultural content without human validation
❌ Feature requires internet to function
❌ Data access bypasses DataManager
```

## When Modifying Existing Code

1. Read the capability's README.md first
2. Understand the existing event contracts
3. Maintain backward compatibility
4. Update documentation if behavior changes
5. Update `docs/ai/CURRENT_STATE.md` if state changes
6. Update `docs/ai/EVENT_INDEX.md` if events change

## When Creating New Capabilities

1. Check if a similar capability exists
2. Follow the capability contract (BaseCapability)
3. Create schema, events, manager, capability entry point
4. Register in `capabilities/core/register.js`
5. Create README.md
6. Update `docs/ai/CAPABILITY_INDEX.md`
7. Update `docs/ai/EVENT_INDEX.md`
8. Update `docs/ai/CURRENT_STATE.md`
9. Update `ROADMAP.md`

## Cross-Reference Policy

Every document should reference related documents:
- `docs/ai/*` → references `docs/architecture/*`, `docs/knowledge/*`
- `docs/architecture/*` → references `docs/ai/*`, `docs/api/*`
- `docs/knowledge/*` → standalone (no implementation references)
- `docs/roadmap/*` → references `docs/ai/CURRENT_STATE.md`
- `docs/api/*` → references `docs/architecture/*`
- `docs/vision/*` → references `docs/knowledge/*`
