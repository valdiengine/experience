# Exploration, Gamification & Eco Pokedex Architecture Specification

## 1. Strategic Vision

The tourism ecosystem becomes a living digital encyclopedia.

The platform evolves from "Discover destinations" to "Explore, collect, learn, protect and remember destinations."

Visitor downloads valdi.app/costa, explores Costa de Valdivia, visits Los Molinos, discovers a beach, observes a native bird, AI identifies the species, species is added to the Eco Pokedex, visitor earns a badge, leaves a memory, and helps future visitors while supporting conservation.

The destination becomes alive through the people who explore it.

Mapping:
- Destination = World
- Locality = Region
- Places = Discovery Points
- Species = Collectible Entries
- Experiences = Missions
- Visitors = Explorers
- Businesses = Ecosystem Participants
- Badges = Achievements
- Ecological Actions = Conservation Progress

Game mechanics are inspired by Pokemon Go discovery, naturalist citizen science platforms, tourism exploration apps, achievement systems, and community reputation systems. The goal is NOT to create a game but to create a meaningful exploration experience where visitors become connected with places, species, culture and communities.

---

## 2. Exploration System

### 2.1. Explorer Profile

The explorer profile stores visitor progression inside destinations.

ExplorerProfile properties:
- id: Unique identifier
- visitorId: Visitor reference
- discoveredDestinations: Array of destination IDs visited
- discoveredLocalities: Array of locality IDs visited
- visitedPlaces: Array of place IDs visited
- discoveredSpecies: Array of species IDs discovered
- completedExperiences: Array of experience IDs completed
- explorationLevel: Current level (1-5)
- explorationPoints: Total exploration points
- badges: Array of earned badge IDs
- memoriesCount: Total memories created
- ecologicalPoints: Total ecological contribution points
- createdAt: Registration timestamp

### 2.2. Discovery Points

Discovery points represent things the visitor can discover in the ecosystem.

Discovery point types:
- place: A tourism place (beach, trail, viewpoint)
- viewpoint: A scenic observation point
- beach: A coastal location
- trail: A hiking or walking route
- historical_site: A cultural heritage location
- species: A discoverable species
- experience: A bookable or free experience
- business: A local business
- ecological_area: A conservation or nature area

DiscoveryPoint properties:
- id: Unique identifier
- entityType: Discovery point type
- entityId: Reference to the entity
- location: Geographic coordinates
- difficulty: Easy | Moderate | Challenging | Expert
- discoveryReward: Points awarded for discovery
- requiredLevel: Minimum explorer level to access
- status: Hidden | Discovered | Visited

### 2.3. Discovery Events

- explorer:visited_place - Visitor discovered a new place
- explorer:discovered_species - Visitor identified a species
- explorer:completed_experience - Visitor finished an experience
- explorer:created_memory - Visitor uploaded a memory
- explorer:earned_badge - Visitor earned a badge
- explorer:leveled_up - Visitor advanced to next level

---

## 3. Eco Pokedex System

### 3.1. Species Collection

The Pokedex is the visitor biodiversity collection. Visitors collect flora, fauna, marine species, and fungi.

Example collection for Costa de Valdivia:
- Arrayan (flora)
- Chucao (fauna)
- Lobo Marino (marine)
- Tonina (marine)
- Alga Marina (marine)

### 3.2. Species Entry

PokedexEntry properties:
- speciesId: Species reference
- visitorId: Owner reference
- destinationId: Destination context
- discoveredAt: Discovery timestamp
- location: Where discovered
- observationId: Linked observation reference
- image: Discovery photo
- validationStatus: Pending | Community Confirmed | Expert Validated
- rarity: Common | Uncommon | Rare | Epic | Legendary
- firstDiscovery: Whether this is the visitor first time discovering this species
- knowledgeUnlocked: Level of knowledge unlocked about this species

### 3.3. Rarity System

- Common: Widely observed, easy to find
- Uncommon: Occasionally observed, requires some effort
- Rare: Few observations, specific conditions required
- Epic: Very few observations, seasonal or location-specific
- Legendary: Endangered or protected, expert validation required

### 3.4. Knowledge Levels

Each species entry has unlockable knowledge:
- Level 1: Basic name and image (unlocked on discovery)
- Level 2: Habitat and behavior (unlocked after observation confirmed)
- Level 3: Ecological importance (unlocked after community confirmation)
- Level 4: Conservation status details (unlocked after expert validation)
- Level 5: Scientific and cultural significance (unlocked after multiple observations)

---

## 4. Discovery Mechanics

### 4.1. Discovery Manager

The discovery manager handles:
- Registering new discoveries
- Calculating rewards (points, badges)
- Updating explorer profile
- Generating recommendations
- Tracking discovery history

### 4.2. Discovery Flow

1. Visitor encounters a discovery point
2. System checks if already discovered
3. If new: register discovery, calculate rewards, emit events
4. If existing: show visited status, related memories
5. Update explorer profile
6. Check for badge eligibility
7. Check for level advancement
8. Generate next recommendations

### 4.3. Reward Calculation

Discovery rewards are based on:
- Entity type and difficulty
- Rarity of species (if species discovery)
- First discovery bonus (10x points for first observation)
- Quality of observation (validated observations earn more)
- Conservation significance (endangered species earn more)
- Community contribution (helping others earn points)

---

## 5. Gamification Engine

### 5.1. Level Progression

Level 1 - Explorer (0 points):
Visitor has started exploring. Can discover places and basic species.

Level 2 - Observer (200 points):
Visitor has recorded observations and explored multiple locations. Can access habitat guides.

Level 3 - Contributor (600 points):
Visitor has validated observations and participated in community. Can confirm other observations.

Level 4 - Guardian (1500 points):
Visitor is an active conservation participant. Can lead tours and organize campaigns.

Level 5 - Ambassador (3500 points):
Visitor is a recognized conservation leader. Can validate observations at expert level and mentor others.

### 5.2. Level Benefits

Each level unlocks:
- Profile benefits (display, recognition)
- Special badges
- Advanced challenges
- Community trust
- Access to restricted content
- Ability to contribute at higher levels

---

## 6. Points System

### 6.1. Exploration Points

Earned by visiting places, discovering destinations, completing routes, and exploring new areas.

Actions and points:
- Visit new place: +10
- Discover new destination: +50
- Complete hiking route: +25
- Visit new locality: +20
- Complete all places in a locality: +100

### 6.2. Ecology Points

Earned by species observations, conservation actions, and ecological challenges.

Actions and points:
- Record observation: +10
- Validated species observation: +25
- New species record for destination: +50
- Endangered species observation: +75
- Conservation activity participation: +100
- Lead ecological tour: +150

### 6.3. Community Points

Earned by reviews, memories, and helping other visitors.

Actions and points:
- Create memory: +10
- Write review: +5
- Confirm another observation: +5
- Help new visitor: +15
- Share ecological knowledge: +20

### 6.4. Local Support Points

Earned by visiting local businesses and completing local experiences.

Actions and points:
- Visit local business: +10
- Complete local experience: +15
- Leave business review: +5
- Recommend local business: +10
- Support local conservation: +25

---

## 7. Badge System

### 7.1. Explorer Badges

- First Destination: Discover your first destination
- First Locality: Visit your first locality
- 10 Places: Visit 10 different places
- 50 Places: Visit 50 different places
- 100 Places: Visit 100 different places
- Route Master: Complete all routes in a destination
- Hidden Trail Finder: Discover 5 hidden trails

### 7.2. Biodiversity Badges

- First Species: Discover your first species
- Marine Explorer: Observe 10 marine species
- Native Flora Collector: Discover 20 native flora species
- Bird Watcher: Observe 15 different bird species
- Fungi Finder: Discover 10 fungi species
- Endangered Witness: Observe an endangered species
- Rare Discovery: Discover a rare or legendary species

### 7.3. Conservation Badges

- Beach Guardian: Participate in 3 beach cleanups
- Forest Protector: Monitor a forest habitat for 30 days
- Ocean Defender: Participate in marine conservation
- Campaign Leader: Organize a conservation campaign
- Restoration Worker: Participate in habitat restoration

### 7.4. Community Badges

- Local Contributor: Help 10 other visitors
- Story Keeper: Create 20 memories
- Destination Ambassador: Reach Explorer level in 3 destinations
- Knowledge Sharer: Write 10 species identification guides
- Mentor: Help 5 new visitors with identification

### 7.5. Experience Badges

- Kayak Explorer: Complete a kayaking experience
- Hiking Champion: Complete 5 hiking routes
- Gastronomy Explorer: Try 10 local gastronomy experiences
- Cultural Discoverer: Visit 5 historical sites
- Adventure Seeker: Complete 3 adventure experiences

---

## 8. Tourism Missions

### 8.1. Mission Types

Discovery Missions: Guide visitors to explore specific aspects of a destination.

Example: "Discover the Costa de Valdivia"
Requirements: Visit 5 places, 3 businesses, 2 experiences
Reward: Badge + 200 points

Ecology Missions: Guide visitors toward conservation awareness.

Example: "Marine Guardian"
Requirements: Identify 5 marine species, visit coastal areas, learn conservation information
Reward: Badge + 300 points + Marine Guardian badge

Community Missions: Encourage community participation.

Example: "Local Story Collector"
Requirements: Upload memory, leave review, share experience
Reward: Badge + 150 points

### 8.2. Mission Entity

Mission properties:
- id: Unique identifier
- title: Mission name
- description: What the visitor must do
- type: Discovery | Ecology | Community | Experience
- destinationId: Destination context
- requirements: Array of required actions
- rewards: Points and badge rewards
- timeLimit: Optional expiration
- difficulty: Easy | Moderate | Challenging
- isActive: Whether mission is available
- participantCount: Number of participants

### 8.3. Mission Progress

Visitor progress per mission:
- missionId: Mission reference
- visitorId: Visitor reference
- completedRequirements: Array of completed requirements
- progress: Percentage complete
- completedAt: Completion timestamp
- claimed: Whether rewards have been claimed

---

## 9. Photo Optimization System

### 9.1. Media Optimizer

The media optimizer handles image uploads efficiently.

Flow: Original image > Compression > WebP conversion > Metadata optimization > Storage

### 9.2. Storage Versions

- original: Full quality, restricted access
- optimized: Compressed for web, public access
- thumbnail: Small version for galleries

### 9.3. Processing Requirements

- Generate WebP format for web delivery
- Maintain visual quality while reducing file size
- Create multiple thumbnail sizes (small, medium, large)
- Preserve EXIF location data optionally
- Remove unnecessary metadata for privacy
- Strip author and software metadata

### 9.4. Storage Strategy

- Originals stored in cold storage
- Optimized versions in fast-access storage
- Thumbnails in CDN-ready format
- Lazy loading support through thumbnail references

---

## 10. Destination Exploration Map

### 10.1. Interactive Map

Each destination has an interactive exploration map.

Features:
- Discovery points with type indicators
- Visited places with checkmarks
- Missing discoveries with lock indicators
- Species observation locations
- Experience locations
- Business locations
- Conservation areas
- Habitat boundaries

### 10.2. Map Data

Map data includes:
- Point of interest coordinates
- Visit status per visitor
- Species observation density
- Experience locations
- Business locations
- Habitat boundaries
- Trail routes
- Protected area boundaries

---

## 11. Leaderboards

### 11.1. Leaderboard Types

Global: Top explorers across all destinations
Destination: Top explorers within a specific destination
Locality: Top contributors within a locality
Ecology: Top conservation contributors

### 11.2. Leaderboard Rules

- Focus on recognition, not aggressive competition
- Display top 10 with visitor rank
- Show visitor level and badge count
- Reset monthly or seasonally for freshness
- Celebrate all participation levels

### 11.3. Leaderboard Entity

Leaderboard properties:
- id: Unique identifier
- type: Global | Destination | Locality | Ecology
- entityId: Destination or locality reference (if type-specific)
- period: Weekly | Monthly | Seasonal | AllTime
- entries: Array of ranked visitors
- lastUpdated: Last calculation timestamp

---

## 12. Capability Structure

### 12.1. Files to Create

capabilities/exploration/
- exploration.schema.js - Entity schemas and enums
- exploration.events.js - Event definitions
- exploration.manager.js - Orchestrator
- exploration.capability.js - Capability entry point
- README.md - Documentation

capabilities/exploration/pokedex/
- pokedex.manager.js - Species collection management

capabilities/exploration/gamification/
- gamification.manager.js - Level progression and rewards
- points.manager.js - Points tracking and calculation

capabilities/exploration/missions/
- mission.manager.js - Mission definitions and progress

capabilities/exploration/media/
- media.optimizer.js - Image processing and storage

capabilities/exploration/leaderboard/
- leaderboard.manager.js - Leaderboard calculation

### 12.2. Dependencies

exploration depends on:
- destination (destination data)
- community (visitor profiles, memories, reputation)
- ecology (species, observations, conservation)
- public (rendering, page display)
- pwa-engine (PWA integration)
- seo-intelligence (metadata, SEO pages)
- engagement (challenges, notifications)
- intelligence (analytics, recommendations)
- observability (metrics)

### 12.3. Communication Rules

- No direct imports between exploration and other capabilities
- Use context.capabilities.get() for cross-capability access
- Use EventBus for cross-capability events
- All data scoped by tenant and destination
- Visitor owns their exploration data