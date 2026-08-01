# Valdi Engine Documentation

> The official brain of the platform. Six knowledge domains. One source of truth.

---

## Documentation Domains

```
docs/
├── README.md          ← You are here (Portal)
│
├── ai/                ← CURRENT IMPLEMENTATION
│   │                   Changes frequently. Reflects exact project state.
│   ├── MASTER_CONTEXT.md
│   ├── PROJECT_BOOT.md
│   ├── CURRENT_STATE.md
│   ├── DECISION_LOG.md
│   ├── CAPABILITY_INDEX.md
│   ├── EVENT_INDEX.md
│   └── NEXT_PHASE.md
│
├── knowledge/         ← WHY THE PLATFORM EXISTS
│   │                   Ideas, beliefs, principles. Never describes implementation.
│   ├── WHY.md
│   ├── PLATFORM_MANIFESTO.md
│   ├── DESIGN_PRINCIPLES.md
│   ├── VISION_EVOLUTION.md
│   ├── FUTURE_IDEAS.md
│   ├── PLATFORM_GLOSSARY.md
│   ├── AI_GUIDELINES.md
│   └── README.md
│
├── architecture/      ← HOW THE PLATFORM WORKS
│   │                   Technical structure. Layer model, capabilities, data flow.
│   ├── SYSTEM_OVERVIEW.md
│   ├── CAPABILITY_MAP.md
│   ├── DOMAIN_MODEL.md
│   ├── LAYER_MODEL.md
│   ├── DATA_FLOW.md
│   ├── EVENT_FLOW.md
│   ├── DEPENDENCY_GRAPH.md
│   └── README.md
│
├── roadmap/           ← WHERE DEVELOPMENT IS GOING
│   │                   Planning, scheduling, technical debt.
│   ├── ROADMAP.md
│   ├── CHANGELOG.md
│   ├── RELEASE_PLAN.md
│   ├── TECHNICAL_DEBT.md
│   └── README.md
│
├── api/               ← HOW SYSTEMS COMMUNICATE
│   │                   Contracts, schemas, event definitions.
│   ├── PUBLIC_API.md
│   ├── DATA_CONTRACTS.md
│   ├── EVENT_CONTRACTS.md
│   ├── INTERNAL_EVENTS.md
│   └── README.md
│
└── vision/            ← WHERE THE PLATFORM COULD EVOLVE
    │                   Speculative, ambitious, unbounded.
    ├── 2030_VISION.md
    ├── 2050_VISION.md
    ├── MOONSHOTS.md
    ├── RESEARCH.md
    ├── INNOVATION_LAB.md
    └── README.md
```

---

## When to Use Each Domain

| Question | Domain | Start Here |
|----------|--------|------------|
| What's the current state? | `ai/` | `CURRENT_STATE.md` |
| How do I start working? | `ai/` | `PROJECT_BOOT.md` |
| Why does this platform exist? | `knowledge/` | `WHY.md` |
| What are the design rules? | `knowledge/` | `DESIGN_PRINCIPLES.md` |
| How is the architecture structured? | `architecture/` | `SYSTEM_OVERVIEW.md` |
| How do capabilities relate? | `architecture/` | `CAPABILITY_MAP.md` |
| What's the data model? | `architecture/` | `DOMAIN_MODEL.md` |
| What comes next? | `roadmap/` | `ROADMAP.md` |
| What's the technical debt? | `roadmap/` | `TECHNICAL_DEBT.md` |
| What's the event contract? | `api/` | `EVENT_CONTRACTS.md` |
| What's the data schema? | `api/` | `DATA_CONTRACTS.md` |
| What's the long-term vision? | `vision/` | `2030_VISION.md` |
| What are the moonshots? | `vision/` | `MOONSHOTS.md` |

---

## Who Should Read What

### New Developer
1. `ai/PROJECT_BOOT.md` — Quick start
2. `ai/MASTER_CONTEXT.md` — Architecture rules
3. `architecture/SYSTEM_OVERVIEW.md` — High-level architecture
4. `architecture/LAYER_MODEL.md` — Layer responsibilities
5. `ai/CURRENT_STATE.md` — Current state

### Product Manager
1. `knowledge/WHY.md` — Why the platform exists
2. `knowledge/PLATFORM_MANIFESTO.md` — Vision
3. `knowledge/VISION_EVOLUTION.md` — Evolution
4. `roadmap/ROADMAP.md` — What's planned
5. `knowledge/FUTURE_IDEAS.md` — Possibilities

### AI Agent
1. `ai/MASTER_CONTEXT.md` — Architecture rules
2. `ai/CURRENT_STATE.md` — Exact state
3. `ai/NEXT_PHASE.md` — What to work on
4. `knowledge/AI_GUIDELINES.md` — Coding rules
5. `knowledge/PLATFORM_GLOSSARY.md` — Terminology

### Architect
1. `architecture/SYSTEM_OVERVIEW.md` — Architecture
2. `architecture/CAPABILITY_MAP.md` — Capability relationships
3. `architecture/DEPENDENCY_GRAPH.md` — Import rules
4. `ai/DECISION_LOG.md` — Past decisions
5. `roadmap/TECHNICAL_DEBT.md` — Known issues

### Researcher
1. `knowledge/WHY.md` — Platform purpose
2. `vision/2030_VISION.md` — Near-term vision
3. `vision/RESEARCH.md` — Research topics
4. `vision/INNOVATION_LAB.md` — Experiments
5. `knowledge/FUTURE_IDEAS.md` — Future concepts

### Investor / Partner
1. `knowledge/PLATFORM_MANIFESTO.md` — Vision
2. `knowledge/WHY.md` — Why different
3. `knowledge/VISION_EVOLUTION.md` — Evolution
4. `vision/2030_VISION.md` — Near-term vision
5. `roadmap/RELEASE_PLAN.md` — What's planned

---

## AI Bootstrap Sequence

For any AI system starting work on this repository:

```
1. Read docs/ai/MASTER_CONTEXT.md     (30 seconds)
2. Read docs/ai/CURRENT_STATE.md      (30 seconds)
3. Read docs/ai/NEXT_PHASE.md         (30 seconds)
4. Read docs/knowledge/AI_GUIDELINES.md (30 seconds)
5. Read docs/knowledge/PLATFORM_GLOSSARY.md (30 seconds)
Total: ~2.5 minutes
```

After this bootstrap, the AI understands:
- What the platform is
- What's been built
- What comes next
- How to code correctly
- What vocabulary to use

---

## Cross-Reference Rules

- No document duplicates another
- Each document has one responsibility
- Cross-reference related documents
- Use consistent terminology from `PLATFORM_GLOSSARY.md`

---

## Maintenance

This documentation is maintained alongside the codebase. After each phase completion:

1. Update `ai/CURRENT_STATE.md`
2. Update `ai/EVENT_INDEX.md` if events changed
3. Update `ai/CAPABILITY_INDEX.md` if capabilities changed
4. Update `roadmap/CHANGELOG.md` with new entry
5. Update `roadmap/ROADMAP.md` if phases changed
6. Review all cross-references
