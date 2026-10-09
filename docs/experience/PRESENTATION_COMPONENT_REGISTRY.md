# Presentation Component Registry

**Version:** 1.0  
**Phase:** P15.3.1  
**Status:** Implemented  

---

## Overview

The `ComponentRegistry` maps experience sections and modules to presentation component metadata. It is configuration-driven and contains no destination-specific logic.

---

## Default Registrations

### Sections

| Section ID | Name | Type |
|------------|------|------|
| hero | Hero | section |
| search | Search | section |
| categories | Categories | section |
| featured | Featured | section |
| map | Map | section |
| catalog | Catalog | section |
| booking-form | Booking Form | section |
| company-profile | Company Profile | section |
| about | About | section |
| services | Services | section |
| gallery | Gallery | section |
| testimonials | Testimonials | section |
| pricing | Pricing | section |
| contact | Contact | section |
| footer | Footer | section |
| content | Content | section |
| cta | Call to Action | section |

### Modules

| Module ID | Name | Type |
|-----------|------|------|
| reservations | Reservations | module |
| availability | Availability | module |
| gallery | Gallery | module |
| media | Media | module |
| maps | Maps | module |
| notifications | Notifications | module |
| ecommerce | E-commerce | module |
| payments | Payments | module |
| inventory | Inventory | module |
| blog | Blog | module |
| analytics | Analytics | module |
| pwa | PWA | module |

---

## API

### Registration

```javascript
registry.registerSection('custom-section', { name: 'Custom Section' })
registry.registerModule('custom-module', { name: 'Custom Module' })
```

### Retrieval

```javascript
registry.getSection('hero')    // { id, name, type }
registry.getModule('gallery')  // { id, name, type }
registry.getSection('unknown')  // { id: 'unknown-section', name, type }
registry.getModule('unknown')  // { id: 'unknown-module', name, type }
```

### Batch Retrieval

```javascript
registry.getSections(['hero', 'footer', 'unknown'])
// Returns: [heroSection, footerSection, unknownSection]

registry.getModules(['gallery', 'maps'])
// Returns: [galleryModule, mapsModule]
```

### Checking Existence

```javascript
registry.hasSection('hero')    // true
registry.hasModule('gallery')  // true
registry.hasSection('fake')    // false
```

### Resolution

```javascript
registry.resolve('hero')       // section or null
registry.resolve('gallery')    // module or null
registry.resolve('unknown')    // null
registry.isSection('hero')     // true
registry.isModule('gallery')   // true
```

### Metadata

```javascript
registry.size.sections   // number of sections
registry.size.modules    // number of modules
registry.getAllSections() // array of all sections
registry.getAllModules() // array of all modules
```

---

## Default Fallback

When a section or module is not found, a default is returned:

```javascript
registry.getSection('nonexistent')
// Returns: { id: 'unknown-section', name: 'Unknown Section', type: 'section' }

registry.getModule('nonexistent')
// Returns: { id: 'unknown-module', name: 'Unknown Module', type: 'module' }
```

---

## Usage with ComponentResolver

```javascript
const registry = new ComponentRegistry()
const resolver = new ComponentResolver(registry)
resolver.setViewModel(viewModel)

const { sections, modules } = resolver.resolve()

sections.forEach(section => {
  const component = registry.getSection(section.id)
  render(component)
})
```

---

## Destination Independence

The registry contains NO destination-specific logic:

```javascript
// WRONG - Never do this
registry.registerSection('valdi-hero', { name: 'Valdi Hero' })

// CORRECT - All sections/modules are destination-agnostic
registry.registerSection('hero', { name: 'Hero' })
```

Differences between destinations come from:
- `experience.sections` array
- `modules` array
- `branding` colors/fonts
- `destination` content

---

## Framework Independence

The registry is a pure JavaScript data structure with no UI framework dependencies. It can be used with:
- Vanilla JavaScript
- React
- Vue
- Svelte
- Any framework

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-08-08 | Initial implementation |
