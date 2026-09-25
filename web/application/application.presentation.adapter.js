/**
 * Application Presentation Adapter
 *
 * P15.8.4 - Application Presentation Runtime Integration
 *
 * Transforms ApplicationPresentationContext into ExperienceViewModel-compatible format.
 * Connects Application Runtime with existing Presentation Runtime.
 *
 * This adapter:
 * - Transforms application context to presentation-safe view model
 * - Filters out infrastructure references
 * - Ensures SEO, branding, theme reach the renderer
 * - Handles capability-based section rendering
 *
 * Framework-free implementation.
 */

import { ApplicationPresentationContext } from './application.presentation.js'
import { PresentationAdapter } from '../../experience/presentation/presentation.adapter.js'
import { presentZoneNavigationTabs } from '../../experience/presentation/zone.navigation.tabs.js'

export const INTERNAL_FIELDS = [
  'config',
  'providers',
  'engine',
  'resolver',
  '_ApplicationPresentationContext__runtime',
  '_ApplicationPresentationContext__presentationContext'
]

export class ApplicationPresentationAdapter {
  #applicationContext
  #presentationAdapter

  constructor() {
    this.#presentationAdapter = new PresentationAdapter()
  }

  adapt(applicationContext) {
    if (!applicationContext) {
      throw new Error('ApplicationPresentationContext is required')
    }

    if (applicationContext instanceof ApplicationPresentationContext) {
      return this.#fromApplicationContext(applicationContext)
    }

    if (typeof applicationContext === 'object') {
      return this.#fromPlainObject(applicationContext)
    }

    throw new Error('Invalid application context type')
  }

  #fromApplicationContext(appContext) {
    const ctx = appContext.getPresentationContext()

    const viewModel = {
      identity: this.#extractIdentity(ctx),
      destination: this.#extractDestination(ctx),
      ecosystem: this.#extractEcosystem(ctx),
      company: this.#extractCompany(ctx),
      experience: this.#extractExperience(ctx),
      modules: this.#extractModules(ctx),
      capabilities: this.#extractCapabilities(ctx),
      booking: this.#extractBooking(ctx),
      branding: this.#extractBranding(ctx),
      theme: this.#extractTheme(ctx),
      navigation: this.#extractNavigation(ctx),
      zoneNavigation: this.#extractZoneNavigation(ctx),
      zoneContent: this.#extractZoneContent(ctx),
      zonePresentation: this.#extractZonePresentation(ctx),
      seo: this.#extractSEO(ctx),
      i18n: this.#extractI18n(ctx),
      maps: this.#extractMaps(ctx),
      analytics: this.#extractAnalytics(ctx),
      contact: this.#extractContact(ctx),
      pwa: this.#extractPWA(ctx),
      language: ctx.language || 'es',
      locale: ctx.locale || 'es-CL',
      domain: ctx.domain,
      metadata: this.#extractMetadata(ctx),
      rendering: {
        mode: ctx.renderingMode,
        contentLayer: ctx.contentLayer,
        ownership: ctx.ownership,
        migrationState: ctx.migrationState
      }
    }

    return Object.freeze(viewModel)
  }

  #fromPlainObject(ctx) {
    return {
      identity: this.#extractIdentity(ctx),
      destination: this.#extractDestination(ctx),
      ecosystem: this.#extractEcosystem(ctx),
      company: this.#extractCompany(ctx),
      experience: this.#extractExperience(ctx),
      modules: this.#extractModules(ctx),
      capabilities: this.#extractCapabilities(ctx),
      booking: this.#extractBooking(ctx),
      branding: this.#extractBranding(ctx),
      theme: this.#extractTheme(ctx),
      navigation: this.#extractNavigation(ctx),
      zoneNavigation: this.#extractZoneNavigation(ctx),
      zoneContent: this.#extractZoneContent(ctx),
      zonePresentation: this.#extractZonePresentation(ctx),
      seo: this.#extractSEO(ctx),
      i18n: this.#extractI18n(ctx),
      maps: this.#extractMaps(ctx),
      analytics: this.#extractAnalytics(ctx),
      contact: this.#extractContact(ctx),
      pwa: this.#extractPWA(ctx),
      language: ctx.language || 'es',
      locale: ctx.locale || 'es-CL',
      domain: ctx.domain,
      metadata: this.#extractMetadata(ctx),
      rendering: {
        mode: ctx.renderingMode || 'WORDPRESS',
        contentLayer: ctx.contentLayer || 'wordpress',
        ownership: ctx.ownership,
        migrationState: ctx.migrationState
      }
    }
  }

  #extractIdentity(ctx) {
    return {
      platform: ctx.platform || 'valdi-platform',
      domain: ctx.domain,
      subdomain: null,
      language: ctx.language || 'es',
      locale: ctx.locale || 'es-CL'
    }
  }

  #extractDestination(ctx) {
    const dest = ctx.destination
    if (!dest) return null

    return {
      slug: dest.slug || null,
      name: dest.name || 'Untitled',
      description: dest.description || '',
      domain: dest.domain || ctx.domain,
      country: dest.country || 'Chile',
      region: dest.region || null,
      type: dest.type || 'destination',
      coordinates: dest.coordinates || null,
      contact: dest.contact || null,
      experienceType: dest.experienceType || null,
      categories: dest.categories || [],
      featured: dest.featured || null,
      i18n: dest.i18n || null
    }
  }

  #extractEcosystem(ctx) {
    const eco = ctx.ecosystem
    if (!eco) return null

    return {
      id: eco.id || 'valdi-ecosystem',
      name: eco.name || 'Valdi Platform',
      platform: eco.platform || 'valdi'
    }
  }

  #extractCompany(ctx) {
    const company = ctx.company
    if (!company || Object.keys(company).length === 0) return null

    return {
      slug: company.slug || null,
      name: company.name || 'Untitled',
      description: company.description || '',
      type: company.type || null,
      contact: company.contact || null,
      destination: company.destination || null,
      branding: company.branding || null,
      enabledCategories: company.enabledCategories || [],
      enabledModules: company.enabledModules || [],
      social: company.social || null
    }
  }

  #extractExperience(ctx) {
    const exp = ctx.experience
    if (!exp) return null

    return {
      id: exp.id || null,
      type: exp.type || null,
      name: exp.name || 'Experience',
      description: exp.description || '',
      sections: exp.sections || [],
      components: exp.components || [],
      modules: exp.modules || []
    }
  }

  #extractModules(ctx) {
    return Array.isArray(ctx.modules) ? [...ctx.modules] : []
  }

  #extractCapabilities(ctx) {
    return Array.isArray(ctx.capabilities) ? [...ctx.capabilities] : []
  }

  #extractBooking(ctx) {
    const booking = ctx.booking
    if (booking && typeof booking === 'object' && booking.enabled) {
      const slug = typeof booking.slug === 'string' && booking.slug ? booking.slug : ctx.company?.slug || null
      return {
        enabled: true,
        slug: slug,
        title: typeof booking.title === 'string' ? booking.title : null,
        description: typeof booking.description === 'string' ? booking.description : null,
        availabilityEndpoint: typeof booking.availabilityEndpoint === 'string' ? booking.availabilityEndpoint : null,
        reservationEndpoint: typeof booking.reservationEndpoint === 'string' && booking.reservationEndpoint
          ? booking.reservationEndpoint
          : slug ? `/api/v1/booking/companies/${encodeURIComponent(slug)}/reservations` : null,
      }
    }

    const capability = (Array.isArray(ctx.capabilities) ? ctx.capabilities : []).find(
      (c) => c && typeof c === 'object' && c.name === 'booking'
    )
    const config = capability?.configuration || {}
    if (config.enabled === true) {
      const slug = typeof config.slug === 'string' && config.slug ? config.slug : ctx.company?.slug || null
      return {
        enabled: true,
        slug: slug,
        title: typeof config.title === 'string' ? config.title : null,
        description: typeof config.description === 'string' ? config.description : null,
        availabilityEndpoint: typeof config.availabilityEndpoint === 'string' ? config.availabilityEndpoint : null,
        reservationEndpoint: typeof config.reservationEndpoint === 'string' && config.reservationEndpoint
          ? config.reservationEndpoint
          : slug ? `/api/v1/booking/companies/${encodeURIComponent(slug)}/reservations` : null,
      }
    }

    return { enabled: false }
  }

  #extractBranding(ctx) {
    const branding = ctx.branding || {}
    return {
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
    }
  }

  #extractTheme(ctx) {
    const theme = ctx.theme || {}
    return {
      mode: theme.mode || 'dark',
      borderRadius: theme.borderRadius || '8px',
      spacing: theme.spacing || '8px'
    }
  }

  #extractNavigation(ctx) {
    return ctx.navigation || {
      header: { items: [] },
      footer: { columns: [] }
    }
  }

  /**
   * APP-ZONE-TABS-1
   *
   * Applies the tabs presentation strategy to the validated ZoneNavigation
   * content + engine scope produced by the ApplicationPresentationContext.
   * Content is never mutated; layout/id details are presentation-only.
   */
  #extractZoneNavigation(ctx) {
    const zoneNav = ctx.zoneNavigation
    if (!zoneNav || !zoneNav.content || !Array.isArray(zoneNav.content.items) || zoneNav.content.items.length === 0) {
      return null
    }

    return presentZoneNavigationTabs({
      content: zoneNav.content,
      scope: zoneNav.scope,
      activeKey: null
    })
  }

  /**
   * APP-ZONE-TABS-2
   *
   * Passes the validated Zone Content (content layer only) to the view model.
   * The renderer maps panel component kinds to real, structured panel bodies;
   * no visual/layout concern lives in the content.
   */
  #extractZoneContent(ctx) {
    const zoneContent = ctx.zoneContent
    if (!zoneContent || !zoneContent.content || !Array.isArray(zoneContent.content.items) || zoneContent.content.items.length === 0) {
      return null
    }
    const { content, applicationId } = zoneContent
    return { ...content, applicationId }
  }

  /**
   * APP-ZONE-PRESENT-1
   *
   * Passes the validated, Application-scoped visual identity to the view
   * model. Scope authority is engine-derived (cssScope comes exclusively from
   * generateZoneNavigationScope via the Paired navigation). version/variant
   * are engine-owned; tokens are the effective (variant + overrides) set.
   */
  #extractZonePresentation(ctx) {
    const zonePres = ctx.zonePresentation
    if (!zonePres || !zonePres.content || !zonePres.scope) {
      return null
    }
    const { content, applicationId, scope } = zonePres
    return Object.freeze({
      version: content.version,
      variant: content.variant || null,
      tokens: Object.freeze({ ...content.tokens }),
      applicationId,
      cssScope: scope.cssScope || null
    })
  }

  #extractSEO(ctx) {
    const seo = ctx.seo || {}
    return {
      titleTemplate: seo.titleTemplate,
      descriptionTemplate: seo.descriptionTemplate,
      title: seo.title || 'Untitled',
      description: seo.description || '',
      keywords: seo.keywords || [],
      ogImage: PresentationAdapter.validateAssetPath(seo.ogImage)
        ? seo.ogImage
        : '/assets/og-default.jpg',
      noIndex: seo.noIndex || false
    }
  }

  #extractI18n(ctx) {
    const i18n = ctx.i18n || {}
    return {
      defaultLocale: i18n.defaultLocale || 'es-CL',
      fallbackLocale: i18n.fallbackLocale || 'es',
      supportedLocales: i18n.supportedLocales || ['es-CL', 'es', 'en']
    }
  }

  #extractMaps(ctx) {
    const maps = ctx.maps || {}
    return {
      provider: maps.provider || 'mapbox',
      defaultCenter: maps.defaultCenter || [-39.8197, -73.2459],
      defaultZoom: maps.defaultZoom || 13,
      style: maps.style || null
    }
  }

  #extractAnalytics(ctx) {
    const analytics = ctx.analytics || {}
    return {
      enabled: analytics.enabled ?? true,
      providers: analytics.providers || []
    }
  }

  #extractContact(ctx) {
    if (ctx.destination?.contact) {
      return ctx.destination.contact
    }
    if (ctx.company?.contact) {
      return ctx.company.contact
    }
    return ctx.contact || {}
  }

  #extractPWA(ctx) {
    const capabilities = ctx.capabilities || []
    const installableApp = capabilities.find(c => c.name === 'installableApp')

    if (!installableApp) {
      return {
        enabled: false,
        canInstall: false,
        isInstalled: false,
        manifestUrl: null,
        serviceWorkerUrl: null,
        serviceWorkerScope: null,
        appId: null
      }
    }

    const config = installableApp.configuration || {}
    const enabled = config.enabled !== false
    const company = ctx.company || {}
    const identity = ctx.identity || {}
    const metadata = ctx.metadata || {}

    const slug = company.slug || 'albasie'
    const domain = identity.domain || 'valdi.app'
    const route = identity.route || `/${slug}`
    const applicationId = (metadata.applicationId || `${domain}${route}`).replace(/\/$/, '')

    const scope = config.scope || `/${slug}/`
    const isRootScope = scope === '/'

    return {
      enabled,
      canInstall: enabled,
      isInstalled: false,
      appId: applicationId,
      manifestUrl: `/pwa/${applicationId.replace(/\//g, '__SLASH__').replace(/\./g, '__DOT__')}/manifest.json`,
      serviceWorkerUrl: `/sw-${slug}.js`,
      serviceWorkerScope: scope,
      config: Object.freeze({
        name: config.name || company.name || 'Valdi App',
        shortName: config.shortName || company.shortName || 'Valdi',
        description: config.description || company.description || '',
        startUrl: config.startUrl || `/${slug}/`,
        display: config.display || 'standalone',
        themeColor: config.themeColor || company.branding?.colors?.primary || '#c8956c',
        backgroundColor: config.backgroundColor || company.backgroundColor || '#0a0a0a',
        icons: this.#validateIcons(config.icons),
        favicon: PresentationAdapter.validateAssetPath(config.favicon) ? config.favicon : null,
        appleTouchIcon: PresentationAdapter.validateAssetPath(config.appleTouchIcon) ? config.appleTouchIcon : null,
        scope: scope,
        isRootScope: isRootScope,
        offlineFallback: config.offlineFallback || `/${slug}/offline.html`
      })
    }
  }

  #validateIcons(icons) {
    if (!Array.isArray(icons)) {
      return []
    }
    return icons.filter(icon => {
      if (!icon || typeof icon !== 'object') {
        return false
      }
      if (!PresentationAdapter.validateAssetPath(icon.src)) {
        return false
      }
      if (!icon.sizes || typeof icon.sizes !== 'string') {
        return false
      }
      if (icon.purpose && typeof icon.purpose !== 'string') {
        return false
      }
      return true
    })
  }

  #extractMetadata(ctx) {
    const meta = ctx.metadata || {}
    return {
      resolvedAt: meta.resolvedAt || new Date().toISOString(),
      assembledAt: meta.assembledAt || new Date().toISOString(),
      isResolved: true,
      hasCompany: !!ctx.company,
      hasModules: Array.isArray(ctx.modules) && ctx.modules.length > 0,
      applicationId: meta.applicationId || null,
      renderingMode: meta.renderingMode,
      contentLayer: meta.contentLayer,
      canRender: meta.canRender ?? false,
      cacheKey: meta.cacheKey || null
    }
  }

  static sanitizeForRendering(viewModel) {
    const sanitized = { ...viewModel }

    for (const field of INTERNAL_FIELDS) {
      delete sanitized[field]
    }

    return Object.freeze(sanitized)
  }

  static validateRenderingContext(viewModel) {
    const errors = []

    if (!viewModel.identity?.domain) {
      errors.push('Domain is required')
    }

    if (!viewModel.destination?.slug) {
      errors.push('Destination slug is required')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export function createApplicationPresentationAdapter() {
  return new ApplicationPresentationAdapter()
}

export default {
  ApplicationPresentationAdapter,
  createApplicationPresentationAdapter,
  INTERNAL_FIELDS
}
