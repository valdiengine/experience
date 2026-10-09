# Experience Context Contract

**Version:** 1.0  
**Phase:** P15.3.0  
**Status:** Canonical  

---

## Overview

The `ExperienceContext` is an immutable runtime context object produced by the Experience Engine. It represents the fully resolved and composed experience for a specific product/destination/company request. The Presentation Layer consumes this context without modification.

---

## Canonical Properties

### Identity Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `platform` | `string` | Yes | Platform identifier (e.g., "valdi") |
| `country` | `object` | Yes | Country configuration with code, name, i18n |
| `region` | `object` | Yes | Region configuration with code, name, country |
| `destination` | `object` | Yes | Destination configuration (slug, name, domain, branding, seo, etc.) |
| `ecosystem` | `object` | Yes | Ecosystem identifier and metadata |
| `company` | `object` | No | Company configuration if resolved (may be empty) |
| `tenant` | `object` | No | Tenant identity if available |

### Experience Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `experience` | `object` | Yes | Experience definition (id, type, name, sections, components, modules) |
| `modules` | `string[]` | Yes | Enabled module identifiers |
| `capabilities` | `string[]` | Yes | Enabled capability identifiers |
| `modulesConfig` | `object` | No | Module-specific configuration |

### Presentation Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `theme` | `object` | Yes | Theme configuration (mode, borderRadius, spacing) |
| `branding` | `object` | Yes | Branding (logo, favicon, colors, fonts) |
| `navigation` | `object` | Yes | Navigation structure (header, footer) |
| `seo` | `object` | Yes | SEO metadata (titleTemplate, descriptionTemplate, keywords, ogImage) |
| `i18n` | `object` | Yes | Internationalization (defaultLocale, fallbackLocale, supportedLocales) |
| `maps` | `object` | Yes | Maps configuration (provider, defaultCenter, defaultZoom) |
| `analytics` | `object` | Yes | Analytics configuration (enabled, providers) |

### Request Context

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `language` | `string` | Yes | Current language (default: "es") |
| `locale` | `string` | Yes | Current locale (default: "es-CL") |
| `domain` | `string` | Yes | Request domain |
| `subdomain` | `string` | No | Request subdomain if applicable |
| `request` | `object` | Yes | Original request data (hostname, etc.) |
| `resolution` | `object` | Yes | Resolution metadata (strategy, timestamp) |

### Infrastructure Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `config` | `object` | Yes | Merged configuration hierarchy |
| `providers` | `object` | Yes | Provider configuration (storage, media, maps, analytics) |

---

## Property Classification

### Required vs Optional

**Required (always present):**
- `platform`
- `country`
- `region`
- `destination`
- `ecosystem`
- `experience`
- `modules`
- `capabilities`
- `theme`
- `language`
- `locale`
- `domain`
- `request`
- `resolution`
- `config`
- `branding`
- `navigation`
- `seo`
- `i18n`
- `maps`
- `analytics`
- `providers`

**Optional (may be empty object or undefined):**
- `company`
- `tenant`
- `subdomain`
- `modulesConfig`

### Inherited vs Composed

**Inherited (from configuration hierarchy):**
- `country` (from country config)
- `region` (from region config)
- `destination` (from destination config)
- `company` (from company config)
- `config` (merged hierarchy)

**Composed (processed by Experience Composer):**
- `theme` (merged from defaults + config)
- `branding` (merged from defaults + destination + company)
- `navigation` (merged from defaults + destination)
- `seo` (processed titleTemplate from destination seo)
- `i18n` (merged from country + destination)
- `maps` (from destination)
- `analytics` (from destination)
- `providers` (from destination)
- `experience` (resolved by ExperienceLoader)
- `modules` (resolved by ModuleResolver)
- `capabilities` (resolved by CapabilityResolver)

### Presentation-Relevant Properties

The following properties are intended for direct consumption by the Presentation Layer:

- `experience` (experience type, sections, components)
- `modules` (what modules are enabled)
- `theme` (visual theme configuration)
- `branding` (logo, colors, fonts)
- `navigation` (header, footer)
- `seo` (titleTemplate, description, ogImage)
- `i18n` (locale and language)
- `maps` (map configuration)
- `destination` (destination identity, contact info)
- `company` (company identity if present)

### Internal-Only Properties

The following properties should NOT be consumed directly by Presentation Components:

- `config` — Contains merged platform configuration intended for engine/internal use
- `providers` — Contains internal provider configuration (storage, media, etc.)
- `request` — Contains raw request data
- `resolution` — Contains internal resolution metadata

---

## ExperienceContext Methods

### Query Methods

```javascript
isResolved() → boolean
hasCompany() → boolean
hasModules() → boolean
hasCapability(capabilityId: string) → boolean
hasModule(moduleId: string) → boolean
getModuleConfig(moduleId: string) → object | null
getBranding() → object
getTheme() → object
getLocale() → string
```

### Immutability

```javascript
freeze() → ExperienceContext
seal() → ExperienceContext
```

The context should be frozen or sealed after construction to prevent mutation.

---

## Example ExperienceContext

```javascript
{
  platform: "valdi",
  country: { code: "cl", name: "Chile" },
  region: { code: "los-rios", name: "Los Ríos", country: "cl" },
  destination: {
    slug: "valdi",
    name: "Valdi",
    domain: "valdi.app",
    experienceType: "tourism-directory",
    categories: { tourism: {...}, accommodation: {...}, ... },
    contact: { email: "...", phone: "..." }
  },
  ecosystem: { id: "valdi-platform", name: "Valdi Platform" },
  company: { slug: "albasie", name: "Albasie", destination: "valdi" },
  tenant: { id: "valdi-platform", name: "Valdi Platform" },
  
  experience: {
    id: "tourism-directory",
    type: "directory",
    name: "Tourism Directory",
    sections: ["hero", "search", "categories", "featured", "map", "footer"],
    components: ["search-bar", "category-grid", "business-list", "map-view"],
    modules: ["reservations", "availability", "gallery", "maps", "notifications"]
  },
  modules: ["reservations", "availability", "gallery", "maps", "notifications"],
  capabilities: ["persistence", "media", "storage", "notifications"],
  modulesConfig: {},
  
  theme: { mode: "dark", borderRadius: "8px", spacing: "8px" },
  branding: {
    logo: "/assets/branding/default-logo.svg",
    colors: { primary: "#c8a55c", secondary: "#1a1a2e", accent: "#e8d5a3" },
    fonts: { display: "Inter", body: "Inter" }
  },
  navigation: {
    header: { items: [{ label: "Inicio", path: "/" }, ...] },
    footer: { columns: [...] }
  },
  seo: {
    titleTemplate: "Valdi — Turismo en Valdivia",
    descriptionTemplate: "Descubre los mejores servicios turísticos...",
    keywords: ["valdivia", "turismo", ...],
    ogImage: "/assets/valdi/og-image.jpg"
  },
  i18n: {
    defaultLocale: "es-CL",
    fallbackLocale: "es",
    supportedLocales: ["es-CL", "es", "en", "pt-BR"]
  },
  maps: { provider: "mapbox", defaultCenter: [-39.8197, -73.2459], defaultZoom: 13 },
  analytics: { enabled: true, providers: [] },
  
  language: "es",
  locale: "es-CL",
  domain: "valdi.app",
  subdomain: null,
  request: { hostname: "valdi.app" },
  resolution: { resolvedAt: "2026-08-08T22:00:00.000Z" },
  
  config: { /* merged configuration - internal use */ },
  providers: { storage: "local", media: "local", maps: "mapbox" }
}
```

---

## Presentation Layer Contract

The Presentation Layer receives the `ExperienceContext` and may:

1. Read any property marked as **presentation-relevant**
2. Transform presentation-relevant data into View Models
3. Select and render components based on `experience.sections` and `modules`
4. Apply theme and branding to rendering
5. Use `navigation` for header/footer rendering
6. Use `seo` for metadata rendering

The Presentation Layer must NOT:

1. Modify `ExperienceContext` properties
2. Access `config` or `providers` directly
3. Make independent resolution requests
4. Query databases or storage providers

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-08-08 | Initial contract definition |
