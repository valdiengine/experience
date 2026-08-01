# Public Experience Capability

**Version:** 1.0.0
**Status:** Stable
**Dependencies:** cms, pwa, reservation, communication, engagement

## Purpose

Public experience and discovery layer for tenant-facing pages. Manages rendering, navigation, SEO, and PWA integration.

## Architecture

```
public.capability.js  → PublicManager → PageRenderer
                                       → SectionRenderer → ComponentRenderer
                                       → MenuManager
                                       → RouteManager
                                       → MetadataManager → SchemaGenerator
                                       → SitemapManager
```

## Modules

### PageRenderer
- Renders complete pages into containers
- Applies SEO metadata on render
- Handles page lifecycle events

### SectionRenderer
- Renders section types: hero, gallery, carousel, services, booking, testimonials, contact, map, about, pricing, faq, custom
- Delegates component rendering to ComponentRenderer

### ComponentRenderer
- Bridge to `engine/components/` — no duplication
- Maps: gallery, carousel, lightbox, configurator, expanded-view, format-explorer, card
- Falls back to HTML rendering if engine components unavailable

### MenuManager
- Dynamic tenant menus from config
- Supports nested items, footer navigation
- Default menu: Inicio, Servicios, Galería, Reservar, Contacto

### RouteManager
- Tenant-aware route resolution (/tenant/slug)
- Hash-based routing with listener pattern
- URL building utilities

### MetadataManager
- Title, description, OG tags, Twitter cards
- Auto-generates from page content
- Manages canonical URLs

### SchemaGenerator
- JSON-LD structured data
- Supports: LocalBusiness, Hotel, Restaurant, TouristAttraction, Service, Organization
- BreadcrumbList and FAQ schemas
- Injects into document head

### SitemapManager
- URL collection and XML generation
- robots.txt generation
- Priority and changefreq configuration

## Events

| Event | Description |
|-------|-------------|
| `public:loaded` | Public experience initialized |
| `public:page_rendered` | Page rendered into container |
| `public:route_changed` | Route navigation occurred |
| `public:seo_generated` | SEO metadata generated |
| `public:pwa_ready` | PWA ready for install |
| `public:reservation_opened` | Reservation flow opened |
| `public:reservation_submitted` | Reservation submitted |
| `public:menu_clicked` | Menu item clicked |
| `public:cms_content_loaded` | CMS content loaded |
| `public:cms_content_rendered` | CMS content rendered |

## Usage

```javascript
// Render a page
const container = document.getElementById('app')
await publicCapability.renderPage(container, 'home')

// Get SEO manager
const seo = publicCapability.getSEO()
seo.setMetadata('home', { title: 'Inicio', description: '...' })

// Generate sitemap
const xml = publicCapability.generateSitemap(pages, tenant)

// Get route manager for navigation
const routes = publicCapability.getRoutes()
routes.navigate('services')
```
