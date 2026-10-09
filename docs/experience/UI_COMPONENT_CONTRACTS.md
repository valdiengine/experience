# UI Component Contracts

**Version:** 1.0
**Phase:** P15.5.1
**Status:** DEFINED

---

## Overview

UI components receive data through the `ViewModel` interface and return HTML strings. Components are pure functions with no side effects.

---

## ViewModel Contract

```typescript
interface ViewModel {
  // Identity
  destinationName: string      // "Valdi", "Natales", etc.
  destinationSlug: string      // "valdi", "natales", etc.
  language: string            // "es"
  locale: string              // "es-CL"

  // Branding
  branding: {
    name: string
    logo?: string
    colors?: {
      primary?: string
      secondary?: string
      accent?: string
    }
    fonts?: {
      display?: string
      body?: string
    }
  }

  // Navigation
  navigation: {
    header?: {
      items: Array<{ href: string, label: string }>
    }
    footer?: {
      columns: Array<{
        title: string
        items: Array<{ href: string, label: string }>
      }>
    }
  }

  // SEO
  seo: {
    title?: string
    description?: string
    image?: string
    robots?: string
  }

  // Content
  heroImage?: string
  services: Array<{
    name: string
    description: string
    icon?: string
    href: string
  }>
  gallery: Array<{
    src: string
    alt: string
    caption?: string
  }>
  companies: Array<{
    name: string
    description: string
    logo?: string
    href: string
    location?: string
  }>
  contact: {
    email?: string
    phone?: string
    address?: string
    hours?: string
  }

  // Metadata
  copyright: string
}
```

---

## Component Signatures

### renderHeader(viewModel)

**Input:** ViewModel with `branding`, `navigation.header.items`
**Output:** HTML string
**Requirements:**
- Uses branding.logo for logo image
- Uses navigation.header.items for nav links
- ARIA label on nav element
- Keyboard accessible links

### renderHero(viewModel)

**Input:** ViewModel with `seo.title`, `seo.description`, `heroImage`
**Output:** HTML string
**Requirements:**
- H1 for title
- Gradient background from theme
- Responsive image with alt text

### renderServices(viewModel)

**Input:** ViewModel with `services` array
**Output:** HTML string or empty
**Requirements:**
- Grid layout
- Cards with link wrapping
- Empty state handled

### renderGallery(viewModel)

**Input:** ViewModel with `gallery` array
**Output:** HTML string or empty
**Requirements:**
- Figure/figcaption structure
- Alt text required
- Empty state handled

### renderCompanies(viewModel)

**Input:** ViewModel with `companies` array
**Output:** HTML string or empty
**Requirements:**
- Grid layout
- Logo optional
- Location optional
- Empty state handled

### renderContact(viewModel)

**Input:** ViewModel with `contact` object
**Output:** HTML string or empty
**Requirements:**
- mailto: links for email
- tel: links for phone
- Semantic `<address>` element
- Empty fields not rendered

### renderFooter(viewModel)

**Input:** ViewModel with `branding`, `footer.columns`, `copyright`
**Output:** HTML string
**Requirements:**
- Footer columns from navigation
- Auto-generated year in copyright
- Semantic footer element

---

## Forbidden Patterns

Components MUST NOT:

```javascript
// Access infrastructure
import { pg } from 'pg'
import { Storage } from './storage'

// Hardcode destinations
if (viewModel.destinationSlug === 'valdi') { ... }

// Mutate viewModel
viewModel.foo = 'bar'

// Side effects
console.log(viewModel)
fetch('/api/...')
```

---

## Status

✅ **CONTRACTS DEFINED**