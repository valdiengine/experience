/**
 * Application Configuration Schema
 *
 * P15.8.1 - Application Configuration Model
 *
 * Defines the normalized configuration structure for an Application Instance.
 * This is a data contract - it represents WHAT the application IS,
 * not HOW it is rendered.
 *
 * Framework-free implementation.
 */

export const EXPERIENCE_TYPES = Object.freeze([
  'company-profile',
  'tourism-destination',
  'accommodation',
  'restaurant',
  'tour',
  'real-estate',
  'boat',
  'professional-service'
])

export const CONTENT_SOURCES = Object.freeze([
  'wordpress',
  'experience'
])

export const MIGRATION_STATES = Object.freeze([
  'LEGACY',
  'HYBRID_ACTIVE',
  'EXPERIENCE_ACTIVE'
])

export const DEFAULT_CAPABILITIES = Object.freeze({
  'company-profile': ['hero', 'services', 'gallery', 'contact'],
  'tourism-destination': ['hero', 'destinations', 'attractions', 'activities', 'gallery', 'map'],
  'accommodation': ['hero', 'rooms', 'gallery', 'location', 'booking', 'reviews'],
  'restaurant': ['hero', 'menu', 'gallery', 'location', 'hours', 'reservation'],
  'tour': ['hero', 'itinerary', 'gallery', 'booking', 'reviews', 'location'],
  'real-estate': ['hero', 'listings', 'gallery', 'map', 'contact'],
  'boat': ['hero', 'specs', 'gallery', 'contact'],
  'professional-service': ['hero', 'services', 'about', 'credentials', 'contact', 'appointment']
})

export function createApplicationConfig(data = {}) {
  return {
    identity: createIdentityConfig(data.identity),
    destination: createDestinationConfig(data.destination),
    company: createCompanyConfig(data.company),
    experience: createExperienceConfig(data.experience),
    capabilities: createCapabilitiesConfig(data.capabilities),
    theme: createThemeConfig(data.theme),
    content: createContentConfig(data.content),
    seo: createSeoConfig(data.seo),
    integrations: createIntegrationsConfig(data.integrations),
    migration: createMigrationConfig(data.migration),
    navigation: createNavigationConfig(data.navigation),
    contact: createContactConfig(data.contact)
  }
}

function createIdentityConfig(identity = {}) {
  return {
    domain: identity.domain || null,
    route: identity.route || null,
    applicationId: identity.applicationId || null
  }
}

function createDestinationConfig(destination = {}) {
  return {
    slug: destination.slug || null,
    region: destination.region || null,
    experienceType: destination.experienceType || null,
    categories: destination.categories || null,
    featured: destination.featured || null,
    contact: destination.contact || null,
    branding: destination.branding || null
  }
}

function createCompanyConfig(company = {}) {
  if (company === null || company === undefined) {
    return { slug: null, enabled: false }
  }
  if (typeof company === 'string') {
    return { slug: company, enabled: true }
  }
  return {
    slug: company.slug || null,
    enabled: company.enabled !== false
  }
}

function createExperienceConfig(experience = {}) {
  if (experience === null || experience === undefined) {
    return { type: null }
  }
  if (typeof experience === 'string') {
    return { type: experience }
  }
  return {
    type: experience.type || null
  }
}

function createCapabilitiesConfig(capabilities = {}) {
  if (!capabilities || typeof capabilities !== 'object') {
    return {}
  }
  const result = {}
  for (const [key, value] of Object.entries(capabilities)) {
    if (typeof value === 'boolean') {
      result[key] = value
    } else if (typeof value === 'object' && value !== null) {
      result[key] = { ...value }
    } else {
      result[key] = true
    }
  }
  return result
}

function createThemeConfig(theme = {}) {
  if (!theme || typeof theme !== 'object') {
    return {}
  }
  return {
    branding: theme.branding ? { ...theme.branding } : null,
    primaryColor: theme.primaryColor || null,
    fontFamily: theme.fontFamily || null,
    additional: theme.additional ? { ...theme.additional } : null
  }
}

function createContentConfig(content = {}) {
  if (content === null || content === undefined) {
    return { source: 'wordpress' }
  }
  if (typeof content === 'string') {
    return { source: content }
  }
  return {
    source: content.source || 'wordpress',
    configuration: content.configuration ? { ...content.configuration } : null
  }
}

function createSeoConfig(seo = {}) {
  if (!seo || typeof seo !== 'object') {
    return {}
  }
  return {
    title: seo.title || null,
    description: seo.description || null,
    canonical: seo.canonical || null,
    robots: seo.robots || null,
    openGraph: seo.openGraph ? { ...seo.openGraph } : null,
    twitter: seo.twitter ? { ...seo.twitter } : null,
    structuredData: seo.structuredData ? { ...seo.structuredData } : null
  }
}

function createIntegrationsConfig(integrations = {}) {
  if (!integrations || typeof integrations !== 'object') {
    return {}
  }
  const result = {}
  const allowed = ['whatsapp', 'maps', 'booking', 'payments', 'social', 'notifications', 'analytics']
  for (const [key, value] of Object.entries(integrations)) {
    if (allowed.includes(key) && typeof value === 'object' && value !== null) {
      result[key] = { ...value, enabled: value.enabled !== false }
    }
  }
  return result
}

function createMigrationConfig(migration = {}) {
  if (migration === null || migration === undefined) {
    return { state: 'LEGACY' }
  }
  if (typeof migration === 'string') {
    return { state: migration }
  }
  return {
    state: migration.state || 'LEGACY',
    ownership: migration.ownership || null
  }
}

function createNavigationConfig(navigation = {}) {
  if (!navigation || typeof navigation !== 'object') {
    return {
      header: { items: [] },
      footer: { columns: [] }
    }
  }
  return {
    header: navigation.header ? { ...navigation.header } : { items: [] },
    footer: navigation.footer ? { ...navigation.footer } : { columns: [] }
  }
}

function createContactConfig(contact = {}) {
  if (!contact || typeof contact !== 'object') {
    return {}
  }
  return { ...contact }
}

export function validateExperienceType(type) {
  if (!type) return { valid: true, type: null }
  if (typeof type !== 'string') return { valid: false, error: 'Experience type must be a string' }
  if (!EXPERIENCE_TYPES.includes(type)) {
    return { valid: false, error: `Invalid experience type: ${type}` }
  }
  return { valid: true, type }
}

export function validateContentSource(source) {
  if (!source) return { valid: true, source: 'wordpress' }
  if (typeof source !== 'string') return { valid: false, error: 'Content source must be a string' }
  if (!CONTENT_SOURCES.includes(source)) {
    return { valid: false, error: `Invalid content source: ${source}` }
  }
  return { valid: true, source }
}

export function validateMigrationState(state) {
  if (!state) return { valid: true, state: 'LEGACY' }
  if (typeof state !== 'string') return { valid: false, error: 'Migration state must be a string' }
  if (!MIGRATION_STATES.includes(state)) {
    return { valid: false, error: `Invalid migration state: ${state}` }
  }
  return { valid: true, state }
}

export function validateCapabilityKey(key) {
  if (!key || typeof key !== 'string') return false
  if (key.includes('$') || key.includes('(') || key.includes(')')) return false
  if (key.startsWith('_')) return false
  return true
}

export function validateCompanySlug(slug) {
  if (!slug) return { valid: true, slug: null }
  if (typeof slug !== 'string') return { valid: false, error: 'Company slug must be a string' }
  if (slug.length < 1 || slug.length > 100) {
    return { valid: false, error: 'Company slug must be 1-100 characters' }
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, error: 'Company slug must be lowercase alphanumeric with hyphens' }
  }
  return { valid: true, slug }
}

export default {
  EXPERIENCE_TYPES,
  CONTENT_SOURCES,
  MIGRATION_STATES,
  DEFAULT_CAPABILITIES,
  createApplicationConfig,
  validateExperienceType,
  validateContentSource,
  validateMigrationState,
  validateCapabilityKey,
  validateCompanySlug
}