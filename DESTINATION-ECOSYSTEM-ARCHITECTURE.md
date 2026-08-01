# Destination Ecosystem Architecture

## 1. Vision

Valdi Engine evolves from a **Reservation SaaS platform** to **Digital infrastructure for tourism destinations**.

The platform becomes a territory-first ecosystem where destinations, localities, places, visitors, ecology, and businesses coexist. Businesses are not the center. The territory is the center. Businesses are participants inside the destination ecosystem.

The vision is a "Pokédex of tourism destinations":

- Destinations = the world map
- Places = the discoveries
- Businesses = the ecosystem members
- Visitors = explorers
- Reviews and memories = community knowledge
- Ecology = conservation layer

---

## 2. Hierarchical Domain Model

```
Platform
  └── Destination Network
        └── Region
              └── Commune
                    └── Locality
                          ├── Places / Attractions / Experiences
                          ├── Businesses / Accommodation / Services
                          ├── Visitor Memories
                          ├── Reviews
                          └── Ecology Profile
```

### 2.1. Entity Definitions

#### Destination

A tourism territory with its own identity, content, and ecosystem.

| Property | Type | Description |
|----------|------|-------------|
| id | string | Unique identifier |
| name | string | Display name (e.g., "Costa de Valdivia") |
| slug | string | URL-safe identifier (e.g., "costa-de-valdivia") |
| description | string | Long-form tourism description |
| type | enum | coast, mountain, city, rural, island, fjord |
| regionId | string | Parent region reference |
| communeIds | string[] | Contained communes |
| images | array | Hero images, gallery |
| categories | string[] | Tourism categories (nature, culture, gastronomy, adventure) |
| ecologyProfile | object | Ecological identity reference |
| tourismCharacteristics | object | Climate, season, difficulty, accessibility |
| seoMetadata | object | title, description, canonical, og, schema |
| pwaConfig | object | Manifest, theme, branding per destination |
| status | enum | draft, active, archived |

#### Region

Administrative and tourism grouping.

| Property | Type | Description |
|----------|------|-------------|
| id | string | Unique identifier |
| name | string | Region name (e.g., "Los Ríos") |
| slug | string | URL-safe identifier |
| destinationIds | string[] | Contained destinations |
| communeIds | string[] | Contained communes |
| description | string | Region overview |
| images | array | Region-level imagery |
| seoMetadata | object | SEO configuration |

#### Commune

Municipal-level geographic entity.

| Property | Type | Description |
|----------|------|-------------|
| id | string | Unique identifier |
| name | string | Commune name (e.g., "Valdivia") |
| slug | string | URL-safe identifier |
| regionId | string | Parent region |
| destinationIds | string[] | Associated destinations |
| localityIds | string[] | Contained localities |
| description | string | Commune overview |
| images | array | Commune imagery |
| seoMetadata | object | SEO configuration |

#### Locality

A smaller tourism identity with its own PWA, branding, and ecosystem.

| Property | Type | Description |
|----------|------|-------------|
| id | string | Unique identifier |
| name | string | Locality name (e.g., "Los Molinos") |
| slug | string | URL-safe identifier |
| communeId | string | Parent commune |
| destinationId | string | Associated destination |
| description | string | Locality description |
| images | array | Locality gallery |
| categories | string[] | Tourism categories |
| branding | object | Colors, logo, theme for own PWA |
| pwaConfig | object | Manifest overrides |
| seoMetadata | object | SEO configuration |
| businessIds | string[] | Associated businesses |
| experienceIds | string[] | Available experiences |
| ecologyProfile | object | Local ecological information |

#### Place / Attraction

Tourism points of interest.

| Property | Type | Description |
|----------|------|-------------|
| id | string | Unique identifier |
| name | string | Place name |
| slug | string | URL-safe identifier |
| type | enum | beach, trail, viewpoint, historical, park, waterfall, market, restaurant, viewpoint |
| localityId | string | Parent locality |
| destinationId | string | Associated destination |
| coordinates | object | lat, lng |
| description | string | Place description |
| images | array | Place imagery |
| categories | string[] | Categories |
| ecologyInformation | object | Environmental notes, protected species, guidelines |
| visitorInteractions | object | View count, memory count, review count |
| seoMetadata | object | SEO configuration |

#### Experience

Activities and tours.

| Property | Type | Description |
|----------|------|-------------|
| id | string | Unique identifier |
| name | string | Experience name (e.g., "Kayak en Río Calle-Calle") |
| slug | string | URL-safe identifier |
| type | enum | adventure, cultural, gastronomic, nature, wellness, educational |
| localityId | string | Parent locality |
| destinationId | string | Associated destination |
| description | string | Experience description |
| images | array | Experience imagery |
| duration | string | Duration description |
| difficulty | enum | easy, moderate, difficult, expert |
| season | string[] | Available seasons |
| placeIds | string[] | Connected places |
| businessIds | string[] | Businesses offering this experience |
| reservationRequired | boolean | Whether reservations are needed |
| seoMetadata | object | SEO configuration |

#### Business Tenant

Existing multi-tenant model. Businesses belong to destinations and localities.

| Property | Type | Description |
|----------|------|-------------|
| id | string | Tenant ID (existing) |
| name | string | Business name |
| type | enum | accommodation, restaurant, service, transport, guide |
| localityId | string | Primary locality |
| destinationId | string | Associated destination |
| experienceIds | string[] | Offered experiences |
| placeIds | string[] | Associated places |
| url | string | e.g., valdi.app/cabana-los-molinos |

#### Visitor Memory

Community layer — visitor-contributed content.

| Property | Type | Description |
|----------|------|-------------|
| id | string | Unique identifier |
| visitorId | string | Visitor reference |
| visitorName | string | Display name |
| destinationId | string | Visited destination |
| localityId | string | Visited locality |
| placeIds | string[] | Visited places |
| experienceIds | string[] | Participated experiences |
| images | array | Visitor photos |
| text | string | Written memory |
| date | string | Visit date |
| rating | number | 1-5 overall rating |
| privacy | enum | public, followers, private |
| createdAt | string | Creation timestamp |

#### Review

Tourism reputation layer — structured reviews.

| Property | Type | Description |
|----------|------|-------------|
| id | string | Unique identifier |
| targetType | enum | destination, locality, place, experience, business |
| targetId | string | Reviewed entity ID |
| visitorId | string | Reviewer reference |
| rating | number | 1-5 rating |
| title | string | Review title |
| text | string | Review body |
| pros | string[] | Positive aspects |
| cons | string[] | Negative aspects |
| visitDate | string | When the visit occurred |
| images | array | Review photos |
| helpful | number | Helpfulness votes |
| createdAt | string | Creation timestamp |

#### Ecology Profile

Unique differentiation layer — ecological identity per destination/locality.

| Property | Type | Description |
|----------|------|-------------|
| id | string | Unique identifier |
| entityId | string | Destination or locality ID |
| entityType | enum | destination, locality |
| ecosystem | string[] | marine, forest, wetland, urban, agricultural |
| protectedSpecies | array | Species with conservation status |
| biodiversityScore | number | 0-100 biodiversity index |
| conservationAreas | array | Protected zones |
| environmentalGuidelines | string[] | Responsible tourism rules |
| ecologicalSeal | enum | basic, sustainable, regenerative, certified |
| carbonFootprint | object | Estimated impact per activity |
| responsibleTourismTips | string[] | Visitor guidelines |

---

## 3. Relationship Model

```
Region 1──* Commune
Commune 1──* Locality
Destination 1──* Locality
Locality 1──* Place
Locality 1──* Experience
Locality 1──* Business
Destination 1──* Business
Place 1──* Experience (shared locations)
Experience *──* Business (offered by)
Business *──* Experience (offers)
Visitor *──* Memory
Visitor *──* Review
Destination 1──* EcologyProfile
Locality 1──* EcologyProfile
Place 1──* EcologyInfo
```

### 3.1. Inheritance

- Destinations inherit EcologyProfile from their contained localities
- Localities inherit TourismCategories from their contained places
- Reviews aggregate into Destination/Locality reputation scores

### 3.2. References

- Business Tenant references Locality and Destination via IDs (not embedded)
- Visitor Memory references multiple Places and Experiences
- EcologyProfile is independent — referenced by Destinations, Localities, Places

---

## 4. Capability Boundary Proposal

### 4.1. Capability Decomposition

| Capability | Responsibility | Entities | Notes |
|------------|---------------|----------|-------|
| **destination** | Geographic hierarchy, destinations, localities, communes, regions | Destination, Region, Commune, Locality | Core ecosystem structure |
| **place** | Tourism points of interest, locations, categories | Place, PlaceCategory | Could merge into destination |
| **experience** | Activities, tours, adventures, cultural events | Experience, ExperienceCategory | Connects places to businesses |
| **community** | Visitor memories, reviews, comments, social participation | Memory, Review, Comment | Community-driven content |
| **ecology** | Ecological profiles, conservation, sustainable tourism | EcologyProfile, ConservationArea, Species | Unique differentiator |
| **discovery** | Exploration, recommendations, navigation, tourism search | SearchIndex, Recommendation, Category | Could merge into public |

### 4.2. Consolidation Recommendation

**Merge into fewer capabilities for manageability:**

```
destination capability (core ecosystem)
├── hierarchy management (region, commune, locality, destination)
├── place management (tourism points)
├── experience management (activities)
└── SEO per entity

community capability (visitor engagement)
├── visitor memories
├── reviews and ratings
├── comments
└── social interactions

ecology capability (conservation layer)
├── ecological profiles
├── species data
├── conservation guidelines
├── sustainability scoring
└── ecological seal certification

discovery capability (navigation + recommendations)
├── search across ecosystem
├── category-based browsing
├── personalized recommendations
├── trending destinations
└── cross-entity navigation
```

**4 capabilities total.** This balances separation of concerns with operational simplicity.

### 4.3. Relationship to Existing Capabilities

| Existing Capability | Relationship |
|---------------------|-------------|
| public | Extended to render Destination/Locality pages |
| pwa-engine | Extended to generate per-entity PWAs |
| seo-intelligence | Extended to handle ecosystem SEO hierarchy |
| reservation | Unchanged — businesses still handle reservations |
| availability | Unchanged — availability stays at business level |
| intelligence | Extended to include ecosystem-level analytics |
| engagement | Extended to include community engagement triggers |
| saas | Extended to handle destination-tier plans |
| billing | Extended to handle destination-tier billing |
| admin | Extended to manage ecosystem administration |

---

## 5. PWA Destination Strategy

### 5.1. PWA Hierarchy

Each entity can generate its own installable PWA:

| Level | Example | Scope |
|-------|---------|-------|
| Platform | valdi.app | Global destination network |
| Region | valdi.app/region/los-rios | Regional tourism |
| Destination | valdi.app/costa-de-valdivia | Destination area |
| Locality | valdi.app/los-molinos | Locality tourism |
| Business | valdi.app/cabana-los-molinos | Business tenant (existing) |

### 5.2. PWA Generation Rules

```
Platform PWA
├── scope: /
├── content: all destinations, search, navigation
├── branding: Valdi platform
└── theme: default

Destination PWA
├── scope: /costa-de-valdivia/
├── content: destination overview, localities, places, experiences
├── branding: destination-specific
├── theme: destination colors
└── inherits: platform SEO, communication, analytics

Locality PWA
├── scope: /los-molinos/
├── content: locality detail, places, businesses, memories
├── branding: locality-specific
├── theme: locality colors
└── inherits: destination SEO, communication, analytics

Business PWA
├── scope: /cabana-los-molinos/
├── content: business detail, services, availability
├── branding: business-specific
└── inherits: locality SEO, communication, analytics
```

### 5.3. PWA Sharing

All entity PWAs share:

| Component | Source |
|-----------|--------|
| PWA Engine | capabilities/pwa-engine |
| SEO Engine | capabilities/seo-intelligence |
| CMS | capabilities/cms |
| Communication | capabilities/communication |
| Analytics | capabilities/observability |
| Reservation Engine | capabilities/reservation |

All entity PWAs maintain independent:

| Component | Per-Entity |
|-----------|-----------|
| Manifest | Custom per entity |
| Service Worker Cache | Isolated per entity |
| Theme/Branding | Custom per entity |
| Offline Pages | Entity-specific |
| Install Prompt | Independent tracking |

### 5.4. PWA Identity Resolution

URL resolution follows hierarchy:

```
valdi.app                           → Platform
valdi.app/region/los-rios           → Region
valdi.app/costa-de-valdivia         → Destination
valdi.app/los-molinos               → Locality
valdi.app/cabana-los-molinos        → Business Tenant
```

Resolution order:
1. Exact slug match against Business Tenants
2. Exact slug match against Localities
3. Exact slug match against Destinations
4. Exact slug match against Regions
5. 404 fallback

---

## 6. SEO Hierarchy Strategy

### 6.1. SEO Cascade

SEO metadata cascades from region → destination → locality → business:

```
Region: "Turismo Región de Los Ríos"
  └── Destination: "Turismo Costa de Valdivia — Playas, Naturaleza y Aventura"
        └── Locality: "Turismo Los Molinos — Playas y Naturaleza"
              └── Business: "Cabañas Los Molinos — Alojamiento en Los Molinos"
```

### 6.2. Canonical URL Strategy

| Entity | Canonical | Example |
|--------|-----------|---------|
| Region | valdi.app/region/{slug} | valdi.app/region/los-rios |
| Destination | valdi.app/{slug} | valdi.app/costa-de-valdivia |
| Locality | valdi.app/{slug} | valdi.app/los-molinos |
| Place | valdi.app/{locality-slug}/{place-slug} | valdi.app/los-molinos/playa-miraflores |
| Experience | valdi.app/{locality-slug}/experiencias/{slug} | valdi.app/los-molinos/experiencias/kayak |
| Business | valdi.app/{business-slug} | valdi.app/cabana-los-molinos |

### 6.3. Sitemap Strategy

```
sitemap.xml (platform)
├── region/los-rios.xml
│   ├── costa-de-valdivia.xml
│   │   ├── los-molinos.xml
│   │   │   ├── playas.xml
│   │   │   ├── experiencias.xml
│   │   │   └── negocios.xml
│   │   └── niebla.xml
│   └── ...
└── robots.txt (platform-level)
```

### 6.4. JSON-LD Schema per Entity

| Entity | Schema Type |
|--------|------------|
| Region | TouristDestination |
| Destination | TouristDestination, Place |
| Locality | TouristDestination, Place |
| Place | Place, TouristAttraction |
| Experience | TouristAttraction, Event |
| Business | LocalBusiness, Hotel, Restaurant, TouristAttraction |

### 6.5. Indexing Strategy

- All entity pages are indexable
- Business pages have existing SEO (from P9.1)
- Destination/Locality pages generate unique meta descriptions
- Place pages inherit from parent locality
- Experience pages generate rich results (duration, difficulty, price range)
- Visitor memories generate UGC (user-generated content) signals
- Reviews generate aggregate ratings (structured data)

---

## 7. Data Ownership Rules

### 7.1. Ownership Matrix

| Data Type | Owner | Platform Role | Business Role | Visitor Role |
|-----------|-------|--------------|---------------|-------------|
| Ecosystem structure | Platform | Creates, manages hierarchy | — | — |
| Technical infrastructure | Platform | Maintains PWA, SEO, analytics | — | — |
| Destination identity | Platform + Destination admins | Provides framework | Contributes content | — |
| Tourism stories | Destination admins | Stores | — | — |
| Categories | Platform | Defines taxonomy | — | — |
| Business services | Business tenants | — | Owns, manages | — |
| Business availability | Business tenants | — | Owns, manages | — |
| Reservations | Business tenants | Facilitates | Owns, manages | Participates |
| Visitor memories | Visitors | Stores | — | Owns |
| Reviews | Visitors | Stores, moderates | Can respond | Owns |
| Photos (user) | Visitors | Stores | — | Owns |
| Ecology data | Platform + Experts | Curates, validates | Follows guidelines | — |
| Ecological seal | Platform | Certifies | Complies | — |

### 7.2. Access Rules

```
Platform Admin
├── Read/Write: ecosystem structure, categories, taxonomy
├── Read: all entity data
├── Write: SEO metadata, PWA config
└── Manage: ecological seal certification

Destination Admin
├── Read/Write: destination identity, stories, images
├── Read: locality data, business data
├── Write: SEO for destination
└── Manage: local taxonomy

Locality Admin
├── Read/Write: locality identity, stories, images
├── Read: place data, business data
├── Write: SEO for locality
└── Manage: local categories

Business Tenant
├── Read/Write: own services, availability
├── Read: locality data, destination data
├── Participate: reservation system
└── Cannot: modify ecosystem structure

Visitor
├── Read: all public data
├── Write: own memories, reviews
├── Upload: own images
└── Cannot: modify any entity data
```

---

## 8. Future Monetization Relationship

### 8.1. Tier Structure

| Tier | Name | Includes | Price |
|------|------|----------|-------|
| Free | Tourism Presence | Destination listing, basic gallery, map location | $0 |
| Basic | Local Business Directory | Business listing, contact info, basic SEO | $29/mo |
| Standard | Premium Pages | Custom PWA, advanced SEO, analytics, reviews | $99/mo |
| Premium | Full Ecosystem | All capabilities, reservation engine, billing, PWA, admin | $299/mo |
| Enterprise | Custom | White-label, API access, custom integrations | Custom |

### 8.2. Revenue Streams

| Stream | Description |
|--------|-------------|
| SaaS subscriptions | Business tenants pay monthly |
| Destination plans | Destination admins pay for ecosystem features |
| Reservation commissions | Platform takes % per reservation |
| Ecological partnerships | Conservation organizations sponsor seal |
| Advertising | Local services, experiences, businesses |
| Data insights | Aggregated tourism analytics (anonymized) |

### 8.3. Monetization Integration with SaaS

```
SaaS Products (existing)
├── free_tourism_presence → basic destination listing
├── basic_business_directory → business listing + contact
├── standard_premium_pages → custom PWA + SEO + analytics
├── premium_full_ecosystem → all capabilities
└── enterprise_custom → white-label + API

Destination Products (new)
├── destination_ecosystem → destination management + hierarchy
├── community_platform → visitor memories + reviews
├── ecology_program → ecological seal + certification
└── discovery_engine → recommendations + search
```

---

## 9. Implementation Roadmap

### Phase D1 — Destination Core (Foundation)

Create the destination capability with geographic hierarchy.

**Files:**
```
capabilities/destination/
├── destination.capability.js
├── destination.schema.js
├── destination.events.js
├── destination.manager.js
├── hierarchy/
│   ├── region.manager.js
│   ├── commune.manager.js
│   ├── locality.manager.js
│   └── destination.manager.js
├── README.md
```

**Dependencies:** — (no capability dependencies)

**Registers:** destination

---

### Phase D2 — Place & Experience Layer

Add tourism points and activities.

**Files:**
```
capabilities/destination/
├── places/
│   ├── place.manager.js
│   └── place.category.js
├── experiences/
│   ├── experience.manager.js
│   └── experience.category.js
```

**Dependencies:** destination (D1)

---

### Phase D3 — Community Layer

Visitor memories, reviews, and social participation.

**Files:**
```
capabilities/community/
├── community.capability.js
├── community.schema.js
├── community.events.js
├── community.manager.js
├── memory/
│   ├── memory.manager.js
│   └── memory.moderation.js
├── review/
│   ├── review.manager.js
│   └── review.aggregate.js
└── README.md
```

**Dependencies:** — (no capability dependencies)

**Registers:** community

---

### Phase D4 — Ecology Layer

Ecological profiles and conservation.

**Files:**
```
capabilities/ecology/
├── ecology.capability.js
├── ecology.schema.js
├── ecology.events.js
├── ecology.manager.js
├── profile/
│   ├── profile.manager.js
│   └── profile.scoring.js
├── seal/
│   ├── seal.manager.js
│   └── seal.certification.js
├── conservation/
│   ├── species.manager.js
│   └── area.manager.js
└── README.md
```

**Dependencies:** — (no capability dependencies)

**Registers:** ecology

---

### Phase D5 — Discovery Layer

Search, recommendations, and navigation across ecosystem.

**Files:**
```
capabilities/discovery/
├── discovery.capability.js
├── discovery.schema.js
├── discovery.events.js
├── discovery.manager.js
├── search/
│   ├── ecosystem.search.js
│   └── search.index.js
├── recommendation/
│   ├── destination.recommendation.js
│   └── experience.recommendation.js
├── navigation/
│   ├── category.navigation.js
│   └── map.navigation.js
└── README.md
```

**Dependencies:** destination (D1), community (D3)

**Registers:** discovery

---

### Phase D6 — Integration with Existing Capabilities

Connect ecosystem to existing platform capabilities.

**Modifications:**
- public: Extend to render Destination/Locality pages
- pwa-engine: Extend to generate per-entity PWAs
- seo-intelligence: Extend to handle ecosystem SEO hierarchy
- intelligence: Extend with ecosystem-level analytics
- engagement: Extend with community engagement triggers
- saas: Extend with destination-tier plans
- billing: Extend with destination-tier billing
- admin: Extend with ecosystem administration

---

### Phase D7 — Data Seeding & Testing

Initial data population and ecosystem validation.

**Tasks:**
- Seed region data (Los Ríos)
- Seed destination data (Costa de Valdivia)
- Seed locality data (Los Molinos, Niebla)
- Seed place data (beaches, trails, viewpoints)
- Seed experience data (kayak, trekking, whale watching)
- Test PWA generation per entity
- Test SEO cascade
- Test community features

---

### Phase D8 — Business Integration

Connect existing business tenants to ecosystem.

**Tasks:**
- Map existing tenants to localities
- Add locality/destination references to tenant config
- Test reservation flow within ecosystem context
- Test owner portal with ecosystem data
- Test admin portal with ecosystem management

---

## 10. Coexistence with Existing Architecture

### 10.1. Layer Position

```
L0  Shared
L1  Core (engine)
L2  Providers
L3  Tenant
L4  Capabilities
L5  Plugins
L6  Business Services
L7  Workflows
L8  Automation
L9  Engines
L10 Admin
L11 Destination Ecosystem (NEW)
```

### 10.2. Integration Points

| Layer | Integration |
|-------|-------------|
| L3 (Tenant) | Business tenants reference locality/destination IDs |
| L4 (Capabilities) | destination, community, ecology, discovery capabilities |
| L6 (Business) | Business services orchestrate ecosystem + existing capabilities |
| L7 (Workflows) | Workflow engine handles ecosystem-level workflows |
| L8 (Automation) | Automation rules can trigger on ecosystem events |
| L9 (PWA) | PWA engine generates per-entity PWAs |
| L9 (SEO) | SEO intelligence handles ecosystem SEO hierarchy |
| L10 (Admin) | Admin platform manages ecosystem administration |

### 10.3. Event Flow

```
Destination Event Flow:
  destination:created → seo-intelligence (generate SEO)
  destination:created → pwa-engine (generate PWA)
  destination:updated → discovery (update search index)

Community Event Flow:
  memory:created → community (moderation)
  memory:created → observability (analytics)
  review:created → community (aggregate rating)
  review:created → destination (update reputation)

Ecology Event Flow:
  ecology:updated → destination (update profile)
  seal:granted → destination (display seal)
  seal:revoked → destination (remove seal)

Cross-Capability Flow:
  visitor:arrives → discovery (track visit)
  visitor:views_place → intelligence (analyze interest)
  visitor:makes_reservation → reservation (existing flow)
```

---

## 11. Summary

The Destination Ecosystem Layer transforms Valdi Engine from a reservation SaaS into digital infrastructure for tourism destinations. The territory becomes the center. Businesses are ecosystem participants.

**Key decisions:**
- 4 new capabilities: destination, community, ecology, discovery
- 4-level PWA hierarchy: platform → region → destination → locality
- SEO cascades from region → destination → locality → business
- Data ownership is distributed: platform owns structure, businesses own services, visitors own content
- Ecological seal is a unique differentiator
- Existing capabilities are extended, not replaced

**Result:** A "Pokédex of tourism destinations" where every locality can become an installable PWA with its own identity, content, businesses, and ecological profile.
