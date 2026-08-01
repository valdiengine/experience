# API Domain

> Communication contracts. How systems talk to each other.

## Contents

| File | Purpose | Audience |
|------|---------|----------|
| `PUBLIC_API.md` | Public services available to external consumers | Developers, Integrators |
| `DATA_CONTRACTS.md` | Data schemas, DTOs, and payloads | Developers |
| `EVENT_CONTRACTS.md` | Official EventBus contracts | Developers |
| `INTERNAL_EVENTS.md` | Internal event catalog | Developers |

## How to Use This Folder

- **Integrating externally?** Check `PUBLIC_API.md`
- **Working with data?** Check `DATA_CONTRACTS.md`
- **Emitting or consuming events?** Check `EVENT_CONTRACTS.md`
- **Debugging event flow?** Check `INTERNAL_EVENTS.md`

## Relationship to Other Folders

- `docs/ai/` — Current implementation state (changes frequently)
- `docs/knowledge/` — Why the platform exists (ideas)
- `docs/architecture/` — How the platform works (technical)
- `docs/roadmap/` — Where development is going (planning)
- `docs/vision/` — Where the platform could evolve (inspiration)

This folder is **contract-focused**. It defines interfaces, not implementations.
