# Presentation View Model

**Version:** 1.0  
**Phase:** P15.3.1  
**Status:** Implemented  

---

## Overview

The `ExperienceViewModel` is a presentation-safe, immutable value object derived from `ExperienceContext` via `PresentationAdapter`. It provides convenient accessor methods for rendering without exposing internal engine properties.

---

## Design Principles

1. **Immutable** — Cannot be modified after construction
2. **Derived** — Always created from ExperienceContext, never a source of truth
3. **Presentation-focused** — Only exposes rendering-relevant data
4. **Convenient** — Provides helper methods for common operations

---

## Constructor

```javascript
const vm = new ExperienceViewModel(adaptedData)
```

---

## Properties

### Identity

```javascript
vm.identity           // { platform, domain, subdomain, language, locale }
vm.platform          // 'valdi'
vm.domain            // 'valdi.app'
vm.language          // 'es'
vm.locale            // 'es-CL'
```

### Destination

```javascript
vm.destination       // { slug, name, description, domain, country, region, ... }
vm.destinationSlug   // 'valdi'
vm.destinationName   // 'Valdi'
```

### Experience

```javascript
vm.experience        // { id, type, name, description, sections, components, modules }
vm.experienceId      // 'tourism-directory'
vm.experienceType    // 'directory'
vm.experienceSections // ['hero', 'categories', 'footer']
vm.experienceComponents // ['hero', 'category-grid']
```

### Modules & Capabilities

```javascript
vm.modules           // ['gallery', 'maps', 'reservations']
vm.capabilities     // ['persistence', 'media']

vm.hasModule('gallery')      // true
vm.hasModule('nonexistent')  // false
vm.hasCapability('persistence') // true
```

### Branding

```javascript
vm.branding          // { logo, favicon, colors, fonts }
vm.getBrandingLogo() // '/assets/logo.svg'
vm.getBrandingColors() // { primary: '#c8a55c', secondary: '#1a1a2e', accent: '#e8d5a3' }
```

### Theme

```javascript
vm.theme             // { mode, borderRadius, spacing }
vm.getTheme()       // { mode: 'dark', borderRadius: '8px', spacing: '8px' }
```

### Navigation

```javascript
vm.navigation        // { header: { items }, footer: { columns } }
vm.getNavigation()   // { header, footer }
```

### SEO

```javascript
vm.seo               // { titleTemplate, descriptionTemplate, keywords, ogImage }
vm.getSEO()          // full SEO object
vm.resolveTitle()    // 'Valdi — Tourism' (substituted)
```

### Contact

```javascript
vm.contact           // { email, phone, address }
vm.getContact()      // contact object
```

### Company

```javascript
vm.company           // { slug, name, description, ... } or null
vm.hasCompany()      // true if company exists
```

### Metadata

```javascript
vm.metadata          // { resolvedAt, isResolved, hasCompany, hasModules }
vm.isResolved()      // true if context is resolved
```

---

## Methods

### Query Methods

```javascript
vm.hasModule(moduleId)      // boolean
vm.hasCapability(capId)    // boolean
vm.hasCompany()            // boolean
vm.isResolved()            // boolean
```

### Accessor Methods

```javascript
vm.getBrandingLogo()       // string
vm.getBrandingColors()     // { primary, secondary, accent }
vm.getTheme()             // { mode, borderRadius, spacing }
vm.getSEO()               // { titleTemplate, ... }
vm.getNavigation()        // { header, footer }
vm.getContact()          // { email, phone, address }
```

### Resolution Methods

```javascript
vm.resolveTitle()          // string with template variables substituted
```

### Serialization

```javascript
vm.toJSON()               // plain object copy
vm.freeze()               // makes immutable (idempotent)
vm.isFrozen()            // boolean
```

---

## Internal Properties (Not Exposed)

The following are explicitly NOT exposed by ExperienceViewModel:

| Property | Reason |
|----------|--------|
| `config` | Contains internal platform configuration |
| `providers` | Contains internal provider configuration |
| `request` | Raw request data |
| `resolution` | Internal resolution metadata |

---

## Example Usage

```javascript
import { PresentationAdapter } from './presentation.adapter.js'
import { ExperienceViewModel } from './presentation/experience.view-model.js'

// Transform context to view model
const adapter = new PresentationAdapter()
const adapted = adapter.adapt(experienceContext)
const viewModel = new ExperienceViewModel(adapted)

// Use in rendering
const sections = viewModel.experienceSections
const enabledModules = viewModel.modules.filter(m => viewModel.hasModule(m))
const branding = viewModel.getBrandingColors()
const title = viewModel.resolveTitle()
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-08-08 | Initial definition |
