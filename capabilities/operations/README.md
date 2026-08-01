# Destination Operations Capability

**Version:** 1.0.0 | **Status:** Active | **Dependencies:** None

## Purpose

Destination Operations & Ecosystem Orchestration Layer. Manages destination lifecycle, health monitoring, campaigns, seasonal operations, and multi-destination coordination.

## Architecture

```
operations/
├── operations.schema.js              # Schemas and enums
├── operations.events.js              # Event definitions
├── operations.manager.js             # Core operations manager
├── health/
│   └── destination-health.manager.js # Health scoring and monitoring
├── campaigns/
│   └── campaign.manager.js           # Campaign lifecycle management
├── seasons/
│   └── seasonal.manager.js           # Seasonal profiles and recommendations
├── dashboards/
│   └── operations.analytics.js       # Operations dashboards
├── operations.capability.js          # Capability entry point
└── README.md
```

## Modules

### OperationsManager
Core manager handling destination activation, lifecycle transitions, health monitoring, alerts, and operational checks.

### DestinationHealthManager
Calculates health scores (0-100) across 5 components: Tourism (25%), Community (20%), Ecology (20%), Economy (20%), Governance (15%). Tracks trends and generates alerts.

### CampaignManager
Campaign lifecycle: Draft → Active → Completed → Archived. Supports 5 campaign types (Discovery, Conservation, Community, Business, Seasonal). Tracks participants and milestones.

### SeasonalManager
Season profiles with activities, recommendations, species, and weather. Generates personalized seasonal recommendations based on visitor profiles.

### OperationsAnalytics
Dashboards for Destination Manager, Municipality, Scientific Partners, and Businesses. Tracks metrics across all operational areas.

## Destination Lifecycle

5 Stages: Registered → Activated → Growing → Mature → Living

Each stage has specific requirements and unlocks new capabilities.

## Health Score

0-100 score based on:
- Tourism Health (25%): Visitor activity, experience completion, bookings, reviews
- Community Health (20%): Participation, memories, validations, engagement
- Ecology Health (20%): Observations, conservation, reputation, habitat health
- Economy Health (20%): Partners, transactions, experiences, bookings
- Governance Health (15%): Approvals, moderation, audit, compliance

## Integration

Listens to events from:
- destination (creation)
- exploration (visitor activity)
- community (memories)
- ecology (observations)
- economy (partner registration)
- reservation (bookings)

Produces events:
- operations.destination.activated/paused
- operations.health.updated
- operations.campaign.started/completed
- operations.season.activated
- operations.alert.created
- operations.report.generated

## Key Concepts

- **Operations orchestrates, never owns** — domain data stays with capabilities
- **Health scoring** — continuous monitoring with trend analysis
- **Campaign engine** — gamified destination engagement
- **Seasonal intelligence** — context-aware seasonal operations
- **Multi-destination** — independent but connected operations
