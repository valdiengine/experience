# CAPABILITY_MAP.md

> Relationships between all 29 registered capabilities.

---

## Dependency Graph

```
                    ┌─────────────┐
                    │   saas      │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────┴─────┐ ┌───┴───┐ ┌─────┴─────┐
        │  billing   │ │admin  │ │ lifecycle  │
        └─────┬─────┘ └───┬───┘ └─────┬─────┘
              │            │            │
              └────────────┼────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
  ┌─────┴─────┐    ┌──────┴──────┐    ┌─────┴─────┐
  │  booking   │    │availability │    │   saas    │
  └─────┬─────┘    └──────┬──────┘    └───────────┘
        │                  │
        │    ┌─────────────┤
        │    │             │
  ┌─────┴────┴────┐  ┌────┴─────┐
  │  reservation   │  │  intel   │
  └───────┬───────┘  └──────────┘
          │
  ┌───────┼───────────┬─────────────┐
  │       │           │             │
┌─┴──┐ ┌─┴──┐ ┌──────┴──┐ ┌───────┴──┐
│ownr│ │eng │ │convert  │ │  public  │
└────┘ └─┬──┘ └─────────┘ └──┬───────┘
         │                    │
         │              ┌─────┼──────┐
         │              │     │      │
         │          ┌───┴─┐ ┌─┴───┐ ┌┴────────┐
         │          │seo  │ │pwa  │ │   cms   │
         │          └─────┘ └─────┘ └─────────┘
         │
    ┌────┴────┐
    │  comm   │
    └────┬────┘
         │
    ┌────┼──────────┬───────────┐
    │    │          │           │
┌───┴──┐ │   ┌──────┴──┐  ┌────┴────┐
│commun│ │   │explor   │  │ govern  │
│ ity  │ │   └────┬────┘  └────┬────┘
└──────┘ │        │            │
         │   ┌────┴────┐  ┌────┴─────┐
         │   │intell   │  │operations│
         │   │(dest)   │  └──────────┘
         │   └─────────┘
         │
    ┌────┴────┐
    │  idnt   │
    └─────────┘
```

## Capability Groups

### Core Infrastructure (L0-L3)
| Capability | Dependencies |
|------------|--------------|
| — | shared, core, providers, tenant |

### Feature Capabilities (L4)
| Capability | Dependencies |
|------------|--------------|
| accommodation | business |
| business | tenant, destination |
| persistence | — |
| booking | — |
| notifications | — |
| pwa | — |
| cms | — |
| communication | — |
| availability | — |
| scheduler | — |
| observability | — |
| onboarding | — |
| saas | — |

### Business Capabilities (L4-L6)
| Capability | Dependencies |
|------------|--------------|
| intelligence | availability |
| reservation | booking, availability, communication, notifications |
| owner | reservation, availability, communication, observability |
| engagement | communication, availability, observability |
| conversion | communication, engagement, observability |
| billing | saas |
| lifecycle | saas, billing, communication, onboarding, observability |

### Public Capabilities (L4-L9)
| Capability | Dependencies |
|------------|--------------|
| public | cms, pwa, reservation, communication, engagement |
| seo-intelligence | cms, public, observability, intelligence |
| pwa-engine | notifications, communication, public, observability |
| admin | reservation, availability, seo-intelligence, pwa-engine, observability, onboarding, saas, billing |

### Destination Capabilities (L11)
| Capability | Dependencies |
|------------|--------------|
| community | — |
| exploration | community |
| intelligence (dest) | community, exploration |
| governance | community |
| destination-operations | community, governance |
| destination-identity | — |

## Cross-Capability Communication

Capabilities access each other ONLY via `context.capabilities.get('name')`.

```js
// GOOD
const community = context.capabilities.get('community')
const memories = await community.memoryManager.getByDestination(destId)

// BAD
import { CommunityCapability } from '../community/community.capability.js'  // FORBIDDEN
```

## Event Flows Between Capabilities

| Source | Event | Consumer |
|--------|-------|----------|
| community | memory:created | identity (cultural memory) |
| community | visitor:visited_* | exploration (points) |
| exploration | explorer:discovered_species | intelligence (patterns) |
| exploration | mission:completed | community (reputation) |
| governance | content.flagged | community (moderation) |
| operations | health.updated | governance (decisions) |
| intelligence | recommendation.generated | public (display) |
| identity | story.published | public (content) |
| reservation | reservation:confirmed | notifications (alert) |
| billing | payment:completed | saas (subscription) |

## See Also

- [DEPENDENCY_GRAPH.md](./DEPENDENCY_GRAPH.md) — Allowed and forbidden imports
- [EVENT_FLOW.md](./EVENT_FLOW.md) — How events propagate
- `docs/ai/CAPABILITY_INDEX.md` — Detailed capability information
