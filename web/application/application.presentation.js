/**
 * Application Presentation Integration
 *
 * P15.8.4 - Application Presentation Runtime Integration
 *
 * Bridges ApplicationRuntime output with PresentationRuntime.
 * Transforms RuntimeApplication into presentation-safe context.
 *
 * Responsibilities:
 * - Transform RuntimeApplication to PresentationContext
 * - Handle ownership-based rendering decisions
 * - Ensure no internal infrastructure reaches presentation
 * - Provide SEO, branding, and theme to renderer
 * - Manage content layer based on ownership mode
 *
 * NO direct rendering.
 * NO WordPress access.
 * NO database access.
 * NO storage access.
 *
 * Framework-free implementation.
 */

import { RENDERING_MODE, PRESENTATION_STATUS } from './application.runtime.js'
import { OWNERSHIP } from '../routing/route.registry.js'
import { MIGRATION_STATE } from '../routing/route.migration.controller.js'

export const APPLICATION_PRESENTATION_EVENTS = {
  APPLICATION_PRESENTATION_STARTED: 'application:presentation:started',
  APPLICATION_PRESENTATION_ADAPTED: 'application:presentation:adapted',
  APPLICATION_PRESENTATION_RENDERED: 'application:presentation:rendered',
  APPLICATION_PRESENTATION_COMPLETED: 'application:presentation:completed',
  APPLICATION_PRESENTATION_FAILED: 'application:presentation:failed'
}

export const CONTENT_LAYER = Object.freeze({
  WORDPRESS: 'wordpress',
  EXPERIENCE: 'experience',
  HYBRID: 'hybrid'
})

export class ApplicationPresentationContext {
  #runtime
  #presentationContext
  #renderingMode
  #contentLayer

  constructor(runtime) {
    if (!runtime || typeof runtime !== 'object') {
      throw new Error('RuntimeApplication is required')
    }

    this.#runtime = runtime
    this.#renderingMode = runtime.rendering?.mode || RENDERING_MODE.WORDPRESS
    this.#contentLayer = this.#determineContentLayer()
    this.#presentationContext = this.#buildPresentationContext()
  }

  #determineContentLayer() {
    if (this.#renderingMode === RENDERING_MODE.WORDPRESS) {
      return CONTENT_LAYER.WORDPRESS
    }

    if (this.#renderingMode === RENDERING_MODE.HYBRID) {
      return CONTENT_LAYER.HYBRID
    }

    if (this.#renderingMode === RENDERING_MODE.EXPERIENCE) {
      return CONTENT_LAYER.EXPERIENCE
    }

    return CONTENT_LAYER.WORDPRESS
  }

  #buildPresentationContext() {
    return Object.freeze({
      platform: 'valdi-platform',
      domain: this.#runtime.identity?.domain || null,
      language: 'es',
      locale: 'es-CL',
      destination: this.#buildDestination(),
      ecosystem: this.#buildEcosystem(),
      company: this.#buildCompany(),
      experience: this.#buildExperience(),
      modules: this.#buildModules(),
      capabilities: this.#buildCapabilities(),
      branding: this.#buildBranding(),
      theme: this.#buildTheme(),
      navigation: this.#buildNavigation(),
      seo: this.#buildSEO(),
      i18n: this.#buildI18n(),
      maps: this.#buildMaps(),
      analytics: this.#buildAnalytics(),
      contact: this.#buildContact(),
      contentLayer: this.#contentLayer,
      renderingMode: this.#renderingMode,
      ownership: this.#runtime.ownership,
      migrationState: this.#runtime.migrationState,
      metadata: this.#buildMetadata()
    })
  }

  #buildDestination() {
    const dest = this.#runtime.configuration?.destination
    if (!dest || !dest.slug) {
      return {
        slug: this.#runtime.identity?.destination || null,
        region: this.#runtime.identity?.region || null,
        name: this.#formatDestinationName(this.#runtime.identity?.destination),
        type: 'destination',
        experienceType: dest?.experienceType || null,
        categories: dest?.categories || null,
        featured: dest?.featured || null,
        contact: dest?.contact || null,
        branding: dest?.branding || null
      }
    }

    return Object.freeze({
      slug: dest.slug,
      region: dest.region || this.#runtime.identity?.region || null,
      name: this.#formatDestinationName(dest.slug),
      type: 'destination',
      experienceType: dest.experienceType || null,
      categories: dest.categories || null,
      featured: dest.featured || null,
      contact: dest.contact || null,
      branding: dest.branding || null
    })
  }

  #formatDestinationName(slug) {
    if (!slug) return 'Untitled'
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  #buildEcosystem() {
    return Object.freeze({
      id: 'valdi-ecosystem',
      name: 'Valdi Platform',
      platform: 'valdi'
    })
  }

  #buildCompany() {
    const company = this.#runtime.configuration?.company
    if (!company || !company.slug) {
      return null
    }

    return Object.freeze({
      slug: company.slug,
      name: company.name || this.#formatCompanyName(company.slug),
      description: company.description || '',
      type: 'company',
      contact: company.contact || null,
      branding: company.branding || null,
      enabledCategories: company.enabledCategories || [],
      enabledModules: company.enabledModules || [],
      social: company.social || null
    })
  }

  #formatCompanyName(slug) {
    if (!slug) return 'Untitled'
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  #buildExperience() {
    const experienceType = this.#runtime.configuration?.experience?.type
    if (!experienceType) {
      return null
    }

    return Object.freeze({
      id: `${this.#runtime.identity?.applicationId || 'unknown'}-experience`,
      type: experienceType,
      name: this.#formatExperienceName(experienceType),
      sections: this.#buildSections()
    })
  }

  #formatExperienceName(type) {
    if (!type) return 'Experience'
    return type
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  #buildSections() {
    const capabilities = this.#runtime.composition?.capabilities || []
    return capabilities.map(cap => ({
      id: cap.name,
      name: this.#formatSectionName(cap.name),
      type: cap.type,
      enabled: true
    }))
  }

  #formatSectionName(name) {
    if (!name) return 'Section'
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  #buildModules() {
    return []
  }

  #buildCapabilities() {
    const capabilities = this.#runtime.composition?.capabilities || []
    return capabilities.map(cap => ({
      name: cap.name,
      version: cap.version,
      type: cap.type,
      configuration: cap.configuration || null
    }))
  }

  #buildBranding() {
    const theme = this.#runtime.configuration?.theme || {}
    const dest = this.#runtime.configuration?.destination
    const companyBranding = this.#runtime.configuration?.company?.branding
    const destinationBranding = dest?.branding
    const branding = theme.branding || companyBranding || destinationBranding || {}

    return Object.freeze({
      logo: branding.logo || '/assets/branding/default-logo.svg',
      favicon: branding.favicon || '/assets/branding/favicon.ico',
      colors: branding.colors || {
        primary: '#c8a55c',
        secondary: '#1a1a2e',
        accent: '#e8d5a3'
      },
      fonts: branding.fonts || {
        display: 'Inter',
        body: 'Inter'
      }
    })
  }

  #buildTheme() {
    const theme = this.#runtime.configuration?.theme || {}

    return Object.freeze({
      mode: theme.mode || 'dark',
      borderRadius: theme.borderRadius || '8px',
      spacing: theme.spacing || '8px',
      primaryColor: theme.primaryColor || '#c8a55c',
      fontFamily: theme.fontFamily || 'Inter'
    })
  }

  #buildNavigation() {
    const navigation = this.#runtime.configuration?.navigation
    if (navigation) {
      return Object.freeze({
        header: navigation.header || { items: [] },
        footer: navigation.footer || { columns: [] }
      })
    }
    return Object.freeze({
      header: { items: [] },
      footer: { columns: [] }
    })
  }

  #buildSEO() {
    const seo = this.#runtime.configuration?.seo || {}

    return Object.freeze({
      title: seo.title || this.#buildDefaultTitle(),
      description: seo.description || '',
      titleTemplate: seo.titleTemplate || '{name}',
      descriptionTemplate: seo.descriptionTemplate || '',
      keywords: seo.keywords || [],
      ogImage: seo.ogImage || '/assets/og-default.jpg',
      noIndex: seo.noIndex || false,
      canonical: seo.canonical || null
    })
  }

  #buildDefaultTitle() {
    const company = this.#buildCompany()
    const destination = this.#buildDestination()

    if (company) {
      return `${company.name} | ${destination.name}`
    }

    return destination.name
  }

  #buildI18n() {
    return Object.freeze({
      defaultLocale: 'es-CL',
      fallbackLocale: 'es',
      supportedLocales: ['es-CL', 'es', 'en']
    })
  }

  #buildMaps() {
    return Object.freeze({
      provider: 'mapbox',
      defaultCenter: [-39.8197, -73.2459],
      defaultZoom: 13
    })
  }

  #buildAnalytics() {
    const integrations = this.#runtime.configuration?.integrations || {}

    return Object.freeze({
      enabled: true,
      providers: integrations.analytics?.providers || []
    })
  }

  #buildContact() {
    const configContact = this.#runtime.configuration?.contact
    if (configContact) {
      return Object.freeze({ ...configContact })
    }

    const company = this.#runtime.configuration?.company
    if (company && company.contact) {
      return Object.freeze({ ...company.contact })
    }

    return Object.freeze({})
  }

  #buildMetadata() {
    return Object.freeze({
      resolvedAt: this.#runtime.metadata?.resolvedAt || new Date().toISOString(),
      assembledAt: this.#runtime.metadata?.assembledAt || new Date().toISOString(),
      applicationId: this.#runtime.identity?.applicationId || null,
      renderingMode: this.#renderingMode,
      contentLayer: this.#contentLayer,
      canRender: this.#runtime.rendering?.canRender ?? false,
      presentationStatus: this.#runtime.rendering?.status || PRESENTATION_STATUS.UNAVAILABLE,
      cacheKey: this.#runtime.cache?.key || null
    })
  }

  get context() {
    return this.#presentationContext
  }

  get runtime() {
    return this.#runtime
  }

  get renderingMode() {
    return this.#renderingMode
  }

  get contentLayer() {
    return this.#contentLayer
  }

  get canRender() {
    return this.#runtime.rendering?.canRender ?? false
  }

  get presentationStatus() {
    return this.#runtime.rendering?.status || PRESENTATION_STATUS.UNAVAILABLE
  }

  get cacheKey() {
    return this.#runtime.cache?.key || null
  }

  get cacheTags() {
    return this.#runtime.cache?.tags || []
  }

  get identity() {
    return this.#runtime.identity
  }

  get ownership() {
    return this.#runtime.ownership
  }

  get migrationState() {
    return this.#runtime.migrationState
  }

  get configuration() {
    return this.#runtime.configuration
  }

  get composition() {
    return this.#runtime.composition
  }

  isWordPress() {
    return this.#renderingMode === RENDERING_MODE.WORDPRESS
  }

  isHybrid() {
    return this.#renderingMode === RENDERING_MODE.HYBRID
  }

  isExperience() {
    return this.#renderingMode === RENDERING_MODE.EXPERIENCE
  }

  getPresentationContext() {
    return this.#presentationContext
  }

  toJSON() {
    return { ...this.#presentationContext }
  }

  freeze() {
    return Object.freeze(this)
  }
}

export function createApplicationPresentationContext(runtime) {
  return new ApplicationPresentationContext(runtime)
}

export default {
  ApplicationPresentationContext,
  createApplicationPresentationContext,
  APPLICATION_PRESENTATION_EVENTS,
  CONTENT_LAYER,
  RENDERING_MODE,
  PRESENTATION_STATUS
}
