# Public Presentation Contract

**Phase:** P15.4.2
**Status:** VALIDATED

---

## Overview

Defines the contract between the Public Web Layer and the Presentation Layer.

## Contract Layers

```
Public Web (web/)
        ↓
Presentation Runtime (runtime/experience/presentation.runtime.js)
        ↓
Presentation Core (experience/presentation/)
        ↓
Experience Engine (experience/)
```

## Public Request → Presentation

### Input (from HTTP)
```javascript
{
  hostname: 'valdi.app',
  path: '/',
  headers: { ... }
}
```

### Output (from PresentationRuntime)
```javascript
{
  requestId: 1,
  metadata: {
    destination: 'valdi',
    destinationName: 'Valdi',
    domain: 'valdi.app',
    experience: 'tourism-directory',
    language: 'es',
    locale: 'es-CL'
  },
  identity: { ... },
  destination: { slug: 'valdi', name: 'Valdi', region: 'los-rios' },
  branding: { logo: '...', colors: { ... } },
  navigation: { header: { items: [...] }, footer: { columns: [...] } },
  seo: { title: '...', description: '...' },
  contact: { email: '...', phone: '...' },
  sections: [...],
  components: [...],
  rendered: { branding, navigation, seo, contact }
}
```

## Presentation Boundaries

### Allowed Access
- Branding data (logo, colors)
- Navigation structure
- SEO configuration
- Contact information
- Module/section definitions
- Media URLs (safe references only)

### Forbidden Access
- Database connections
- Storage provider credentials
- Internal configuration objects
- Provider interfaces
- Business logic

## HTML Renderer Contract

### Input
```javascript
presentation  // From PresentationRuntime
request      // HTTP request context
```

### Output
```javascript
htmlString  // Complete HTML document
```

## Component Rendering Contract

### Input
```javascript
viewModel = {
  branding,
  navigation,
  seo,
  contact,
  heroImage,
  services,
  gallery,
  companies,
  footer
}
```

### Output
```javascript
htmlString  // Escaped HTML fragment
```

## Security Rules

1. All dynamic content MUST be escaped
2. URLs MUST be validated against dangerous schemes
3. Internal fields MUST NOT be exposed
4. Credentials MUST NOT be in response
5. Path traversal MUST be prevented
