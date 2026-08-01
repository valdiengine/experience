# Valdi Engine - Agent Rules

## 1. Platform Identity

Valdi Engine is a **multi-tenant tourism ecosystem platform**. It is not only a reservation SaaS.

The platform provides digital infrastructure for tourism destinations where:
- **Destinations** are territories with identity, content, and ecosystems
- **Localities** represent community identity inside destinations
- **Places** are tourism discovery points (trails, viewpoints, restaurants, parks)
- **Experiences** are bookable services offered by businesses
- **Businesses** participate inside destinations as service providers
- **Visitors** are ecosystem explorers who generate content, reviews, and reputation
- **Community** is the visitor-generated knowledge layer (memories, photos, reviews)
- **Ecology** connects tourism with conservation (flora, fauna, citizen science)
- **SaaS services** provide monetization through business tooling

The **territory is the main entity**. Businesses participate inside destinations.
Not the other way around.

Core vision:
- Tourism Network > Region > Destination > Commune > Locality > Place > Experience > Business Tenant
- Each level can have its own PWA, branding, SEO, and community content
- The platform evolves from Reservation SaaS to Destination Digital Infrastructure

---
## 2. Architecture Principles

### 2.1. Capability-Based Architecture

The platform is built as a collection of capabilities - self-contained, independently activatable feature modules.
Each capability extends BaseCapability and follows a standard lifecycle:

REGISTERED > LOADED > ACTIVE > INACTIVE > REGISTERED

Capability contract (from base.capability.js):
- static id: unique identifier (lowercase, hyphens)
- static name: human-readable name
- static version: semver version
- static dependencies: IDs of required capabilities
- init(context, config): initialize with tenant context
- activate(): bring to active state
- deactivate(): pause capability
- destroy(): clean up resources

Context passed to capabilities:
  tenant, dataManager, eventBus, provider, config, capabilities

### 2.2. Business-Agnostic Capabilities

Capabilities never know about tourism, drones, restaurants, or any specific industry.
They only understand: resources, dates, availability, demand, patterns, recommendations.

Industry-specific logic lives in:
- engine/data/ - domain datasets
- Tenant configuration files
- business/services/ - domain services
- Plugins
- shared/ has ZERO business knowledge

### 2.3. Event-Driven Communication

Components communicate through a global EventBus.
Components never import each other directly.

Component A --emit--> EventBus --route--> Component B

### 2.4. DataManager as Persistence Abstraction

The DataManager centralizes all data access: cache, search, filter, validate, normalize.
Providers handle ONLY communication with data sources (JSON, API, CMS).

UI Component > DataManager > Provider > Data Source

### 2.5. EventBus as Communication Layer

The EventBus is the sole communication mechanism between:
- Capabilities
- Engines
- Services
- Components

No direct imports between peers.

### 2.6. context.capabilities.get() for Capability Communication

Capabilities access other capabilities ONLY via: context.capabilities.get('capability-name')
NEVER via direct imports.
ONLY capabilities/core/register.js imports capability classes.
### 2.7. Golden Rules

Never import UP - Lower layers cannot import higher layers
Never import SAME-LEVEL sibling - Use EventBus for cross-engine communication
Cross-engine ONLY via EventBus - Engines never import each other
DataManager ONLY via Providers - DataManager never accesses data sources directly
Shared has ZERO app knowledge - shared/ cannot import from any app layer

---

## 3. Capability Rules

### 3.1. What Each Capability Must Do

- Have isolated responsibility (single domain)
- Declare dependencies explicitly via static dependencies
- Expose public API through {name}.capability.js
- Use schemas for data validation
- Emit events for state changes
- Respect tenant isolation
- Follow lifecycle: init, activate, deactivate, destroy
- Include error handling with try/catch in managers
- Document itself with README.md

### 3.2. Allowed vs Not Allowed

ALLOWED:
- capability -> core (import BaseCapability, schema, events)
- capability -> own internal files (managers, schemas, sub-modules)
- capability -> context.capabilities.get() for cross-capability access

NOT ALLOWED:
- capability A -> capability B direct import
- capability -> shared/ business logic
- capability -> other engine files

### 3.3. File Structure per Capability

Each capability follows this structure:
- {name}.capability.js - Entry point, extends BaseCapability
- {name}.manager.js - Orchestrator, delegates to sub-modules
- {name}.schema.js - Entity schemas and enums
- {name}.events.js - Event definitions
- README.md - Documentation
- sub-modules/ - Domain-specific managers

### 3.4. Registration

All capabilities are registered in capabilities/core/register.js.
This is the SINGLE source of truth.
No other file imports capability classes.

### 3.5. Active Capabilities (22)

ID                  Name                Version  Dependencies
---
booking             Booking             1.0.0    none
notifications       Notifications       2.0.0    none
pwa                 PWA                 1.0.0    none
cms                 CMS Bridge          1.0.0    none
communication       Communication       1.0.0    none
availability        Availability        1.0.0    none
intelligence        Intelligence        1.0.0    availability
scheduler           Scheduler           2.0.0    none
observability       Observability       1.0.0    none
onboarding          Onboarding          1.0.0    none
saas                SaaS                1.0.0    none
reservation         Reservation         2.0.0    booking, availability, communication, notifications
owner               Owner               1.0.0    reservation, availability, communication, observability
engagement          Engagement          1.0.0    communication, availability, observability
conversion          Conversion          1.0.0    communication, engagement, observability
public              Public              1.0.0    cms, pwa, reservation, communication, engagement
seo-intelligence    SEO Intelligence    1.0.0    cms, public, observability, intelligence
pwa-engine          PWA Engine          1.0.0    notifications, communication, public, observability
admin               Admin               1.0.0    reservation, availability, seo-intelligence, pwa-engine, observability, onboarding, saas, billing
billing             Billing             1.0.0    saas
lifecycle           Lifecycle           1.0.0    saas, billing, communication, onboarding, observability
community           Community           1.0.0    none
exploration         Exploration         1.1.0    none
---

## 4. Core Platform Layers

### 4.1. Layer Hierarchy (L0-L11)

L0  Shared          - Utilidades, constantes, schemas, eventos
L1  Core            - Boot, routing, theme, data access, event bus
L2  Providers       - Abstraccion de fuentes de datos
L3  Tenant Manager  - Configuracion por proyecto, resolucion de motores
L4  Capabilities    - Modulos de funcionalidad
L5  Plugins         - Preocupaciones transversales
L6  Business        - Logica de dominio (reservas, pagos, notificaciones)
L7  Workflows       - Ejecucion de flujos visuales multi-paso
L8  Automation      - Reglas basadas en eventos
L9  Engines         - Subsistemas especializados (Experience, Reservation, Notification, PWA, Admin)
L10 Admin           - Panel de gestion para operaciones de negocio
L11 Destination     - Ecosistema de destinos turisticos (community, ecology, discovery)

### 4.2. Core Platform (L1)

- bootstrap.js - DOMContentLoaded, init sequence
- app.js - Boot orchestrator
- eventbus.js - App-level EventBus singleton
- datamanager.js - Data access via Providers only
- router.js - Hash-based SPA routing
- loader.js - Loading screen
- theme.js - Dark/light manager

### 4.3. Engines (L9)

- Experience Engine - Main website, public pages, components, animations
- Reservation Engine - Booking flow, calendar, time slots, form, confirmation
- Notification Engine - Multi-channel: email, SMS, push, in-app
- PWA Engine - Service worker, offline support, installability
- Admin Engine - Management dashboard, CRUD, analytics

### 4.4. Business Layers

- Reservation - Availability, booking, confirmation, cancellation
- Availability - Slot management, intelligence layer, demand analysis
- Communication - Email, SMS, WhatsApp, push, chat providers
- Notifications - Templates, scheduling, batching, rate limiting
- Engagement - Campaign orchestration, journey management
- Intelligence - Demand analysis, patterns, recommendations
- Billing - Invoicing, payment tracking, subscription billing
- SaaS - Product catalog, plans, entitlements, feature flags
- Lifecycle - Customer health, churn prediction, retention
- Community - Visitor profiles, memories, reviews, reputation

### 4.5. Destination Layers (L11)

- Destination Data - Regions, destinations, communes, localities, places, experiences
- Community - Visitor-generated content and reputation
- Ecology - Flora, fauna, conservation (future)
- Gamification - Eco-badges, challenges (future)
---

## 5. Multi-Tenant Rules

### 5.1. Tenant Isolation

Every business, destination, locality or organization MUST be isolated.
No data leakage between tenants.

All queries require:
- tenantId parameter, OR
- entity ownership context

### 5.2. Tenant Resolution

TenantManager resolves current tenant via (in order):
1. URL parameter (?tenant=xxx)
2. Subdomain (xxx.valdi.app)
3. Path segment (/xxx/)
4. localStorage
5. Default tenant

### 5.3. Tenant Config

Each tenant has independent configuration:
- Branding (colors, logo, theme)
- Active capabilities
- Provider configuration
- Limits and entitlements
- SEO metadata
- PWA configuration

### 5.4. Data Isolation

- DataManager queries are scoped to current tenant
- Providers filter by tenantId
- Cross-tenant data access requires explicit admin context
- No global queries without tenant filter
---

## 6. SaaS Product Rules

### 6.1. Product Levels

The platform supports multiple product tiers:

1. Free presence - Basic listing
2. Basic digital presence - Standard profile
3. Business plans - Reservations, notifications
4. Advanced websites - PWA, SEO, analytics
5. Premium landing pages - Custom domains, branding
6. Web applications - Full booking engine
7. SaaS platform - Multi-tenant admin
8. Destination ecosystem products - Territory-level infrastructure

### 6.2. Plans Control Access, Not Logic

Plans control:
- Which capabilities are enabled
- Usage limits (bookings, notifications, storage)
- Feature availability
- Support tier

Plans do NOT contain business logic.
Entitlements control access.

### 6.3. Plan Structure

Plans have:
- id, name, description
- capabilities: which capabilities are active
- limits: numeric caps per billing period
- features: boolean feature flags
- pricing: monthly/annual amounts

### 6.4. Upgrade Flow

Upgrades are managed by the upgrade manager.
Downgrades respect active usage before applying.
Trial periods use lifecycle.trial capability.
---

## 7. Tourism Ecosystem Rules

### 7.1. Domain Hierarchy

Tourism Network
  +-- Region
    +-- Destination
      +-- Commune
        +-- Locality
          +-- Place
            +-- Experience
              +-- Business Tenant

### 7.2. Entity Roles

Destination - The ecosystem identity. Owns the territory.
Locality - Represents community identity within a destination.
Place - A tourism discovery point (trail, viewpoint, beach, restaurant).
Experience - A bookable service or activity.
Business Tenant - A service provider operating inside the ecosystem.
Visitor - An ecosystem participant who generates content.

### 7.3. Territory Is Center

The platform is territory-first, not business-first.
- Destinations contain localities, places, experiences
- Businesses participate inside destinations
- Visitors explore destinations and generate community content
- Community content (memories, reviews) belongs to the visitor
- Ecology connects tourism with conservation

### 7.4. SEO Cascade

SEO flows down the hierarchy:
Platform > Region > Destination > Locality > Place > Experience > Business

Each entity owns its metadata, schema.org, canonical URL, sitemap entry.

### 7.5. URL Resolution

Entity URLs follow the hierarchy:
- /costa-de-valdivia (destination)
- /costa-de-valdivia/los-molinos (locality)
- /costa-de-valdivia/los-molinos/playa-negra (place)
- /costa-de-valdivia/los-molinos/playa-negra/surf-lesson (experience)
---

## 8. PWA Rules

### 8.1. Every Entity Can Be a PWA

Every relevant entity in the hierarchy can become an installable PWA:
- valdi.app (platform root)
- valdi.app/costa-de-valdivia (destination)
- valdi.app/costa-de-valdivia/los-molinos (locality)
- valdi.app/business-name (business tenant)

### 8.2. Per-PWA Configuration

Each PWA has:
- Own manifest.json (name, icons, theme, start_url)
- Own branding (colors, logo, fonts)
- Own cache scope (service worker boundaries)
- Own SEO identity (meta tags, schema.org)
- Own analytics scope

### 8.3. Shared Infrastructure

All PWAs share:
- PWA Engine capability (service worker management)
- SEO Intelligence capability (metadata generation)
- CMS capability (content source)
- Communication capability (notifications)

### 8.4. PWA Engine Capabilities

- Manifest generation per tenant
- Service worker registration and update
- Cache strategy configuration
- Install prompt management
- Offline page fallback
- Multi-tenant cache isolation
---

## 9. SEO Rules

### 9.1. SEO Hierarchy

SEO cascades down the tourism hierarchy:
Platform > Region > Destination > Locality > Place > Experience > Business

### 9.2. Required Per Entity

Every entity in the hierarchy requires:
- title tag (unique, keyword-rich)
- meta description (unique, compelling)
- canonical URL (self-referencing)
- schema.org structured data (JSON-LD)
- Open Graph tags (og:title, og:description, og:image)
- Sitemap inclusion (xmlsitemap)
- Internal linking (breadcrumbs, related entities)

### 9.3. SEO Intelligence Capability

The seo-intelligence capability provides:
- Content analysis (title, description, keyword density)
- Metadata analysis (completeness, uniqueness)
- Schema.org validation
- Internal link analysis and recommendations
- Keyword tracking
- Sitemap generation and management

### 9.4. Content Management

- CMS provides source content
- SEO Intelligence analyzes and recommends
- Public capability renders with SEO metadata
- PWA Engine ensures SEO-friendly URLs
---

## 10. Community Rules

### 10.1. Visitors Are Participants

Visitors are ecosystem participants, not just consumers.
They generate content, build reputation, and contribute community knowledge.

### 10.2. Community Content

The community layer includes:
- Memories - Visitor stories connected to territories (photos, text, tips)
- Reviews - Structured ratings (1-5 stars) of any ecosystem entity
- Interactions - Likes, follows, helpful votes
- Visit Events - Tracking visitor exploration patterns
- Reputation Scores - Points earned through participation
- Badges - Achievement markers for contribution milestones

### 10.3. Content Ownership

Visitor-generated content belongs to the visitor.
The platform hosts it, but the visitor owns it.
Content can be exported, deleted, or transferred.

### 10.4. Moderation Required

All community content enters a moderation queue before appearing publicly.
Moderation workflow: pending > approved/rejected/flagged
Moderation is managed by the community.moderation sub-module.

### 10.5. Reputation System

Reputation levels (from community capability):
Level 1: Explorador (0 points)
Level 2: Viajero (50 points)
Level 3: Aventurero (150 points)
Level 4: Guardian (350 points)
Level 5: Embajador (700 points)

Points earned:
- Create memory: +10
- Write review: +5
- Helpful vote received: +2
- Visit verified place: +3
- Upload photo: +1
- Post comment: +1

### 10.6. Cross-Module Workflow

When a memory is created:
1. memory.created event emitted
2. Community manager queues for moderation
3. On approval: reputation points awarded
4. Analytics metrics updated
5. Observability metrics sent
---

## 11. Ecology Rules

### 11.1. Future Ecosystem Direction

The platform connects tourism with conservation.
Tourism and ecology are not separate concerns - they are intertwined.

### 11.2. Ecology Capabilities (Planned)

- Flora Discovery - Cataloging and mapping local plant species
- Fauna Discovery - Wildlife observation and tracking
- Citizen Science - Visitor-contributed ecological data
- Conservation Actions - Volunteer opportunities, clean-up events
- Ecological Reputation - Points for ecological contributions
- Ecological Seals - Certification for eco-friendly businesses

### 11.3. Territory Ecology Profile

Each destination and locality has an ecology profile containing:
- Flora species catalog
- Fauna species catalog
- Conservation status
- Protected areas
- Ecological tourism opportunities
- Conservation partner organizations

### 11.4. Business Ecology Integration

Businesses can earn ecological reputation by:
- Participating in conservation actions
- Implementing sustainable practices
- Contributing citizen science data
- Earning ecological seals
---

## 12. Development Rules

### 12.1. Before Creating a New Capability

Check these questions first:
1. Does this functionality already exist?
2. Can it belong to an existing capability?
3. Does it require a new capability?
4. Are dependencies correct?
5. Does it respect tenant isolation?

### 12.2. Avoid Unnecessary Capabilities

- Prefer extending existing capabilities over creating new ones
- Each new capability adds complexity to the dependency graph
- New capabilities must be registered in register.js
- New capabilities must have README.md documentation

### 12.3. File Rules

- Archivos: kebab-case.js
- Clases: PascalCase
- Funciones/variables: camelCase
- Constantes: UPPER_SNAKE_CASE
- CSS classes: kebab-case con prefijo del dominio
- Un archivo = una responsabilidad
- Managers separados por dominio

### 12.4. Code Rules

- Usar class syntax (nunca function constructors)
- Heredar de BaseCapability para capabilities
- Siempre import/export (nunca require)
- Usar async/await para operaciones async
- Envolver en try/catch cuando haya side effects
- Definir eventos en archivos dedicados (*.events.js)
- Validar inputs en managers, no en capabilities
- Retornar objetos de error consistentes: { success, data, error }

### 12.5. CSS Rules

- Cinematic: Dark backgrounds, gold/amber accents, glassmorphism
- Typography: Cabinet Grotesk (display), Inter (body), JetBrains Mono (data)
- Glassmorphism: backdrop-filter blur(12px), rgba backgrounds
- Animations: ease-in-out, transitions 200-400ms
- Shadows: 0 8px 32px rgba(0,0,0,0.3)
- Borders: 1px solid rgba(212,160,83,0.2)
- Card hover: transform translateY(-2px)
- Border radius: 12px cards, 8px inputs, 16px modals

### 12.6. Prohibitions

1. NO usar require() - solo import/export
2. NO importar un capability desde otro - usar EventBus
3. NO hardcodear valores de configuracion
4. NO crear dependencias circulares
5. NO modificar archivos de shared/ para logica de negocio
6. NO usar var - solo const o let
7. NO crear archivos sin export
8. NO usar alert() o console.log() en produccion
9. NO mezclar logica de UI con logica de datos
10. NO crear GOD objects (una clase que haga todo)
11. NO saltar validacion de inputs
12. NO ignorar errores silenciosamente
13. NO crear archivos vacios ni placeholders sin logica
14. NO usar variables globales
15. NO mutar objetos pasados como parametros
---

## 13. Final Platform Status

### 13.1. Completed Capabilities

The platform contains:
- Multi-tenant architecture with tenant isolation
- SaaS architecture with plans, entitlements, feature flags
- Reservation system (booking, availability, confirmation)
- Communication system (email, SMS, WhatsApp, push, chat)
- Intelligence layer (demand analysis, recommendations)
- Automation engine (event-driven rules, workflows)
- PWA generation (per-tenant manifests, service workers)
- Admin platform (20 files, tenant management)
- Tourism ecosystem foundation (destinations, localities, places)
- Community layer (visitors, memories, reviews, reputation)
- Observability (metrics, health monitoring, alerts)
- Lifecycle management (customer health, churn prediction)
- Billing infrastructure (invoicing, payments, subscriptions)

### 13.2. Unregistered Orphan Files

These files exist on disk but are NOT in register.js:
- capabilities/catalog/catalog.capability.js (superseded by public + booking)
- capabilities/gallery/gallery.capability.js (superseded by public renderer)
- capabilities/payments/payments.capability.js (superseded by billing)
These can be safely removed.

### 13.3. Future Development Focus

- Ecology layer (flora, fauna, conservation)
- Gamification (eco-badges, challenges)
- Destination intelligence (visitor patterns, demand prediction)
- Real integrations (APIProvider, CMSProvider)
- Production deployment
- Backend API integration
- Authentication system
- Email transactional (SendGrid, SES)
- Analytics real-time
- Multi-idioma (i18n)
- Testing automatizado
- CI/CD pipeline

### 13.4. Verification

After making changes, verify:
- All imports resolve correctly
- No circular dependencies
- All files have exports
- Managers have error handling
- Events are in dedicated files
- Capability is registered in register.js
- README.md is included
