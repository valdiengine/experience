# EXPERIENCE_ENGINE_CORE.md

> Experience Engine Core Implementation Documentation

## Overview

The Experience Engine is the composition layer that transforms Platform Core behavior into product experiences. It sits above the certified Platform Core and orchestrates configuration, modules, and capabilities.

## Architecture

```
USER
   ↓
EXPERIENCE ENGINE
   ↓
PRODUCT RESOLVER → ECOSYSTEM LOADER → CONFIGURATION HIERARCHY
   ↓
Platform → Country → Region → Destination → Company → Experience
   ↓
Modules → Capabilities → Platform Core
```

## Core Components

### ExperienceEngine (`experience.engine.js`)

Central orchestrator that:
- Initializes and manages lifecycle
- Coordinates resolvers and loaders
- Composes the final experience context
- Exposes health checks and diagnostics

```javascript
const engine = new ExperienceEngine({ debug: true })
engine.registerResolver('product', new ProductResolver())
engine.registerResolver('ecosystem', new EcosystemResolver())
engine.registerLoader('configuration', new ConfigurationLoader())
engine.setComposition(new ExperienceComposer())

await engine.initialize()
await engine.start()

const context = await engine.resolveAndCompose(request)
```

### ExperienceContext (`experience.context.js`)

Immutable runtime context containing:
- platform, country, region, destination, ecosystem, company
- modules, capabilities
- theme, branding, navigation, SEO
- language, locale
- maps, analytics configuration

### Resolvers

| Resolver | Purpose |
|----------|---------|
| ProductResolver | Resolves products from hostname/subdomain/path |
| EcosystemResolver | Resolves country, region, destination |
| ModuleResolver | Resolves enabled modules |
| CapabilityResolver | Resolves required capabilities |

### Loaders

| Loader | Purpose |
|--------|---------|
| ConfigurationLoader | Loads and merges hierarchical configuration |
| ExperienceLoader | Loads experience-specific configuration |

### Composition

| Composer | Purpose |
|---------|---------|
| ExperienceComposer | Builds theme, branding, navigation, SEO, i18n |

## Configuration Hierarchy

```
Platform Defaults
    ↓
Country Config
    ↓
Region Config
    ↓
Destination Config
    ↓
Company Config
    ↓
Experience
```

## Product Resolution Strategies

1. **Subdomain** (priority 1): `company.valdi.app`
2. **Hostname** (priority 2): `valdi.app`
3. **Path** (priority 3): `/cl/los-rios/valdi`
4. **Query** (priority 4): `?ecosystem=cl-los-rios-valdi`
5. **Header** (priority 5): `X-Ecosystem: cl-los-rios-valdi`

## Module System

Modules are activated through configuration:

```javascript
{
  "enabledModules": [
    "reservations",
    "availability",
    "gallery",
    "media",
    "maps",
    "analytics"
  ]
}
```

### Available Modules

- reservations
- availability
- ecommerce
- quotations
- blog
- tickets
- agenda
- crm
- chat
- payments
- inventory
- notifications
- analytics
- maps
- gallery
- media
- seo
- pwa
- owner-portal
- visitor-portal

## Capability Resolution

Modules map to capabilities:

```javascript
{
  "reservations": ["reservation", "booking"],
  "gallery": ["cms", "media"],
  "maps": ["maps"]
}
```

## Lifecycle Events

```javascript
EXPERIENCE_INITIALIZING
EXPERIENCE_INITIALIZED
EXPERIENCE_RESOLVING
EXPERIENCE_RESOLVED
EXPERIENCE_LOADING
EXPERIENCE_LOADED
EXPERIENCE_COMPOSING
EXPERIENCE_COMPOSED
EXPERIENCE_READY
EXPERIENCE_FAILED
EXPERIENCE_STOPPING
EXPERIENCE_STOPPED
```

## Security

- Tenant isolation enforced through context
- No direct database access (uses Repository pattern)
- No direct storage access (uses Storage Capability)
- No direct media access (uses Media Capability)
- No hardcoded product identities

## Testing

```bash
node experience/experience.test.js
```

All 14 tests pass covering:
- Context building
- Product resolution
- Ecosystem resolution
- Module resolution
- Capability resolution
- Configuration loading
- Experience loading
- Composition
- Multi-destination support
- Tenant isolation
- Configuration inheritance
