/**
 * Public Schema — Business-agnostic public experience data definitions
 *
 * Defines data structures for pages, sections, navigation, SEO
 */
import { createSchema } from '../core/schema.js'

export const PAGE_VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  DRAFT: 'draft',
}

export const SECTION_TYPE = {
  HERO: 'hero',
  GALLERY: 'gallery',
  CAROUSEL: 'carousel',
  SERVICES: 'services',
  BOOKING: 'booking',
  TESTIMONIALS: 'testimonials',
  CONTACT: 'contact',
  MAP: 'map',
  ABOUT: 'about',
  PRICING: 'pricing',
  FAQ: 'faq',
  CUSTOM: 'custom',
}

export const SCHEMA_TYPE = {
  LOCAL_BUSINESS: 'LocalBusiness',
  HOTEL: 'Hotel',
  RESTAURANT: 'Restaurant',
  TOURIST_ATTRACTION: 'TouristAttraction',
  SERVICE: 'Service',
  ORGANIZATION: 'Organization',
}

export const PUBLIC_PAGE_SCHEMA = createSchema({
  id: 'public_page',
  name: 'Public Page',
  description: 'A public-facing page for a tenant',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    slug: { type: 'string', required: true },
    title: { type: 'string', required: true },
    description: { type: 'string', required: false },
    sections: { type: 'array', required: true, items: { type: 'object' } },
    seo: { type: 'object', required: false },
    visibility: { type: 'string', required: true, values: Object.values(PAGE_VISIBILITY) },
    order: { type: 'number', required: false },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: false },
  },
})

export const PUBLIC_SECTION_SCHEMA = createSchema({
  id: 'public_section',
  name: 'Public Section',
  description: 'A section within a public page',
  fields: {
    type: { type: 'string', required: true, values: Object.values(SECTION_TYPE) },
    order: { type: 'number', required: true },
    title: { type: 'string', required: false },
    content: { type: 'object', required: false },
    components: { type: 'array', required: false, items: { type: 'object' } },
    visibility: { type: 'string', required: false },
  },
})

export const PUBLIC_NAVIGATION_SCHEMA = createSchema({
  id: 'public_navigation',
  name: 'Public Navigation',
  description: 'Navigation configuration for a tenant',
  fields: {
    tenantId: { type: 'string', required: true },
    menuItems: { type: 'array', required: true, items: { type: 'object' } },
    routes: { type: 'array', required: true, items: { type: 'object' } },
    footerItems: { type: 'array', required: false, items: { type: 'object' } },
  },
})

export const PUBLIC_SEO_SCHEMA = createSchema({
  id: 'public_seo',
  name: 'Public SEO',
  description: 'SEO metadata for a page',
  fields: {
    pageId: { type: 'string', required: true },
    title: { type: 'string', required: true },
    description: { type: 'string', required: true },
    canonical: { type: 'string', required: false },
    ogTitle: { type: 'string', required: false },
    ogDescription: { type: 'string', required: false },
    ogImage: { type: 'string', required: false },
    twitterCard: { type: 'string', required: false },
    jsonLd: { type: 'object', required: false },
  },
})

export function validatePublicPage(data) {
  return PUBLIC_PAGE_SCHEMA.validate(data)
}

export function validatePublicSection(data) {
  return PUBLIC_SECTION_SCHEMA.validate(data)
}

export function validatePublicNavigation(data) {
  return PUBLIC_NAVIGATION_SCHEMA.validate(data)
}

export function validatePublicSEO(data) {
  return PUBLIC_SEO_SCHEMA.validate(data)
}
