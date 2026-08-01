# Architecture Domain

> How the platform works. Technical structure and design.

## Contents

| File | Purpose | Audience |
|------|---------|----------|
| `SYSTEM_OVERVIEW.md` | High-level architecture diagram and components | Everyone |
| `CAPABILITY_MAP.md` | Relationships between all 26 capabilities | Developers |
| `DOMAIN_MODEL.md` | Complete ecosystem hierarchy and entities | Developers, Product |
| `LAYER_MODEL.md` | Layer responsibilities and import rules | Developers |
| `DATA_FLOW.md` | How information moves through the platform | Developers |
| `EVENT_FLOW.md` | How events propagate via EventBus | Developers |
| `DEPENDENCY_GRAPH.md` | Allowed and forbidden imports | Developers |
| `DATABASE-BLUEPRINT.md` | P12.0.0 — Canonical persistence model for all providers | Developers, Architects |
| `PERSISTENCE-CONTRACTS.md` | P12.0.1 — Persistence contracts between capabilities, repositories, providers, database | Developers, Architects |
| `REPOSITORY-UOW-ARCHITECTURE.md` | P12.0.2 — Repository, Unit of Work, Transaction Manager architecture | Developers, Architects |
| `ORM-ADAPTER-ARCHITECTURE.md` | P12.0.4 — ORM Adapter Layer architecture | Developers, Architects |
| `POSTGRES-PROVIDER-ARCHITECTURE.md` | P12.0.5 — PostgreSQL Provider architecture (16 sections) | Developers, Architects |
| `PLATFORM-RUNTIME-ARCHITECTURE.md` | P12.0.5.1 — Platform Runtime architecture (14 sections, 12 rules) | Developers, Architects |
| `IDENTITY-AUTHENTICATION-BLUEPRINT.md` | P12.1.0 — Identity domain & authentication architecture (13 sections, 15 rules) | Developers, Architects |
| `AUTHORIZATION-RUNTIME-INTEGRATION.md` | P12.1.6 — Authorization Runtime Integration architecture (13 sections, 12 rules) | Developers, Architects |
| `WORDPRESS-PROVIDER-ARCHITECTURE.md` | P12.2.3 — WordPress Provider architecture (12 sections, 10 rules) | Developers, Architects |
| `CMS-SYNC-ENGINE-ARCHITECTURE.md` | P12.2.4 — CMS Sync Engine architecture (12 sections, 10 rules) | Developers, Architects |
| `PRE_MVP_ARCHITECTURE_REVIEW.md` | P12.2.5 — Pre-MVP Architecture Review (10 areas, 66/100 readiness score) | Developers, Architects, Product |
| `INFRASTRUCTURE-WIRING-ARCHITECTURE.md` | P12.3.0 — Infrastructure Wiring Architecture (12 sections, 12 rules) | Developers, Architects |

## How to Use This Folder

- **New developer?** Start with `SYSTEM_OVERVIEW.md`
- **Building a capability?** Read `LAYER_MODEL.md` and `DEPENDENCY_GRAPH.md`
- **Debugging data flow?** Check `DATA_FLOW.md`
- **Debugging events?** Check `EVENT_FLOW.md`
- **Understanding capability relationships?** Check `CAPABILITY_MAP.md`
- **Building a persistence provider?** Read `DATABASE-BLUEPRINT.md` → `PERSISTENCE-CONTRACTS.md` → `REPOSITORY-UOW-ARCHITECTURE.md`

## Relationship to Other Folders

- `docs/ai/` — Current implementation state (changes frequently)
- `docs/knowledge/` — Why the platform exists (ideas)
- `docs/api/` — Communication contracts (reference)
- `docs/roadmap/` — Where development is going (planning)
- `docs/vision/` — Where the platform could evolve (inspiration)

This folder is **intentionally technical**. It describes architecture, not implementation details.
