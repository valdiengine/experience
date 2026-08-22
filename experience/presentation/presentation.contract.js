/**
 * Presentation Contract
 * 
 * Defines the contract between Experience Engine and Presentation Layer.
 * Based on P15.3.0 ExperienceContext Contract.
 */

export const PRESENTATION_CONTRACT = {
  VERSION: '1.0',
  
  VIEW_MODEL_PROPERTIES: [
    'identity',
    'destination',
    'ecosystem',
    'company',
    'experience',
    'modules',
    'capabilities',
    'branding',
    'theme',
    'navigation',
    'seo',
    'i18n',
    'maps',
    'analytics',
    'contact',
    'language',
    'locale',
    'domain',
    'metadata'
  ],

  IDENTITY_PROPERTIES: [
    'platform',
    'domain',
    'subdomain',
    'language',
    'locale'
  ],

  DESTINATION_PROPERTIES: [
    'slug',
    'name',
    'description',
    'domain',
    'country',
    'region',
    'type',
    'coordinates',
    'contact',
    'experienceType',
    'categories',
    'featured',
    'i18n'
  ],

  EXPERIENCE_PROPERTIES: [
    'id',
    'type',
    'name',
    'description',
    'sections',
    'components',
    'modules'
  ],

  BRANDING_PROPERTIES: [
    'logo',
    'favicon',
    'colors',
    'fonts'
  ],

  THEME_PROPERTIES: [
    'mode',
    'borderRadius',
    'spacing'
  ],

  SEO_PROPERTIES: [
    'titleTemplate',
    'descriptionTemplate',
    'title',
    'description',
    'keywords',
    'ogImage',
    'noIndex'
  ],

  NAVIGATION_PROPERTIES: [
    'header',
    'footer'
  ],

  INTERNAL_PROPERTIES: [
    'config',
    'providers'
  ],

  FORBIDDEN_EXPOSURE: [
    'config',
    'providers',
    'request',
    'resolution'
  ]
}

export const SECTION_TYPES = [
  'hero',
  'search',
  'categories',
  'featured',
  'map',
  'catalog',
  'booking-form',
  'company-profile',
  'about',
  'services',
  'gallery',
  'testimonials',
  'pricing',
  'contact',
  'footer',
  'content',
  'cta'
]

export const MODULE_TYPES = [
  'reservations',
  'availability',
  'gallery',
  'media',
  'maps',
  'notifications',
  'ecommerce',
  'payments',
  'inventory',
  'blog',
  'analytics',
  'pwa'
]

export function validatePresentationContract(viewModel) {
  const errors = []
  
  for (const prop of PRESENTATION_CONTRACT.VIEW_MODEL_PROPERTIES) {
    if (!(prop in viewModel)) {
      errors.push(`Missing required property: ${prop}`)
    }
  }
  
  for (const prop of PRESENTATION_CONTRACT.FORBIDDEN_EXPOSURE) {
    if (prop in viewModel) {
      errors.push(`Forbidden property exposed: ${prop}`)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

export default PRESENTATION_CONTRACT
