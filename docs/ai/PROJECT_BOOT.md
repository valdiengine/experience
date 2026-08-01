# PROJECT_BOOT.md

> Quick-start guide for AI agents resuming work on Valdi Engine.
> Read this file at the start of EVERY new session.

## Step 1: Read Context (30 seconds)

1. Read `docs/ai/MASTER_CONTEXT.md` — Architecture rules, golden rules, design system
2. Read `docs/ai/CURRENT_STATE.md` — Exact state snapshot
3. Read `docs/ai/NEXT_PHASE.md` — What to work on next

## Step 2: Understand the Codebase

```
valdi-engine/
├── shared/                    # L0: ZERO business knowledge
│   ├── utils/                 # DOM, format, performance, a11y, icons, observers
│   ├── constants/             # Labels, status, config
│   ├── events/eventbus.js     # App-level EventBus singleton
│   └── schema/                # Normalize, validators, types
│
├── engine/                    # L1-L2: Core platform
│   ├── core/                  # bootstrap, app, eventbus, datamanager, router, loader, theme
│   ├── providers/             # base.provider, json.provider
│   ├── components/            # UI components (card, carousel, lightbox, gallery, etc.)
│   ├── features/              # Feature placeholders
│   └── styles/                # CSS structure
│
├── capabilities/              # L4: Feature modules (26 registered)
│   ├── core/                  # base.capability, register.js, schema, events, loader, registry
│   ├── booking/               # Booking system
│   ├── notifications/         # Notification engine
│   ├── pwa/                   # PWA basics
│   ├── cms/                   # WordPress bridge
│   ├── communication/         # Multi-channel messaging
│   ├── availability/          # Availability collection
│   ├── intelligence/          # Analytics and recommendations
│   ├── reservation/           # Reservation orchestration
│   ├── scheduler/             # Job scheduling
│   ├── observability/         # Metrics, health, alerts
│   ├── onboarding/            # Business registration
│   ├── owner/                 # Owner portal
│   ├── engagement/            # Customer engagement
│   ├── conversion/            # Conversion intelligence
│   ├── public/                # Public experience
│   ├── seo-intelligence/      # SEO analysis
│   ├── pwa-engine/            # Full PWA engine
│   ├── admin/                 # Admin platform
│   ├── saas/                  # SaaS products
│   ├── billing/               # Payments
│   ├── lifecycle/             # Customer lifecycle
│   ├── community/             # Visitor community (L11)
│   ├── exploration/           # Gamification & discovery (L11)
│   ├── governance/            # Destination governance (L11)
│   ├── operations/            # Destination operations (L11)
│   └── identity/              # Cultural identity (L11)
│
├── business/services/         # L6: Domain orchestration
├── workflows/engine/          # L7: Visual workflow execution
├── automation/engine/         # L8: Event-based rules
│
├── agent.md                   # Platform documentation
├── ROADMAP.md                 # Master roadmap
└── docs/ai/                   # AI context files
```

## Step 3: Know the Rules

### DO
- Extend `BaseCapability` for new capabilities
- Use `context.capabilities.get('name')` for cross-capability access
- Register in `capabilities/core/register.js`
- Emit events for state changes
- Use DataManager for all data access
- Include error handling in managers
- Create schemas for data validation
- Document with README.md

### DON'T
- Import capabilities directly (only register.js does that)
- Import UP from lower layers
- Import SAME-LEVEL siblings (use EventBus)
- Put business logic in shared/
- Put industry knowledge in capabilities
- Access data sources directly (use Providers)
- Skip error handling

## Step 4: Verify Your Work

After completing a task:
1. Check all files exist with correct paths
2. Verify ES module syntax (import/export)
3. Ensure events follow naming convention: `domain:entity.action`
4. Confirm capability follows the contract (id, name, version, dependencies, lifecycle)
5. Update `capabilities/core/register.js` if new capability
6. Update `ROADMAP.md` with new phase
7. Update `docs/ai/CURRENT_STATE.md`

## Common Patterns

### Creating a new capability
```js
// capabilities/{name}/{name}.capability.js
import { BaseCapability } from '../core/base.capability.js'

export class {Name}Capability extends BaseCapability {
  static id = '{name}'
  static name = '{Name}'
  static version = '1.0.0'
  static dependencies = []

  async init(context) {
    await super.init(context)
    // Initialize managers
    return this
  }

  async activate() {
    await super.activate()
    // Set up event listeners
    return this
  }

  async deactivate() {
    // Clean up listeners
    await super.deactivate()
    return this
  }

  async destroy() {
    // Final cleanup
    await super.destroy()
    return this
  }
}
```

### Registering a capability
```js
// capabilities/core/register.js
import { NewCapability } from '../new-capability/new-capability.capability.js'

// In AVAILABLE_CAPABILITIES:
'new-capability': NewCapability,
```

### Emitting events
```js
// In any manager
this.context.eventBus?.emit({
  type: 'domain:entity.action',
  data: { id, ...payload },
  timestamp: Date.now()
})
```

## Current State Summary

- **26 capabilities** registered
- **44 phases** completed (100%)
- **Architecture specs** for 6 destination ecosystem layers
- **~370 events** across all capabilities
- **Last phase:** P11.3.9 — Destination Identity, Storytelling & Cultural Memory
- **Next:** See `docs/ai/NEXT_PHASE.md`
