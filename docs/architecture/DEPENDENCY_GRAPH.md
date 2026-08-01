# DEPENDENCY_GRAPH.md

> Allowed imports, forbidden imports, and cross-capability communication rules.
> Updated: P11.6 — Ecosystem Stabilization

---

## Import Rules Summary

| Rule | Description |
|------|-------------|
| Never import UP | Lower layers cannot import higher layers |
| Never import SAME-LEVEL sibling | Use EventBus for cross-engine communication |
| Cross-engine ONLY via EventBus | Engines never import each other |
| DataManager ONLY via Providers | DataManager never accesses data sources directly |
| Shared has ZERO app knowledge | `shared/` cannot import from any application layer |
| Capabilities via context only | Capabilities access each other ONLY via `context.capabilities.get()` |
| Only register.js imports | Only `capabilities/core/register.js` imports capability classes |

---

## Allowed Imports

```
L0 (Shared)
  └── imports: NOTHING (isolated)

L1 (Core)
  └── imports: L0

L2 (Providers)
  └── imports: L0, L1

L3 (Tenant Manager)
  └── imports: L0, L1, L2

L4 (Capabilities)
  └── imports: L0 (shared/core utilities)
  └── cross-capability: context.capabilities.get('name')

L5 (Plugins)
  └── imports: L0, L1, L2, L3, L4

L6 (Business)
  └── imports: L0, L1, L2, L3, L4

L7 (Workflows)
  └── imports: L0, L1, L2, L3, L4

L8 (Automation)
  └── imports: L0, L1, L2, L3, L4

L9 (Engines)
  └── imports: L0, L1, L2, L3, L4
  └── cross-engine: EventBus only

L10 (Admin)
  └── imports: L0, L1, L2, L3, L4

L11 (Destination)
  └── imports: L0, L1, L2, L3, L4
```

## Forbidden Imports

```
L0 → ANYTHING (Shared is isolated)
L1 → L2+ (Core cannot import Providers or higher)
L2 → L3+ (Providers cannot import Tenant or higher)
L4 → L4 (Capabilities cannot import each other directly)
L4 → L5+ (Capabilities cannot import Plugins or higher)
L9 → L9 (Engines cannot import each other directly)
```

## Cross-Capability Communication

### Correct Pattern
```js
// In any capability manager
const community = this.context.capabilities.get('community')
const memories = await community.memoryManager.getByDestination(destId)
```

### Incorrect Pattern (FORBIDDEN)
```js
// NEVER do this
import { CommunityCapability } from '../community/community.capability.js'
```

### Exception
Only `capabilities/core/register.js` imports capability classes:
```js
import { CommunityCapability } from '../community/community.capability.js'
import { ExplorationCapability } from '../exploration/exploration.capability.js'

export const AVAILABLE_CAPABILITIES = {
  community: CommunityCapability,
  exploration: ExplorationCapability,
  // ...
}
```

## Engine Cross-Communication

### Correct Pattern
```js
// Engine A emits event
this.context.eventBus.emit({
  type: 'reservation:confirmed',
  data: { reservationId, tenantId }
})

// Engine B listens (not imported by A)
this.context.eventBus.on('reservation:confirmed', (data) => {
  this.handleReservationConfirmed(data)
})
```

### Incorrect Pattern (FORBIDDEN)
```js
// NEVER import another engine
import { ReservationEngine } from '../reservation/engine.js'
```

## Provider Restrictions

Providers handle ONLY data source communication:

```js
// CORRECT - Provider
class JsonProvider {
  async fetch(query) {
    return await fetch(this.url + query)
  }
}

// INCORRECT - Provider with business logic
class JsonProvider {
  async fetch(query) {
    const data = await fetch(this.url + query)
    return data.filter(item => item.status === 'active')  // WRONG: filtering is DataManager's job
  }
}
```

## Shared Restrictions

Shared has ZERO business knowledge:

```js
// CORRECT - Shared utility
export function formatDate(date) {
  return new Intl.DateTimeFormat('es-CL').format(date)
}

// INCORRECT - Shared with business logic
export function formatReservationDate(reservation) {
  return `Reserva: ${reservation.date} - ${reservation.service}`  // WRONG: business knowledge
}
```

## Capability Dependencies (Registered)

| Capability | Can Import (L0) | Can Access (context.capabilities.get) |
|------------|-----------------|--------------------------------------|
| booking | shared, core | — |
| notifications | shared, core | — |
| pwa | shared, core | — |
| cms | shared, core | — |
| communication | shared, core | — |
| availability | shared, core | — |
| scheduler | shared, core | — |
| observability | shared, core | — |
| onboarding | shared, core | — |
| saas | shared, core | — |
| intelligence | shared, core | availability |
| reservation | shared, core | booking, availability, communication, notifications |
| owner | shared, core | reservation, availability, communication, observability |
| engagement | shared, core | communication, availability, observability |
| conversion | shared, core | communication, engagement, observability |
| billing | shared, core | saas |
| lifecycle | shared, core | saas, billing, communication, onboarding, observability |
| public | shared, core | cms, pwa, reservation, communication, engagement |
| seo-intelligence | shared, core | cms, public, observability, intelligence |
| pwa-engine | shared, core | notifications, communication, public, observability |
| admin | shared, core | reservation, availability, seo-intelligence, pwa-engine, observability, onboarding, saas, billing |
| community | shared, core | — |
| exploration | shared, core | community |
| intelligence (dest) | shared, core | community, exploration |
| governance | shared, core | community |
| destination-operations | shared, core | community, governance |
| destination-identity | shared, core | — |

### Static Dependencies (P11.6)

The following capabilities now declare `static dependencies = []`:
- `intelligence` (destination) — `static dependencies = []`
- `governance` — `static dependencies = []`
- `destination-operations` — `static dependencies = []`
- `destination-identity` — `static dependencies = []`

### Event-Only Modules (P11.6)

These modules contain only event definitions (no capability class):
- `capabilities/ecology/ecology.events.js` — ECOLOGY_EVENTS (6)
- `capabilities/economy/economy.events.js` — ECONOMY_EVENTS (4)
- `capabilities/destination/destination.events.js` — DESTINATION_EVENTS (4)
- `capabilities/locality/locality.events.js` — LOCALITY_EVENTS (3)

### Upward Imports Resolved (P11.6)

Engine core (`engine/core/`) previously imported from `src/` (architectural inversion). All upward imports now resolve to `shared/`:
- DOM utilities → `shared/utils/dom.js`
- Formatting → `shared/utils/format.js`
- EventBus → `shared/events/eventbus.js`

## See Also

- [LAYER_MODEL.md](./LAYER_MODEL.md) — Layer responsibilities
- [CAPABILITY_MAP.md](./CAPABILITY_MAP.md) — Capability relationships
- [EVENT_FLOW.md](./EVENT_FLOW.md) — Event propagation
