# P15.0 — Multi-Ecosystem Platform Architecture

> **Version:** 1.0.0
> **Date:** 2026-08-06
> **Status:** ARCHITECTURE PROPOSAL
> **Platform:** Valdi Engine v4.0 Compatible
> **Scope:** Architecture Only — No Implementation

---

## 1. Executive Summary

### 1.1 Objective

Design a definitive multi-ecosystem architecture that allows a single certified Platform Core (v4.0) to support:

- Multiple countries
- Multiple regions per country
- Hundreds of destinations
- Thousands of companies per destination
- Unlimited categories
- Unlimited modules

**Without modifying any Platform Core component.**

### 1.2 Core Principle

```
┌─────────────────────────────────────────────────────────────┐
│                    PLATFORM CORE                            │
│           (Immutable — Certified v4.0)                      │
│                                                              │
│  Runtime Engine | Repository | API Layer | Business        │
│  Aggregate | BusinessService | Guardian | Health Engine     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Configuration Only
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   ECOSYSTEM LAYER                           │
│                                                              │
│  Country → Region → Destination → Category → Company        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Platform Core must never change for a new destination.**
**Platform Core must never change for a new company.**
**Platform Core must never change for a new country.**

---

## 2. Directory Structure

### 2.1 Final Directory Layout

```
/
├── platforms/                          # Platform instances
│   └── valdi/                          # Default platform (v4.0 certified)
│       ├── core/                       # Platform Core (READ ONLY — certified)
│       │   ├── runtime/               # Runtime Engine
│       │   ├── repository/            # Repository Engine
│       │   ├── api/                   # API Layer
│       │   ├── capabilities/          # Capability System (34 capabilities)
│       │   ├── guardian/              # Guardian System
│       │   ├── business/              # Business Aggregate
│       │   └── health/                # Health Engine
│       │
│       ├── config/                    # Platform-level config
│       │   ├── platform.config.js     # Platform settings
│       │   ├── defaults.config.js     # Default values
│       │   └── i18n/                 # Platform translations
│       │       ├── es.json
│       │       ├── en.json
│       │       └── pt.json
│       │
│       └── bootstrap/                 # Bootstrap pipeline
│           ├── bootstrap.pipeline.js
│           └── ecosystem.loader.js     # FUTURE: Ecosystem Loader
│
├── ecosystems/                        # Ecosystem configurations
│   ├── .registry/                    # Ecosystem registry (JSON/YAML)
│   │   ├── index.json                # Master ecosystem index
│   │   ├── countries.json            # Country definitions
│   │   └── routing.json             # Domain/subdomain routing
│   │
│   ├── cl/                          # Chile ecosystem
│   │   ├── metadata.json            # Country metadata
│   │   │
│   │   ├── regions/                 # Chilean regions
│   │   │   ├── los-rios/
│   │   │   │   ├── metadata.json
│   │   │   │   │
│   │   │   │   ├── destinations/   # Destinations in Los Ríos
│   │   │   │   │   ├── valdi/     # valdi.valdi.app
│   │   │   │   │   │   ├── config.json
│   │   │   │   │   │   ├── branding.json
│   │   │   │   │   │   ├── categories.json
│   │   │   │   │   │   ├── modules.json
│   │   │   │   │   │   ├── navigation.json
│   │   │   │   │   │   ├── seo.json
│   │   │   │   │   │   ├── maps.json
│   │   │   │   │   │   ├── analytics.json
│   │   │   │   │   │   └── i18n/
│   │   │   │   │   │       └── es.json
│   │   │   │   │   │
│   │   │   │   │   └── natales/   # natales.valdi.app
│   │   │   │   │       ├── config.json
│   │   │   │   │       └── ...
│   │   │   │   │
│   │   │   │   └── coyhaique/
│   │   │   │       └── ...
│   │   │   │
│   │   │   └── magallanes/
│   │   │       ├── metadata.json
│   │   │       └── destinations/
│   │   │           └── puntaarenas/
│   │   │               └── ...
│   │   │
│   │   └── ar/                      # Argentina ecosystem
│   │       ├── metadata.json
│   │       └── regions/
│   │           └── ...
│   │
│   ├── pe/                          # Peru ecosystem
│   │   └── ...
│   │
│   ├── br/                          # Brazil ecosystem
│   │   └── ...
│   │
│   └── template/                    # Ecosystem template
│       ├── metadata.json
│       └── regions/
│           └── _default/
│               └── destinations/
│                   └── _default/
│                       └── config.json
│
├── companies/                        # Company configurations
│   ├── cl/                         # Chilean companies
│   │   ├── los-rios/
│   │   │   ├── valdi/
│   │   │   │   ├── albasie/       # albasie.valdi.cl
│   │   │   │   │   ├── config.json
│   │   │   │   │   ├── branding.json
│   │   │   │   │   ├── modules.json
│   │   │   │   │   ├── team.json
│   │   │   │   │   └── catalog/
│   │   │   │   │       ├── products.json
│   │   │   │   │       └── services.json
│   │   │   │   │
│   │   │   │   ├── secnet/        # secnet.valdi.cl
│   │   │   │   │   └── ...
│   │   │   │   │
│   │   │   │   └── esr-motos/     # esrmotos.valdi.cl
│   │   │   │       └── ...
│   │   │   │
│   │   │   └── natales/
│   │   │       ├── patagonia360/   # patagonia360.natales.cl
│   │   │       └── ...
│   │   │
│   │   └── magallanes/
│   │       └── ...
│   │
│   └── _templates/                  # Company templates
│       ├── tourism/
│       ├── accommodation/
│       ├── restaurant/
│       ├── commerce/
│       └── _default/
│
├── products/                        # Future product configurations
│   ├── drone-services/            # Dronestica product
│   │   └── config.json
│   │
│   ├── tourism-network/           # Future product
│   │   └── config.json
│   │
│   └── _templates/
│
├── shared/                         # Shared Platform assets
│   ├── categories/                # Category definitions (platform-wide)
│   │   ├── tourism.json
│   │   ├── accommodation.json
│   │   ├── restaurant.json
│   │   ├── commerce.json
│   │   └── _template.json
│   │
│   ├── modules/                   # Module definitions (platform-wide)
│   │   ├── reservations.json
│   │   ├── availability.json
│   │   ├── ecommerce.json
│   │   └── _template.json
│   │
│   └── i18n/                     # Shared translations
│       └── _template.json
│
└── uploads/                       # Runtime uploads (per deployment)
    └── {ecosystem}/
        └── {destination}/
            └── {company}/
```

### 2.2 Certified Platform Core Structure (READ ONLY)

```
platforms/valdi/core/           ← CERTIFIED v4.0 (DO NOT MODIFY)
├── runtime/                    # Runtime Engine
├── repository/                 # Repository Engine  
├── api/                        # API Layer (56+ endpoints)
├── capabilities/               # 34 registered capabilities
├── guardian/                   # 9 guardians
├── business/                   # Business Aggregate
└── health/                    # Health Engine
```

### 2.3 Ecosystem Layer Structure

```
ecosystems/                     ← ECOSYSTEM CONFIGURATION
├── .registry/                 # Routing and indexing
├── {country-code}/            # Country (e.g., cl, ar, pe, br)
│   ├── metadata.json         # Country-level config
│   └── regions/
│       └── {region-slug}/
│           └── destinations/
│               └── {destination-slug}/
│                   └── {config-files}
│
companies/                     ← COMPANY CONFIGURATION
└── {country-code}/
    └── {region-slug}/
        └── {destination-slug}/
            └── {company-slug}/
                └── {config-files}
```

---

## 3. Configuration Architecture

### 3.1 Configuration Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 0: PLATFORM                        │
│                    (platforms/valdi/config/)                  │
│                                                              │
│  • Platform ID, version, global settings                     │
│  • Default theme, locale, timezone                          │
│  • Platform-wide capability defaults                         │
│  • i18n translations                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ inherits
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 1: COUNTRY                         │
│                    (ecosystems/{cc}/metadata.json)            │
│                                                              │
│  • Country name, code, flag                                 │
│  • Default region                                            │
│  • Country-specific categories                              │
│  • Country-specific modules                                 │
│  • Default locale, timezone                                 │
│  • Currency, measurement units                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ inherits
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 2: REGION                           │
│                    (ecosystems/{cc}/regions/{rs}/)           │
│                                                              │
│  • Region name, code                                        │
│  • Regional categories (subset of country)                  │
│  • Regional modules (subset of country)                     │
│  • Regional i18n overrides                                  │
│  • Regional SEO defaults                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ inherits
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 3: DESTINATION                     │
│                    (ecosystems/{cc}/.../destinations/{ds}/) │
│                                                              │
│  • Destination name, slug, domain, subdomains                │
│  • Destination branding (logo, colors, fonts)               │
│  • Enabled categories (subset of region)                   │
│  • Enabled modules (subset of region)                      │
│  • Navigation structure                                     │
│  • SEO configuration                                        │
│  • Maps integration                                         │
│  • Analytics setup                                          │
│  • Destination i18n                                         │
│  • Provider configuration                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ inherits
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 4: COMPANY                         │
│                    (companies/{cc}/.../{company-slug}/)      │
│                                                              │
│  • Company name, logo, branding overrides                   │
│  • Company-specific capabilities (subset of destination)     │
│  • Company modules configuration                           │
│  • Company catalog, products, services                      │
│  • Team members                                             │
│  • Company-specific i18n                                   │
│  • Contact information                                      │
│  • Social media                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ activates
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 5: RUNTIME                         │
│                    (Platform Core receives merged config)     │
│                                                              │
│  • Final merged configuration                              │
│  • Activated capabilities                                   │
│  • Registered routes                                       │
│  • Initialized providers                                    │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Configuration File Schemas

#### 3.2.1 Ecosystem Registry (ecosystems/.registry/index.json)

```json
{
  "platform": "valdi",
  "version": "4.0",
  "ecosystems": {
    "cl": {
      "name": "Chile",
      "code": "CL",
      "flag": "🇨🇱",
      "regions": ["los-rios", "magallanes", "aysen", "nioe"],
      "defaultRegion": "los-rios",
      "defaultLocale": "es-CL",
      "currency": "CLP",
      "timezone": "America/Santiago"
    },
    "ar": {
      "name": "Argentina",
      "code": "AR",
      "flag": "🇦🇷",
      "regions": [],
      "defaultLocale": "es-AR",
      "currency": "ARS",
      "timezone": "America/Buenos_Aires"
    },
    "pe": {
      "name": "Peru",
      "code": "PE",
      "flag": "🇵🇪",
      "regions": [],
      "defaultLocale": "es-PE",
      "currency": "PEN",
      "timezone": "America/Lima"
    },
    "br": {
      "name": "Brazil",
      "code": "BR",
      "flag": "🇧🇷",
      "regions": [],
      "defaultLocale": "pt-BR",
      "currency": "BRL",
      "timezone": "America/Sao_Paulo"
    }
  }
}
```

#### 3.2.2 Destination Configuration (ecosystems/{cc}/.../destinations/{ds}/config.json)

```json
{
  "destination": {
    "id": "valdi",
    "slug": "valdi",
    "name": "Valdi",
    "description": "Plataforma de gestión turística",
    
    "geography": {
      "country": "cl",
      "region": "los-rios",
      "coordinates": [-41.7545, -73.1269],
      "boundingBox": {}
    },
    
    "domains": {
      "primary": "valdi.app",
      "www": "www.valdi.app",
      "subdomains": {
        "api": "api.valdi.app",
        "admin": "admin.valdi.app"
      },
      "alternativeDomains": ["valdi.cl", "valdi.losrios.cl"]
    },
    
    "branding": {
      "logo": "/assets/ecosystems/cl/los-rios/valdi/logo.svg",
      "favicon": "/assets/ecosystems/cl/los-rios/valdi/favicon.svg",
      "colors": {
        "primary": "#c8a55c",
        "secondary": "#1a1a2e",
        "accent": "#e8d5a3"
      },
      "fonts": {
        "display": "Cabinet Grotesk",
        "body": "Inter"
      }
    },
    
    "i18n": {
      "defaultLocale": "es-CL",
      "supportedLocales": ["es-CL", "en-US"],
      "fallbackLocale": "es-CL"
    },
    
    "geography": {
      "maps": {
        "provider": "mapbox",
        "defaultCenter": [-41.7545, -73.1269],
        "defaultZoom": 12,
        "style": "mapbox://styles/mapbox/outdoors-v12"
      }
    },
    
    "seo": {
      "defaultTitle": "Valdi — {destination}",
      "defaultDescription": "Gestión turística para {destination}",
      "ogImage": "/assets/ecosystems/cl/los-rios/valdi/og-image.jpg",
      "socialCards": {}
    },
    
    "analytics": {
      "googleAnalytics": "GA4-XXXXXXXX",
      "mixpanel": "MX-XXXXXXXX",
      "hotjar": "HJ-XXXXXXXX"
    },
    
    "enabledCategories": [
      "tourism",
      "accommodation", 
      "restaurant",
      "events",
      "services"
    ],
    
    "enabledModules": [
      "reservations",
      "availability",
      "notifications",
      "ecommerce",
      "owner-portal",
      "visitor-portal"
    ],
    
    "navigation": {
      "header": {
        "items": [
          { "label": "Inicio", "path": "/" },
          { "label": "Explorar", "path": "/explore" },
          { "label": "Reservar", "path": "/booking" },
          { "label": "Nosotros", "path": "/about" }
        ]
      },
      "footer": {
        "columns": [
          { "title": "Explorar", "items": [] },
          { "title": "Empresa", "items": [] },
          { "title": "Legal", "items": [] }
        ]
      }
    }
  }
}
```

#### 3.2.3 Company Configuration (companies/{cc}/.../{company}/config.json)

```json
{
  "company": {
    "id": "albasie",
    "slug": "albasie",
    "name": "Albasie",
    "type": "tourism-operator",
    
    "destination": "valdi",
    
    "branding": {
      "logo": "/assets/companies/cl/los-rios/valdi/albasie/logo.svg",
      "colors": {
        "primary": "#2d5a27",
        "secondary": "#1a1a2e"
      },
      "overrides": {
        "applyDestinationBranding": true,
        "except": ["logo", "primaryColor"]
      }
    },
    
    "contact": {
      "email": "info@albasie.cl",
      "phone": "+56 9 1234 5678",
      "whatsapp": "+56912345678",
      "address": {
        "street": "Calle Principal 123",
        "city": "Puerto Varas",
        "region": "Los Ríos",
        "country": "CL"
      }
    },
    
    "social": {
      "instagram": "https://instagram.com/albasie",
      "facebook": "https://facebook.com/albasie",
      "tripadvisor": "https://tripadvisor.com/albasie"
    },
    
    "enabledCategories": ["tourism", "events"],
    "enabledModules": ["reservations", "availability", "notifications"],
    
    "team": [
      {
        "id": "usr-001",
        "name": "Juan Pérez",
        "role": "Guía Turístico",
        "avatar": "/assets/companies/cl/los-rios/valdi/albasie/team/juan.jpg"
      }
    ],
    
    "catalog": {
      "products": "/assets/companies/cl/los-rios/valdi/albasie/catalog/products.json",
      "services": "/assets/companies/cl/los-rios/valdi/albasie/catalog/services.json"
    }
  }
}
```

---

## 4. Inheritance Model

### 4.1 Inheritance Rules

```
RULE 1: Lower layers override higher layers
  Company → Destination → Region → Country → Platform

RULE 2: Null values trigger inheritance lookup
  If a field is null in Company, inherit from Destination

RULE 3: Arrays are merged (not replaced)
  enabledCategories = destination.categories + company.categories

RULE 4: Objects are deep merged
  branding.colors.primary = company.branding.colors.primary || destination.branding.colors.primary

RULE 5: Explicit override prevents inheritance
  If company sets "overrides": { "primaryColor": true }, use company value exactly
```

### 4.2 Inheritance Resolution Algorithm

```
function resolveConfig(entity, level):
  switch(level):
    case 'company':
      base = loadFrom(companies/{cc}/{region}/{destination}/{company}/)
      parent = resolveConfig(entity, 'destination')
      
    case 'destination':
      base = loadFrom(ecosystems/{cc}/regions/{region}/destinations/{ds}/)
      parent = resolveConfig(entity, 'region')
      
    case 'region':
      base = loadFrom(ecosystems/{cc}/regions/{region}/)
      parent = resolveConfig(entity, 'country')
      
    case 'country':
      base = loadFrom(ecosystems/{cc}/metadata.json)
      parent = resolveConfig(entity, 'platform')
      
    case 'platform':
      base = loadFrom(platforms/valdi/config/defaults.config.js)
      return base
    
  return deepMerge(parent, base, {
    arrayMerge: 'union',
    nullOverride: true,
    explicitOverride: true
  })
```

### 4.3 Merge Priority

```
Priority (highest to lowest):
  1. Company (company config.json)
  2. Destination (destination config.json)
  3. Region (region metadata.json)
  4. Country (country metadata.json)
  5. Platform (platform defaults)
```

### 4.4 Configuration Merge Example

**Platform Default:**
```json
{
  "theme": { "mode": "dark", "borderRadius": "8px" },
  "i18n": { "defaultLocale": "es-CL" },
  "enabledCategories": ["tourism", "accommodation", "restaurant"],
  "enabledModules": ["reservations", "notifications"]
}
```

**Country (Chile):**
```json
{
  "i18n": { "defaultLocale": "es-CL", "supportedLocales": ["es-CL", "en-US"] },
  "currency": "CLP",
  "enabledCategories": ["tourism", "accommodation", "restaurant", "marine"]
}
```

**Destination (Valdi):**
```json
{
  "branding": { "colors": { "primary": "#c8a55c" } },
  "enabledCategories": ["tourism", "accommodation", "restaurant", "events"],
  "enabledModules": ["reservations", "availability", "notifications", "ecommerce"]
}
```

**Company (Albasie):**
```json
{
  "branding": { "colors": { "primary": "#2d5a27" } },
  "enabledModules": ["reservations", "availability"]
}
```

**Final Merged Config (Albasie):**
```json
{
  "theme": { "mode": "dark", "borderRadius": "8px" },
  "i18n": { "defaultLocale": "es-CL", "supportedLocales": ["es-CL", "en-US"] },
  "currency": "CLP",
  "branding": { "colors": { "primary": "#2d5a27", "secondary": "#1a1a2e" } },
  "enabledCategories": ["tourism", "accommodation", "restaurant", "events"],
  "enabledModules": ["reservations", "availability"]
}
```

---

## 5. Configuration Loading Flow

### 5.1 Boot Sequence

```
┌─────────────────────────────────────────────────────────────┐
│                    1. PLATFORM BOOT                         │
│                    (platforms/valdi/core/)                   │
│                                                              │
│  • Load Runtime Engine                                      │
│  • Load Repository Engine                                   │
│  • Load API Layer                                           │
│  • Load Capabilities                                        │
│  • Initialize Guardian                                      │
│  • Initialize Health Engine                                 │
│                                                              │
│  Platform Core is READY                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 2. ECOSYSTEM RESOLUTION                     │
│                 (ecosystem.loader.js)                        │
│                                                              │
│  2.1. Parse request (domain, subdomain, path, tenant)       │
│  2.2. Query Ecosystem Registry                              │
│  2.3. Identify: country, region, destination, company       │
│  2.4. Return Ecosystem Context                              │
│                                                              │
│  Example: albasie.valdi.app →                              │
│    country: cl, region: los-rios, destination: valdi,        │
│    company: albasie                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  3. CONFIGURATION LOADING                     │
│                  (config.loader.js)                          │
│                                                              │
│  3.1. Load Platform Defaults (platforms/valdi/config/)      │
│  3.2. Load Country Config (ecosystems/{cc}/metadata.json)  │
│  3.3. Load Region Config (ecosystems/{cc}/regions/{r}/)   │
│  3.4. Load Destination Config (ecosystems/{cc}/.../{d}/)   │
│  3.5. Load Company Config (companies/{cc}/.../{c}/)         │
│  3.6. Merge with Inheritance Rules                          │
│  3.7. Validate Merged Configuration                         │
│  3.8. Return Final Context                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    4. ECOSYSTEM BOOT                         │
│                    (ecosystem.bootstrap.js)                  │
│                                                              │
│  4.1. Configure TenantManager with merged tenant             │
│  4.2. Configure Provider with ecosystem provider settings    │
│  4.3. Register destination-specific capabilities            │
│  4.4. Configure i18n with locale settings                   │
│  4.5. Configure maps with destination coordinates           │
│  4.6. Configure SEO with destination metadata               │
│  4.7. Initialize analytics                                   │
│  4.8. Register custom navigation routes                     │
│                                                              │
│  Ecosystem is READY                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   5. APPLICATION BOOT                       │
│                   (engine/core/bootstrap.js)                 │
│                                                              │
│  5.1. Initialize with Ecosystem Context                     │
│  5.2. Start UI Layer                                       │
│  5.3. Display Ecosystem-branded Interface                   │
│                                                              │
│  Application is READY                                       │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Configuration Loader Interface

```typescript
interface ConfigurationLoader {
  // Load and merge configuration for an ecosystem context
  loadForEcosystem(context: EcosystemContext): MergedConfiguration;
  
  // Load specific layer only
  loadPlatformDefaults(): PlatformConfig;
  loadCountry(countryCode: string): CountryConfig;
  loadRegion(countryCode: string, regionSlug: string): RegionConfig;
  loadDestination(countryCode: string, regionSlug: string, destSlug: string): DestinationConfig;
  loadCompany(countryCode: string, regionSlug: string, destSlug: string, companySlug: string): CompanyConfig;
  
  // Merge with inheritance rules
  merge(...configs: Configuration[]): MergedConfiguration;
  
  // Validate configuration
  validate(config: Configuration): ValidationResult;
}
```

---

## 6. Product Resolution Architecture

### 6.1 Product Resolver

```
┌─────────────────────────────────────────────────────────────┐
│                   PRODUCT RESOLVER                          │
│                   (product.resolver.js)                     │
│                                                              │
│  Responsibility: Map incoming request to Ecosystem Context   │
│                                                              │
│  Input: HTTP Request                                        │
│    • Host header (domain/subdomain)                        │
│    • URL path                                              │
│    • Query parameters                                      │
│    • Headers (tenant, authorization)                        │
│                                                              │
│  Output: EcosystemContext                                   │
│    • country, region, destination, company                  │
│    • merged configuration                                   │
│    • routing information                                    │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Resolution Strategies

```javascript
const RESOLUTION_STRATEGIES = [
  {
    name: 'subdomain',
    priority: 1,
    match: (request) => {
      // albasie.valdi.app → company: albasie, destination: valdi
      const subdomain = request.hostname.split('.')[0];
      return ecosystemRegistry.findBySubdomain(subdomain);
    }
  },
  {
    name: 'cname',
    priority: 2,
    match: (request) => {
      // albasie.valdi.cl → company: albasie (CNAME to valdi.app)
      return ecosystemRegistry.findByDomain(request.hostname);
    }
  },
  {
    name: 'path',
    priority: 3,
    match: (request) => {
      // valdi.app/cl/los-rios/albasie → company: albasie
      const match = request.path.match(/^\/([a-z]{2})\/([\w-]+)\/([\w-]+)/);
      if (match) {
        return ecosystemRegistry.findByPath({
          country: match[1],
          region: match[2],
          company: match[3]
        });
      }
    }
  },
  {
    name: 'query',
    priority: 4,
    match: (request) => {
      // ?ecosystem=cl-los-rios-valdi-albasie
      const ecosystem = request.query.ecosystem;
      if (ecosystem) {
        return ecosystemRegistry.findBySlug(ecosystem);
      }
    }
  },
  {
    name: 'header',
    priority: 5,
    match: (request) => {
      // X-Ecosystem: cl-los-rios-valdi-albasie
      const ecosystem = request.headers['x-ecosystem'];
      if (ecosystem) {
        return ecosystemRegistry.findBySlug(ecosystem);
      }
    }
  },
  {
    name: 'ip-geo',
    priority: 6,
    match: (request) => {
      // Fallback: use IP geolocation
      const country = geoip.lookup(request.ip)?.country;
      if (country) {
        return ecosystemRegistry.getDefaultForCountry(country);
      }
    }
  },
  {
    name: 'default',
    priority: 99,
    match: (request) => {
      // Final fallback
      return ecosystemRegistry.getDefault();
    }
  }
];
```

### 6.3 Ecosystem Context

```typescript
interface EcosystemContext {
  // Identifiers
  platform: string;           // "valdi"
  country: CountryRef;       // { code: "cl", name: "Chile" }
  region: RegionRef | null;   // { slug: "los-rios", name: "Los Ríos" }
  destination: DestinationRef;// { slug: "valdi", name: "Valdi" }
  company: CompanyRef | null; // { slug: "albasie", name: "Albasie" }
  
  // Routing
  domain: string;             // "albasie.valdi.app"
  subdomain: string | null;   // "albasie"
  pathPrefix: string;         // "/" or "/cl/los-rios/valdi/albasie"
  
  // Configuration
  config: MergedConfiguration;
  
  // Metadata
  resolutionStrategy: string;
  resolvedAt: Date;
}
```

### 6.4 Routing Rules

```
┌─────────────────────────────────────────────────────────────┐
│                    ROUTING RULES                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  {company}.{destination}.{tld}                             │
│  ├── albasie.valdi.app          → Company: Albasie        │
│  ├── patagonia360.natales.app   → Company: Patagonia360   │
│  │                                                         │
│  {destination}.{tld}                                       │
│  ├── valdi.app                   → Destination: Valdi     │
│  ├── natales.app                 → Destination: Natales    │
│  │                                                         │
│  {country}.{tld}                                           │
│  ├── valdi.cl                    → Country: Chile          │
│  ├── valdi.ar                    → Country: Argentina      │
│  │                                                         │
│  {tld}                                                    │
│  ├── valdi.com                   → Platform (no ecosystem) │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  PATH-BASED (for CNAME targets without subdomain)           │
│                                                              │
│  /{country}/{region}/{destination}                          │
│  ├── /cl/los-rios/valdi            → CL, Los Ríos, Valdi  │
│  │                                                         │
│  /{country}/{region}/{destination}/{company}               │
│  └── /cl/los-rios/valdi/albasie   → CL, Los Ríos, Valdi, │
│                                      Albasie               │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Future Ecosystem Loader Integration

### 7.1 Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│               ECOSYSTEM LOADER INTEGRATION                   │
│                   (ecosystem.loader.js)                      │
│                                                              │
│  Integration Points in Bootstrap Pipeline:                  │
│                                                              │
│  1. BEFORE Platform Core Init                               │
│     └─> ecosystemResolver.detect(request)                   │
│         └─> ecosystemContext = { country, region, ... }     │
│                                                              │
│  2. AFTER Platform Core Init                                 │
│     └─> configLoader.loadForEcosystem(context)             │
│         └─> mergedConfig = { ... }                          │
│                                                              │
│  3. AFTER Capabilities Registered                           │
│     └─> capabilityLoader.configureFromEcosystem(mergedConfig)│
│         └─> activate(mergedConfig.enabledModules)          │
│                                                              │
│  4. AFTER UI Manager Init                                   │
│     └─> uiManager.applyEcosystemBranding(mergedConfig)     │
│         └─> theme, colors, fonts, logo                     │
│                                                              │
│  5. AFTER Router Init                                       │
│     └─> router.registerEcosystemRoutes(mergedConfig)        │
│         └─> navigation, SEO routes                          │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Bootstrap Pipeline Modification

```javascript
// platforms/valdi/bootstrap/ecosystem.loader.js

export async function loadEcosystem(request) {
  // Step 1: Resolve ecosystem context
  const resolver = new EcosystemResolver(ecosystemRegistry);
  const context = await resolver.resolve(request);
  
  // Step 2: Load configuration hierarchy
  const loader = new ConfigurationLoader(platformDefaults);
  const config = await loader.loadForEcosystem(context);
  
  // Step 3: Validate configuration
  const validator = new ConfigValidator(schemaRegistry);
  const result = validator.validate(config);
  if (!result.valid) {
    throw new EcosystemConfigError(result.errors);
  }
  
  // Step 4: Return ecosystem context
  return {
    ...context,
    config,
    readyAt: new Date()
  };
}

// Integration into existing bootstrap (NO CHANGES TO CERTIFIED CORE)
export function extendBootstrapPipeline(pipeline) {
  pipeline.addStage({
    name: 'ecosystem',
    before: 'tenant',
    handler: loadEcosystem
  });
}
```

### 7.3 Capability Activation

```javascript
// Based on enabledModules in merged config
const capabilityLoader = new CapabilityLoader(eventBus);

// Map module names to capability IDs
const MODULE_TO_CAPABILITY = {
  'reservations': 'reservation',
  'availability': 'availability',
  'ecommerce': 'booking',
  'notifications': 'notifications',
  'owner-portal': 'owner',
  'visitor-portal': 'visitor',
  'seo': 'seo-intelligence',
  'pwa': 'pwa-engine',
  // ... extensible
};

// Activate capabilities from ecosystem config
for (const moduleName of mergedConfig.enabledModules) {
  const capabilityId = MODULE_TO_CAPABILITY[moduleName];
  if (capabilityId) {
    await capabilityLoader.activate(capabilityId);
  }
}
```

---

## 8. Migration Strategy

### 8.1 Current State

```
CURRENT ARCHITECTURE:
├── engine/core/bootstrap.js      # Hardcoded Dronestica tenant
├── config/product.config.js     # Dronestica-specific config (NEW)
├── data.js                      # Product data (Dronestica)
└── index.html                   # Hardcoded references
```

### 8.2 Target State

```
TARGET ARCHITECTURE:
├── platforms/valdi/core/        # Certified Platform Core (v4.0)
├── ecosystems/                  # Multi-ecosystem configs
│   ├── cl/
│   │   └── los-rios/
│   │       └── valdi/          # Current Dronestica destination
│   └── _templates/
├── companies/                   # Company configs
│   └── cl/
│       └── los-rios/
│           └── valdi/
│               └── dronestica/  # Current Dronestica company
└── config/                      # Platform config (renamed from current)
```

### 8.3 Migration Phases

```
PHASE 1: Infrastructure (P15.1)
├── Create directory structure
├── Create ecosystem registry
├── Create configuration schemas
├── Create configuration loader
└── Create product resolver

PHASE 2: Configuration Migration (P15.2)
├── Migrate Dronestica to destination config
├── Migrate Dronestica company to company config
├── Migrate data.js to company catalog
├── Create Chile ecosystem
├── Create Los Ríos region
└── Validate inheritance model

PHASE 3: Runtime Integration (P15.3)
├── Integrate ecosystem loader into bootstrap
├── Connect capability activation to config
├── Connect theme/branding to config
├── Connect navigation to config
└── Smoke test full pipeline

PHASE 4: Multi-Ecosystem Testing (P15.4)
├── Test new destination creation
├── Test new company creation
├── Test cross-destination features
├── Test country switching
└── Performance testing

PHASE 5: Decommission (P15.5)
├── Remove hardcoded Dronestica from engine/core/
├── Remove legacy config files
├── Remove legacy data.js structure
├── Archive old architecture docs
└── Final validation
```

### 8.4 Backward Compatibility

**During migration, maintain backward compatibility:**

```
WEEK 1-4: Parallel Running
├── Old bootstrap.js still works
├── New ecosystem loader available but optional
├── Flag: ?ecosystem=legacy (uses old config)
└── Flag: ?ecosystem=new (uses new config)

WEEK 5-8: Gradual Migration
├── New ecosystem as default for new users
├── Old config still works for existing tenants
├── Monitoring for issues
└── Performance validation

WEEK 9-12: Full Cutover
├── Old bootstrap removed
├── All tenants on new ecosystem config
├── Old config files archived
└── Platform Core unchanged (Design Freeze respected)
```

### 8.5 Validation Checklist

```
PRE-MIGRATION:
☐ All current features work under new config structure
☐ No data loss in configuration merge
☐ All routes resolve correctly
☐ All capabilities activate from config

DURING MIGRATION:
☐ Zero downtime for existing tenants
☐ Rollback plan documented
☐ Monitoring alerts configured
☐ Communication plan ready

POST-MIGRATION:
☐ All tenants migrated successfully
☐ Performance baseline maintained
☐ No regression in certified components
☐ Documentation updated
```

---

## 9. Compatibility Analysis with Platform v4.0

### 9.1 Certified Components (DO NOT MODIFY)

```
┌─────────────────────────────────────────────────────────────┐
│              CERTIFIED COMPONENTS — v4.0                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✅ Runtime Engine (runtime/)                               │
│  ✅ Repository Engine (repository/)                         │
│  ✅ API Layer (api/)                                        │
│  ✅ Business Aggregate (business/)                          │
│  ✅ BusinessService                                          │
│  ✅ Business Managers (12)                                  │
│  ✅ Capability System (capabilities/)                       │
│  ✅ Capability Loader (capabilities/core/loader.js)         │
│  ✅ Capability Registry (capabilities/core/register.js)     │
│  ✅ Guardian System (guardian/)                            │
│  ✅ Health Engine                                           │
│  ✅ Bootstrap Pipeline (runtime/bootstrap/)                 │
│  ✅ Design Freeze Components (9 frozen)                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Modified Components (Engine/Core — Outside Certification)

```
┌─────────────────────────────────────────────────────────────┐
│              MODIFIED COMPONENTS — UI Layer                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ⚠️  engine/core/bootstrap.js    — Was hardcoded, now       │
│                                      imports from config/    │
│                                                              │
│  ⚠️  engine/core/theme.js       — Uses PLATFORM_CONFIG     │
│                                                              │
│  ⚠️  engine/core/loader.js      — Uses PRODUCT_CONFIG      │
│                                                              │
│  ⚠️  engine/core/engine.js      — Reads from window.DATA    │
│                                                              │
│  ⚠️  index.html                 — Uses data-bind for dynamic│
│                                      values                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 9.3 Extension Points (Where Ecosystem Layer Plugs In)

```
┌─────────────────────────────────────────────────────────────┐
│               EXTENSION POINTS                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. TenantManager.init()                                    │
│     → Receives merged ecosystem config                      │
│                                                              │
│  2. CapabilityLoader.activate()                             │
│     → Activates based on enabledModules                     │
│                                                              │
│  3. UIManager.init()                                        │
│     → Applies ecosystem branding                            │
│                                                              │
│  4. Router.init()                                           │
│     → Registers ecosystem navigation                         │
│                                                              │
│  5. Provider configuration                                  │
│     → Uses ecosystem provider settings                      │
│                                                              │
│  6. ThemeManager.init()                                     │
│     → Uses platform theme config                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 9.4 Compatibility Matrix

```
┌──────────────────────┬──────────────┬──────────────────────┐
│ Component           │ Certification │ Multi-Ecosystem      │
├──────────────────────┼──────────────┼──────────────────────┤
│ Runtime Engine       │ ✅ Certified  │ No changes needed    │
│ Repository Engine   │ ✅ Certified  │ No changes needed    │
│ API Layer           │ ✅ Certified  │ No changes needed    │
│ Business Aggregate  │ ✅ Certified  │ No changes needed    │
│ BusinessService     │ ✅ Certified  │ No changes needed    │
│ Capability System   │ ✅ Certified  │ No changes needed    │
│ Guardian System     │ ✅ Certified  │ No changes needed    │
│ Health Engine       │ ✅ Certified  │ No changes needed    │
│ Bootstrap Pipeline  │ ✅ Certified  │ Extension point only │
│ engine/core/        │ ⚠️  UI Layer  │ Full refactor        │
│ config/             │ 🆕 New       │ New component        │
│ ecosystems/         │ 🆕 New       │ New component        │
│ companies/          │ 🆕 New       │ New component        │
└──────────────────────┴──────────────┴──────────────────────┘
```

---

## 10. Design Freeze Impact Assessment

### 10.1 Design Freeze Components

```
┌─────────────────────────────────────────────────────────────┐
│              DESIGN FREEZE COMPONENTS — P13.8               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Business Aggregate        — FROZEN ✅ NO IMPACT         │
│  2. BusinessService           — FROZEN ✅ NO IMPACT         │
│  3. Business Managers         — FROZEN ✅ NO IMPACT         │
│  4. Repository Engine         — FROZEN ✅ NO IMPACT         │
│  5. Runtime Engine           — FROZEN ✅ NO IMPACT         │
│  6. Capability Registration   — FROZEN ✅ NO IMPACT         │
│  7. Aggregate Ownership       — FROZEN ✅ NO IMPACT         │
│  8. Event Model              — FROZEN ✅ NO IMPACT         │
│  9. API Layer                — FROZEN ✅ NO IMPACT         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Impact Analysis

```
┌──────────────────────┬──────────────┬──────────────────────┐
│ Design Freeze Item   │ Impact      │ Mitigation           │
├──────────────────────┼──────────────┼──────────────────────┤
│ Business Aggregate   │ NONE        │ N/A — Configuration  │
│                     │             │ layer only           │
├──────────────────────┼──────────────┼──────────────────────┤
│ BusinessService      │ NONE        │ N/A — Called with   │
│                     │             │ merged config        │
├──────────────────────┼──────────────┼──────────────────────┤
│ Business Managers    │ NONE        │ N/A — Receive config │
│                     │             │ via context          │
├──────────────────────┼──────────────┼──────────────────────┤
│ Repository Engine    │ NONE        │ N/A — No schema      │
│                     │             │ changes              │
├──────────────────────┼──────────────┼──────────────────────┤
│ Runtime Engine       │ NONE        │ N/A — Pure orchestr.│
├──────────────────────┼──────────────┼──────────────────────┤
│ Capability System    │ NONE        │ N/A — Activation    │
│                     │             │ only, not structure  │
├──────────────────────┼──────────────┼──────────────────────┤
│ Guardian System      │ NONE        │ N/A — Monitors, not │
│                     │             │ modifies             │
├──────────────────────┼──────────────┼──────────────────────┤
│ Health Engine        │ NONE        │ N/A — Read-only     │
├──────────────────────┼──────────────┼──────────────────────┤
│ API Layer           │ NONE        │ N/A — Routes receive │
│                     │             │ config via headers   │
└──────────────────────┴──────────────┴──────────────────────┘
```

### 10.3 Design Freeze Conformance

```
┌─────────────────────────────────────────────────────────────┐
│               DESIGN FREEZE CONFORMANCE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✅ No changes to certified Runtime Engine                   │
│  ✅ No changes to certified Repository Engine                │
│  ✅ No changes to certified API Layer                        │
│  ✅ No changes to certified Business Aggregate               │
│  ✅ No changes to certified BusinessService                  │
│  ✅ No changes to certified Business Managers                │
│  ✅ No changes to certified Capability System                │
│  ✅ No changes to certified Guardian System                  │
│  ✅ No changes to certified Health Engine                   │
│  ✅ No changes to Event Model                               │
│  ✅ No changes to Design Freeze specifications              │
│                                                              │
│  🆕 NEW: Configuration Layer (ecosystems/, companies/)     │
│  🆕 NEW: Ecosystem Loader (platforms/valdi/bootstrap/)    │
│  🆕 NEW: Product Resolver                                  │
│  🆕 NEW: Configuration Loader                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Long-Term Scalability Evaluation

### 11.1 Scalability Targets

```
┌─────────────────────────────────────────────────────────────┐
│                 SCALABILITY TARGETS                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Metric                │ Target        │ Design Supports    │
│  ──────────────────────┼───────────────┼────────────────────│
│  Countries             │ Unlimited     │ ✅ Yes            │
│  Regions per Country   │ Unlimited    │ ✅ Yes            │
│  Destinations         │ 500+         │ ✅ Yes            │
│  Companies per Dest.   │ 1000+       │ ✅ Yes            │
│  Categories            │ Unlimited    │ ✅ Yes            │
│  Modules               │ Unlimited    │ ✅ Yes            │
│  Concurrent Users      │ 100,000+    │ ✅ Yes            │
│  API Requests/day      │ 10M+        │ ✅ Yes            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 11.2 Scalability Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              HORIZONTAL SCALABILITY                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  DESTINATION ISOLATION:                                      │
│  • Each destination is a configuration, not a deployment    │
│  • Destinations share Platform Core                          │
│  • No destination-specific code paths                        │
│  • Configuration is loaded at bootstrap, not at runtime      │
│                                                              │
│  COMPANY ISOLATION:                                          │
│  • Companies are sub-configurations of destinations          │
│  • Company config inherits from destination                 │
│  • No company-specific code paths                            │
│  • Company data isolated via Repository (future multi-tenancy)│
│                                                              │
│  SCALING STRATEGY:                                          │
│  • Read-heavy: CDN for static assets, caching for configs   │
│  • Write-heavy: Database sharding by destination/company    │
│  • Compute: Horizontal scaling of Platform Core instances   │
│  • Config: In-memory cache with invalidation                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 11.3 Configuration Caching Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                 CONFIGURATION CACHING                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Level 1: In-Memory Cache (per instance)                    │
│  └── Hot configs (active destinations)                      │
│                                                              │
│  Level 2: Redis Cache (shared across instances)             │
│  └── Warm configs (recently accessed)                       │
│                                                              │
│  Level 3: File System (JSON/YAML)                          │
│  └── All configs (ecosystems/, companies/)                 │
│                                                              │
│  Level 4: CDN (static assets)                              │
│  └── Logos, branding, i18n                                 │
│                                                              │
│  Invalidation:                                              │
│  • Watch filesystem for config changes                       │
│  • Publish/subscribe for cross-instance invalidation        │
│  • TTL-based expiry as fallback                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 11.4 Performance Budget

```
┌─────────────────────────────────────────────────────────────┐
│                 PERFORMANCE BUDGET                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Configuration Load (cold):                                  │
│  ├── Platform defaults:        < 5ms                       │
│  ├── Country config:           < 10ms                       │
│  ├── Region config:           < 10ms                       │
│  ├── Destination config:      < 20ms                       │
│  ├── Company config:          < 20ms                       │
│  └── Full merge:              < 10ms                       │
│  Total cold start:             < 75ms                      │
│                                                              │
│  Configuration Load (warm):      < 5ms                       │
│                                                              │
│  Ecosystem Resolution:           < 10ms                      │
│                                                              │
│  Memory per Instance:                                      │
│  ├── Platform Core:           ~50MB                         │
│  ├── Config cache (100 dest): ~10MB                         │
│  └── Company configs (1000):   ~5MB                        │
│  Total per instance:           ~65MB                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 12. Deliverables Summary

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | Directory Structure | ✅ Complete (Section 2) |
| 2 | Configuration Architecture | ✅ Complete (Section 3) |
| 3 | Inheritance Model | ✅ Complete (Section 4) |
| 4 | Configuration Loading Flow | ✅ Complete (Section 5) |
| 5 | Product Resolution Architecture | ✅ Complete (Section 6) |
| 6 | Ecosystem Loader Integration Points | ✅ Complete (Section 7) |
| 7 | Migration Strategy | ✅ Complete (Section 8) |
| 8 | Compatibility Analysis with v4.0 | ✅ Complete (Section 9) |
| 9 | Design Freeze Impact Assessment | ✅ Complete (Section 10) |
| 10 | Long-Term Scalability Evaluation | ✅ Complete (Section 11) |

---

## 13. Next Steps

```
┌─────────────────────────────────────────────────────────────┐
│                    RECOMMENDED NEXT STEPS                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  IMMEDIATE (P15.1):                                         │
│  1. Create directory structure                              │
│  2. Implement ecosystem registry (ecosystems/.registry/)    │
│  3. Create configuration schemas (JSON Schema)              │
│  4. Implement ConfigurationLoader class                      │
│  5. Implement ProductResolver class                         │
│                                                              │
│  SHORT-TERM (P15.2):                                        │
│  6. Migrate Dronestica to new structure                    │
│  7. Create Chile ecosystem with Los Ríos region            │
│  8. Create Valdi destination config                        │
│  9. Create Dronestica company config                       │
│  10. Validate inheritance model                             │
│                                                              │
│  MEDIUM-TERM (P15.3):                                       │
│  11. Implement EcosystemLoader                              │
│  12. Integrate into bootstrap pipeline                      │
│  13. Connect capability activation to config                │
│  14. Test full pipeline                                     │
│                                                              │
│  LONG-TERM (P15.4+):                                        │
│  15. Add Argentina, Peru, Brazil ecosystems                │
│  16. Performance optimization                              │
│  17. Multi-destination load testing                         │
│  18. Production deployment                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Appendix A: File Naming Conventions

```
┌─────────────────────────────────────────────────────────────┐
│                 FILE NAMING CONVENTIONS                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CONFIGURATION FILES:                                        │
│  ├── config.json              — Main configuration          │
│  ├── branding.json            — Visual identity             │
│  ├── categories.json          — Category definitions        │
│  ├── modules.json             — Module activation           │
│  ├── navigation.json          — Navigation structure        │
│  ├── seo.json                 — SEO settings                │
│  ├── maps.json                — Map integration             │
│  ├── analytics.json           — Analytics setup            │
│  └── metadata.json           — Registry metadata           │
│                                                              │
│  DIRECTORY NAMING:                                          │
│  ├── Countries: ISO 3166-1 alpha-2 (cl, ar, pe, br)       │
│  ├── Regions: kebab-case (los-rios, magallanes)            │
│  ├── Destinations: kebab-case (valdi, natales)             │
│  ├── Companies: kebab-case (albasie, patagonia360)         │
│                                                              │
│  ECOSYSTEM SLUG FORMAT:                                      │
│  {country}-{region}-{destination}-{company}                 │
│  Example: cl-los-rios-valdi-albasie                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Appendix B: Glossary

```
┌─────────────────────────────────────────────────────────────┐
│                    GLOSSARY                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Platform Core     — Certified v4.0 components (immutable) │
│  Ecosystem         — Country + Regions + Destinations       │
│  Destination      — Application instance (e.g., valdi.app)  │
│  Company          — Business tenant within a destination     │
│  Product          — Product line (e.g., drone-services)     │
│  Category         — Business category (tourism, restaurant)  │
│  Module           — Feature module (reservations, ecommerce) │
│  Configuration    — Declarative settings (JSON/YAML)       │
│  Ecosystem Loader — Component that loads ecosystem config   │
│  Product Resolver — Component that identifies ecosystem     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

*Architecture: P15.0 — Multi-Ecosystem Platform Architecture*
*Platform: Valdi Engine v4.0 Compatible*
*Status: ARCHITECTURE PROPOSAL*
