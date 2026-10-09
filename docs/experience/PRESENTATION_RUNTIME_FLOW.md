# Presentation Runtime Flow

**Version:** 1.0  
**Phase:** P15.3.1  
**Status:** Defined  

---

## Overview

The Presentation Runtime Flow describes how a user request becomes a rendered experience through the entire platform stack.

---

## Complete Flow

```
HTTP REQUEST (Browser)
     ↓
PRODUCT RESOLVER
     ↓
ECOSYSTEM RESOLVER
     ↓
CONFIGURATION LOADER
     ↓
EXPERIENCE LOADER
     ↓
MODULE RESOLVER
     ↓
CAPABILITY RESOLVER
     ↓
EXPERIENCE COMPOSER
     ↓
EXPERIENCE CONTEXT
     ↓
PRESENTATION ADAPTER
     ↓
EXPERIENCE VIEW MODEL
     ↓
COMPONENT RESOLVER
     ↓
COMPONENT REGISTRY
     ↓
RENDERER
     ↓
RENDERED EXPERIENCE
     ↓
HTTP RESPONSE (Browser)
```

---

## Stage Definitions

### 1. HTTP Request

User requests a URL:
```
https://valdi.app
```

### 2. Product Resolver

Resolves hostname to product context:

```javascript
{ hostname: 'valdi.app' }
  ↓
{
  platform: 'valdi',
  destination: 'valdi',
  region: 'los-rios',
  country: 'cl',
  domain: 'valdi.app'
}
```

### 3. Ecosystem Resolver

Resolves ecosystem configuration:

```javascript
{
  platform: 'valdi',
  destination: 'valdi',
  ...
}
  ↓
{
  platform: 'valdi',
  destination: { slug: 'valdi', name: 'Valdi', ... },
  ecosystem: { id: 'valdi-platform' },
  ...
}
```

### 4. Configuration Loader

Loads full destination configuration:

```javascript
{
  destination: 'valdi',
  ...
}
  ↓
{
  destination: { slug: 'valdi', categories: {...}, branding: {...}, ... },
  country: { code: 'cl', name: 'Chile' },
  region: { code: 'los-rios', name: 'Los Ríos' },
  ...
}
```

### 5. Experience Loader

Resolves experience type:

```javascript
{
  destination: { experienceType: 'tourism-directory' },
  ...
}
  ↓
{
  experience: {
    id: 'tourism-directory',
    type: 'directory',
    sections: ['hero', 'search', 'categories', 'featured', 'map', 'footer'],
    components: ['search-bar', 'category-grid', ...],
    modules: ['reservations', 'availability', 'gallery', 'maps', 'notifications']
  }
}
```

### 6. Module Resolver

Resolves enabled modules:

```javascript
{
  destination: { enabledModules: [...] },
  experience: { modules: [...] },
  ...
}
  ↓
{
  modules: ['gallery', 'maps', 'reservations', 'availability', 'notifications']
}
```

### 7. Capability Resolver

Resolves enabled capabilities:

```javascript
{
  modules: ['gallery', 'maps', ...],
  ...
}
  ↓
{
  capabilities: ['persistence', 'media', 'storage', 'notifications']
}
```

### 8. Experience Composer

Composes theme, branding, navigation, SEO:

```javascript
{
  destination: { branding: {...}, navigation: {...}, seo: {...} },
  ...
}
  ↓
{
  theme: { mode: 'dark', ... },
  branding: { logo: '/assets/logo.svg', colors: {...} },
  navigation: { header: {...}, footer: {...} },
  seo: { titleTemplate: '{name} — Tourism', ... }
}
```

### 9. Experience Context

Final composed context:

```javascript
{
  platform: 'valdi',
  destination: { slug: 'valdi', ... },
  ecosystem: { id: 'valdi-platform' },
  company: { slug: 'albasie', ... },
  experience: { id: 'tourism-directory', sections: [...], modules: [...] },
  modules: [...],
  capabilities: [...],
  branding: {...},
  theme: {...},
  navigation: {...},
  seo: {...},
  i18n: {...},
  maps: {...},
  ...
}
```

### 10. Presentation Adapter

Transforms to presentation-safe view model:

```javascript
ExperienceContext
  ↓
{
  identity: { platform: 'valdi', domain: 'valdi.app' },
  destination: { slug: 'valdi', name: 'Valdi', ... },
  experience: { sections: [...], modules: [...] },
  branding: {...},
  theme: {...},
  seo: {...},
  // INTERNAL FIELDS REMOVED: config, providers
}
```

### 11. Experience View Model

Immutable presentation object:

```javascript
ExperienceViewModel {
  destinationSlug: 'valdi',
  experienceType: 'directory',
  experienceSections: ['hero', 'categories', ...],
  hasModule('gallery'): true,
  getBrandingColors(): {...},
  resolveTitle(): 'Valdi — Tourism',
  ...
}
```

### 12. Component Resolver

Resolves which components to render:

```javascript
ViewModel
  ↓
{
  sections: [
    { id: 'hero', name: 'Hero', type: 'section' },
    { id: 'categories', name: 'Categories', type: 'section' },
    ...
  ],
  modules: [
    { id: 'gallery', name: 'Gallery', type: 'module' },
    { id: 'maps', name: 'Maps', type: 'module' },
    ...
  ]
}
```

### 13. Component Registry

Maps IDs to component metadata:

```javascript
{ id: 'hero', name: 'Hero', type: 'section' }
```

### 14. Renderer

Produces renderable structure:

```javascript
{
  meta: { destination: 'valdi', experience: 'tourism-directory' },
  sections: [{ id: 'hero', name: 'Hero', rendered: true }, ...],
  modules: [{ id: 'gallery', name: 'Gallery', rendered: true }, ...],
  branding: { logo: '/assets/logo.svg', colors: {...} },
  navigation: { header: {...}, footer: {...} },
  seo: { title: 'Valdi — Tourism', ... },
  contact: { email: '...', phone: '...' }
}
```

### 15. Rendered Experience

Final HTML/JSON sent to browser.

---

## Boundary Enforcement

### Forbidden at Presentation Layer

```
Presentation → ProductResolver       ❌
Presentation → ConfigurationLoader  ❌
Presentation → Database              ❌
Presentation → Storage Provider      ❌
Presentation → Filesystem           ❌
```

### Allowed

```
ExperienceContext → Presentation Adapter → ExperienceViewModel → Renderer
```

---

## Security

Internal properties never reach the browser:

- `config` — stripped by PresentationAdapter
- `providers` — stripped by PresentationAdapter
- `request` — internal only
- `resolution` — internal only

---

## Multi-Tenant

Each tenant receives a completely isolated context:

```
Tenant A request → Tenant A ExperienceContext → Tenant A Rendered Experience
Tenant B request → Tenant B ExperienceContext → Tenant B Rendered Experience
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-08-08 | Initial documentation |
