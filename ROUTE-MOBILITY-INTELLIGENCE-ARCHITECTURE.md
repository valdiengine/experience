# Route, Trails & Mobility Intelligence Layer — Architecture Specification

**Capability ID:** `destination-mobility`
**Version:** 1.0.0
**Status:** Architecture Specification (No Code)
**Depends On:** community, exploration, intelligence, governance, operations, identity, economy

---

## 1. Vision

### 1.1 Purpose

The Route, Trails & Mobility Intelligence Layer is the final capability of the Destination Ecosystem. It transforms the platform from a collection of disconnected features into a unified, intelligent navigation system that connects every previous capability into one coherent experience.

Where every other capability answers a specific question — what to book, what to discover, what to learn — the Mobility Layer answers the most fundamental question of all: **how do I move through this territory?**

Movement is not logistics. Movement is the primary experience of any destination. The path between two points is where memories are created, species are discovered, stories are heard, businesses are encountered, and ecological knowledge is generated. The Mobility Layer treats every journey as an opportunity to strengthen the connection between visitors and territories.

### 1.2 Mission

The platform must no longer behave like a directory. It must behave like an intelligent guide capable of understanding the full context of every visitor and dynamically generating the best possible experience.

The Mobility Layer integrates:

- Where the visitor is
- What they enjoy
- How much time they have
- Weather conditions
- Seasonal patterns
- Conservation restrictions
- Route difficulty
- Available transportation
- Accessibility requirements
- Ecological sensitivity
- Business availability
- Existing reservations
- Current crowd density

And synthesizes all of these inputs into a single, adaptive, context-aware navigation experience.

The platform should feel like Google Maps + AllTrails + Komoot + Pokemon Go + National Geographic + Lonely Planet + iNaturalist — unified inside one ecosystem where every component feeds every other component.

### 1.3 Visitor Mobility Philosophy

Mobility is not about getting from point A to point B. It is about what happens between point A and point B.

Every step a visitor takes generates data. Every observation they make contributes to ecological knowledge. Every business they pass is a potential connection. Every view they photograph becomes community memory. Every species they identify feeds the Eco Pokedex. Every meter they walk strengthens the bond between visitor and territory.

The Mobility Layer does not optimize for shortest distance. It optimizes for richest experience within the constraints the visitor provides.

### 1.4 Living Destinations

A destination is alive. It breathes with seasons, tides, weather, and human activity. The Mobility Layer understands this aliveness. Routes are not static paths drawn on a map — they are living recommendations that respond to real-time conditions.

A trail that is perfect at dawn may be unbearable at noon. A coastal route that is spectacular in summer may be dangerous in winter. A bird-watching path that is extraordinary during migration season may be empty in July. The Mobility Layer knows this. It adapts.

### 1.5 Movement as Experience

Movement creates memories. The most vivid travel memories are rarely about destinations — they are about journeys. The unexpected turn that led to a hidden waterfall. The conversation with a fisherman on a dock. The moment a bird appeared on a branch while hiking. The Mobility Layer is designed to maximize these moments.

### 1.6 Movement Creates Ecological Knowledge

Every visitor who moves through a territory is a mobile sensor. Their phone captures species observations, trail conditions, weather data, and crowd density. The Mobility Layer transforms passive movement into active ecological contribution. Navigation becomes citizen science.

### 1.7 Movement Creates Economy

When visitors move through a territory, they encounter businesses. Not through advertisements — through natural route design. A rest stop near a café. A scenic viewpoint near a craft shop. A trail junction near a bike rental. The Mobility Layer creates economic flow without advertising.

### 1.8 Movement Creates Community

Routes connect localities. Visitors who follow recommended routes discover communities they would never have found through search. The Mobility Layer distributes tourism across the territory, giving every locality visibility through movement, not marketing.

---

## 2. Mobility Domain Model

### 2.1 Core Entities

#### Route

A defined path through the territory connecting multiple points. Routes have a type (walking, cycling, kayaking, etc.), a difficulty level, a duration estimate, and a set of waypoints. Routes are the primary unit of the Mobility Layer.

A route is not just geometry. It is a living entity that carries ecological data, community memories, business associations, seasonal variations, and real-time conditions.

#### Trail

A physical path on the ground. Trails are the infrastructure that enables routes. A single trail can be part of multiple routes. Trails have surface conditions, width, grade, and maintenance status.

#### Path

An informal or unmarked connection between points. Paths are less maintained than trails but still navigable. The Mobility Layer can recommend paths but with appropriate difficulty and condition warnings.

#### Waypoint

A specific geographic coordinate along a route. Waypoints carry metadata: name, description, type, elevation, and associated content. Every point on a route is potentially a waypoint, but only significant points are formally defined.

#### Checkpoint

A waypoint that requires visitor interaction. Checkpoints can be for validation (proof of passage), data collection (species observation), or engagement (answering a question about local heritage). Checkpoints are the gamification layer of routes.

#### Scenic Point

A waypoint specifically designated for visual appreciation. Scenic points have optimal viewing times based on sun position, seasonal light, and weather conditions. The Mobility Layer can recommend scenic points based on time of day and conditions.

#### Observation Point

A waypoint optimized for ecological observation. Observation points are positioned near habitats, nesting sites, feeding areas, or migration corridors. They include expected species, best observation times, and required equipment.

#### Ecological Zone

A defined area with specific ecological characteristics. Ecological zones have sensitivity levels, species density, habitat types, and conservation status. The Mobility Layer uses ecological zones to route visitors away from sensitive areas and toward appropriate experiences.

#### Protected Area

A legally or ecologically restricted zone. Protected areas have access rules, seasonal closures, permit requirements, and maximum visitor density. The Mobility Layer enforces protected area rules and suggests alternatives when areas are restricted.

#### Rest Area

A designated stopping point along a route. Rest areas have seating, shade, water access, and sometimes basic facilities. The Mobility Layer places rest areas based on route difficulty, estimated energy expenditure, and distance between services.

#### Transport Hub

A point where transportation modes change. Bus stops, train stations, ferry docks, parking areas, and bike share stations. Transport hubs are the connection points between mobility modes.

#### Dock

A water access point for kayak, SUP, canoe, or boat launch. Docks have water conditions, rental availability, safety equipment, and tidal considerations. The Mobility Layer integrates dock status into water route planning.

#### Parking

Vehicle storage points at route beginnings or transition points. Parking availability, capacity, and cost are integrated into route planning for visitors arriving by car.

#### Bike Station

A point where bicycles can be rented, returned, or serviced. Bike stations have fleet availability, bike types, and maintenance status. The Mobility Layer integrates bike station status into cycling route planning.

#### Kayak Launch

A specialized water access point for paddle sports. Kayak launches have water conditions, equipment rental, safety briefings, and guided tour availability.

#### Viewpoint

A scenic overlook with panoramic visibility. Viewpoints have elevation, directional orientation, best viewing times, and visible landmarks. The Mobility Layer connects viewpoints through routes optimized for visual experience.

#### Business Stop

A waypoint associated with a business entity from the economy layer. Business stops are not advertisements — they are contextual services that naturally fit within a route. A café at a rest point. A craft shop near a historical route. A kayak rental at a water launch.

#### Emergency Point

A waypoint marking emergency services, first aid stations, or rescue access points. Emergency points are critical for route safety and are always visible regardless of route filtering.

#### Accessibility Node

A waypoint or route segment with specific accessibility characteristics. Wheelchair-accessible paths, accessible restrooms, accessible viewpoints, and assisted navigation points. The Mobility Layer considers accessibility as a primary constraint, not an afterthought.

#### Weather Zone

A geographical area with specific weather patterns. Weather zones have microclimate characteristics that differ from regional forecasts. The Mobility Layer integrates weather zone data for more accurate route recommendations.

#### Marine Route

A route designed for water-based navigation. Marine routes consider tides, currents, water depth, marine protected areas, and vessel traffic. Marine routes are for kayakers, SUP paddlers, divers, snorkelers, and boaters.

#### River Route

A route following a river or waterway. River routes consider water levels, flow rate, rapids classification, and seasonal variation. River routes are for kayakers, canoeists, and riverside hikers.

#### Navigation Corridor

A broad movement path between two areas. Navigation corridors are the high-level connections in the destination graph. They represent the primary movement patterns of visitors and residents.

### 2.2 Entity Relationships

```
Destination Graph
  └── Navigation Corridor
        └── Route
              ├── Trail
              │     └── Path
              ├── Waypoint (many)
              │     ├── Checkpoint
              │     ├── Scenic Point
              │     ├── Observation Point
              │     ├── Rest Area
              │     ├── Transport Hub
              │     ├── Dock / Kayak Launch
              │     ├── Parking
              │     ├── Bike Station
              │     ├── Viewpoint
              │     ├── Business Stop
              │     ├── Emergency Point
              │     └── Accessibility Node
              ├── Ecological Zone (adjacent)
              ├── Protected Area (adjacent)
              └── Weather Zone (overlapping)

Route Types
  ├── Walking / Hiking / Trail Running
  ├── Cycling / Mountain Bike / Road Bike
  ├── Water: Kayak / SUP / Canoe / Boat
  ├── Underwater: Diving / Snorkeling
  ├── Equestrian
  ├── Thematic: Photography / Bird Watching / Gastronomic / Historical
  ├── Accessibility: Wheelchair / Family / Night
  ├── Scientific
  └── Multi-day Expedition
```

### 2.3 Hierarchy

```
Destination Graph (territory-wide movement network)
  └── Navigation Corridor (primary movement paths between areas)
        └── Route (specific path with type and metadata)
              ├── Trail Segment (physical path portion)
              │     └── Path Segment (informal connection)
              └── Waypoint (significant point along route)
                    ├── Interaction Point (checkpoint, validation)
                    ├── Service Point (business, transport, emergency)
                    ├── Observation Point (ecological, scenic)
                    └── Rest Point (rest area, shelter)
```

### 2.4 Destination Graph

The Destination Graph is the mathematical representation of the entire territory's movement network. It is a weighted, directed graph where:

- **Nodes** represent waypoints, locations, businesses, and transition points
- **Edges** represent routes, trails, paths, and navigation corridors
- **Weights** represent distance, difficulty, time, ecological sensitivity, and visitor preference

The Destination Graph is not static. It updates in real-time based on conditions, closures, events, and crowd density. It is the foundation of all intelligent routing.

The Destination Graph connects to the broader destination hierarchy:

```
Tourism Network Graph
  └── Region Graph
        └── Destination Graph
              ├── Locality Graph
              │     └── Place Graph
              │           └── Experience Graph
              └── Ecology Graph
                    └── Habitat Graph
```

Each level in the hierarchy has its own graph, and the Mobility Layer can navigate across all levels seamlessly.

---

## 3. Route Types

### 3.1 Walking Routes

**Walking** — Casual walking routes for visitors exploring at a relaxed pace. Flat to gentle terrain. Urban sidewalks, promenades, and park paths. Duration: 30 minutes to 3 hours. Difficulty: Easy.

**Hiking** — Longer walking routes through natural terrain. May include elevation changes, uneven surfaces, and natural obstacles. Duration: 2 hours to full day. Difficulty: Easy to Hard.

**Trail Running** — Running routes on trails. Optimized for fitness-oriented visitors. Includes distance, elevation gain, and estimated pace. Duration: 30 minutes to 6 hours. Difficulty: Moderate to Expert.

### 3.2 Cycling Routes

**Cycling** — General cycling routes on roads and paths. Suitable for casual cyclists. Duration: 30 minutes to 4 hours. Difficulty: Easy to Moderate.

**Mountain Bike** — Off-road cycling routes on technical terrain. Includes singletrack, fire roads, and technical features. Duration: 1 hour to full day. Difficulty: Moderate to Expert.

**Road Bike** — Paved road cycling routes. Optimized for road cyclists. Includes distance, elevation, and gradient profiles. Duration: 1 hour to multi-day. Difficulty: Easy to Expert.

### 3.3 Water Routes

**Kayak** — Paddling routes for kayakers. Considers water conditions, currents, tides, and wind. Duration: 30 minutes to multi-day. Difficulty: Easy to Expert.

**SUP (Stand-Up Paddleboard)** — Calm water paddling routes. Typically in bays, lakes, and slow rivers. Duration: 30 minutes to 3 hours. Difficulty: Easy to Moderate.

**Canoe** — Canoe routes on rivers and lakes. May include portage sections. Duration: 2 hours to multi-day. Difficulty: Easy to Hard.

**Boat** — Motorized or sailed boat routes. Covers larger water areas. Includes marina access, anchorage points, and navigation markers. Duration: 2 hours to multi-day. Difficulty: Easy to Expert.

### 3.4 Underwater Routes

**Diving** — Scuba diving routes to specific underwater sites. Includes depth profiles, marine life expectations, and safety requirements. Duration: 45 minutes to 3 hours. Difficulty: Beginner to Expert (certification required).

**Snorkeling** — Shallow water observation routes. Accessible to non-certified visitors. Duration: 30 minutes to 2 hours. Difficulty: Easy to Moderate.

### 3.5 Equestrian Routes

**Horse Riding** — Routes designed for horseback exploration. Includes terrain suitability, hitching posts, and water access for horses. Duration: 1 hour to full day. Difficulty: Easy to Moderate.

### 3.6 Thematic Routes

**Photography Route** — Routes optimized for photographic opportunities. Includes golden hour timing, composition points, and subject recommendations. Duration: 2 hours to full day. Difficulty: Easy to Moderate.

**Bird Watching Route** — Routes passing through bird habitats. Includes species expectations, optimal observation times, and required equipment. Duration: 2 hours to full day. Difficulty: Easy to Hard.

**Gastronomic Route** — Routes connecting culinary experiences. Includes restaurants, markets, food producers, and tasting stops. Duration: 3 hours to multi-day. Difficulty: Easy.

**Historical Route** — Routes following historical paths. Includes heritage sites, historical markers, and cultural interpretation. Duration: 2 hours to full day. Difficulty: Easy to Moderate.

### 3.7 Accessibility Routes

**Family Route** — Routes designed for families with children. Includes rest stops, child-friendly activities, and safety features. Duration: 30 minutes to 4 hours. Difficulty: Easy.

**Accessible Route** — Routes designed for wheelchair users and visitors with mobility limitations. Includes surface conditions, gradients, rest areas, and accessible facilities. Duration: 30 minutes to 3 hours. Difficulty: Accessible.

**Night Route** — Routes safe and interesting after dark. Includes lighting conditions, safety considerations, and nocturnal wildlife opportunities. Duration: 30 minutes to 3 hours. Difficulty: Easy to Moderate.

### 3.8 Scientific Routes

**Scientific Route** — Routes designed for citizen science data collection. Includes observation protocols, data submission points, and species identification guides. Duration: 2 hours to multi-day. Difficulty: Moderate to Hard.

### 3.9 Marine Routes

**Marine Wildlife Route** — Routes optimized for marine animal observation. Includes whale watching, dolphin spotting, seal colonies, and marine bird colonies. Duration: 2 hours to full day. Difficulty: Easy to Moderate (boat dependent).

### 3.10 Urban Discovery Routes

**Urban Discovery** — Routes through urban areas highlighting architecture, street art, local shops, and cultural venues. Duration: 1 hour to 4 hours. Difficulty: Easy.

### 3.11 Multi-day Expeditions

**Multi-day Expedition** — Extended routes spanning multiple days with overnight stops. Includes camping sites, accommodation, resupply points, and emergency access. Duration: 2 days to 2 weeks. Difficulty: Moderate to Expert.

---

## 4. Intelligent Route Engine

### 4.1 Overview

The Intelligent Route Engine is the computational core of the Mobility Layer. It generates, adapts, and optimizes routes based on multiple simultaneous inputs. It is not a static pathfinder — it is a dynamic recommendation system that considers the full context of each visitor and territory.

### 4.2 Inputs

#### Visitor Profile
- Physical fitness level (from exploration capability)
- Mobility limitations (accessibility requirements)
- Interests (from intelligence capability — visitor profile)
- Past explorations (from exploration capability — explorer profile)
- Species already discovered (from exploration — Eco Pokedex)
- Missions in progress (from exploration capability)
- Reputation level (from community capability)
- Time of visit (current time or planned time)
- Group composition (solo, couple, family, group)
- Equipment available (bike, kayak, etc.)

#### Ecology
- Active species (seasonal presence)
- Nesting seasons (breeding restrictions)
- Feeding times (optimal observation windows)
- Habitat sensitivity levels
- Protected area status
- Conservation zones
- Marine conditions (for water routes)
- Flora blooming seasons

#### Community
- Community-recommended routes
- Popular routes (visitor frequency)
- Recently updated routes (new conditions)
- Community memories along routes
- Local knowledge (seasonal tips)
- Community events on route

#### Season
- Current season and seasonal patterns
- Seasonal route availability
- Seasonal species presence
- Seasonal weather expectations
- Seasonal crowd patterns
- Seasonal business hours

#### Weather
- Current conditions (temperature, wind, precipitation)
- Forecast (next 24-72 hours)
- Microclimate variations by zone
- UV index
- Visibility conditions
- Tide schedules (for marine routes)
- Water temperature (for water activities)

#### Opening Hours
- Business operating hours
- Restaurant service times
- Museum and attraction hours
- Equipment rental availability
- Tour departure times

#### Reservations
- Existing bookings (time constraints)
- Upcoming reservations (route must end near reservation location)
- Available slots (for businesses along route)

#### Difficulty
- Visitor capability vs. route difficulty
- Fatigue estimation based on distance and elevation
- Water and rest availability
- Emergency access

#### Accessibility
- Wheelchair accessibility requirements
- Visual or hearing impairments
- Age-related considerations
- Stroller compatibility
- Service animal requirements

#### Transportation
- Available transport modes
- Public transit schedules
- Bike rental availability
- Car parking availability
- Ferry schedules
- Walking-only zones

#### Time Available
- Total time budget
- Time until next reservation
- Sunset/sunrise constraints
- Business closing times
- Transport last departure

#### Energy Level
- Estimated energy expenditure
- Recent activity (from exploration tracking)
- Caloric needs (for multi-hour routes)
- Hydration reminders

#### Interests
- Nature / Ecology
- Culture / History
- Adventure / Sports
- Photography
- Gastronomy
- Relaxation
- Family activities
- Science / Education

#### Safety
- Current safety alerts (from operations)
- Crime statistics (if available)
- Wildlife activity warnings
- Terrain hazard reports
- Emergency response times

### 4.3 Processing Pipeline

```
Visitor Request
    │
    ▼
Context Collection
    │  ├── Visitor Profile
    │  ├── Current Location
    │  ├── Time / Date
    │  ├── Weather
    │  ├── Season
    │  └── Available Constraints
    │
    ▼
Constraint Application
    │  ├── Hard Constraints (must satisfy)
    │  │     ├── Time limit
    │  │     ├── Accessibility
    │  │     ├── Safety
    │  │     ├── Protected areas
    │  │     └── Closures
    │  └── Soft Constraints (optimize for)
    │        ├── Interests
    │        ├── Difficulty preference
    │        ├── Crowd avoidance
    │        └── Scenic quality
    │
    ▼
Route Generation
    │  ├── Candidate Routes (multiple options)
    │  ├── Scoring (weighted multi-criteria)
    │  ├── Ranking (best to good)
    │  └── Explanation (why each route was recommended)
    │
    ▼
Output
    │  ├── Primary Recommendation
    │  ├── Alternative Routes (2-3 options)
    │  ├── Contextual Information
    │  │     ├── Weather along route
    │  │     ├── Species expected
    │  │     ├── Businesses open
    │  │     ├── Hazards
    │  │     └── Memories to discover
    │  └── Dynamic Updates (real-time)
```

### 4.4 Scoring Model

Each candidate route is scored across multiple dimensions:

| Dimension | Weight | Source |
|-----------|--------|--------|
| Interest Match | 30% | Visitor profile vs. route content |
| Time Fit | 20% | Route duration vs. available time |
| Difficulty Match | 15% | Visitor capability vs. route difficulty |
| Ecological Value | 15% | Species observation potential |
| Community Value | 10% | Community memories and recommendations |
| Crowd Level | 5% | Current crowd density |
| Weather Suitability | 5% | Weather conditions along route |

The scoring model is adaptive. Weights shift based on context. For a family with limited time, time fit becomes dominant. For a photographer, ecological value and scenic quality dominate. For an athlete, difficulty match dominates.

### 4.5 Output

The engine produces:

**Primary Recommendation** — The single best route for the current context. Includes detailed waypoint-by-waypoint guidance, estimated duration, difficulty summary, and contextual information.

**Alternative Routes** — Two or three additional options that satisfy constraints differently. One might be shorter but less scenic. One might be longer but include a business stop. One might be the community favorite.

**Contextual Information** — Weather along the route, expected species, open businesses, known hazards, and community memories at waypoints.

**Dynamic Updates** — Real-time adjustments based on changing conditions. A sudden weather change triggers rerouting. A trail closure triggers alternatives. A new species sighting triggers a detour suggestion.

### 4.6 Adaptive Itinerary

For visitors with multi-hour or multi-day timeframes, the engine generates adaptive itineraries. These are sequences of routes and stops that form a complete experience.

An adaptive itinerary includes:
- Morning route (optimized for morning conditions)
- Lunch stop (at a business, not a random point)
- Afternoon route (different from morning to avoid repetition)
- Rest periods (timed to energy expenditure)
- Buffer time (for spontaneous exploration)
- Contingency routes (if conditions change)

The itinerary adapts in real-time. If the visitor is slower than expected, the afternoon route is shortened. If weather changes, the itinerary shifts to indoor experiences. If the visitor discovers something unexpected, the itinerary accommodates the detour.

### 4.7 Dynamic Rerouting

When conditions change during a route, the engine offers dynamic rerouting:

- **Trail closure detected** → Alternative path around closure
- **Weather alert** → Shorter route to nearest shelter or indoor experience
- **Species sighting** → Optional detour to observation point
- **Crowd density spike** → Alternative quieter route
- **Business closure** → Alternative service point
- **Fatigue detected** → Shortened route to nearest rest area or transport hub
- **Time running out** → Direct route to endpoint or reservation location

Dynamic rerouting respects all original constraints. It never routes through protected areas, never recommends unsafe paths, and never exceeds the visitor's time budget.

---

## 5. Mobility Intelligence

### 5.1 Live Routing

The Mobility Layer provides real-time routing based on current conditions. Not planned routes — live, responsive navigation.

Live routing considers:
- Current GPS position
- Real-time weather
- Current crowd density
- Live business status
- Active safety alerts
- Recent species sightings
- Trail condition updates from other visitors

Live routing updates continuously. The visitor does not need to request updates — the system proactively suggests improvements.

### 5.2 Dynamic Alternatives

At every decision point (trail junction, intersection, fork), the Mobility Layer presents alternatives:

- "Continue on current route (2.3 km remaining)"
- "Turn left for scenic viewpoint (+0.8 km, +15 min)"
- "Turn right for café rest stop (+0.3 km, +5 min)"
- "Detour to recent bird sighting (+0.5 km, +10 min)"

Alternatives are contextual. They consider the visitor's current energy, time remaining, and interests.

### 5.3 Unexpected Closures

When a trail, business, or attraction closes unexpectedly:

1. The Mobility Layer detects the closure (community report, operations alert, business update)
2. All active routes through the closure are flagged
3. Affected visitors receive rerouting suggestions
4. The Destination Graph is updated to reflect the closure
5. Alternative routes are pre-computed for future visitors

### 5.4 Species Activity

The Mobility Layer integrates species activity data from the exploration and ecology capabilities:

- "Warblers have been spotted at the viewpoint ahead (last seen 2 hours ago)"
- "Sea turtles are nesting on the beach to your left (keep distance)"
- "Dolphins spotted in the bay — 600m detour to observation point"

Species activity data comes from:
- Visitor observations (Eco Pokedex contributions)
- Community reports
- Seasonal predictions (from intelligence capability)
- Scientific monitoring data

### 5.5 Weather Alerts

Weather-based routing intelligence:

- "Thunderstorm expected in 45 minutes — recommend ending route at the rest area 800m ahead"
- "UV index very high — shade available at checkpoint 3 (200m)"
- "Wind increasing — water route conditions changing, return to dock recommended within 2 hours"
- "Fog expected at elevation — viewpoint visibility may be reduced"

### 5.6 Danger Zones

The Mobility Layer maintains real-time danger zones:

- Active fire areas
- Flood zones
- Landslide risk areas
- Aggressive wildlife zones
- High crime areas
- Construction zones
- Closed military areas

Danger zones are absolute constraints. No route will pass through an active danger zone. Visitors near danger zones receive immediate alerts and evacuation routes.

### 5.7 Restricted Habitats

Ecological restriction intelligence:

- "You are approaching a nesting area — please maintain 50m distance"
- "This trail is closed during seal pupping season (December-February)"
- "Marine protected zone — no anchoring, no fishing, no swimming beyond this point"
- "Sensitive moss habitat — stay on marked trail"

Restricted habitat information is sourced from governance (protected area rules), ecology (species data), and operations (seasonal closures).

### 5.8 Crowd Intelligence

Real-time crowd density monitoring:

- "Current trail usage: moderate (12 visitors ahead)"
- "Viewpoint is crowded — consider the alternative viewpoint 400m further"
- "Beach access busy — quieter beach available 2 km north"
- "Restaurant full — wait time approximately 25 minutes, or try the café 200m away"

Crowd data comes from:
- Visitor device presence (privacy-preserving aggregate counts)
- Community reports
- Business capacity data
- Event schedules

### 5.9 Quiet Routes

For visitors seeking solitude, the Mobility Layer identifies and recommends quiet routes:

- Low traffic volume
- Remote locations
- Off-peak timing
- Alternative paths to popular destinations
- Hidden waypoints unknown to mass tourism

Quiet routes are scored by solitude potential and recommended based on visitor preference.

### 5.10 Explorer Recommendations

Routes recommended based on explorer profile:

- "Based on your Eco Pokedex, you haven't discovered orchids yet — this route passes through known orchid habitats"
- "You've completed 3 of 5 missions in this area — the remaining 2 are accessible via this route"
- "Your badge progress: 2 more conservation observations needed — this route passes through high-biodiversity zones"
- "Community members with similar interests loved this route"

---

## 6. Ecological Navigation

### 6.1 Conservation-First Routing

The Mobility Layer's primary constraint is ecological preservation. Every route must satisfy ecological rules before optimizing for visitor experience.

Ecological navigation principles:

1. **Never disturb protected species.** Routes avoid nesting sites, feeding areas, and den locations during sensitive periods.
2. **Respect nesting seasons.** Areas with breeding wildlife are excluded from routes during breeding season.
3. **Marine protection.** Marine routes avoid coral reefs, seagrass beds, and marine mammal resting areas.
4. **Sensitive habitats.** Routes through fragile ecosystems use only established trails and limit group size.
5. **Maximum visitor density.** When an area reaches capacity, the Mobility Layer routes visitors elsewhere.
6. **Seasonal closures.** Routes through seasonally closed areas are automatically disabled.

### 6.2 Alternative Routes for Restricted Areas

When a standard route passes through a restricted area, the Mobility Layer automatically generates alternatives:

- **Seasonal alternative** — A different path that avoids the restricted zone
- **Time-based alternative** — The same path but restricted to hours when wildlife is less active
- **Group-size alternative** — The path is available but only for small groups
- **Guided alternative** — The path requires a certified guide to minimize impact
- **Virtual alternative** — A digital experience of the restricted area without physical presence

### 6.3 Educational Interpretation

Routes through ecologically significant areas include educational interpretation:

- "You are walking through a Mediterranean maquis ecosystem. This habitat supports over 200 plant species."
- "This viewpoint overlooks a coral reef that has been monitored since 2015. You can contribute to the monitoring by photographing the reef from this point."
- "The birds singing in the bushes to your right are European Robin. They nest in this area from March to July."

Educational content is sourced from the ecology capability, community knowledge, and scientific data.

### 6.4 Conservation-First Navigation Summary

The Mobility Layer never sacrifices ecology for convenience. If the most scenic route passes through a sensitive habitat, the visitor is routed along a less scenic but ecologically safe alternative. If the shortest route crosses a nesting area, the longer route is recommended.

This principle is non-negotiable. It is the foundation of the Mobility Layer's architecture.

---

## 7. Route Gamification

### 7.1 Route Completion

Every route has a completion metric. Visitors who complete a route earn recognition:

- **Route completed** — Finished the full route
- **Route speed record** — Fastest completion (for sports routes)
- **Route completeness** — Visited all waypoints, not just endpoints
- **Route documentation** — Created memories at key waypoints
- **Route contribution** — Submitted observations at checkpoint waypoints

Completion data feeds into the exploration capability's explorer profile.

### 7.2 Exploration Percentage

The Mobility Layer tracks what percentage of a destination's routes a visitor has explored:

- **0-10%** — Newcomer
- **10-25%** — Explorer
- **25-50%** — Adventurer
- **50-75%** — Expert
- **75-100%** — Guardian

Exploration percentage is a composite metric across all route types. It incentivizes visitors to try different types of exploration.

### 7.3 Hidden Checkpoints

Routes contain hidden checkpoints — waypoints that are not shown on the standard map but can be discovered through exploration:

- "You discovered a hidden waterfall! (+50 points)"
- "You found the ancient oak tree that locals call 'The Guardian.' (+30 points)"
- "You stumbled upon a secret beach. Only 23 people have found this spot. (+100 points)"

Hidden checkpoints create surprise and delight. They reward curiosity and exploration beyond the recommended path.

### 7.4 Discovery Rewards

Rewards for discovering hidden waypoints:

- **Eco Pokedex entries** — New species observations at hidden locations
- **Community memories** — Unlocking memories left by previous discoverers
- **Badge progress** — Contributions toward badge achievement
- **Eco-tokens** — Digital tokens for conservation contributions
- **Local stories** — Unlocking cultural narratives connected to the location

### 7.5 Memory Creation

Routes are designed to create memory creation opportunities:

- Scenic points with optimal photo conditions
- Historical markers with stories to share
- Ecological observation points with species to identify
- Cultural interpretation points with heritage to learn

Memory creation at waypoints feeds the community capability's memory system.

### 7.6 EcoPokedex Integration

Routes are designed to maximize Eco Pokedex contribution:

- Species-rich routes for collectors
- Rare species routes for advanced explorers
- Seasonal species routes for timing-based challenges
- Multi-habitat routes for diverse observation

The Mobility Layer recommends routes based on which Eco Pokedex entries the visitor is missing.

### 7.7 Badge Unlocks

Route-based badge categories:

- **Distance badges** — Total distance traveled
- **Elevation badges** — Total elevation gained
- **Route type badges** — Completed routes of different types
- **Conservation badges** — Observations contributed
- **Community badges** — Memories created and shared
- **Discovery badges** — Hidden checkpoints found
- **Season badges** — Routes completed in different seasons

### 7.8 Sport Progression

For athletic visitors, the Mobility Layer tracks sport-specific progression:

- **Running:** Distance, pace, elevation, trail difficulty
- **Cycling:** Distance, speed, elevation, technical difficulty
- **Kayaking:** Distance, water conditions, skill progression
- **Diving:** Depth, duration, certification level

Progression data feeds into the exploration capability's sports tracking.

### 7.9 Local Challenges

Community-organized challenges tied to routes:

- "Complete all 5 coastal routes this month"
- "Photograph 10 species along the mountain trail"
- "Visit every heritage site on the historical route"
- "Run the full marathon route before the festival"

Local challenges are created by community leaders and approved through the governance capability.

### 7.10 Seasonal Challenges

Season-specific challenges:

- **Spring:** "Discover 5 blooming species"
- **Summer:** "Complete all water routes"
- **Autumn:** "Photograph the fall colors at every viewpoint"
- **Winter:** "Spot 3 migratory bird species"

Seasonal challenges rotate automatically and are tied to real ecological events.

### 7.11 Community Races

Community-organized competitive events:

- Trail running races
- Cycling time trials
- Kayak races
- Photography competitions
- Species identification contests

Community races are managed through the governance capability and promoted through the operations capability.

### 7.12 Expeditions

Multi-day exploration events:

- "The Coastal Expedition: 5 days, 80km, 30 species, 5 communities"
- "The Mountain Challenge: 3 days, 45km, summit attempt, ecological survey"
- "The River Journey: 4 days, 60km, 15 bird species, 3 villages"

Expeditions combine routing, gamification, ecology, community, and economy into immersive multi-day experiences.

---

## 8. Offline Navigation

### 8.1 Offline Maps

The Mobility Layer provides full offline map capability:

- Vector maps downloaded for the destination area
- Route overlays cached for offline display
- Topographic data for terrain understanding
- POI data for services and waypoints
- Ecological zone boundaries

Offline maps are generated per-destination and cached on the device. Map updates are synchronized when connectivity returns.

### 8.2 Offline Routes

Complete route data is cached for offline navigation:

- Turn-by-turn directions
- Waypoint coordinates and descriptions
- Difficulty ratings
- Distance and elevation profiles
- Alternative route options
- Emergency exit points

Offline routes function identically to online routes. The visitor experience does not degrade without connectivity.

### 8.3 Offline Species Guides

Species identification guides are cached for offline use:

- Common species in the area
- Photo identification guides
- Habitat descriptions
- Seasonal presence information
- Conservation status

Offline species guides enable identification without internet. Observations are queued for upload when connectivity returns.

### 8.4 Offline Memories

Visitor-created memories are stored locally:

- Photos and text
- GPS coordinates
- Timestamps
- Waypoint associations
- Draft status (not yet published)

Offline memories sync to the community capability when connectivity returns. No data is lost during offline periods.

### 8.5 Offline Checkpoints

Checkpoint interactions work offline:

- Validation events recorded locally
- Progress tracking maintained locally
- Achievement unlocks computed locally
- Eco-token calculations performed locally

Offline checkpoints ensure gamification works everywhere. Progress syncs when connectivity returns.

### 8.6 Offline Achievements

Achievement computation works offline:

- Badge eligibility calculated from local progress
- Route completion verified from local data
- Species count updated from local observations
- Rank progression computed from local data

Offline achievements ensure the visitor sees their progress regardless of connectivity.

### 8.7 Offline Validation Queue

When offline actions need server validation:

1. Action recorded locally with timestamp
2. Action queued for synchronization
3. When connectivity returns, queue is processed
4. Server validates and confirms
5. Local state updated with server confirmation

The validation queue ensures consistency between offline and online states.

### 8.8 Synchronization Strategy

Synchronization follows these principles:

1. **Priority sync** — Safety-critical data (emergency location, danger alerts) syncs first
2. **Batch sync** — Observations, memories, and progress sync in batches
3. **Background sync** — Map updates and content refresh sync in background
4. **Conflict resolution** — Last-write-wins for user data, server-authoritative for system data

### 8.9 Conflict Resolution

When offline edits conflict with server state:

- **User data** (memories, observations) — Last-write-wins with merge for non-conflicting fields
- **Route data** (conditions, closures) — Server-authoritative, local override removed
- **Gamification data** (points, badges) — Server-authoritative, local override removed
- **Map data** — Server-authoritative, local cache refreshed

Conflict resolution is transparent. The visitor sees a notification when conflicts are resolved.

---

## 9. Business Integration

### 9.1 Businesses as Route Nodes

Businesses are not advertisements on routes. They are natural nodes in the movement network. A café at a rest point is not advertising — it is a service. A bike rental at a trail head is not a promoted listing — it is a transport hub.

The Mobility Layer integrates businesses as waypoints that serve the visitor's journey. The business is relevant because of its location, not because it paid for placement.

### 9.2 Contextual Services

Businesses appear in route recommendations based on context:

- **Rest context** — Café, restaurant, shelter when the visitor is tired
- **Equipment context** — Bike rental, kayak rental, gear shop when the route requires equipment
- **Emergency context** — Pharmacy, medical center, repair shop when the visitor needs help
- **Cultural context** — Museum, craft shop, gallery when the route passes through cultural areas
- **Nature context** — Guided tour, equipment rental, education center near ecological zones

Contextual relevance is determined by the visitor's current needs, not by business payment.

### 9.3 Service Categories

Business types integrated as route nodes:

- **Food & Beverage:** Restaurants, cafés, food markets, producers
- **Accommodation:** Hotels, hostels, camping, rural houses
- **Equipment:** Bike rental, kayak rental, diving center, gear shop
- **Transport:** Taxi, bus, ferry, car rental, bike share
- **Culture:** Museums, galleries, heritage sites, workshops
- **Services:** Pharmacies, medical centers, repair shops, ATMs
- **Nature:** Guided tours, ecological centers, nurseries
- **Emergency:** First aid, rescue services, emergency supplies
- **Comfort:** Public toilets, water refill stations, charging stations, shelters

### 9.4 Partner Visibility Rules

Business visibility on routes follows strict rules:

1. **Relevance** — Business must be contextually relevant to the visitor's current need
2. **Proximity** — Business must be within a reasonable detour from the route
3. **Availability** — Business must be currently open or opening soon
4. **Quality** — Business must meet minimum community rating threshold
5. **Contribution** — Business must contribute to the ecosystem (community participation, ecological practices)
6. **No payment for placement** — Never. Visibility is earned through contribution, not purchased.

### 9.5 Business Status Integration

Real-time business status affects routing:

- "Café ahead is closed today — alternative café 400m further"
- "Bike rental fully booked — next available at 14:00"
- "Restaurant full — wait time 30 minutes, or try the bistro next door"
- "Equipment shop closes in 45 minutes — recommend visiting now if needed"

---

## 10. AI Mobility Assistant

### 10.1 Overview

The AI Mobility Assistant is a natural language interface for route planning. Instead of filtering maps and scrolling through lists, visitors describe what they want and receive a complete, contextual itinerary.

### 10.2 Natural Language Planning

The assistant accepts natural language requests and translates them into route recommendations.

#### Example Requests

**Time-based:**
- "I have 4 hours." → Generates a 4-hour route optimized for available time.
- "I need something for this afternoon." → Afternoon-specific route with weather and business hours considered.
- "We have 2 hours before our reservation." → Route that ends near the reservation location.

**Interest-based:**
- "I want birds." → Bird-watching route with species expectations and observation points.
- "I want waterfalls." → Route passing through waterfall viewpoints with access information.
- "I want photography." → Photography route with golden hour timing and composition points.
- "I want local food." → Gastronomic route connecting restaurants, markets, and producers.

**Group-based:**
- "I travel with children." → Family-friendly route with rest stops, activities, and safety features.
- "I'm with elderly parents." → Accessible route with minimal elevation, frequent rest areas, and nearby services.
- "Solo trip." → Personalized route with hidden discoveries and solitude options.

**Equipment-based:**
- "I only have a bicycle." → Cycling route with bike station access and repair points.
- "I want to kayak." → Water route with launch point, conditions, and rental information.
- "No car." → Walking and public transport routes only.

**Constraint-based:**
- "I'm travelling without a car." → Routes accessible by foot and public transport.
- "Wheelchair accessible." → Accessible routes with surface conditions and facility information.
- "Something easy." → Low-difficulty routes with flat terrain and frequent rest areas.
- "Something challenging." → High-difficulty routes with elevation, technical terrain, and distance.

### 10.3 Contextual Journey Generation

The assistant generates complete journeys, not just routes:

1. **Morning segment** — Route optimized for morning conditions and energy
2. **Lunch stop** — Business recommendation based on dietary preferences and budget
3. **Afternoon segment** — Different route to avoid repetition and match afternoon conditions
4. **Rest periods** — Timed breaks at appropriate intervals
5. **Contingency** — Alternative options if conditions change

The journey is presented as a narrative: "Start at the harbor at 9:00. Walk along the coastal path for 2km. Stop at the viewpoint for photos. Continue through the olive grove. Lunch at María's restaurant. Afternoon hike to the waterfall. Return via the forest trail."

### 10.4 Follow-up Conversations

The assistant supports follow-up modifications:

- "Can we make it shorter?" → Adjusts route to reduce distance
- "Is there a café along the way?" → Adds a café stop
- "What about rain?" → Checks forecast and adjusts
- "Any birds to see?" → Adds species information
- "We're tired." → Shortens route and adds rest stops
- "Can we extend it?" → Adds additional waypoints and routes

### 10.5 Proactive Suggestions

The assistant proactively suggests improvements:

- "Based on the weather forecast, I recommend starting earlier"
- "A rare bird was spotted on an alternative route — interested?"
- "The café you planned to visit is closed — I found a great alternative"
- "Sunset is at 19:42 — this viewpoint is perfect for 19:15"

---

## 11. Multi-Destination Navigation

### 11.1 Cross-Place Routes

Routes connect places within a locality. A visitor can walk from a beach to a viewpoint to a restaurant within a single locality. Cross-place routes are the most common routing scenario.

### 11.2 Cross-Locality Routes

Routes connect localities within a destination. A visitor can cycle from one village to another, passing through multiple places. Cross-locality routes consider transport options, terrain, and services between localities.

### 11.3 Cross-Commune Routes

Routes connect communes within a destination. These are longer routes that may require transport segments. The Mobility Layer integrates public transport, bike rental, and car sharing for cross-commune travel.

### 11.4 Cross-Destination Routes

Routes connect destinations within a region. These are multi-day expeditions that span territories. Cross-destination routes consider different governance rules, ecological regulations, and community norms.

### 11.5 Cross-Region Routes

Routes connect regions. These are major expeditions — long-distance trails, multi-day kayak journeys, or cycling pilgrimages. Cross-region routes are the most complex and require coordination across multiple governance structures.

### 11.6 Long Expeditions

Extended routes spanning multiple days:

- **Coastal expedition** — Multi-day coastal journey with overnight stops
- **Mountain traverse** — Mountain crossing with camps and huts
- **River journey** — Downstream or upstream multi-day paddle
- **Cultural pilgrimage** — Multi-day cultural heritage route
- **Scientific transect** — Multi-day data collection route

Long expeditions require:
- Camping or accommodation booking (reservation capability)
- Equipment supply points (economy capability)
- Emergency access planning (operations capability)
- Multi-day weather forecasting (intelligence capability)
- Community hosting arrangements (community capability)

---

## 12. Analytics

### 12.1 Route Popularity

Metrics on which routes are most used:

- Total visitors per route
- Visitors per time period
- Peak usage times
- Seasonal variation
- Route type distribution
- Starting points and ending points

Route popularity data informs destination management and route optimization.

### 12.2 Completion Rates

Metrics on route completion:

- Percentage of visitors who complete the full route
- Drop-off points (where visitors stop early)
- Average completion time vs. estimated time
- Completion by difficulty level
- Completion by visitor type

Completion rates indicate route quality and visitor satisfaction.

### 12.3 Average Duration

Metrics on time spent:

- Average time per route
- Time distribution along route
- Rest stop usage duration
- Business stop duration
- Total experience duration

Duration data informs business planning and route timing recommendations.

### 12.4 Heat Maps

Visual representations of visitor movement:

- Density heat maps (where visitors cluster)
- Flow heat maps (direction of movement)
- Temporal heat maps (how patterns change by time of day)
- Seasonal heat maps (how patterns change by season)

Heat maps inform destination management, infrastructure planning, and conservation decisions.

### 12.5 Biodiversity Observations

Metrics on ecological data generated through routing:

- Species observations per route
- Observation density per kilometer
- New species discoveries
- Observation quality (validated vs. pending)
- Seasonal observation patterns

Biodiversity observation metrics measure the platform's contribution to citizen science.

### 12.6 Business Impact

Metrics on economic flow generated through routing:

- Business stops per route
- Revenue attributed to route traffic
- Business discovery rate (first-time visitors via routes)
- Business satisfaction with route integration
- Seasonal business impact

Business impact metrics demonstrate the economic value of intelligent routing.

### 12.7 Ecological Impact

Metrics on conservation outcomes:

- Visitors routed away from sensitive areas
- Conservation rule compliance rate
- Ecological observations contributed
- Habitat disturbance incidents (should be zero)
- Conservation funding generated

Ecological impact metrics measure the platform's contribution to conservation.

### 12.8 Community Participation

Metrics on community engagement:

- Community-created routes
- Community memories along routes
- Community challenges organized
- Community events promoted through routes
- Community leader activity

Community participation metrics measure the platform's contribution to community engagement.

### 12.9 Economic Flow

Metrics on territory-wide economic distribution:

- Revenue distribution across localities
- Economic impact per route
- Business diversity along routes
- Seasonal economic patterns
- Economic equality across territories

Economic flow metrics measure whether the Mobility Layer distributes economic value equitably.

---

## 13. Integrations

### 13.1 Identity

The Mobility Layer consumes destination identity data:

- Destination branding (colors, logos, naming) applied to route presentation
- Cultural stories displayed at relevant waypoints
- Heritage items highlighted along historical routes
- Local heroes featured at relevant locations
- Cultural routes generated from identity data

The Mobility Layer contributes to identity:

- New cultural routes become part of destination identity
- Route-based cultural discoveries enrich the identity layer
- Movement patterns inform identity evolution

### 13.2 Public

The Mobility Layer integrates with the public experience:

- Routes are rendered as interactive maps in the public interface
- Waypoints are displayed as discoverable points
- Route descriptions are rendered with destination branding
- SEO metadata generated for route pages
- Route content is CMS-managed through the CMS capability

### 13.3 SEO

The Mobility Layer generates SEO value:

- Route pages with unique titles and descriptions
- Schema.org markup for routes and waypoints
- Internal linking between routes, places, and experiences
- Sitemap entries for all routes
- Local SEO signals from route-generated content

### 13.4 Reservation

The Mobility Layer integrates with the reservation capability:

- Routes are designed to end near reservation locations
- Time constraints from reservations shape route duration
- Business stops include reservation availability
- Route recommendations consider upcoming bookings
- Post-experience routes suggest related bookable experiences

### 13.5 Community

The Mobility Layer deeply integrates with the community capability:

- Community memories are displayed at waypoints
- Community reviews inform route quality scoring
- Community-created routes are discoverable
- Community events are promoted through route recommendations
- Route completion generates reputation points
- Route-based observations contribute to community knowledge

### 13.6 Exploration

The Mobility Layer is the primary interface for the exploration capability:

- Missions are tied to specific routes and waypoints
- Badge progress is tracked through route completion
- Explorer profile is built from route activity
- Eco Pokedex entries are discovered along routes
- Leaderboard position reflects route-based exploration

### 13.7 Ecology

The Mobility Layer consumes ecology data:

- Species presence data informs route recommendations
- Habitat sensitivity data constrains routing
- Seasonal ecology data affects route availability
- Conservation status data determines route restrictions
- Ecological observation data comes from route-based citizen science

The Mobility Layer contributes to ecology:

- Route-based observations feed the ecology database
- Visitor movement patterns inform habitat monitoring
- Ecological interpretation educates visitors
- Conservation-first routing protects ecosystems

### 13.8 Engagement

The Mobility Layer integrates with the engagement capability:

- Route-based triggers activate engagement campaigns
- Route completion sends congratulatory messages
- Route recommendations are sent through engagement channels
- Route-based challenges are promoted through campaigns
- Route activity feeds engagement analytics

### 13.9 Journey

The Mobility Layer extends the journey system:

- Routes form the backbone of visitor journeys
- Journey stages correspond to route segments
- Journey completion requires route completion
- Journey memories are created along routes
- Journey progression is tracked through route activity

### 13.10 Economy

The Mobility Layer creates economic flow:

- Business stops generate revenue
- Route-based recommendations drive customer acquisition
- Equipment rental generates activity revenue
- Guided tours generate experience revenue
- Route analytics inform business decisions

### 13.11 Intelligence

The Mobility Layer consumes intelligence data:

- Visitor profiles inform route personalization
- Predictive analytics inform route recommendations
- Pattern detection identifies popular routes
- AI assistant capabilities power the mobility assistant
- Knowledge graph connects routes to entities

The Mobility Layer contributes to intelligence:

- Movement patterns inform visitor behavior analysis
- Route preferences inform interest modeling
- Completion patterns inform demand prediction
- Route-based observations enrich the knowledge graph

### 13.12 Governance

The Mobility Layer respects governance rules:

- Protected area regulations constrain routing
- Access rules determine route availability
- Permit requirements are integrated into route planning
- Business certification requirements filter service recommendations
- Content moderation applies to route descriptions

The Mobility Layer contributes to governance:

- Movement data informs destination management decisions
- Route compliance data supports regulatory reporting
- Visitor distribution data supports governance planning

### 13.13 Operations

The Mobility Layer consumes operations data:

- Health scores inform route quality recommendations
- Campaign data promotes route-based events
- Seasonal profiles affect route availability
- Alert data triggers route restrictions
- Report data includes route analytics

The Mobility Layer contributes to operations:

- Real-time crowd density informs destination management
- Route-based activity data supports health scoring
- Visitor distribution data informs campaign targeting
- Route compliance data supports operational reporting

### 13.14 PWA

The Mobility Layer is PWA-native:

- Offline navigation works through PWA infrastructure
- Route data is cached through PWA caching strategies
- Push notifications deliver route updates
- Background sync synchronizes offline activity
- Install prompt promotes PWA installation for navigation

### 13.15 Analytics

The Mobility Layer generates analytics:

- Route usage metrics
- Visitor flow analytics
- Completion and drop-off analytics
- Business impact analytics
- Ecological observation analytics

Analytics are exposed through the observability capability's dashboards.

### 13.16 Media

The Mobility Layer handles media:

- Route photos and waypoint images
- Species identification photos
- Memory photos along routes
- Media optimization for offline use
- Media storage and retrieval

Media is managed through the community capability's media system.

### 13.17 Observability

The Mobility Layer emits observability metrics:

- Route engine performance
- Recommendation accuracy
- Offline sync status
- Navigation accuracy
- System health indicators

Metrics are collected through the observability capability.

---

## 14. Architecture Rules

### 14.1 Mobility Never Owns Destination Data

The Mobility Layer consumes data from other capabilities but never owns it. Routes reference places, experiences, businesses, and ecology — they do not duplicate them.

When a place is updated in the community capability, the Mobility Layer sees the update automatically. When a business changes its hours in the economy capability, the Mobility Layer adjusts recommendations.

### 14.2 Mobility Consumes Capabilities

The Mobility Layer accesses other capabilities ONLY through `context.capabilities.get()`. It never imports capability classes directly.

```js
// CORRECT
const community = this.context.capabilities.get('community')
const exploration = this.context.capabilities.get('exploration')

// FORBIDDEN
import { CommunityCapability } from '../community/community.capability.js'
```

### 14.3 Context Over Shortest Path

The Mobility Layer never optimizes for shortest distance. It optimizes for richest experience within constraints.

A 5km route that passes through 3 viewpoints, 2 species habitats, and 1 cultural site is better than a 2km direct route — if the visitor has the time and interest.

### 14.4 Conservation Before Convenience

When conservation and convenience conflict, conservation wins. Always.

If the most scenic route passes through a nesting area, the visitor is routed elsewhere. If the shortest path crosses a sensitive habitat, the longer path is recommended. If a species is nesting, the route is rerouted regardless of visitor preference.

### 14.5 Accessibility Always Considered

Every route must have an accessible alternative. Not as an afterthought — as a primary consideration.

Accessibility is not just wheelchair access. It includes:
- Mobility limitations (difficulty, elevation, distance)
- Visual impairments (audio descriptions, tactile markers)
- Cognitive accessibility (simple navigation, clear signage)
- Age-related considerations (children, elderly)
- Medical conditions (heart conditions, asthma, heat sensitivity)

### 14.6 Offline-First

The Mobility Layer works without internet. Every feature, every route, every interaction must function offline.

Online connectivity enhances the experience (real-time updates, live conditions) but is never required for core navigation.

### 14.7 Explainable Recommendations

Every route recommendation comes with an explanation. The visitor must understand why a route was recommended.

- "Recommended because you enjoy bird watching and this route passes through a known nesting area."
- "Recommended because you have 3 hours and this route fits perfectly with a lunch stop."
- "Recommended because you haven't explored the mountain area yet and this is the easiest introduction."

Explanations build trust and help visitors make informed decisions.

### 14.8 No Advertising

Businesses appear on routes because they are contextually relevant, not because they paid for placement. This principle is absolute and non-negotiable.

The Mobility Layer generates revenue through SaaS subscriptions, not through advertising. Business visibility is earned through contribution and relevance.

### 14.9 Privacy-First

The Mobility Layer minimizes data collection:

- Location data is processed locally when possible
- Aggregate movement patterns are anonymized
- Individual tracking requires explicit consent
- Data retention follows最小化原则 (principle of minimal data)
- Visitors can delete their movement history at any time

### 14.10 Global Scalability

The Mobility Layer architecture must scale globally:

- Route data structures support any geography
- Coordinate systems handle global positioning
- Multi-language support for all content
- Cultural adaptation for different tourism norms
- Regulatory compliance across jurisdictions

---

## 15. Future Vision

### 15.1 Autonomous Trip Planner

An AI that plans entire trips autonomously. Not just routes — complete experiences including accommodation, dining, activities, and transport. The visitor says "I have 5 days in Costa de Valdivia" and receives a complete itinerary.

### 15.2 Wearables Integration

Smart watches and fitness trackers that provide:
- Haptic navigation feedback (vibration for turns)
- Heart rate-based difficulty adjustment
- Altitude and weather alerts
- Species identification via wrist camera
- Emergency SOS from wrist device

### 15.3 Smart Glasses

AR navigation through smart glasses:
- Turn-by-turn directions overlaid on reality
- Species identification in real-time
- Historical information at heritage sites
- Distance and elevation displays
- Safety alerts as visual overlays

### 15.4 AR Navigation

Phone-based augmented reality navigation:
- Route overlay on camera view
- Waypoint visualization
- Species identification
- Historical reconstruction
- Future condition simulation

### 15.5 Drone-Assisted Interpretation

Drones that provide:
- Aerial views of routes ahead
- Wildlife observation without disturbance
- Emergency supply delivery
- Search and rescue support
- Environmental monitoring

### 15.6 Marine Navigation

Full marine navigation capability:
- Tide-aware routing
- Current prediction
- Marine species tracking
- Weather routing for boats
- Harbor and marina integration

### 15.7 Offline Satellite Maps

Satellite imagery cached for offline use:
- High-resolution terrain maps
- Vegetation analysis
- Water body mapping
- Urban area identification
- Trail condition assessment

### 15.8 Collaborative Expeditions

Multi-visitor collaborative exploration:
- Group route planning
- Real-time group position sharing
- Collaborative species identification
- Group challenges and competitions
- Shared memory creation

### 15.9 Scientific Missions

Routes designed for scientific data collection:
- Structured observation protocols
- Data quality assurance
- Integration with research databases
- Academic collaboration tools
- Publication-quality data export

### 15.10 Real-Time Biodiversity

Live biodiversity monitoring through visitor movement:
- Real-time species tracking
- Population density estimation
- Migration pattern detection
- Habitat health assessment
- Conservation threat detection

### 15.11 Citizen Science Routes

Routes specifically designed for scientific contribution:
- Structured observation points
- Protocol-based data collection
- Quality scoring for observations
- Researcher collaboration
- Citizen science credit system

### 15.12 Digital Ranger Mode

An immersive mode for dedicated conservation supporters:
- Enhanced ecological monitoring
- Priority access to restricted areas (with permits)
- Direct communication with conservation teams
- Advanced species identification tools
- Conservation reporting interface

### 15.13 Global Ecosystem Graph

A worldwide graph connecting ecosystems:
- Species migration routes across continents
- Climate impact tracking across regions
- Conservation success stories shared globally
- Cross-border ecological collaboration
- Planetary biodiversity monitoring

---

## Appendix A: Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    DESTINATION GRAPH                         │
│                                                             │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐           │
│  │ Locality │────>│  Place   │────>│Experience│           │
│  └────┬─────┘     └────┬─────┘     └──────────┘           │
│       │                │                                    │
│       │         ┌──────┴──────┐                            │
│       │         │    Route    │                            │
│       │         └──────┬──────┘                            │
│       │                │                                    │
│       │    ┌───────────┼───────────┐                       │
│       │    │           │           │                       │
│  ┌────┴────┴──┐  ┌─────┴─────┐  ┌─┴──────────┐          │
│  │  Waypoint  │  │   Trail   │  │  Ecological │          │
│  └─────┬──────┘  └───────────┘  │    Zone     │          │
│        │                         └─────────────┘          │
│  ┌─────┼──────────┬──────────┬──────────┐                 │
│  │     │          │          │          │                 │
│  ▼     ▼          ▼          ▼          ▼                 │
│ Scenic Business  Check-   Emergency  Access-              │
│ Point    Stop    point     Point     ibility              │
│                                   Node                    │
└─────────────────────────────────────────────────────────────┘
```

## Appendix B: Capability Integration Matrix

| Capability | Data Flow | Integration Type |
|------------|-----------|------------------|
| Identity | Destination branding, cultural stories, heritage | Consume |
| Public | Route rendering, waypoint display | Emit + Consume |
| SEO | Route pages, schema.org, sitemaps | Emit |
| Reservation | Time constraints, booking integration | Consume |
| Community | Memories, reviews, routes, challenges | Emit + Consume |
| Exploration | Missions, badges, progress, Eco Pokedex | Emit + Consume |
| Ecology | Species data, habitat sensitivity, conservation | Consume + Emit |
| Engagement | Route-based triggers, campaigns | Emit + Consume |
| Journey | Route stages, journey completion | Emit + Consume |
| Economy | Business stops, revenue flow | Consume + Emit |
| Intelligence | Visitor profiles, recommendations, predictions | Consume + Emit |
| Governance | Protected areas, access rules, certification | Consume |
| Operations | Health scores, alerts, campaigns, seasonal | Consume + Emit |
| PWA | Offline maps, caching, push notifications | Consume |
| Analytics | Route metrics, visitor flow, impact | Emit |
| Media | Route photos, species images, memories | Consume + Emit |
| Observability | Performance metrics, health indicators | Emit |

---

*This document is the architectural specification for Capability 27: Destination Mobility. It describes the system's design without implementation details. Code implementation follows a separate phase.*
