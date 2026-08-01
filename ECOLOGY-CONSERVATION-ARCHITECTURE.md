# Ecology & Conservation Architecture Specification

## 1. Ecology Domain Vision

### 1.1. Purpose

The Ecology Layer transforms the tourism ecosystem from a discovery platform into a living conservation platform.

The platform evolves from:

"Discover destinations"

into:

"Discover, understand and protect destinations."

The system enables:

- Flora discovery and cataloging
- Fauna discovery and tracking
- Marine ecosystem exploration
- Citizen science participation
- Environmental education
- Conservation action coordination
- Ecological reputation building
- Sustainable tourism certification

### 1.2. The Visitor Evolution

The visitor is not only a tourist. The visitor becomes a conservation participant.

Progression:

Explorer > Observer > Contributor > Guardian > Ambassador

Each stage represents deeper engagement with the ecological identity of the territory.

### 1.3. Strategic Context

The platform is not only a tourism directory or reservation system. It is a digital ecosystem where:

- Destinations have identity
- Localities have communities
- Visitors create memories
- Nature becomes discoverable
- Users contribute ecological knowledge
- Businesses participate in sustainable tourism
- Communities protect their territory

### 1.4. Core Belief

Tourism and conservation are not separate concerns. They are intertwined. A visitor who discovers a species becomes invested in its protection. A business that earns ecological certification becomes a guardian of its territory. A community that participates in conservation builds resilience.

---

## 2. Ecology Entity Hierarchy

### 2.1. Domain Structure

Ecology Ecosystem

+-- Species Registry
|   +-- Flora
|   +-- Fauna
|   +-- Marine Species
|   +-- Fungi
|
+-- Observation System
|   +-- Visitor Observation
|   +-- Scientific Observation
|   +-- Community Observation
|
+-- Habitat Registry
|   +-- Forest
|   +-- Wetland
|   +-- Coast
|   +-- River
|   +-- Ocean
|   +-- Protected Area
|
+-- Conservation System
|   +-- Conservation Action
|   +-- Ecological Campaign
|   +-- Conservation Partner
|
+-- Recognition System
|   +-- Ecological Badge
|   +-- Ecological Seal
|   +-- Ecological Reputation
|
+-- Education System
    +-- Species Guide
    +-- Habitat Guide
    +-- Conservation Guide

### 2.2. Relationship Model

`
Destination
  +-- has many Habitats
  +-- has many Species (through habitats)
  +-- has many Conservation Actions
  +-- has Ecological Profile

Habitat
  +-- belongs to Destination
  +-- has many Species (native species)
  +-- has many Observations
  +-- has Conservation Status

Species
  +-- belongs to Category (flora, fauna, marine, fungi)
  +-- has many Observations
  +-- has many Habitats
  +-- has Conservation Status
  +-- has Identification Data

Observation
  +-- belongs to Visitor
  +-- references Species
  +-- belongs to Location (Place or Habitat)
  +-- has Validation Status
  +-- may have AI Identification

Conservation Action
  +-- belongs to Destination or Locality
  +-- has many Participants
  +-- has Impact Metrics
  +-- rewards Ecological Reputation

Ecological Badge
  +-- awarded to Visitor
  +-- requires specific criteria
  +-- may be destination-specific

Ecological Seal
  +-- awarded to Business or Destination
  +-- validates sustainable practices
  +-- has expiration and renewal
`

### 2.3. Cross-Layer Connections

The Ecology Layer connects to:

- Destination Data (P11.3.1): Destinations, localities, places, habitats
- Community Layer (P11.3.2): Visitor profiles, memories, reputation
- PWA Engine: Ecology pages in destination PWAs
- SEO Intelligence: Species pages, habitat guides
- Engagement: Challenges, campaigns, notifications
- Intelligence: Biodiversity analytics, visitor participation
- Admin: Validation workflows, scientific content
- SaaS: Eco-tier plans, seal certifications
---

## 3. Species Registry

### 3.1. Global Species Taxonomy

The platform maintains a global species taxonomy that serves as the ecological reference.
Destinations reference this taxonomy to build local species catalogs.

The taxonomy is shared across all destinations.
Local variations (common names, seasonal behavior, cultural significance) are stored per destination.

### 3.2. Species Categories

Flora - Native plants, trees, ferns, mosses, lichens, flowers.
Examples: Arrayan, Ruil, Fern, Copihue.

Fauna - Birds, mammals, reptiles, amphibians, insects, arachnids.
Examples: Chucao, Pudu, Monito del Monte, Martin Pescador.

Marine Species - Fish, marine mammals, crustaceans, mollusks, algae.
Examples: Ballena Franca, Pingui de Magallanes, Kelp Forest species.

Fungi - Mushrooms, mycelium networks, lichens, yeasts.
Examples: Pan de Indio, Hongo endemico, Mycorrhizal networks.

### 3.3. Species Entity Model

Species properties:

- id: Unique identifier (global taxonomy)
- scientificName: Latin binomial name
- commonNames: Array of local names (multilingual)
- category: Flora | Fauna | Marine | Fungi
- images: Array of reference images (scientific + visitor-contributed)
- description: Ecological description and significance
- habitat: Associated habitat types (forest, wetland, coast, river, ocean)
- geographicDistribution: Geographic range (global and local)
- conservationStatus: Common | Vulnerable | Endangered | Protected
- seasonality: Active seasons for observation
- identificationData: Visual and auditory identification cues
- ecologicalImportance: Role in ecosystem (pollinator, predator, decomposer, etc.)
- culturalSignificance: Local cultural meaning and stories

### 3.4. Conservation Status Levels

Level 1 - Common: Abundant, no immediate concern. Normal observation rules.
Level 2 - Vulnerable: Declining population, monitored. Enhanced reporting.
Level 3 - Endangered: Critical population, protection required. Expert validation mandatory.
Level 4 - Protected: Legally protected, no disturbance allowed. Observation only from distance.

### 3.5. Local Species Catalog

Each destination maintains a local species catalog.
This catalog is a curated subset of the global taxonomy with local context.

Local catalog entries include:
- Local common names (which may differ from other regions)
- Habitat associations within this destination
- Seasonal activity patterns specific to this climate
- Local ecological stories and cultural significance
- Historical observation data
- Conservation priority within this destination

### 3.6. Seasonal Information

Each species entry includes seasonal activity data:
- Breeding season
- Migration patterns
- Activity peaks (dawn, dusk, nocturnal)
- Seasonal visibility (which months to observe)
- Weather-dependent activity

### 3.7. Educational Content Structure

Species entries include educational content:
- Identification guide (how to recognize this species)
- Habitat guide (where to find it)
- Behavioral guide (what to expect)
- Conservation status explanation
- What visitors can do to help
- Related species in the area

---

## 4. Observation System

### 4.1. Citizen Science Model

Visitors become ecological contributors by recording observations.
This transforms passive tourism into active conservation participation.

The observation workflow:

1. Visitor discovers a species in a destination
2. Visitor takes or uploads a photo
3. Visitor selects location (place or habitat)
4. Visitor records date and time
5. System offers AI identification assistance
6. Visitor adds notes and ecological context
7. Observation enters validation pipeline
8. Community or expert confirms identification
9. Visitor earns ecological reputation and points
10. Observation contributes to destination biodiversity data

### 4.2. Observation Entity

Observation properties:

- id: Unique identifier
- visitorId: Observer reference
- speciesId: Identified or suggested species (may be null if unknown)
- speciesGuess: Visitor best guess if species unknown
- locationId: Place or habitat reference
- placeId: Specific place reference
- destinationId: Destination context
- image: Uploaded photo (URL or base64)
- thumbnail: Processed thumbnail for gallery display
- date: Observation date and time
- season: Derived from date and destination climate data
- confidenceScore: AI confidence (0-1, if AI identification used)
- validationStatus: Pending | Community Confirmed | Expert Validated | Rejected
- validationCount: Number of community confirmations
- expertValidator: Expert user ID if validated at expert level
- notes: Visitor notes and ecological context
- ecologicalContext: Habitat conditions observed (weather, time, environment)
- latitude: GPS latitude
- longitude: GPS longitude
- accuracy: GPS accuracy in meters
- weatherConditions: Weather at time of observation
- habitatType: Habitat type at observation location
- isNocturnalObservation: Whether observation was at night

### 4.3. Validation Pipeline

Observation validation levels:

Level 1 - AI Suggestion:
- System analyzes uploaded photo
- Returns possible species matches with confidence scores
- Visitor confirms or corrects the identification
- This is NOT validation - it is identification assistance

Level 2 - Community Confirmation:
- Other visitors with observations of same species can confirm
- Requires minimum community votes (configurable per destination)
- Community members earn small reputation points for confirming
- Multiple independent confirmations increase confidence

Level 3 - Expert Validation:
- Scientific partners or trained local experts validate observations
- Required for endangered and protected species
- Required for new species records in a destination
- Required for rare or unusual observations
- Expert validators earn reputation points

### 4.4. Observation Quality Factors

Photo quality - Clarity, focus, detail level, showing identifying features.
Location accuracy - GPS coordinates, habitat match, place match.
Temporal accuracy - Season match, time of day consistency.
Species match - AI confidence, community votes, expert validation.
Context quality - Notes completeness, ecological context provided.
Consistency - Similar observations from same location/timeframe.

### 4.5. Data Contribution

Each validated observation contributes to:

- Destination biodiversity index (species richness)
- Species distribution mapping (where species are found)
- Seasonal activity patterns (when species are active)
- Conservation status assessment (population trends)
- Visitor ecological reputation (individual contribution)
- Scientific knowledge base (global taxonomy enrichment)
- Destination ecological identity (what makes this place unique)

---

## 5. AI Identification Layer

### 5.1. Future AI Integration

The system may support AI-powered species identification in the future.
This is NOT part of the current implementation.
The architecture defines integration boundaries for future development.

### 5.2. Image Analysis Workflow

Input: Visitor uploaded photo
Processing: AI model analyzes image features
Output: Possible species matches with confidence scores

Example output structure:

  species: 'Chucao'
  confidence: 0.87
  alternatives:
    - { species: 'Huet Huet', confidence: 0.42 }
    - { species: 'Zorzal', confidence: 0.31 }

### 5.3. Confidence Scoring

AI confidence is advisory, not authoritative.
The system never trusts AI alone for ecological data.

Confidence thresholds:
- 0.90+ : High confidence - suggested for fast-track validation
- 0.70-0.89 : Medium confidence - standard validation path
- 0.50-0.69 : Low confidence - requires community validation
- Below 0.50 : No suggestion - human identification required

### 5.4. Human Validation Requirements

AI suggestions ALWAYS require human validation.
Validation hierarchy:

1. AI suggestion (advisory only)
2. Visitor confirmation (acknowledges the suggestion)
3. Community confirmation (other observers agree)
4. Expert validation (final authoritative confirmation)

Rules:
- AI is NEVER the final word
- Endangered and protected species ALWAYS require expert validation
- New species records for a destination ALWAYS require expert validation
- Visitor can override AI suggestion with their own identification

### 5.5. AI Limitations and Safety Rules

AI identification is NOT:
- A replacement for human expertise
- An authoritative source for conservation decisions
- A guarantee of species identification
- Sufficient for protected species validation

AI identification IS:
- An educational tool to help visitors learn
- A first-pass filter to reduce expert workload
- A way to increase visitor engagement
- A data collection improvement mechanism

### 5.6. Integration Boundaries

Future AI integration points:
- Image analysis service (external API or on-device model)
- Species matching engine (local taxonomy lookup)
- Confidence calibration (based on historical accuracy)
- Feedback loop (visitor corrections improve AI over time)
- Photo quality assessment (pre-analysis quality check)

---

## 6. Habitat System

### 6.1. Habitat Registry

The habitat registry defines the ecological environments within each destination.
Habitats are the physical spaces where species live and interact.

### 6.2. Habitat Types

Forest Ecosystem - Native forests, secondary growth, old-growth remnants.
Examples: Valdivian temperate rainforest, coastal forest.

Wetland - Marshes, bogs, floodplains, estuaries.
Examples: Humedales de Valdivia, river floodplains.

Coastal - Beaches, rocky shores, cliffs, tide pools.
Examples: Costa de Los Rios, Pacific coastline.

River - Freshwater rivers, streams, tributaries.
Examples: Rio Valdivia, Rio Calle-Calle.

Ocean - Marine environments, kelp forests, open ocean.
Examples: Pacific Ocean, coastal marine reserves.

Protected Area - National parks, reserves, sanctuaries.
Examples: Parque Nacional Alerce Andino, Reserva Nacional.

### 6.3. Habitat Entity Model

Habitat properties:

- id: Unique identifier
- name: Habitat name (e.g., 'Valdivian Temperate Rainforest')
- type: Forest | Wetland | Coast | River | Ocean | Protected
- destinationId: Parent destination reference
- localityId: Parent locality reference (optional)
- description: Ecological description
- images: Array of habitat photographs
- area: Size in hectares or square kilometers
- elevation: Elevation range
- climate: Climate characteristics
- threats: Array of current threats
- conservationStatus: Conservation assessment
- biodiversityIndex: Calculated species richness score
- speciesCount: Number of recorded species
- lastSurvey: Date of last ecological survey
- isProtected: Whether area has legal protection
- accessLevel: Public | Restricted | Research Only
- educationalContent: Guide content for visitors
- mapData: Geographic boundary data

### 6.4. Species-Habitat Relationships

Each habitat defines which species are native, endemic, or migratory.

Native species - Naturally occurring in this habitat.
Endemic species - Found only in this specific region.
Migratory species - Present seasonally.
Threatened species - Present but at risk.
Invasive species - Non-native, potentially harmful.

Relationships include:
- Species list per habitat
- Population estimates
- Seasonal presence patterns
- Conservation priority
- Monitoring frequency

### 6.5. Habitat-Species Maps

The system generates species-habitat maps showing:
- Which species live where
- Biodiversity hotspots
- Conservation priority areas
- Visitor exploration density
- Seasonal variation

This data feeds into the ecological Pokedex experience.

---

## 7. Conservation Actions

### 7.1. Conservation Projects

Conservation projects are organized ecological initiatives.
They connect visitors, businesses, and communities with conservation goals.

Project types:
- Habitat restoration (reforestation, wetland recovery)
- Species monitoring (population counts, behavior studies)
- Pollution reduction (beach cleanups, river monitoring)
- Environmental education (guided tours, workshops)
- Research support (data collection, citizen science)
- Sustainable tourism development (eco-tourism planning)

### 7.2. Ecological Campaigns

Campaigns are time-bound conservation efforts.
They create urgency and community participation.

Campaign properties:
- id: Unique identifier
- destinationId: Destination context
- title: Campaign name
- description: Goals and purpose
- type: Cleanup | Monitoring | Education | Restoration | Research
- startDate: Campaign start
- endDate: Campaign end
- targetParticipants: Goal for participant count
- currentParticipants: Current participant count
- impactMetrics: Measured outcomes
- badgeReward: Badge awarded for participation
- pointsReward: Reputation points awarded
- partners: Supporting organizations

### 7.3. Community Participation

Visitors participate in conservation through:
- Joining campaigns
- Recording observations
- Reporting threats (pollution, habitat damage)
- Sharing ecological knowledge
- Educating other visitors
- Supporting local conservation organizations

Businesses participate through:
- Sustainable practices certification
- Conservation program sponsorship
- Employee volunteer programs
- Local sourcing and supply chain
- Waste reduction initiatives

Communities participate through:
- Restoration projects
- Environmental monitoring
- Cultural ecological knowledge sharing
- Youth education programs
- Policy advocacy

### 7.4. Impact Measurement

Conservation actions are measured through:
- Participants engaged
- Area restored (hectares)
- Species monitored
- Waste collected (kilograms)
- Educational sessions delivered
- Data points contributed
- Media reach and awareness

Impact data feeds into:
- Destination conservation metrics
- Business ecological seal scoring
- Visitor ecological reputation
- Platform conservation dashboard

### 7.5. Destination Conservation Metrics

Each destination tracks:
- Total conservation actions completed
- Active campaigns
- Participant engagement rates
- Species observations recorded
- Habitat health trends
- Community involvement levels
- Business certification rates
- Threats addressed

This data informs conservation priorities and resource allocation.

---

## 8. Ecological Reputation System

### 8.1. Integration with Community Layer

The ecological reputation system extends the existing community reputation system (P11.3.2).
Visitors earn ecological reputation through conservation participation.

The community reputation system provides:
- Base reputation levels (Explorador to Embajador)
- Point accumulation mechanics
- Level progression thresholds

The ecological reputation system adds:
- Ecological-specific actions and points
- Nature-specific progression levels
- Conservation contribution tracking

### 8.2. Visitor Ecological Reputation

Ecological reputation is tracked per visitor.
It represents the visitor's contribution to conservation.

Ecological actions and points:

Record observation: +10 points
Validated species observation: +25 points
New species record for destination: +50 points
Endangered species observation: +75 points
Conservation activity participation: +100 points
Lead a guided ecological tour: +150 points
Community ecological education: +150 points
Expert validation contribution: +200 points
Campaign organization: +250 points

### 8.3. Ecological Levels

The ecological reputation progression:

Level 1 - Explorer (0 points):
Visitor has started engaging with ecological content.

Level 2 - Nature Observer (50 points):
Visitor has recorded observations and explored habitats.

Level 3 - Eco Contributor (200 points):
Visitor has validated observations and participated in conservation.

Level 4 - Guardian (500 points):
Visitor is an active conservation participant with verified contributions.

Level 5 - Ecological Ambassador (1000 points):
Visitor is a recognized conservation leader in the community.

### 8.4. Participation Scoring

Scoring factors:
- Number of observations recorded
- Quality of observations (validation status)
- Conservation actions participated
- Community engagement (confirmations, education)
- Campaign leadership and organization
- Time active in ecological activities
- Diversity of species observed
- Diversity of habitats explored

### 8.5. Trust Levels

Ecological trust levels determine what a visitor can do:

Explorer: Can record observations, view species guides.
Observer: Can confirm other observations, access detailed habitat info.
Contributor: Can flag threats, participate in campaigns.
Guardian: Can validate observations at community level, lead tours.
Ambassador: Can validate at expert level, organize campaigns, mentor new visitors.

### 8.6. Guardian Progression

The path from Explorer to Guardian requires:
- Consistent observation recording
- Quality contributions (validated observations)
- Active conservation participation
- Community engagement and education
- Demonstration of ecological knowledge

This is not automatic point accumulation.
Each level requires demonstrated contribution.

---

## 9. Ecological Badge System

### 9.1. Achievement Badges

Badges recognize specific ecological achievements.
They are displayed on visitor profiles and in PWA experiences.

### 9.2. Destination-Specific Badges

Badges that are unique to each destination.
They reflect the ecological identity of the territory.

Examples:
- Costa de Valdivia Marine Guardian: 10 marine observations + 1 conservation activity
- Los Molinos Forest Explorer: 20 native flora discoveries
- Humedales Wetland Protector: 15 wetland species observed

### 9.3. Species Discovery Badges

Badges for discovering specific species categories.

Examples:
- First Flora Discovery: Record your first plant observation
- Bird Watcher: Observe 10 different bird species
- Marine Life Spotter: Observe 5 marine species
- Fungi Finder: Discover 3 different fungi species
- Endangered Species Witness: Observe an endangered species

### 9.4. Conservation Action Badges

Badges for participating in conservation.

Examples:
- Beach Defender: Participate in 3 beach cleanups
- River Guardian: Monitor a river habitat for 30 days
- Campaign Leader: Organize a conservation campaign
- Restoration Worker: Participate in habitat restoration

### 9.5. Community Contribution Badges

Badges for community engagement.

Examples:
- First Confirmation: Confirm another visitor observation
- Knowledge Sharer: Write 10 species identification guides
- Mentor: Help 5 new visitors with identification
- Educator: Lead an ecological guided tour

### 9.6. Business Sustainability Badges

Badges for business ecological participation.

Examples:
- Eco Certified: Achieve ecological seal certification
- Sustainable Operations: Implement sustainable business practices
- Conservation Partner: Sponsor a conservation project
- Local Champion: Source 80%+ locally and sustainably

### 9.7. Badge Requirements

Badges must be:
- Destination-specific (reflect local ecology)
- Ecology-specific (conservation-focused)
- Community-based (social validation)
- Merit-based (earned through action, not purchase)
- Displayable (visible in profiles and PWAs)
- Shareable (social media integration)

Badges connect with:
- Community reputation (visitor profiles)
- Visitor profiles (personal achievement display)
- Destination identity (local ecological pride)
- PWA experience (gamified ecological discovery)

---

## 10. Ecological Seal System

### 10.1. Eco Certification Framework

The ecological seal validates sustainable practices.
It connects tourism businesses and destinations with conservation goals.

### 10.2. Business Ecological Seal

Businesses earn ecological seals by meeting sustainability criteria.

Seal requirements (accommodation example):
- Sustainable energy usage (solar, wind, hydro)
- Recycling and waste reduction programs
- Local and sustainable product sourcing
- Water conservation practices
- Conservation contribution (donations, volunteer hours)
- Staff ecological training
- Guest ecological education
- No harm to local wildlife or habitats

Seal levels:
- Bronze: Basic sustainability practices
- Silver: Advanced sustainability with measurable impact
- Gold: Leading sustainability with conservation contribution
- Platinum: Model ecological business

### 10.3. Destination Ecological Seal

Destinations earn seals based on collective ecological health.

Seal criteria:
- Protected ecosystem areas
- Community participation in conservation
- Active conservation programs
- Visitor ecological engagement rates
- Species observation data richness
- Habitat health trends
- Business certification rates
- Threats addressed and resolved

### 10.4. Seal Validation Process

1. Business or destination applies for seal
2. System evaluates criteria against collected data
3. Community contribution data is analyzed
4. Expert review for higher certification levels
5. Seal granted with specific level
6. Annual renewal required
7. Continuous monitoring for compliance

### 10.5. Expiration and Renewal

Seals expire annually.
Renewal requires:
- Continued compliance with criteria
- Updated impact documentation
- Community feedback review
- Expert re-evaluation for gold and platinum

### 10.6. Integration with SaaS Plans

Ecological seals are available as premium SaaS features.

Free tier: Basic ecological profile
Starter tier: Sustainability checklist
Professional tier: Bronze seal application
Enterprise tier: Full seal program with expert validation
Destination tier: Destination-level ecological certification

This creates a revenue opportunity while incentivizing conservation.

---

## 11. Integration With Existing Capabilities

### 11.1. Community Integration

The ecology layer uses community infrastructure for:
- Visitor profiles (ecological reputation extends visitor profile)
- Memories (ecological memories are a memory type)
- Reviews (habitat and species reviews)
- Interactions (likes on observations, follows on conservation campaigns)
- Reputation (ecological reputation extends community reputation)
- Moderation (ecological content enters same moderation pipeline)

### 11.2. Destination Integration

The ecology layer enriches destination data with:
- Ecological identity (what makes this destination ecologically unique)
- Habitat registry (physical environments within the destination)
- Species catalog (local species with ecological stories)
- Conservation status (threats, protection efforts, health trends)
- Biodiversity index (calculated species richness)

### 11.3. PWA Engine Integration

The ecology layer creates destination ecological pages:
- Species discovery pages (individual species profiles)
- Habitat exploration pages (virtual habitat guides)
- Observation gallery (community-contributed observations)
- Conservation challenge pages (active campaigns)
- Ecological map (species and habitat locations)
- Personal ecological profile (discoveries, badges, reputation)

### 11.4. SEO Intelligence Integration

The ecology layer creates searchable ecological content:
- Species pages with unique metadata and schema.org
- Habitat guides with educational content
- Conservation stories and campaign reports
- Destination ecological identity pages
- Seasonal observation guides

Example searchable pages:
- Chucao en Los Molinos
- Humedales Costa de Valdivia
- Fauna del bosque valdiviano
- Aves endemicas de Valdivia

### 11.5. Engagement Integration

The ecology layer creates engagement opportunities:
- Ecological challenges (observation goals, campaign participation)
- Conservation notifications (new campaigns, seasonal activity)
- Species alerts (rare sightings, endangered species updates)
- Community campaigns (organized conservation efforts)
- Achievement celebrations (badge earning, level ups)

### 11.6. Intelligence Integration

The ecology layer provides data for intelligence analysis:
- Biodiversity activity trends (species observation patterns)
- Visitor participation analysis (engagement depth and quality)
- Ecological trend analysis (population changes, habitat health)
- Conservation impact assessment (measured outcomes)
- Destination ecological scoring (comparative ecological health)

### 11.7. Admin Integration

The ecology layer provides administrative capabilities:
- Validation workflow management (observation review queue)
- Scientific content management (species data, habitat guides)
- Conservation project oversight (campaign management, impact tracking)
- Expert validation coordination (expert assignments, review queues)
- Ecological seal administration (applications, renewals, compliance)

---

## 12. PWA Ecology Experience

### 12.1. Ecology Inside Destination PWAs

Ecology appears as a core section in destination PWAs.
Every destination PWA includes an ecology section.

### 12.2. PWA Structure

Destination PWA sections:

Discover
  +-- Places
  +-- Experiences
  +-- Businesses

Nature
  +-- Species Guide
  +-- Habitats
  +-- Observations Gallery
  +-- Conservation Challenges

Community
  +-- Memories
  +-- Reviews
  +-- Eco Badges

My Ecology
  +-- My Observations
  +-- My Discoveries
  +-- My Badges
  +-- My Reputation

### 12.3. Species Discovery Pages

Individual species pages include:
- Scientific and common names
- Reference images (scientific + visitor-contributed)
- Identification guide
- Habitat information
- Conservation status
- Seasonal activity
- Recent observations
- Map of sightings
- Visitor observations gallery

### 12.4. Habitat Pages

Habitat exploration pages include:
- Habitat description and images
- Species list (native, endemic, migratory)
- Conservation status
- Visitor access information
- Educational content
- Recent observations
- Interactive map

### 12.5. Ecological Maps

Interactive maps showing:
- Species observation locations
- Habitat boundaries
- Conservation action areas
- Visitor exploration density
- Seasonal patterns
- Protected areas

### 12.6. Personal Ecological Profile

Each visitor has a personal ecology profile:
- Total observations recorded
- Species discovered
- Habitats explored
- Badges earned
- Ecological reputation level
- Recent activity
- Collection summary

### 12.7. Conservation Challenges

Active conservation challenges within the PWA:
- Observation goals (observe X species in Y time)
- Campaign participation (join cleanup, monitoring)
- Educational challenges (learn about local species)
- Community challenges (collective observation goals)

### 12.8. Ecological Notifications

PWA push notifications for ecology:
- New species observed nearby
- Conservation campaign starting
- Badge earned
- Level up achieved
- Seasonal species activity alert
- Campaign reminder

---

## 13. Data Ownership Rules

### 13.1. Ownership Model

Platform owns:
- Global species taxonomy
- Platform-wide conservation rules and standards
- Ecological seal criteria
- Badge definitions
- Reputation level definitions
- Platform ecological analytics

Destination owners own:
- Local species catalog (curated subset)
- Habitat registry and descriptions
- Local conservation stories
- Destination ecological profile
- Local campaign management

Locality owners own:
- Local habitat descriptions
- Community ecological knowledge
- Local species observations
- Cultural ecological stories

Business tenants own:
- Business sustainability information
- Business ecological profile
- Business seal application data
- Business conservation contributions

Visitors own:
- Personal observations
- Uploaded photos (retained even if account deleted)
- Personal ecological reputation
- Personal badge collection
- Personal discovery history

Scientific partners own:
- Expert validation data
- Scientific research contributions
- Species data enrichment
- Conservation assessment data

### 13.2. Content Rules

Ecological content rules:
- Species taxonomy is curated by platform and scientific partners
- Visitor observations contribute to but do not modify taxonomy
- Photos are owned by the visitor but licensed to the platform
- Conservation data is validated before publication
- Educational content is reviewed by experts
- Local stories belong to the local community

### 13.3. Data Portability

Visitors can export:
- All personal observations
- All uploaded photos
- Ecological reputation history
- Badge collection
- Discovery history

Destinations can export:
- Species catalog
- Habitat registry
- Conservation metrics
- Visitor engagement data

---

## 14. Gamification Foundation

### 14.1. Tourism Ecological Pokedex Concept

The user experience is inspired by collection systems.
Visitors collect species, habitats, and conservation achievements.

This is NOT a game.
This is a meaningful engagement system that makes conservation rewarding.

### 14.2. Collection Experience

Visitors build personal ecological collections:

My discoveries in Costa de Valdivia
  +-- 15 species observed
  +-- 5 habitats explored
  +-- 8 observations validated
  +-- 3 badges earned

My marine observations
  +-- 7 marine species
  +-- 2 marine habitats
  +-- 1 endangered species observed

My protected species discoveries
  +-- 2 endangered species
  +-- 1 protected species
  +-- All expert validated

### 14.3. Discovery Mechanics

The system rewards:
- Exploration (visiting new habitats and places)
- Observation quality (validated, well-documented observations)
- Conservation participation (joining campaigns, contributing data)
- Community contribution (confirming observations, educating others)
- Knowledge building (completing species guides, sharing stories)

### 14.4. Collection Metrics

Each visitor's collection tracks:
- Species observed (count, validation status)
- Habitats explored (count, diversity)
- Observations recorded (count, quality)
- Badges earned (count, rarity)
- Conservation actions completed (count, impact)
- Destinations explored (count, depth)
- Seasons observed (temporal coverage)

### 14.5. Progress Indicators

Visual indicators show collection progress:
- Species discovery progress (X of Y known species in this destination)
- Habitat exploration progress (X of Z habitats visited)
- Badge progress (how close to next badge)
- Reputation progress (points toward next level)
- Seasonal coverage (which seasons have observations)

### 14.6. Future Game Mechanics (Not Now)

The gamification foundation prepares for P11.3.4.
Future phases may add:
- Ecological challenges and quests
- Competitive leaderboards
- Seasonal events
- Community challenges
- Destination vs destination comparisons
- Species rarity mechanics

These are NOT implemented now.
Only the data foundations are defined here.

---

## 15. Architecture Rules

### 15.1. Technical Rules

- No direct capability imports between ecology and other capabilities
- Use EventBus communication for all cross-capability events
- Use DataManager abstraction for all data access
- Respect tenant isolation for all ecological data
- Business-agnostic design (ecology layer does not know about specific industries)
- Use context.capabilities.get() for capability communication
- Do not modify existing capabilities when adding ecology features
- All ecology data follows existing schema patterns

### 15.2. Ecological Rules

- Species taxonomy is authoritative data, not user-generated
- Conservation status is validated by experts, not visitors
- AI identification is advisory only, never authoritative
- Protected species have strict observation rules
- Visitor observations contribute to knowledge, not replace science
- Ecological reputation is earned through genuine contribution
- Seals represent verified sustainability, not purchased certification

### 15.3. Data Rules

- All observations require location data
- All observations require date data
- All observations enter validation pipeline
- Species taxonomy is globally consistent
- Local catalogs are destination-specific
- Conservation data is time-stamped
- Badge criteria are transparent and verifiable

---

## Final Validation

This document defines the Ecology and Conservation Architecture Specification.

Sections completed: 15
Entities defined: Species, Observation, Habitat, Conservation Action, Campaign, Badge, Seal, Ecological Reputation
Capability integrations documented: Community, Destination, PWA Engine, SEO Intelligence, Engagement, Intelligence, Admin, SaaS
Code created: None
Existing files modified: None
