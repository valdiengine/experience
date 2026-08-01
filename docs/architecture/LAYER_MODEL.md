# LAYER_MODEL.md

> Layer responsibilities and import rules.

---

## Layer Hierarchy

| Layer | Name | Purpose |
|-------|------|---------|
| L0 | Shared | Utilities, constants, schemas, events |
| L1 | Core | Bootstrap, routing, theme, data access, event bus |
| L2 | Providers | Data source abstraction |
| L3 | Tenant Manager | Multi-tenant configuration |
| L4 | Capabilities | Feature modules (26 registered) |
| L5 | Plugins | Cross-cutting concerns |
| L6 | Business | Domain orchestration |
| L7 | Workflows | Visual multi-step flow execution |
| L8 | Automation | Event-based rules |
| L9 | Engines | Specialized subsystems |
| L10 | Admin | Business management panel |
| L11 | Destination | Tourism destination ecosystem |

---

## Layer Details

### L0 — Shared

**Path:** `shared/`
**Purpose:** Zero business knowledge. Pure utilities.
**Contains:**
- `utils/` — DOM, format, performance, a11y, icons, observers
- `constants/` — Labels, status, config
- `events/eventbus.js` — App-level EventBus singleton
- `schema/` — Normalize, validators, types

**Rules:**
- CANNOT import from any application layer
- CANNOT contain business logic
- CANNOT reference tourism, restaurants, drones, or any industry

### L1 — Core

**Path:** `engine/core/`
**Purpose:** Platform orchestration.
**Contains:**
- `bootstrap.js` — DOMContentLoaded, init sequence
- `app.js` — Boot orchestrator
- `eventbus.js` — App-level EventBus singleton
- `datamanager.js` — Data access via Providers only
- `router.js` — Hash-based SPA routing
- `loader.js` — Loading screen
- `theme.js` — Dark/light manager

**Rules:**
- CAN import from L0 (Shared)
- CANNOT import from L2+ (Providers, Capabilities, etc.)
- DataManager ONLY accesses data through Providers

### L2 — Providers

**Path:** `engine/providers/`
**Purpose:** Data source communication.
**Contains:**
- `base.provider.js` — Provider base class
- `json.provider.js` — JSON file provider

**Rules:**
- CAN import from L0, L1
- CANNOT contain business logic
- CANNOT cache, search, filter, validate (that's DataManager)
- ONLY handles data source communication

### L3 — Tenant Manager

**Path:** `capabilities/tenant/`
**Purpose:** Multi-tenant configuration.
**Contains:**
- `config.schema.js` — Tenant configuration schema
- `registry.js` — Tenant registry
- `resolver.js` — Tenant resolution
- `manager.js` — Tenant management

**Rules:**
- CAN import from L0, L1, L2
- Resolves current tenant via URL, subdomain, path, localStorage
- Provides tenant config to capabilities

### L4 — Capabilities

**Path:** `capabilities/`
**Purpose:** Self-contained feature modules.
**Contains:** 26 registered capabilities
**File structure:**
```
capabilities/{name}/
├── {name}.capability.js      # Entry point
├── {name}.manager.js          # Orchestrator
├── {name}.schema.js           # Schemas
├── {name}.events.js           # Events
├── README.md                  # Documentation
└── sub-modules/               # Domain managers
```

**Rules:**
- CAN import from L0 (shared/core utilities)
- CAN access other capabilities via `context.capabilities.get()`
- CANNOT import other capabilities directly
- CANNOT import from L5+
- MUST have schema, events, capability entry point
- MUST follow lifecycle: init → activate → deactivate → destroy

### L5 — Plugins

**Path:** (planned)
**Purpose:** Cross-cutting concerns.
**Status:** Not yet implemented.

### L6 — Business

**Path:** `business/services/`
**Purpose:** Domain orchestration.
**Contains:**
- `reservation.service.js` — Reservation workflow
- `payment.service.js` — Payment processing
- `notification.service.js` — Notification orchestration
- `user.service.js` — User management
- `analytics.service.js` — Analytics aggregation

**Rules:**
- CAN import from L0-L4
- Orchestrates multiple capabilities
- Contains domain-specific logic
- NOT a capability (different lifecycle)

### L7 — Workflows

**Path:** `workflows/engine/`
**Purpose:** Visual multi-step flow execution.
**Contains:**
- `workflow.engine.js` — State machine
- `workflow.parser.js` — Flow definition parser
- `workflow.context.js` — Execution context
- `nodes/` — Trigger, Condition, Action, Delay nodes

**Rules:**
- CAN import from L0-L4
- Executes defined flow definitions
- State machine with persistence

### L8 — Automation

**Path:** `automation/engine/`
**Purpose:** Event-based rules.
**Contains:**
- `automation.engine.js` — Rule engine
- `rule.context.js` — Rule execution context
- `actions/` — Webhook, notification, log, service actions

**Rules:**
- CAN import from L0-L4
- Listens to events
- Executes actions based on rules

### L9 — Engines

**Path:** `engine/`
**Purpose:** Specialized subsystems.
**Contains:**
- Experience Engine — Main website, components, animations
- Reservation Engine — Booking flow, calendar
- Notification Engine — Multi-channel notifications
- PWA Engine — Service worker, offline, install
- Admin Engine — Management dashboard

**Rules:**
- CAN import from L0-L4
- Subsystems with specific responsibilities
- Cross-engine communication ONLY via EventBus

### L10 — Admin

**Path:** `capabilities/admin/`
**Purpose:** Business management panel.
**Contains:** Users, roles, tenants, plans, analytics, content management.

**Rules:**
- CAN import from L0-L4
- Depends on multiple capabilities
- Admin-only functionality

### L11 — Destination

**Path:** `capabilities/community/`, `capabilities/exploration/`, etc.
**Purpose:** Tourism destination ecosystem.
**Contains:** Community, exploration, intelligence, governance, operations, identity.

**Rules:**
- CAN import from L0-L4
- Destination-specific logic
- Territory is the center

---

## Import Rules

### Allowed
```
L0 → (nothing, isolated)
L1 → L0
L2 → L0, L1
L3 → L0, L1, L2
L4 → L0 (and context.capabilities.get for cross-capability)
L5 → L0-L4
L6 → L0-L4
L7 → L0-L4
L8 → L0-L4
L9 → L0-L4
L10 → L0-L4
L11 → L0-L4
```

### Forbidden
```
L0 → ANY (Shared has zero app knowledge)
L1 → L2+ (Core cannot import Providers or higher)
L2 → L3+ (Providers cannot import Tenant or higher)
L4 → L4 (Capabilities cannot import each other directly)
L4 → L5+ (Capabilities cannot import Plugins or higher)
ANY → L0 from application (Shared cannot be imported by app layers... wait, this is wrong. Let me re-read the rules)

Actually, the golden rules say:
- Never import UP - Lower layers cannot import higher layers
- Never import SAME-LEVEL sibling - Use EventBus
- Cross-engine ONLY via EventBus
- Shared has ZERO app knowledge
```

### Critical Rule
**Capabilities communicate ONLY via EventBus or `context.capabilities.get()`.**
**Only `capabilities/core/register.js` imports capability classes.**
