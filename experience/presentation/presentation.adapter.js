/**
 * Presentation Adapter
 * 
 * Transforms ExperienceContext into presentation-safe view models.
 * Preserves architecture: Presentation never bypasses Experience Engine.
 */

import { ExperienceContext } from '../experience.context.js'

export const INTERNAL_FIELDS = ['config', 'providers']

export class PresentationAdapterError extends Error {
  constructor(message, context = {}) {
    super(message)
    this.name = 'PresentationAdapterError'
    this.context = context
  }
}

export class PresentationAdapter {
  #context = null
  #viewModel = null

  get name() {
    return 'presentation'
  }

  adapt(context) {
    if (!context) {
      throw new PresentationAdapterError('Context is required')
    }

    if (context instanceof ExperienceContext) {
      return this.#fromExperienceContext(context)
    }

    if (context.destination && context.experience) {
      return this.#fromPlainObject(context)
    }

    throw new PresentationAdapterError('Invalid context structure', { context })
  }

  #fromExperienceContext(ctx) {
    this.#context = ctx

    this.#validateRequiredFields(ctx)

    this.#viewModel = {
      identity: this.#extractIdentity(ctx),
      destination: this.#extractDestination(ctx),
      ecosystem: this.#extractEcosystem(ctx),
      company: this.#extractCompany(ctx),
      experience: this.#extractExperience(ctx),
      modules: this.#extractModules(ctx),
      capabilities: this.#extractCapabilities(ctx),
      branding: this.#extractBranding(ctx),
      theme: this.#extractTheme(ctx),
      navigation: this.#extractNavigation(ctx),
      seo: this.#extractSEO(ctx),
      i18n: this.#extractI18n(ctx),
      maps: this.#extractMaps(ctx),
      analytics: this.#extractAnalytics(ctx),
      contact: this.#extractContact(ctx),
      language: ctx.language,
      locale: ctx.locale,
      domain: ctx.domain,
      metadata: this.#extractMetadata(ctx)
    }

    return this.#viewModel
  }

  #fromPlainObject(ctx) {
    this.#context = ctx

    return {
      identity: this.#extractIdentity(ctx),
      destination: ctx.destination,
      ecosystem: ctx.ecosystem,
      company: ctx.company,
      experience: ctx.experience,
      modules: ctx.modules || [],
      capabilities: ctx.capabilities || [],
      branding: ctx.branding,
      theme: ctx.theme,
      navigation: ctx.navigation,
      seo: ctx.seo,
      i18n: ctx.i18n,
      maps: ctx.maps,
      analytics: ctx.analytics,
      contact: ctx.destination?.contact || {},
      language: ctx.language || 'es',
      locale: ctx.locale || 'es-CL',
      domain: ctx.domain,
      metadata: {
        resolvedAt: ctx.resolution?.resolvedAt || new Date().toISOString(),
        isResolved: !!ctx.destination && !!ctx.ecosystem
      }
    }
  }

  #validateRequiredFields(ctx) {
    const required = ['platform', 'destination', 'ecosystem', 'experience', 'modules']
    for (const field of required) {
      if (!ctx[field]) {
        throw new PresentationAdapterError(`Missing required field: ${field}`)
      }
    }
  }

  #extractIdentity(ctx) {
    return {
      platform: ctx.platform,
      domain: ctx.domain,
      subdomain: ctx.subdomain || null,
      language: ctx.language,
      locale: ctx.locale
    }
  }

  #extractDestination(ctx) {
    const dest = ctx.destination
    if (!dest) return null

    return {
      slug: dest.slug,
      name: dest.name,
      description: dest.description,
      domain: dest.domain,
      country: dest.country,
      region: dest.region,
      type: dest.type,
      coordinates: dest.coordinates,
      contact: dest.contact,
      experienceType: dest.experienceType,
      categories: dest.categories,
      featured: dest.featured,
      i18n: dest.i18n
    }
  }

  #extractEcosystem(ctx) {
    const eco = ctx.ecosystem
    if (!eco) return null

    return {
      id: eco.id,
      name: eco.name,
      platform: eco.platform
    }
  }

  #extractCompany(ctx) {
    const company = ctx.company
    if (!company || Object.keys(company).length === 0) return null

    return {
      slug: company.slug,
      name: company.name,
      description: company.description,
      type: company.type,
      contact: company.contact,
      destination: company.destination,
      branding: company.branding,
      enabledCategories: company.enabledCategories,
      enabledModules: company.enabledModules,
      social: company.social
    }
  }

  #extractExperience(ctx) {
    const exp = ctx.experience
    if (!exp) return null

    return {
      id: exp.id,
      type: exp.type,
      name: exp.name,
      description: exp.description,
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

  #extractSEO(ctx) {
    const seo = ctx.seo || {}
    return {
      titleTemplate: seo.titleTemplate,
      descriptionTemplate: seo.descriptionTemplate,
      title: seo.title,
      description: seo.description,
      keywords: seo.keywords || [],
      ogImage: seo.ogImage || '/assets/og-default.jpg',
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
      style: maps.style
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
    return {}
  }

  #extractMetadata(ctx) {
    return {
      resolvedAt: ctx.resolution?.resolvedAt || new Date().toISOString(),
      isResolved: ctx.isResolved ? ctx.isResolved() : (!!ctx.destination && !!ctx.ecosystem),
      hasCompany: ctx.hasCompany ? ctx.hasCompany() : (!!ctx.company && Object.keys(ctx.company).length > 0),
      hasModules: ctx.hasModules ? ctx.hasModules() : (Array.isArray(ctx.modules) && ctx.modules.length > 0)
    }
  }

  getViewModel() {
    return this.#viewModel
  }

  getContext() {
    return this.#context
  }

  static validateAssetPath(path) {
    if (!path || typeof path !== 'string') return false
    if (!path.startsWith('/')) return false
    if (path.includes('..')) return false
    if (/^[A-Za-z]:/.test(path)) return false
    return true
  }

  static sanitizeSEO(seo) {
    return {
      title: seo.title || seo.titleTemplate || 'Untitled',
      description: seo.description || seo.descriptionTemplate || '',
      keywords: Array.isArray(seo.keywords) ? seo.keywords : [],
      ogImage: PresentationAdapter.validateAssetPath(seo.ogImage) 
        ? seo.ogImage 
        : '/assets/og-default.jpg',
      noIndex: !!seo.noIndex
    }
  }
}

export default PresentationAdapter
