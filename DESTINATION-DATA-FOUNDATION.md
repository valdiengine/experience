# Destination Data Foundation Layer

## 1. Strategic Context

The platform evolves from a reservation-focused SaaS into **digital ecosystem infrastructure for tourism destinations**. The territory becomes the primary entity. Businesses are participants, not owners.

This document defines the foundational data model that will support:

- valdi.app
- natales.app
- chiloe.app
- coyhaique.app
- future destination applications

---

## 2. Core Territorial Hierarchy

```
Tourism Network (platform-level)
  └── Region
        └── Destination
              └── Commune
                    └── Locality
                          └── Place
                                └── Experience
                                      └── Business (tenant)
```

### 2.1. Hierarchy Adjustments

**Adjusted hierarchy from the proposal:**

| Proposed | Adjusted | Reason |
|----------|----------|--------|
| Tourism Network | Tourism Network | Keep — platform-level grouping for multi-destination platforms |
| Region | Region | Keep — administrative and tourism grouping |
| Destination | Destination | Keep — main ecosystem identity |
| Commune | Commune | Keep — administrative territory containing localities |
| Locality | Locality | Keep — strongest community identity layer |
| Place | Place | Keep — tourism points of interest |
| Experience | Experience | Keep — activities, tours, adventures |
| Business | Business Tenant | Keep — existing SaaS tenant model |

**No adjustments needed.** The hierarchy is sound. Each level serves a distinct purpose.

---

## 3. Entity Specifications

### 3.1. Tourism Network

Platform-level grouping for multi-destination platforms.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | yes | Unique identifier |
| name | string | yes | Platform name (e.g., "Valdi Network") |
| slug | string | yes | URL-safe identifier |
| description | string | no | Platform description |
| domains | string[] | yes | Associated domains (valdi.app, natales.app) |
| regionIds | string[] | yes | Contained regions |
| branding | object | no | Global branding defaults |
| seoMetadata | object | no | Platform-level SEO |

**Responsibility:** Owns the platform identity. Contains regions. Defines global defaults for branding, SEO, and configuration.

---

### 3.2. Region

Administrative and tourism grouping.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | yes | Unique identifier |
| name | string | yes | Region name (e.g., "Los Ríos") |
| slug | string | yes | URL-safe identifier |
| networkId | string | yes | Parent network reference |
| country | string | yes | Country code (CL) |
| description | string | no | Region overview |
| coverImage | string | no | Hero image URL |
| categories | string[] | no | Tourism categories available |
| destinationIds | string[] | yes | Contained destinations |
| coordinates | object | no | Center point (lat, lng) |
| seoMetadata | object | no | SEO configuration |

**Region is both administrative and tourism identity.**

| Aspect | Description |
|--------|-------------|
| Administrative | Official geographic boundary, government region |
| Tourism Identity | Marketed as a tourism area with its own character |

Regions have their own SEO and can be searched, but they are not the primary discovery layer. Destinations are the primary discovery layer.

---

### 3.3. Destination

The main tourism ecosystem entity. The center of the platform.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | yes | Unique identifier |
| name | string | yes | Display name (e.g., "Costa de Valdivia") |
| slug | string | yes | URL-safe identifier |
| regionId | string | yes | Parent region |
| description | string | yes | Long-form tourism description |
| heroMedia | object | no | Hero image/video |
| geographicArea | object | no | Boundaries, coordinates, map data |
| categories | string[] | yes | Tourism categories |
| tourismProfile | object | no | Climate, season, accessibility, difficulty |
| ecologyProfileId | string | no | Reference to ecology profile |
| localityIds | string[] | yes | Contained localities |
| businessIds | string[] | yes | Associated businesses |
| pwaConfig | object | no | PWA manifest overrides, theme |
| seoMetadata | object | yes | SEO configuration |
| status | enum | yes | draft, active, archived |

**Destination vs Commune:**

| Aspect | Destination | Commune |
|--------|-------------|---------|
| Purpose | Tourism identity | Administrative territory |
| PWA | Always has own PWA | Only when tourism identity is strong enough |
| Content | Tourism stories, experiences, gallery | Administrative information |
| Branding | Custom theme, colors, logo | Usually default platform branding |
| SEO | Primary tourism SEO | Secondary administrative SEO |
| Discovery | Primary discovery layer | Supporting geographic layer |

A Destination is marketed. A Commune is administered. Valdivia is both a commune and a destination, but they serve different purposes.

---

### 3.4. Commune

Administrative territory that can contain multiple tourism identities.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | yes | Unique identifier |
| name | string | yes | Commune name (e.g., "Valdivia") |
| slug | string | yes | URL-safe identifier |
| regionId | string | yes | Parent region |
| destinationIds | string[] | yes | Associated destinations |
| localityIds | string[] | yes | Contained localities |
| description | string | no | Commune overview |
| coverImage | string | no | Hero image |
| coordinates | object | no | Center point |
| seoMetadata | object | no | SEO configuration |

**Commune PWA rule:**

Communes do **not** always have their own PWA. A commune gets its own PWA only when:

1. It contains 3+ localities with tourism identity
2. It has its own distinct tourism character
3. It is not already represented by a Destination PWA

Most communes are represented through their contained Destinations and Localities. The commune level exists for administrative grouping and geographic navigation, not as a primary tourism identity.

---

### 3.5. Locality

The strongest community identity layer. Where visitors actually spend time.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | yes | Unique identifier |
| name | string | yes | Locality name (e.g., "Los Molinos") |
| slug | string | yes | URL-safe identifier |
| communeId | string | yes | Parent commune |
| destinationId | string | yes | Associated destination |
| description | string | yes | Locality description |
| images | array | yes | Gallery images |
| coordinates | object | yes | Center point |
| history | string | no | Local history narrative |
| categories | string[] | yes | Tourism categories |
| placeIds | string[] | yes | Contained places |
| experienceIds | string[] | yes | Available experiences |
| businessIds | string[] | yes | Associated businesses |
| branding | object | no | Custom colors, logo, theme |
| pwaConfig | object | no | PWA manifest overrides |
| seoMetadata | object | yes | SEO configuration |
| status | enum | yes | draft, active, archived |

**When should a locality become an installable PWA?**

A locality becomes a PWA when it meets **at least 3 of these 5 criteria:**

| Criterion | Threshold |
|-----------|-----------|
| Places | 5+ tourism places registered |
| Businesses | 3+ active business tenants |
| Experiences | 2+ bookable experiences |
| Content | 10+ images, 500+ words of description |
| Visitor Activity | 10+ visitor memories or reviews |

Locality PWAs are the core of the ecosystem. They represent where visitors actually explore, discover, and connect with businesses.

---

### 3.6. Place

Tourism points of interest within a locality.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | yes | Unique identifier |
| name | string | yes | Place name (e.g., "Playa Los Molinos") |
| slug | string | yes | URL-safe identifier |
| type | enum | yes | beach, trail, viewpoint, historical, park, waterfall, market, monument, viewpoint, cave, island |
| localityId | string | yes | Parent locality |
| destinationId | string | yes | Associated destination |
| coordinates | object | yes | Exact location (lat, lng) |
| description | string | yes | Place description |
| images | array | yes | Place imagery |
| categories | string[] | yes | Tourism categories |
| accessibility | object | no | Wheelchair, stroller, difficulty level |
| ecologyInformation | object | no | Environmental notes |
| visitorInteractions | object | no | View count, memory count, review count |
| seoMetadata | object | no | SEO configuration |

**Destination vs Locality vs Place:**

| Aspect | Destination | Locality | Place |
|--------|-------------|----------|-------|
| Scope | Large territory (50-500 km²) | Small area (1-50 km²) | Specific point |
| Identity | Regional tourism brand | Community identity | Single attraction |
| PWA | Always | When criteria met | Never (contained in locality PWA) |
| Content | Stories, overview, gallery | Detail, history, gallery | Description, images |
| Businesses | All in destination | All in locality | Specific to place |
| Examples | Costa de Valdivia | Los Molinos | Playa Los Molinos |

---

### 3.7. Experience

Activities and tours available within the ecosystem.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | yes | Unique identifier |
| name | string | yes | Experience name (e.g., "Kayak en Río Calle-Calle") |
| slug | string | yes | URL-safe identifier |
| type | enum | yes | adventure, cultural, gastronomic, nature, wellness, educational |
| localityId | string | yes | Primary locality |
| destinationId | string | yes | Associated destination |
| description | string | yes | Experience description |
| images | array | yes | Experience imagery |
| duration | string | yes | Duration description |
| difficulty | enum | yes | easy, moderate, difficult, expert |
| season | string[] | yes | Available seasons |
| placeIds | string[] | no | Connected places |
| businessIds | string[] | no | Businesses offering this experience |
| reservationRequired | boolean | yes | Whether reservations are needed |
| priceRange | object | no | Estimated price range |
| seoMetadata | object | no | SEO configuration |

**Experience relationships:**

- Experience **belongs to** Place, Locality, Destination
- Experience **connects with** Businesses (offered by)
- Experience **connects with** Reservations (future)
- Experience **connects with** Availability (future)

---

### 3.8. Business Tenant

Existing SaaS tenant model connected to the ecosystem.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | yes | Tenant ID (existing) |
| name | string | yes | Business name |
| type | enum | yes | accommodation, restaurant, service, transport, guide |
| localityId | string | yes | Primary locality |
| destinationId | string | yes | Associated destination |
| communeId | string | no | Administrative commune |
| regionId | string | no | Administrative region |
| experienceIds | string[] | no | Offered experiences |
| placeIds | string[] | no | Associated places |
| url | string | yes | Business URL |

**Business-territory rules:**

| Rule | Description |
|------|-------------|
| Primary location | A business has one primary locality |
| Multiple localities | A business can list in multiple localities within the same destination |
| Multiple destinations | A business can exist in multiple destinations (separate tenants) |
| Place association | A business can be associated with specific places |
| Experience association | A business can offer specific experiences |

A business does not own a destination. It participates in the destination ecosystem.

---

## 4. Entity Relationship Diagram

```
TourismNetwork 1──* Region
Region 1──* Destination
Region 1──* Commune
Destination 1──* Locality
Destination 1──* Business
Commune 1──* Locality
Locality 1──* Place
Locality 1──* Experience
Locality 1──* Business
Place 1──* Experience
Experience *──* Business
```

### 4.1. Inheritance Rules

| Rule | Description |
|------|-------------|
| SEO cascade | Region → Destination → Locality → Place → Business |
| Branding cascade | Destination → Locality (localities inherit, can override) |
| Category cascade | Place categories roll up to Locality |
| Ecology cascade | Localities roll up to Destination |

### 4.2. Reference Rules

| Rule | Description |
|------|-------------|
| IDs only | Entities reference each other via IDs, not embedded objects |
| Denormalized reads | For performance, frequently-read fields can be denormalized |
| Cascading updates | When a locality name changes, places reference it but don't embed it |

---

## 5. URL Resolution Strategy

### 5.1. URL Patterns

| Entity | Pattern | Example |
|--------|---------|---------|
| Network | `/` | valdi.app |
| Region | `/region/{slug}` | valdi.app/region/los-rios |
| Destination | `/{slug}` | valdi.app/costa-de-valdivia |
| Commune | `/commune/{slug}` | valdi.app/commune/valdivia |
| Locality | `/{slug}` | valdi.app/los-molinos |
| Place | `/{locality-slug}/{place-slug}` | valdi.app/los-molinos/playa-miraflores |
| Experience | `/{locality-slug}/experiencias/{slug}` | valdi.app/los-molinos/experiencias/kayak |
| Business | `/{business-slug}` | valdi.app/cabana-los-molinos |

### 5.2. Resolution Algorithm

```
1. Extract slug from URL path
2. Search in order:
   a. Business tenants (exact match)
   b. Localities (exact match)
   c. Destinations (exact match)
   d. Communes (exact match via /commune/ prefix)
   e. Regions (exact match via /region/ prefix)
   f. Place composite (/{locality}/{place})
   g. Experience composite (/{locality}/experiencias/{experience})
3. If no match → 404
4. If match → resolve entity + context
```

### 5.3. Conflict Resolution

When a slug could match multiple entity types:

| Conflict | Resolution |
|----------|-----------|
| Business slug = Locality slug | Business wins (more specific) |
| Locality slug = Destination slug | Locality wins (more specific) |
| Place composite = Business slug | Business wins |

---

## 6. PWA Hierarchy Strategy

### 6.1. PWA Levels

| Level | Scope | Content | Branding |
|-------|-------|---------|----------|
| Platform | `/` | All destinations, search, navigation | Global Valdi branding |
| Region | `/region/{slug}` | Region overview, destinations | Region defaults |
| Destination | `/{slug}` | Destination detail, localities, places | Destination branding |
| Locality | `/{slug}` | Locality detail, places, businesses | Locality branding |
| Business | `/{slug}` | Business detail, services | Business branding |

### 6.2. PWA Generation Rules

| Entity | Generates PWA? | Condition |
|--------|---------------|-----------|
| Platform | Always | — |
| Region | Optional | When region has strong tourism identity |
| Destination | Always | — |
| Locality | Conditional | When meets 3/5 criteria (see §3.5) |
| Business | Always | Existing business PWA |

### 6.3. PWA Sharing

All entity PWAs share:

- PWA Engine (manifest, service worker, cache, install)
- SEO Engine (metadata, schema, sitemap)
- CMS (content management)
- Communication (notifications, messaging)
- Analytics (observability metrics)

All entity PWAs maintain independent:

- Manifest (name, icons, theme color, start_url)
- Service Worker Cache (tenant-cache-{slug}-v1)
- Offline Pages (entity-specific fallback)
- Install Tracking (per-entity metrics)

### 6.4. PWA Identity

Each entity PWA has its own identity within the ecosystem:

```
Platform PWA
├── valdi.app
├── scope: /
├── theme: Valdi default
└── identity: Platform

Destination PWA
├── valdi.app/costa-de-valdivia
├── scope: /costa-de-valdivia/
├── theme: Costa branding
└── identity: Costa de Valdivia

Locality PWA
├── valdi.app/los-molinos
├── scope: /los-molinos/
├── theme: Los Molinos branding
└── identity: Los Molinos
```

---

## 7. SEO Structure Strategy

### 7.1. SEO Hierarchy

```
Platform
└── "Valdi — Turismo de Destinos"
    └── Region
        └── "Turismo Región de Los Ríos"
            └── Destination
                └── "Turismo Costa de Valdivia — Playas, Naturaleza y Aventura"
                    └── Locality
                        └── "Turismo Los Molinos — Playas y Naturaleza"
                            └── Place
                                └── "Playa Los Molinos — Información, Fotos y Acceso"
                                └── Business
                                    └── "Cabañas Los Molinos — Alojamiento en Los Molinos"
```

### 7.2. Canonical URL Rules

| Entity | Canonical Pattern | Example |
|--------|------------------|---------|
| Region | valdi.app/region/{slug} | valdi.app/region/los-rios |
| Destination | valdi.app/{slug} | valdi.app/costa-de-valdivia |
| Locality | valdi.app/{slug} | valdi.app/los-molinos |
| Place | valdi.app/{locality-slug}/{place-slug} | valdi.app/los-molinos/playa-miraflores |
| Experience | valdi.app/{locality-slug}/experiencias/{slug} | valdi.app/los-molinos/experiencias/kayak |
| Business | valdi.app/{business-slug} | valdi.app/cabana-los-molinos |

### 7.3. Parent-Child SEO

| Parent | Child | Relationship |
|--------|-------|-------------|
| Region | Destination | Region page links to all destinations |
| Destination | Locality | Destination page links to all localities |
| Locality | Place | Locality page links to all places |
| Locality | Experience | Locality page links to all experiences |
| Place | Business | Place page lists associated businesses |

### 7.4. Internal Linking Strategy

Every entity page includes:

| Link Type | Source | Target |
|-----------|--------|--------|
| Breadcrumb | Any entity | Parent entity |
| Related | Destination | Other destinations in region |
| Related | Locality | Other localities in destination |
| Nearby | Place | Other places in locality |
| Offers | Experience | Businesses offering experience |
| Memories | Any entity | Visitor memories for entity |
| Reviews | Any entity | Reviews for entity |

### 7.5. Sitemap Structure

```
sitemap.xml (platform)
├── region/los-rios.xml
│   ├── costa-de-valdivia.xml
│   │   ├── _places.xml (all places in locality)
│   │   ├── _experiences.xml (all experiences)
│   │   ├── _businesses.xml (all businesses)
│   │   └── localities/
│   │       ├── los-molinos.xml
│   │       ├── niebla.xml
│   │       └── curinanco.xml
│   └── ...
├── places.xml (all places across platform)
├── experiences.xml (all experiences across platform)
└── businesses.xml (all businesses across platform)
```

### 7.6. JSON-LD Schema per Entity

| Entity | Schema Type | Properties |
|--------|------------|------------|
| Region | TouristDestination | name, description, geo, image |
| Destination | TouristDestination | name, description, geo, image, touristType |
| Locality | TouristDestination, Place | name, description, geo, image |
| Place | TouristAttraction | name, description, geo, image, address |
| Experience | TouristAttraction, Event | name, description, duration, difficulty, season |
| Business | LocalBusiness, Hotel, Restaurant | name, description, address, priceRange, aggregateRating |

---

## 8. Data Ownership Rules

### 8.1. Ownership Matrix

| Data | Owner | Platform | Destination | Locality | Business | Visitor |
|------|-------|----------|-------------|----------|----------|---------|
| Ecosystem structure | Platform | Create, manage | — | — | — | — |
| Infrastructure | Platform | Maintain | — | — | — | — |
| Destination identity | Destination | Framework | Own | — | — | — |
| Tourism stories | Destination | Store | Own | — | — | — |
| Local history | Locality | Store | — | Own | — | — |
| Local culture | Locality | Store | — | Own | — | — |
| Categories | Platform | Define | Customize | Customize | — | — |
| Business services | Business | — | — | — | Own | — |
| Business availability | Business | — | — | — | Own | — |
| Business pricing | Business | — | — | — | Own | — |
| Reservations | Business | Facilitate | — | — | Own | Participate |
| Visitor memories | Visitor | Store | — | — | — | Own |
| Reviews | Visitor | Store | — | — | Respond | Own |
| Photos (user) | Visitor | Store | — | — | — | Own |
| Ecology data | Platform + Experts | Curate | — | — | Follow | — |
| Ecological seal | Platform | Certify | — | — | Comply | — |

### 8.2. Access Control

| Role | Read | Write | Scope |
|------|------|-------|-------|
| Platform Admin | All entities | Ecosystem structure, SEO, PWA | Global |
| Destination Admin | Destination, localities | Destination identity, stories | Own destination |
| Locality Admin | Locality, places | Locality identity, history | Own locality |
| Business Tenant | Own data, locality data | Own services, availability | Own business |
| Visitor | All public data | Own memories, reviews | Own content |

---

## 9. Tourism Categories System

### 9.1. Hybrid Model

Categories use a **hybrid model**: global platform taxonomy with destination customization.

| Level | Type | Description |
|-------|------|-------------|
| Global | Platform-defined | Core taxonomy shared across all destinations |
| Destination | Customizable | Destinations can add local categories |
| Local | Inherited | Localities inherit from destination, can add specifics |

### 9.2. Global Taxonomy

```javascript
const GLOBAL_CATEGORIES = {
  nature: {
    label: 'Naturaleza',
    subcategories: ['playas', 'bosques', 'rios', 'lagos', 'montañas', 'fauna', 'flora']
  },
  activities: {
    label: 'Actividades',
    subcategories: ['aventura', 'relajacion', 'familia', 'fotografia', 'deportes']
  },
  culture: {
    label: 'Cultura',
    subcategories: ['historia', 'gastronomia', 'tradiciones', 'artes', 'arquitectura']
  },
  experiences: {
    label: 'Experiencias',
    subcategories: ['senderismo', 'kayak', 'avistamiento', 'pesca', 'visitas_guiadas']
  }
}
```

### 9.3. Destination Customization

Destinations can extend the global taxonomy:

```javascript
const costaValdiviaCategories = {
  ...GLOBAL_CATEGORIES,
  local: {
    label: 'Costa de Valdivia',
    subcategories: ['costa', 'rio', 'bosque_valdiviano', 'islas']
  }
}
```

### 9.4. Category Rules

| Rule | Description |
|------|-------------|
| Inheritance | Localities inherit destination categories |
| Extension | Destinations can add local categories |
| No removal | Destinations cannot remove global categories |
| Searchable | All categories are searchable across platform |
| Filterable | All categories filter entities in search |

---

## 10. Geographic Identity Model

### 10.1. Coordinate System

| Property | Type | Description |
|----------|------|-------------|
| lat | number | Latitude (-90 to 90) |
| lng | number | Longitude (-180 to 180) |
| altitude | number | Optional altitude in meters |

### 10.2. Boundary System

| Property | Type | Description |
|----------|------|-------------|
| type | enum | point, polygon, circle |
| coordinates | array | GeoJSON-style coordinate array |
| radius | number | For circle type (meters) |

### 10.3. Map Integration Requirements

| Feature | Requirement |
|---------|-------------|
| Coordinates | All entities with locations must have lat/lng |
| Boundaries | Destinations and localities should have boundary polygons |
| Routes | Experiences can define route polylines |
| Nearby | System must calculate nearby places within radius |
| Maps | Future: Google Maps, OpenStreetMap, Mapbox integration |
| GIS | Future: GIS layers for ecology, conservation, land use |

### 10.4. Geographic Queries

| Query | Description |
|-------|-------------|
| within_radius | Find entities within X km of a point |
| within_boundary | Find entities within a polygon |
| nearest | Find nearest N entities to a point |
| route_along | Find entities along a route |
| cluster | Group entities by proximity |

---

## 11. Future Capability Boundaries

### 11.1. Capability Dependency Graph

```
destination (core)
├── manages: regions, destinations, communes, localities, places
├── depends on: —
└── events: destination:created, destination:updated, locality:created, etc.

discovery (navigation)
├── manages: search, recommendations, exploration
├── depends on: destination, community
└── events: discovery:searched, discovery:recommended, etc.

community (engagement)
├── manages: memories, reviews, comments
├── depends on: —
└── events: memory:created, review:created, etc.

ecology (conservation)
├── manages: ecological profiles, conservation, seals
├── depends on: destination
└── events: ecology:updated, seal:granted, etc.
```

### 11.2. Integration with Existing Capabilities

| Existing Capability | Integration |
|---------------------|-------------|
| public | Extended to render Destination/Locality pages |
| pwa-engine | Extended to generate per-entity PWAs |
| seo-intelligence | Extended to handle ecosystem SEO hierarchy |
| reservation | Unchanged — businesses handle reservations |
| availability | Unchanged — availability at business level |
| intelligence | Extended with ecosystem-level analytics |
| engagement | Extended with community engagement triggers |
| saas | Extended with destination-tier plans |
| billing | Extended with destination-tier billing |
| admin | Extended with ecosystem administration |

### 11.3. Event Flow

```
Destination Created
  → seo-intelligence: generate SEO
  → pwa-engine: generate PWA
  → discovery: add to search index

Locality Created
  → destination: update locality list
  → seo-intelligence: generate locality SEO
  → pwa-engine: generate locality PWA (if criteria met)

Business Connected to Locality
  → destination: update business list
  → discovery: add to search index
  → intelligence: track ecosystem participation

Visitor Memory Created
  → community: moderate content
  → observability: track engagement
  → destination: update memory count

Review Created
  → community: aggregate rating
  → destination: update reputation score
  → discovery: boost entity in recommendations
```

---

## 12. Summary

### 12.1. Entity Count

| Entity | Purpose |
|--------|---------|
| Tourism Network | Platform-level grouping |
| Region | Administrative + tourism grouping |
| Destination | Main tourism ecosystem |
| Commune | Administrative territory |
| Locality | Community identity |
| Place | Tourism points |
| Experience | Activities |
| Business Tenant | Existing SaaS tenants |

**8 entities** define the complete data foundation.

### 12.2. Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Region is both administrative and tourism | Both | Regions need tourism identity for discovery |
| Commune PWA is conditional | Conditional | Most communes are represented through destinations |
| Locality PWA is criteria-based | 3/5 criteria | Ensures quality before generating PWA |
| Categories are hybrid | Global + local | Platform consistency with local flexibility |
| Business has primary locality | Yes | One primary location, can list in multiple |
| SEO cascades from region to business | Yes | Consistent hierarchy for search engines |

### 12.3. Vision

```
Visitor installs valdi.app
  → discovers Costa de Valdivia
    → explores Los Molinos
      → finds Playa Los Molinos
      → discovers Kayak en Río Calle-Calle
      → connects with Cabañas Mar Azul
      → books accommodation
      → returns
      → leaves memory
      → helps preserve the destination
```

The destination is the ecosystem. Businesses are the participants. Technology connects people with places.
