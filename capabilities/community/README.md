# Community Capability

Destination Community & Memory Layer — visitor memories, reviews, interactions, reputation, and moderation.

## Architecture

```
capabilities/community/
├── community.capability.js      # Capability entry point
├── community.manager.js         # Orchestrator
├── community.schema.js          # Entity schemas + enums
├── community.events.js          # Event definitions
├── README.md
├── memories/
│   ├── memory.manager.js        # Memory CRUD + queries
│   └── memory.schema.js         # Memory schema re-export
├── reviews/
│   ├── review.manager.js        # Review CRUD + ratings
│   └── review.schema.js         # Review schema re-export
├── interactions/
│   ├── interaction.manager.js   # Likes, follows, helpful votes
│   └── interaction.schema.js    # Interaction schema re-export
├── profiles/
│   ├── visitor.profile.js       # Visitor profiles + tracking
│   └── reputation.manager.js    # Reputation scoring + levels
├── moderation/
│   └── moderation.manager.js    # Content moderation workflow
└── analytics/
    └── community.analytics.js   # Community engagement metrics
```

## Core Entities

| Entity | Purpose |
|--------|---------|
| Visitor Profile | Visitor participating in the ecosystem |
| Memory | Visitor story connected to a territory |
| Review | Structured rating of any ecosystem entity |
| Interaction | Like, comment, follow, helpful vote |
| Visit Event | Tracks visitor exploration |
| Reputation Score | Community contribution scoring |

## Key Concepts

- **Business-agnostic**: No tourism, restaurant, or drone knowledge
- **Territory-centered**: Memories and reviews belong to destinations, localities, places
- **Zero cross-capability imports**: Uses `context.capabilities.get()` only
- **Moderation-first**: All content enters moderation queue before appearing
- **Reputation-driven**: Visitor actions earn points and level up

## Reputation Levels

| Level | Name | Min Score |
|-------|------|-----------|
| 1 | Explorador | 0 |
| 2 | Viajero | 50 |
| 3 | Aventurero | 150 |
| 4 | Guardián | 350 |
| 5 | Embajador | 700 |

## Reputation Points

| Action | Points |
|--------|--------|
| Create memory | +10 |
| Write review | +5 |
| Helpful vote received | +2 |
| Visit verified place | +3 |
| Upload photo | +1 |
| Post comment | +1 |

## Events

| Event | Description |
|-------|-------------|
| community:visitor_registered | New visitor registered |
| memory:created | Memory created |
| memory:approved | Memory approved by moderation |
| memory:featured | Memory featured |
| memory:liked | Memory liked |
| memory:commented | Memory commented |
| review:created | Review created |
| review:approved | Review approved |
| review:updated | Review updated |
| review:reported | Review reported |
| interaction:created | Interaction created |
| visitor:visited_destination | Visitor explored destination |
| visitor:visited_place | Visitor explored place |
| reputation:updated | Reputation score changed |
| community:content_flagged | Content flagged for review |
| community:content_approved | Content approved |
| community:content_rejected | Content rejected |

## Integration

| Capability | Integration |
|------------|-------------|
| observability | Metrics sent via `context.capabilities.get('observability')` |
| destination | Extends destination/locality/place with community content |
| public | Displays memories, reviews, visitor activity |
| pwa-engine | Future destination PWAs include community sections |
| engagement | Community events trigger notifications/campaigns |
| intelligence | Visitor interests feed recommendations |
