# INTERNAL_EVENTS.md

> Internal event catalog. Events used between capabilities.

---

## Overview

Internal events are emitted and consumed within the platform. They are NOT exposed to external systems. External events (future REST API webhooks) will be separate.

---

## Event Groups by Domain

### Community Events
| Event | Emitter | Consumers |
|-------|---------|-----------|
| `community:visitor_registered` | Community | Intelligence, Exploration |
| `memory:created` | Community | Governance (moderation), Exploration (points) |
| `memory:approved` | Community | Exploration, Intelligence |
| `review:created` | Community | Intelligence, Governance |
| `reputation:updated` | Community | Exploration, Governance |

### Exploration Events
| Event | Emitter | Consumers |
|-------|---------|-----------|
| `explorer:created` | Exploration | Intelligence |
| `explorer:leveled_up` | Exploration | Community (reputation) |
| `explorer:discovered_species` | Exploration | Intelligence (patterns) |
| `mission:completed` | Exploration | Community (reputation) |
| `pokedex:entry_added` | Exploration | Intelligence |

### Governance Events
| Event | Emitter | Consumers |
|-------|---------|-----------|
| `governance.place.approved` | Governance | Community, Exploration |
| `governance.business.verified` | Governance | Economy |
| `governance.content.flagged` | Governance | Community (moderation) |
| `governance.health.calculated` | Governance | Operations |

### Operations Events
| Event | Emitter | Consumers |
|-------|---------|-----------|
| `operations.health.updated` | Operations | Governance, Intelligence |
| `operations.campaign.started` | Operations | Community, Exploration |
| `operations.alert.created` | Operations | Governance, Admin |

### Identity Events
| Event | Emitter | Consumers |
|-------|---------|-----------|
| `identity.story.published` | Identity | Public, Intelligence |
| `identity.heritage.item.validated` | Identity | Community, Exploration |
| `identity.hero.recognized` | Identity | Community |

### Intelligence Events
| Event | Emitter | Consumers |
|-------|---------|-----------|
| `intelligence.recommendation.generated` | Intelligence | Public, Exploration |
| `intelligence.demand.predicted` | Intelligence | Operations, Governance |
| `intelligence.knowledge.graph.updated` | Intelligence | Exploration |

### Reservation Events
| Event | Emitter | Consumers |
|-------|---------|-----------|
| `reservation:confirmed` | Reservation | Notifications, Analytics |
| `reservation:cancelled` | Reservation | Availability, Notifications |
| `reservation:completed` | Reservation | Lifecycle, Analytics |

### Billing Events
| Event | Emitter | Consumers |
|-------|---------|-----------|
| `billing:payment_completed` | Billing | SaaS (subscription), Analytics |
| `billing:invoice_overdue` | Billing | SaaS (suspension), Notifications |

### SaaS Events
| Event | Emitter | Consumers |
|-------|---------|-----------|
| `saas:subscription_activated` | SaaS | Admin, Lifecycle |
| `saas:limit_reached` | SaaS | Admin, Notifications |

---

## Event Routing Rules

1. Events are routed to ALL subscribers
2. No event is lost (retry on failure)
3. Events are processed in emission order
4. Error in one subscriber doesn't affect others
5. Events can trigger new events (chain pattern)

---

## See Also

- [EVENT_CONTRACTS.md](./EVENT_CONTRACTS.md) — Event contracts
- `docs/ai/EVENT_INDEX.md` — Complete event catalog
- [EVENT_FLOW.md](../architecture/EVENT_FLOW.md) — How events propagate
