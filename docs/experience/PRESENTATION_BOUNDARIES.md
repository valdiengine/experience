# Presentation Boundaries

**Version:** 1.0  
**Phase:** P15.3.0  
**Status:** Canonical  

---

## Architectural Principle

The Presentation Layer must never become a second Experience Engine. It receives an already-resolved `ExperienceContext` and transforms it into user-facing output.

```
PLATFORM OWNS BEHAVIOR
EXPERIENCE ENGINE COMPOSES BEHAVIOR
PRODUCTS OWN IDENTITY
COMPANIES OWN CONTENT
PRESENTATION OWNS RENDERING
USERS CONSUME EXPERIENCES
```

---

## Mandatory Data Flow

```
HTTP REQUEST
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
PRESENTATION LAYER
     ↓
USER
```

The Presentation Layer must never bypass the Experience Engine.

---

## Forbidden Access Patterns

The Presentation Layer MUST NOT access, import, or interact with:

### Direct Database Access

```
Presentation → PostgreSQL
Presentation → Database SDK
Presentation → Repository
```

**Correct:** Use capabilities via capability adapters.

### Direct Storage Access

```
Presentation → Filesystem
Presentation → S3 SDK
Presentation → R2 SDK
Presentation → Storage Provider
Presentation → StorageManager
```

**Correct:** Access media via asset references in ExperienceContext, resolved through Storage Capability.

### Direct Configuration Access

```
Presentation → ConfigurationLoader
Presentation → FilesystemConfigurationSource
Presentation → Environment Variables (platform secrets)
```

**Correct:** All configuration flows through ExperienceContext.

### Direct Resolution

```
Presentation → ProductResolver
Presentation → EcosystemResolver
Presentation → ModuleResolver
Presentation → CapabilityResolver
```

**Correct:** Resolution is handled by the Experience Engine before context delivery.

### Business Logic

```
Presentation → BusinessService
Presentation → Domain Logic
Presentation → Aggregate
```

**Correct:** Use capabilities for business operations.

---

## Authorized Access Patterns

### Correct: Context Consumption

```
ExperienceContext
     ↓
Presentation Adapter
     ↓
View Model
     ↓
Presentation Components
```

### Correct: Capability Usage

```
UI Component Action
     ↓
Capability Adapter
     ↓
Capability (via Context)
     ↓
BusinessService
```

### Correct: Media Access

```
ExperienceContext.branding.logo
     ↓
URL Reference
     ↓
<img> or appropriate media element
```

NOT: Direct storage provider access.

### Correct: SEO Rendering

```
ExperienceContext.seo
     ↓
<meta> tags, Open Graph, JSON-LD
```

---

## Presentation Layer Responsibilities

### MAY Do

- Transform ExperienceContext into presentation models
- Select visual components based on `experience.sections`
- Select visual components based on `modules`
- Render sections in order defined by `experience.sections`
- Render modules present in `modules` array
- Apply `theme` to presentation
- Apply `branding` (logo, colors, fonts)
- Render `navigation` (header, footer)
- Render `seo` metadata
- Render destination `contact` information
- Render company information if `hasCompany()`
- Handle responsive presentation (desktop/tablet/mobile)
- Manage client-side presentation state
- Handle UI interactions (clicks, forms, navigation)

### MUST NOT Do

- Resolve destinations independently
- Resolve companies independently
- Resolve modules independently
- Resolve capabilities independently
- Query PostgreSQL directly
- Access storage providers directly
- Access filesystem configuration directly
- Modify platform configuration
- Modify ExperienceContext properties
- Mutate business persistence
- Implement business rules owned by Platform Core
- Hardcode destination-specific logic (if domain === "valdi.app"...)
- Hardcode company-specific logic
- Expose internal infrastructure credentials

---

## Destination Isolation Rule

The Presentation Layer must not contain destination-specific logic such as:

```javascript
// FORBIDDEN
if (context.destination.slug === "valdi") {
  renderValdiSpecificUI()
}

if (context.domain === "natales.app") {
  renderNatalesBanner()
}

// CORRECT
context.experience.sections.forEach(section => {
  renderSection(section, context)
})
```

All presentation differences must derive from:
- `experience.type` (tourism-directory, company-profile, etc.)
- `experience.sections` (hero, search, categories, etc.)
- `modules` (reservations, gallery, maps, etc.)
- `theme` / `branding` (colors, fonts, logo)
- `destination` / `company` data (contact info, description)

---

## Module-to-Component Mapping

The Presentation Layer maps modules to UI components:

| Module | UI Component | Capability Boundary |
|--------|--------------|-------------------|
| `reservations` | ReservationComponent | Uses Reservation Capability |
| `availability` | AvailabilityComponent | Uses Availability Capability |
| `gallery` | GalleryComponent | Uses Media Capability |
| `maps` | MapComponent | Uses Maps Provider |
| `notifications` | NotificationComponent | Uses Notification Capability |
| `media` | MediaPlayerComponent | Uses Media Capability |
| `ecommerce` | CommerceComponent | Uses Commerce Capability |
| `payments` | PaymentComponent | Uses Payment Capability |

The UI component renders the module UI but delegates business operations to the appropriate capability.

---

## Section-to-Component Mapping

Experience sections map to presentation components:

| Section | Presentation Component |
|---------|----------------------|
| `hero` | HeroSection |
| `search` | SearchBar |
| `categories` | CategoryGrid |
| `featured` | FeaturedList |
| `map` | MapView |
| `catalog` | ServiceCatalog |
| `booking-form` | BookingWizard |
| `company-profile` | AboutSection |
| `gallery` | ImageGallery |
| `contact` | ContactForm |
| `footer` | FooterSection |

---

## Boundary Violations

The following are architectural violations:

1. **Presentation imports ConfigurationLoader** — Must use ExperienceContext
2. **Presentation imports ProductResolver** — Must not resolve products
3. **Presentation queries database** — Must use capabilities
4. **Presentation accesses filesystem** — Must not
5. **Presentation has domain === "valdi.app" conditionals** — Must use configuration
6. **Presentation stores provider credentials** — Must not
7. **Presentation modifies ExperienceContext** — Must not

---

## Testing Boundaries

### Valid Tests

- Context consumption produces correct View Model
- Destination A renders same as Destination B for same experience type
- Theme/branding correctly applied from context
- Module presence causes correct component rendering
- Module absence causes correct component exclusion
- Navigation renders from context
- SEO metadata renders from context
- Responsive breakpoints handled correctly

### Invalid Tests (not exhaustive)

- Presentation bypasses context to load its own config
- Presentation directly queries database
- Presentation hardcodes destination-specific assertions

---

## Framework Independence

The boundary rules apply regardless of rendering framework:

- Vanilla JavaScript
- React
- Vue
- Svelte
- Flutter Web
- Any future compatible presentation technology

The architectural contract remains framework-agnostic.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-08-08 | Initial boundary definition |
