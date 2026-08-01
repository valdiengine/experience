# DOMAIN_MODEL.md

> Complete ecosystem hierarchy and entity relationships.

---

## Entity Hierarchy

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

## Entity Definitions

### Tourism Network
- **Description:** The highest level. A collection of regions.
- **Contains:** Regions
- **Has PWA:** Yes (platform root)
- **Has SEO:** Yes (platform-level metadata)

### Region
- **Description:** A geographical or administrative grouping of destinations.
- **Contains:** Destinations
- **Has PWA:** Yes (region-level)
- **Has SEO:** Yes (region metadata)

### Destination
- **Description:** The primary ecosystem identity. A territory with shared tourism, ecology, and cultural identity.
- **Contains:** Localities, Places, Experiences, Businesses, Ecology
- **Has PWA:** Yes (destination-level)
- **Has SEO:** Yes (destination metadata)
- **Governed by:** Governance capability
- **Monitored by:** Operations capability

### Locality
- **Description:** A community identity within a destination. A neighborhood, village, or district.
- **Contains:** Places, Experiences
- **Has PWA:** Yes (locality-level)
- **Has SEO:** Yes (locality metadata)
- **Managed by:** Community leaders

### Place
- **Description:** A tourism discovery point. Trail, viewpoint, beach, restaurant, park, landmark.
- **Contains:** Experiences
- **Has PWA:** No (uses parent PWA)
- **Has SEO:** Yes (place metadata)
- **Has Community Content:** Memories, Reviews

### Experience
- **Description:** A bookable service or activity. Surf lesson, guided hike, cooking class, kayak tour.
- **Contains:** Reservations
- **Has PWA:** No (uses parent PWA)
- **Has SEO:** Yes (experience metadata)
- **Has Community Content:** Reviews, Memories

### Business Tenant
- **Description:** A service provider operating inside the ecosystem.
- **Offers:** Experiences
- **Has PWA:** Yes (business-level)
- **Has SEO:** Yes (business metadata)
- **Has Community Content:** Reviews
- **Governed by:** Governance capability

## People Entities

### Visitor
- **Description:** An ecosystem participant who explores destinations and generates content.
- **Generates:** Memories, Reviews, Interactions, Observations
- **Has:** Explorer Profile, Reputation, EcoScore
- **Tracks:** Visits, Discoveries, Missions

### Explorer
- **Description:** A visitor who actively participates in gamification.
- **Has:** Missions, Badges, Leaderboard Position, Explorer Card
- **Discovers:** Species, Places, Cultural Heritage
- **Earns:** Points, EcoTokens, Badges

### Guardian
- **Description:** A high-reputation visitor who contributes to conservation.
- **Reputation Level:** 4 (of 5)
- **Has:** Verified Conservation Contributions
- **Can:** Validate Observations, Lead Missions

### Ambassador
- **Description:** The highest reputation level. Represents the destination.
- **Reputation Level:** 5 (of 5)
- **Has:** Sustained Contribution History
- **Can:** Mentor New Visitors, Lead Community Initiatives

## Ecology Entities

### Species
- **Description:** A documented plant, animal, or organism.
- **Cataloged in:** Eco Pokedex (FloraDex, FaunaDex, MarineDex)
- **Has:** Photos, Habitat, Conservation Status, Observations
- **Tracked by:** Citizen Science

### Habitat
- **Description:** A defined ecological zone within a destination.
- **Contains:** Species
- **Has:** Health Score, Monitoring Data
- **Managed by:** Conservation programs

### Observation
- **Description:** A visitor-contributed ecological data point.
- **Types:** Species sighting, Trail condition, Wildlife photo
- **Has:** Trust Score, Validation Status
- **Contributes to:** Citizen Science, Conservation

## Cultural Entities

### Story
- **Description:** A cultural narrative belonging to a community.
- **Types:** Historical, Human, Nature, Experience, Legend, Tradition
- **Has:** Chapters, Characters, Themes, Media
- **Validated by:** Community

### Heritage
- **Description:** Documented cultural assets.
- **Types:** Tangible (buildings, monuments), Intangible (traditions, food, music, crafts)
- **Has:** Conservation Status, Cultural Significance
- **Preserved by:** Community

### Local Hero
- **Description:** A recognized community member who contributes to the destination's identity.
- **Types:** Fisherman, Artisan, Scientist, Explorer, Conservationist, Entrepreneur, Community Leader, Educator
- **Has:** Story, Contribution, Recognition Level
- **Verified by:** Community

### Cultural Memory
- **Description:** Collective knowledge preserved by communities.
- **Categories:** Personal, Family, Community, Historical, Cultural, Traditional, Natural
- **Has:** Cultural Significance, Heritage Contribution
- **Validated by:** Community

## Operational Entities

### Campaign
- **Description:** A managed initiative to achieve a destination objective.
- **Types:** Promotion, Seasonal, Event, Conservation
- **Has:** Milestones, Budget, Timeline
- **Tracked by:** Operations

### Health Score
- **Description:** A quantified measure of destination ecosystem health.
- **Components:** Ecology, Community, Economy, Operations, Identity
- **Range:** 0-100
- **Monitored by:** Operations

### Season Profile
- **Description:** Defined seasonal patterns for a destination.
- **Affects:** Recommendations, Campaigns, Operations
- **Has:** Active Period, Recommendations, Predictions

## Relationships

```
Destination ──contains──> Locality ──contains──> Place ──contains──> Experience
    │                        │                     │                     │
    │                        │                     │                     │
    └──governs──> Business Tenant ──offers──> Experience
    │
    └──monitors──> Ecology ──contains──> Habitat ──contains──> Species
    │
    └──preserves──> Heritage
    │
    └──narrates──> Story
    │
    └──recognizes──> Local Hero
    │
    └──tracks──> Campaign
    │
    └──measures──> Health Score

Visitor ──explores──> Destination
    │
    ├──generates──> Memory
    ├──generates──> Review
    ├──discovers──> Species (Observation)
    ├──completes──> Mission
    ├──earns──> Badge
    ├──builds──> Reputation
    └──contributes──> Cultural Memory
```

## See Also

- [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) — High-level architecture
- [CAPABILITY_MAP.md](./CAPABILITY_MAP.md) — Capability relationships
- `docs/knowledge/PLATFORM_GLOSSARY.md` — Official vocabulary
