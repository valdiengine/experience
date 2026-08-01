# SYSTEM_OVERVIEW.md

> High-level architecture of Valdi Engine.

---

## Platform Summary

Valdi Engine is a multi-tenant tourism ecosystem platform built on a capability-based architecture. It serves as digital infrastructure for tourism destinations, connecting territories, communities, ecology, and businesses.

## Core Architecture

```
┌─────────────────────────────────────────────────────┐
│                    L11 DESTINATION                   │
│  Community · Ecology · Exploration · Identity        │
│  Governance · Operations · Intelligence              │
├─────────────────────────────────────────────────────┤
│                    L10 ADMIN                         │
│  Users · Roles · Tenants · Plans · Analytics         │
├─────────────────────────────────────────────────────┤
│                    L9 ENGINES                        │
│  Experience · Reservation · Notification · PWA · Admin│
├─────────────────────────────────────────────────────┤
│                    L8 AUTOMATION                     │
│  Event-based rules · Triggers · Actions              │
├─────────────────────────────────────────────────────┤
│                    L7 WORKFLOWS                      │
│  Visual multi-step flows · State machines            │
├─────────────────────────────────────────────────────┤
│                    L6 BUSINESS                       │
│  Reservation · Payment · Notification · User services│
├─────────────────────────────────────────────────────┤
│                    L5 PLUGINS                        │
│  Cross-cutting concerns                              │
├─────────────────────────────────────────────────────┤
│                    L4 CAPABILITIES                   │
│  26 registered feature modules                       │
├─────────────────────────────────────────────────────┤
│                    L3 TENANT MANAGER                 │
│  Multi-tenant config · Engine resolution             │
├─────────────────────────────────────────────────────┤
│                    L2 PROVIDERS                      │
│  Data source abstraction                             │
├─────────────────────────────────────────────────────┤
│                    L1 CORE                           │
│  Bootstrap · EventBus · DataManager · Router · Theme  │
├─────────────────────────────────────────────────────┤
│                    L0 SHARED                         │
│  Utilities · Constants · Schemas · Events            │
└─────────────────────────────────────────────────────┘
```

## Key Components

### EventBus (L1)
The communication backbone. All components communicate through events. No direct imports between peers.

### DataManager (L1)
Central data access layer. Handles cache, search, filter, validate, normalize. Providers handle data sources.

### Capabilities (L4)
26 self-contained feature modules. Each has lifecycle: init → activate → deactivate → destroy. Registered in `capabilities/core/register.js`.

### Business Services (L6)
Domain orchestration layer. Connects capabilities for complex workflows.

### Workflow Engine (L7)
Visual multi-step flow execution. State machines with triggers, conditions, actions, delays.

### Automation Engine (L8)
Event-based rules. Triggers, conditions, actions. Reacts to system events.

## Data Flow

```
User Interface
      ↓
Capability Manager
      ↓
DataManager ←→ Provider ←→ Data Source
      ↓
EventBus → Other Capabilities
```

## Communication Flow

```
Component A
    ↓ emit
EventBus
    ↓ route
Component B (subscribed)
```

## Multi-Tenant Isolation

```
Tenant A ←→ DataManager (scoped) ←→ Provider (filtered)
Tenant B ←→ DataManager (scoped) ←→ Provider (filtered)
```

Each tenant has:
- Isolated data scope
- Independent configuration
- Custom capability activation
- Separate branding and theming

## Destination Ecosystem

```
Tourism Network
  └── Region
        └── Destination
              ├── Locality
              │     ├── Place
              │     │     └── Experience
              │     │           └── Business Tenant
              │     └── Heritage
              └── Ecology
                    ├── Flora
                    ├── Fauna
                    └── Habitats
```

## Technology Stack

- **Frontend:** Vanilla JS (ES modules), CSS custom properties
- **Architecture:** Capability-based, event-driven
- **PWA:** Service workers, offline-first
- **CMS:** WordPress (hybrid architecture)
- **Data:** JSON providers (mock), API providers (future)
- **Communication:** EventBus (in-process)

## See Also

- [CAPABILITY_MAP.md](./CAPABILITY_MAP.md) — Relationships between capabilities
- [LAYER_MODEL.md](./LAYER_MODEL.md) — Layer responsibilities
- [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) — Ecosystem hierarchy
- `docs/ai/MASTER_CONTEXT.md` — Current implementation state
